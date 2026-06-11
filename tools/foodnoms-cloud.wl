(* ::Package:: *)

(* foodnoms-cloud.wl — deploy-ready Wolfram Cloud Object that turns a recipe
   spec (a list of USDA ingredients + optional patches) into ready-to-write
   .foodnoms file bytes plus whole-recipe nutrition totals.

   WHY THIS EXISTS
   Generating a .foodnoms recipe used to be a manual, per-session playbook
   (docs/RECIPE_NUTRITION_GENERATOR.md): paste fdc-lookup.wl, resolve each
   ingredient to a USDA fdcId, fetch per-100 g blocks, hand-assemble JSON, fold
   in patches, sum totals. This deploys all of that as ONE Wolfram Cloud
   APIFunction (same pattern as the pirk0/RenderTimeline endpoint).

   THE .foodnoms BYTES ARE PRODUCED HERE, IN WOLFRAM — NO PYTHON.
   LZFSE *compression* is not available in Wolfram, but the LZFSE container
   permits an UNCOMPRESSED block: 'bvx-' + uint32-LE raw-length + raw JSON +
   'bvx$'. Apple's compression framework / liblzfse decode that fine. We
   assemble those bytes directly (foodnomsBytes), Base64 them into the JSON
   response, and the caller writes them with BinaryWrite[name, BaseDecode[b64]].

   HOW IT RUNS
   The FDC helpers (Section A) call api.nal.usda.gov via URLExecute; that only
   works server-side (Wolfram Cloud egress), which is exactly where the deployed
   object runs. Deploy with the line in Section D from an authenticated session.

   ---------------------------------------------------------------------------
   Section A is a VERBATIM SYNCED COPY of tools/fdc-lookup.wl (the source of
   truth). If fdc-lookup.wl changes, re-sync this block and redeploy.
   --------------------------------------------------------------------------- *)


(* ======================= A. FDC helpers (synced copy) ===================== *)

$FDCApiKey = "CQawDjU3RVijSYCgvhRxH1ReIT12ZS02LkbXX3f1";

(* name -> ranked candidate records *)
fdcSearch[query_String, n_Integer : 5] := Module[{data},
  data = URLExecute[<|
     "Scheme" -> "https", "Domain" -> "api.nal.usda.gov",
     "Path" -> "/fdc/v1/foods/search",
     "Query" -> {"api_key" -> $FDCApiKey, "query" -> query,
        "pageSize" -> ToString[n]}|>, "RawJSON"];
  {#["fdcId"], #["description"], #["dataType"]} & /@ Lookup[data, "foods", {}]
];

(* raw FDC record (full format) *)
fdcFood[fdcId_] := URLExecute[
   "https://api.nal.usda.gov/fdc/v1/food/" <> ToString[fdcId] <>
    "?api_key=" <> $FDCApiKey <> "&format=full", "RawJSON"];

(* full-format row accessors: each row is
   <|"nutrient"-><|"name"->..,"unitName"->..|>, "amount"->..|> *)
fdcRowName[r_] := Lookup[Lookup[r, "nutrient", <||>], "name", ""];
fdcRowUnit[r_] := ToUpperCase[Lookup[Lookup[r, "nutrient", <||>], "unitName", ""]];
fdcRowAmt[r_]  := Lookup[r, "amount", Missing[]];

(* Foundation foods often lack a plain Energy/KCAL row; fall back to Atwater *)
fdcEnergyKcal[fn_List] := Module[{pick},
  pick[name_] := fdcRowAmt @ SelectFirst[fn,
    fdcRowName[#] == name && fdcRowUnit[#] == "KCAL" &, <||>];
  FirstCase[
    {pick["Energy"], pick["Energy (Atwater General Factors)"],
     pick["Energy (Atwater Specific Factors)"]}, _?NumberQ, Missing[]]
];

(* total-sugars row, robust to "Sugars, total including NLEA" vs "Total Sugars";
   excludes "added sugars" *)
fdcSugars[fn_List] := fdcRowAmt @ SelectFirst[fn,
  With[{n = ToLowerCase @ fdcRowName[#]},
    StringContainsQ[n, "sugars"] && StringContainsQ[n, "total"] &&
    ! StringContainsQ[n, "added"]] &, <||>];

(* fdcId -> per-100g block keyed by FoodNoms nutrient names *)
fdcToFoodNoms[fdcId_] := Module[{data, fn, get},
  data = fdcFood[fdcId];
  fn = Lookup[data, "foodNutrients", {}];
  (* match by exact nutrient name; unit defaults to "any" *)
  get[pat_, unit_ : _] := fdcRowAmt @ SelectFirst[fn,
    StringMatchQ[fdcRowName[#], pat] && MatchQ[fdcRowUnit[#], unit] &, <||>];
  <|
   "name" -> data["description"], "fdcId" -> fdcId, "dataType" -> data["dataType"],
   "baseAmount" -> 100, "baseUnit" -> "gram",
   "nutrients" -> DeleteCases[<|
      "calories" -> fdcEnergyKcal[fn],
      "protein" -> get["Protein"], "fat" -> get["Total lipid (fat)"],
      "carbs" -> get["Carbohydrate, by difference"],
      "sugars" -> fdcSugars[fn], "fiber" -> get["Fiber, total dietary"],
      "fatSaturated" -> get["Fatty acids, total saturated"],
      "fatTrans" -> get["Fatty acids, total trans"],
      "fatMonounsaturated" -> get["Fatty acids, total monounsaturated"],
      "fatPolyunsaturated" -> get["Fatty acids, total polyunsaturated"],
      "cholesterol" -> get["Cholesterol"], "water" -> get["Water"],
      "sodium" -> get["Sodium, Na"], "potassium" -> get["Potassium, K"],
      "calcium" -> get["Calcium, Ca"], "iron" -> get["Iron, Fe"],
      "magnesium" -> get["Magnesium, Mg"], "zinc" -> get["Zinc, Zn"],
      "phosphorus" -> get["Phosphorus, P"], "copper" -> get["Copper, Cu"],
      "manganese" -> get["Manganese, Mn"], "selenium" -> get["Selenium, Se"],
      "caffeine" -> get["Caffeine"],
      "vitaminC" -> get["Vitamin C" ~~ ___], "vitaminE" -> get["Vitamin E (alpha-tocopherol)"],
      "niacin" -> get["Niacin"], "thiamin" -> get["Thiamin"],
      "riboflavin" -> get["Riboflavin"], "vitaminB6" -> get["Vitamin B-6"],
      "pantothenicAcid" -> get["Pantothenic acid"], "folate" -> get["Folate, total"],
      "vitaminA" -> get["Vitamin A, RAE"], "vitaminD" -> get["Vitamin D (D2 + D3)" ~~ ___],
      "vitaminB12" -> get["Vitamin B-12"], "vitaminK" -> get["Vitamin K (phylloquinone)"],
      "iodine" -> get["Iodine, I"], "biotin" -> get["Biotin"]
     |>, _Missing]
   |>
];

(* convenience: search, then map the top hit *)
fdcToFoodNomsByName[query_String] := Module[{hits = fdcSearch[query, 1]},
  If[hits === {}, Missing["NotFound"], fdcToFoodNoms[hits[[1, 1]]]]];

(* dataType -> .foodnoms secondarySource (see docs/FOODNOMS_FORMAT.md §7) *)
fdcSecondarySource[dataType_] := Switch[dataType,
  "Foundation", "foundation_food",
  "SR Legacy", "sr_legacy_food",
  "Survey (FNDDS)", "survey_fndds_food",
  _, Missing[]];


(* ===================== B. FoodNoms recipe builder ========================= *)

(* fresh uppercase local: id *)
mkLocalID[] := "local:" <> ToUpperCase[CreateUUID[]];

(* a .foodnoms byte stream as an UNCOMPRESSED LZFSE block:
   'bvx-' + uint32 little-endian raw length + raw UTF-8 JSON + 'bvx$' *)
foodnomsBytes[a_] := Module[{j = ExportByteArray[a, "RawJSON"]},
  ByteArray @ Join[
    ToCharacterCode["bvx-"],
    Reverse @ IntegerDigits[Length[j], 256, 4],   (* uint32 LE *)
    Normal[j],
    ToCharacterCode["bvx$"]]];

(* the 16 nutrient slots summed for the whole-recipe totals (RECIPE_FORMAT.md) *)
$totalsSlots = {"calories", "protein", "carbs", "sugars", "fat", "fatSaturated",
   "fiber", "sodium", "iron", "calcium", "zinc", "magnesium", "potassium",
   "vitaminD", "vitaminB12", "folate"};

(* standard per-100 g USDA ingredient entry *)
usdaFoodEntry[block_, qty_, unit_, sortIdx_] := DeleteMissing @ <|
   "name" -> block["name"],
   "foodID" -> "foodnoms:usda:" <> ToString[block["fdcId"]],
   "source" -> "usda",
   "secondarySource" -> fdcSecondarySource[block["dataType"]],
   "version" -> 1, "baseAmount" -> 100, "baseUnit" -> unit,
   "traits" -> 0, "uncertainty" -> 0,
   "quantity" -> qty,
   "measure" -> <|"unit" -> unit, "value" -> 1, "traits" -> 0|>,
   "nutrients" -> block["nutrients"],
   "collectionSortIndex" -> sortIdx|>;

(* pass-through entry for non-USDA (local:/ciqual:) foods: nutrients given verbatim *)
passthroughFoodEntry[ing_, sortIdx_] := Module[
  {unit = Lookup[ing, "unit", Lookup[ing, "baseUnit", "gram"]]},
  DeleteMissing @ <|
   "name" -> Lookup[ing, "name", "Ingredient"],
   "foodID" -> ing["foodID"],
   "source" -> Lookup[ing, "source", Missing[]],
   "secondarySource" -> Lookup[ing, "secondarySource", Missing[]],
   "version" -> 1,
   "baseAmount" -> Lookup[ing, "baseAmount", 100],
   "baseUnit" -> unit,
   "traits" -> 0, "uncertainty" -> 0,
   "quantity" -> ing["quantity"],
   "measure" -> <|"unit" -> unit, "value" -> 1, "traits" -> 0|>,
   "nutrients" -> ing["nutrients"],
   "collectionSortIndex" -> sortIdx|>];

(* the formal 3-tier weightless patch (FOODNOMS_FORMAT.md §11):
   returns the consuming-recipe per-gram entry + the two reusable provenance
   objects (patch food, patched food) + the keys the patch newly created. *)
patchTrio[block_, delta_Association, qty_, note_String, patchID0_, patchedID0_, sortIdx_] :=
 Module[{patchID, patchedID, fdcId, per100, perGram, missing, base, patchFood,
    patchedFood, recipeEntry, url, oname, secSrc},
  patchID = If[StringQ[patchID0], patchID0, mkLocalID[]];
  patchedID = If[StringQ[patchedID0], patchedID0, mkLocalID[]];
  fdcId = block["fdcId"];
  oname = block["name"];
  per100 = block["nutrients"];
  secSrc = fdcSecondarySource[block["dataType"]];
  url = "https://fdc.nal.usda.gov/food-details/" <> ToString[fdcId] <> "/nutrients";
  missing = Select[Keys[delta], ! KeyExistsQ[per100, #] &];
  (* per-gram nutrients for the consuming recipe entry: (per100 + delta)/100 *)
  perGram = (#/100.) & /@ Merge[{per100, delta}, Total];

  patchFood = <|"version" -> 2, "contentType" -> 3,
    "foods" -> {<|
       "name" -> oname <> " Patch", "foodID" -> patchID, "version" -> 1,
       "baseAmount" -> 1, "baseUnit" -> "serving", "traits" -> 0,
       "isHidden" -> False, "brandOwner" -> "Created by Claude",
       "nutrients" -> delta,
       "measures" -> {<|"value" -> 1, "unit" -> "serving", "traits" -> 1|>}|>}|>;

  patchedFood = <|"version" -> 2, "contentType" -> 2,
    "foodCollections" -> {<|
       "name" -> "\|01FA79 " <> oname <> " #Patched", "collectionType" -> 3,
       "version" -> 1, "traits" -> 0, "totalServingSize" -> 100,
       "servingSizeUnit" -> "gram", "servings" -> 1,
       "urlString" -> url, "notes" -> note|>},
    "foodEntries" -> {
       DeleteMissing @ <|
        "name" -> oname, "foodID" -> "foodnoms:usda:" <> ToString[fdcId],
        "version" -> 1, "baseAmount" -> 100, "baseUnit" -> "gram",
        "traits" -> 0, "uncertainty" -> 0, "quantity" -> 100,
        "measure" -> <|"unit" -> "gram", "value" -> 1, "traits" -> 0|>,
        "nutrients" -> per100, "source" -> "usda", "secondarySource" -> secSrc|>,
       <|"name" -> oname <> " Patch", "foodID" -> patchID, "version" -> 1,
        "baseAmount" -> 1, "baseUnit" -> "serving", "traits" -> 0,
        "uncertainty" -> 0, "quantity" -> 1, "brandOwner" -> "Created by Claude",
        "nutrients" -> delta,
        "measure" -> <|"unit" -> "serving", "value" -> 1, "traits" -> 1|>,
        "measures" -> {<|"value" -> 1, "unit" -> "serving", "traits" -> 1|>}|>}|>;

  recipeEntry = <|
    "name" -> "\|01FA79 " <> oname <> " #Patched", "foodID" -> patchedID,
    "version" -> 1, "baseAmount" -> 1, "baseUnit" -> "gram",
    "traits" -> 0, "uncertainty" -> 0, "quantity" -> qty,
    "measure" -> <|"unit" -> "gram", "value" -> 1, "traits" -> 0|>,
    "measures" -> {<|"descriptionText" -> "serving", "descriptionQuantity" -> 1,
        "unit" -> "gram", "value" -> 100, "traits" -> 0|>},
    "nutrients" -> perGram, "collectionSortIndex" -> sortIdx|>;

  <|"entry" -> recipeEntry, "patchFood" -> patchFood, "patchedFood" -> patchedFood,
    "missing" -> missing, "patchedName" -> "\|01FA79 " <> oname <> " #Patched"|>];

(* sum nutrients[k]*quantity/baseAmount over the final entries, for one slot *)
slotTotal[entries_, slot_] :=
  Total[(Lookup[#["nutrients"], slot, 0] * #["quantity"] / #["baseAmount"]) & /@ entries];

(* spec (Association) -> <|"files"->{..}, "totals"->.., "warnings"->..|> *)
buildFoodNomsRecipe[spec_Association] := Module[
  {name, servings, ings, warnings = {}, entries = {}, aux = {}, totalSize,
   totals, recipeJson, files, auxFiles, i = 0},
  name = Lookup[spec, "name", "Untitled Recipe"];
  servings = Lookup[spec, "servings", 1];
  ings = Lookup[spec, "ingredients", {}];

  Do[
    Module[{ing = rawIng, fdcId, block, patch, qty, unit, note, trio},
     qty = Lookup[ing, "quantity", 0];
     unit = Lookup[ing, "unit", "gram"];
     patch = Lookup[ing, "patch", <||>];
     Which[
      (* pass-through: explicit foodID + nutrients given verbatim *)
      KeyExistsQ[ing, "nutrients"] && KeyExistsQ[ing, "foodID"],
        AppendTo[entries, passthroughFoodEntry[ing, i]],
      (* USDA-resolved by a known fdcId (with or without a patch).
         NB: no fuzzy name search here — resolution is a separate concern
         (the ResolveFDC endpoint). An ingredient must arrive already resolved. *)
      KeyExistsQ[ing, "fdcId"],
        fdcId = ing["fdcId"];
        block = fdcToFoodNoms[fdcId];
        If[fdcSecondarySource[block["dataType"]] === Missing[],
         AppendTo[warnings,
          block["name"] <> ": unmapped USDA dataType '" <> ToString @ block["dataType"] <> "'"]];
        If[AssociationQ[patch] && Length[patch] > 0,
         note = Lookup[ing, "patchNote",
           "USDA record " <> ToString[fdcId] <> " patched: " <>
            StringRiffle[KeyValueMap[#1 <> " +" <> ToString[#2] &, patch], ", "] <> "."];
         trio = patchTrio[block, patch, qty, note,
           Lookup[ing, "patchFoodID", Missing[]], Lookup[ing, "patchedFoodID", Missing[]], i];
         AppendTo[entries, trio["entry"]];
         AppendTo[aux, trio["patchFood"]];
         AppendTo[aux, trio["patchedFood"]];
         If[trio["missing"] =!= {},
          AppendTo[warnings,
           block["name"] <> ": patch created previously-missing key(s) " <>
            ToString[trio["missing"]]]],
         (* else: plain USDA entry *)
         AppendTo[entries, usdaFoodEntry[block, qty, unit, i]]],
      (* unresolved: neither a known fdcId nor a pass-through food — skip, don't guess *)
      True,
        AppendTo[warnings,
         "Ingredient " <> ToString @ Lookup[ing, "name", Lookup[ing, "query", "#" <> ToString[i]]] <>
          " is unresolved (needs `fdcId`, or `foodID`+`nutrients`); skipped. Use ResolveFDC first."]
      ]];
    i++,
    {rawIng, ings}];

  totalSize = Lookup[spec, "totalServingSize",
    Total[Lookup[#, "quantity", 0] & /@ entries]];

  totals = Association @ Table[s -> N[slotTotal[entries, s], 6], {s, $totalsSlots}];
  totals["salt"] = N[totals["sodium"] * 2.5 / 1000, 6];

  recipeJson = <|"version" -> 2, "contentType" -> 2,
    "foodCollections" -> {<|
       "name" -> name, "collectionType" -> 3, "version" -> 1, "traits" -> 0,
       "totalServingSize" -> totalSize, "servingSizeUnit" -> "gram",
       "servings" -> servings|>},
    "foodEntries" -> entries|>;

  (* dedupe reusable provenance objects by their food/collection name *)
  auxFiles = DeleteDuplicatesBy[
    Map[Function[j,
      <|"name" -> (If[KeyExistsQ[j, "foods"], j["foods"][[1]]["name"],
           j["foodCollections"][[1]]["name"]]) <> ".foodnoms",
        "json" -> j, "b64" -> BaseEncode[foodnomsBytes[j]]|>], aux],
    #["name"] &];

  files = Prepend[auxFiles,
    <|"name" -> name <> ".foodnoms", "json" -> recipeJson,
      "b64" -> BaseEncode[foodnomsBytes[recipeJson]]|>];

  <|"files" -> files, "totals" -> totals, "warnings" -> warnings|>];


(* ============ B2. Resolution: ingredient name -> USDA candidates =========
   A SEPARATE concern from building. fdcSearch is fuzzy and ranked — its output
   exists to be judged (by Claude), not silently top-picked. So it is exposed as
   its own endpoint; buildFoodNomsRecipe only ever takes already-resolved ids.
   Rank order is the USDA API's relevance (Foundation/SR Legacy/FNDDS/Branded
   noted via dataType, for the caller to weigh). *)
resolveFDC[spec_Association] := Module[{qs, n},
  qs = Lookup[spec, "queries",
     If[KeyExistsQ[spec, "query"], {spec["query"]}, {}]];
  n = Lookup[spec, "n", 5];
  <|"results" -> Function[q,
     <|"query" -> q,
       "candidates" -> (<|"fdcId" -> #[[1]], "description" -> #[[2]],
            "dataType" -> #[[3]]|> & /@ fdcSearch[q, n])|>] /@ qs|>];


(* ======================= C. APIFunction (JSON in) ======================== *)

(* The caller sends `spec` as a JSON object; the builtin "RawJSON" interpreter
   parses it into nested Associations -- exactly what buildFoodNomsRecipe wants.
   Send standard JSON with any non-ASCII escaped as \\uXXXX (the default for most
   JSON encoders, e.g. Python json.dumps): the interpreter accepts ASCII bytes and
   decodes the escapes back to the real characters. The patched-food name glyph is
   generated server-side, so the caller rarely needs non-ASCII beyond the recipe
   name's stamp. NB: plain "JSON" yields rule-lists (wrong shape) -- use "RawJSON". *)
foodnomsAPI = APIFunction[{"spec" -> "RawJSON"},
   buildFoodNomsRecipe[#spec] &, "JSON"];

(* the resolution endpoint (search only — returns candidates to judge) *)
resolveAPI = APIFunction[{"spec" -> "RawJSON"},
   resolveFDC[#spec] &, "JSON"];


(* ===================== D. Deploy (run once, as pirk0) ===================== *)

(* Evaluate in an authenticated Wolfram Cloud session (CloudConnect[]). Two
   endpoints, two concerns — deploy both:

   CloudDeploy[resolveAPI,  CloudObject["ResolveFDC"],            Permissions -> "Public"]
   CloudDeploy[foodnomsAPI, CloudObject["BuildFoodNomsRecipe"],   Permissions -> "Public"]

   1) ResolveFDC — name(s) -> ranked USDA candidates (you pick the fdcId):

     curl -s https://www.wolframcloud.com/obj/pirk0/ResolveFDC \
       --data-urlencode 'spec={"queries":["butternut squash raw","dry soybeans"],"n":5}'
     -> {"results":[{"query":"...","candidates":[{"fdcId":...,"description":"...","dataType":"..."},...]},...]}

   2) BuildFoodNomsRecipe — already-resolved ingredients -> .foodnoms + totals:

     curl -s https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe \
       --data-urlencode 'spec={"name":"My Soup","servings":5,
         "ingredients":[{"fdcId":2685570,"quantity":1918,
         "patch":{"sugars":2.2}}]}'
     -> {"files":[{name,json,b64}...], "totals":{...}, "warnings":[...]}

   Write each returned file from its Base64 bytes:
     BinaryWrite[f["name"], BaseDecode[f["b64"]]]   (* per files[] item *)
*)

