(* ::Package:: *)

(* foodnoms-cloud.wl — deploy-ready Wolfram Cloud Object that turns a recipe
   spec (a list of USDA ingredients + optional patches) into the raw bytes of a
   ready-to-import .foodnoms file (downloaded directly, no JSON envelope).

   WHY THIS EXISTS
   Generating a .foodnoms recipe used to be a manual, per-session playbook
   (docs/RECIPE_NUTRITION_GENERATOR.md): paste fdc-lookup.wl, resolve each
   ingredient to a USDA fdcId, fetch per-100 g blocks, hand-assemble JSON, fold
   in patches, sum totals. This deploys that as Wolfram Cloud APIFunctions
   (same pattern as the pirk0/RenderTimeline endpoint), split into two concerns:
   ResolveFDC (name -> ranked USDA candidates, to be judged) and
   BuildFoodNomsRecipe (resolved ids -> one .foodnoms file; totals are read back
   from the file, warnings + companion-file menu ride in its notes field).

   THE .foodnoms BYTES ARE PRODUCED HERE, IN WOLFRAM — NO PYTHON.
   LZFSE *compression* is not available in Wolfram, but the LZFSE container
   permits an UNCOMPRESSED block: 'bvx-' + uint32-LE raw-length + raw JSON +
   'bvx$'. Apple's compression framework / liblzfse decode that fine. We
   assemble those bytes directly (foodnomsBytes) and return them as the HTTP
   response body, so `curl -o recipe.foodnoms` lands the file with no decoding.
   foodnomsDecode is the inverse, for reading totals back out of a built file.

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

(* Deterministic local: id, derived from a seed string (a food name + role).
   Stable across calls so a separately-emitted provenance file (see `emit`
   below) carries the SAME foodID the recipe references — they link in FoodNoms
   without a shared random UUID. Format: SHA-256 -> first 32 hex as 8-4-4-4-12. *)
mkLocalID[seed_String] := Module[
  {h = ToUpperCase @ StringTake[Hash[seed, "SHA256", "HexString"], 32]},
  "local:" <> StringInsert[h, "-", {9, 13, 17, 21}]];

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
  fdcId = block["fdcId"];
  oname = block["name"];
  patchID = If[StringQ[patchID0], patchID0, mkLocalID[oname <> "#patch"]];
  patchedID = If[StringQ[patchedID0], patchedID0, mkLocalID[oname <> "#patched"]];
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

(* --- read totals back from a generated .foodnoms (the endpoint no longer
   returns them; the file is self-describing). Inverse of foodnomsBytes: the
   block is 'bvx-' + 4-byte length + raw JSON + 'bvx$', so drop 8 leading and 4
   trailing bytes and parse. *)
foodnomsDecode[bytes_ByteArray] := ImportByteArray[Take[bytes, {9, -5}], "RawJSON"];

(* decoded-or-bytes .foodnoms -> the 16 whole-recipe slot totals + salt *)
foodnomsTotals[in_] := Module[{r = If[Head[in] === ByteArray, foodnomsDecode[in], in], e, t},
  e = Lookup[r, "foodEntries", {}];
  t = Association @ Table[s -> N[slotTotal[e, s], 6], {s, $totalsSlots}];
  t["salt"] = N[t["sodium"] * 2.5 / 1000, 6]; t];

(* spec (Association) -> <|"name"->..., "bytes"->ByteArray, "json"->...|>
   for the ONE file selected by `emit` (default the recipe). *)
buildFoodNomsRecipe[spec_Association] := Module[
  {name, servings, ings, warnings = {}, entries = {}, aux = {}, totalSize,
   recipeJson, recipeCollection, auxRecs, emit, selected, notes,
   selectedName, selectedJson, i = 0},
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

  (* Every call yields exactly ONE raw .foodnoms file (the response body IS the
     file bytes). The recipe and each reusable provenance object (patch food /
     patched food, FOODNOMS_FORMAT.md §11) are separate files; `emit` picks which
     to render. There is no JSON envelope, so anything the caller would have read
     from one is carried IN the file instead:
       - totals     -> derivable from the file's foodEntries (foodnomsTotals);
       - warnings + the companion-file menu -> the recipe collection's `notes`.
     Provenance foodIDs are deterministic (mkLocalID), so a companion file
     emitted in a later call still links to the recipe that references it. *)
  auxRecs = DeleteDuplicatesBy[
    Map[Function[j,
      If[KeyExistsQ[j, "foods"],
        <|"name" -> j["foods"][[1]]["name"], "kind" -> "patchFood", "json" -> j|>,
        <|"name" -> j["foodCollections"][[1]]["name"], "kind" -> "patchedFood", "json" -> j|>]],
      aux],
    #["name"] &];

  emit = Lookup[spec, "emit", "recipe"];
  selected = If[emit === "recipe", "recipe",
    SelectFirst[auxRecs, #["name"] === emit &, $Failed]];
  If[selected === $Failed,
   AppendTo[warnings,
    "emit target " <> ToString[emit] <> " not found; emitted the recipe instead. " <>
     "Available: " <> ToString[Prepend[#["name"] & /@ auxRecs, "recipe"]]];
   selected = "recipe"];

  (* warnings + companion-file menu -> recipe collection notes *)
  notes = StringRiffle[DeleteCases[{
     If[warnings =!= {}, "\:26a0 " <> StringRiffle[warnings, " | "], Nothing],
     If[auxRecs =!= {},
      "Companion .foodnoms files (re-request with emit=<name>, identical ingredients): " <>
       StringRiffle[("\"" <> #["name"] <> "\"") & /@ auxRecs, ", "], Nothing]},
    Nothing], "\n"];
  recipeCollection = <|
     "name" -> name, "collectionType" -> 3, "version" -> 1, "traits" -> 0,
     "totalServingSize" -> totalSize, "servingSizeUnit" -> "gram",
     "servings" -> servings|>;
  If[notes =!= "", AppendTo[recipeCollection, "notes" -> notes]];
  recipeJson = <|"version" -> 2, "contentType" -> 2,
    "foodCollections" -> {recipeCollection}, "foodEntries" -> entries|>;

  {selectedName, selectedJson} = If[selected === "recipe",
    {name, recipeJson}, {selected["name"], selected["json"]}];

  <|"name" -> selectedName <> ".foodnoms", "bytes" -> foodnomsBytes[selectedJson],
    "json" -> selectedJson|>];


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
       "candidates" -> Function[hit,
          With[{block = fdcToFoodNoms[hit[[1]]]},
           <|"fdcId" -> hit[[1]], "description" -> hit[[2]], "dataType" -> hit[[3]],
             "baseAmount" -> 100, "baseUnit" -> "gram",
             "nutrients" -> block["nutrients"]|>]] /@ fdcSearch[q, n]|>] /@ qs|>];


(* ======================= C. APIFunction (JSON in) ======================== *)

(* The caller sends `spec` as a JSON object; the builtin "RawJSON" interpreter
   parses it into nested Associations -- exactly what buildFoodNomsRecipe wants.
   Send standard JSON with any non-ASCII escaped as \\uXXXX (the default for most
   JSON encoders, e.g. Python json.dumps): the interpreter accepts ASCII bytes and
   decodes the escapes back to the real characters. The patched-food name glyph is
   generated server-side, so the caller rarely needs non-ASCII beyond the recipe
   name's stamp. NB: plain "JSON" yields rule-lists (wrong shape) -- use "RawJSON".

   The response body IS the raw .foodnoms bytes (application/octet-stream) -- no
   JSON envelope -- so `curl -o recipe.foodnoms ...` writes the file directly. The
   filename is offered via Content-Disposition (RFC 5987, so the emoji/✴️ survive). *)
foodnomsAPI = APIFunction[{"spec" -> "RawJSON"},
   With[{r = buildFoodNomsRecipe[#spec]},
     HTTPResponse[r["bytes"], <|"StatusCode" -> 200, "Headers" -> {
        "Content-Type" -> "application/octet-stream",
        "Content-Disposition" ->
          "attachment; filename*=UTF-8''" <> URLEncode[r["name"]]}|>]] &];

(* the resolution endpoint (search only — returns candidates to judge) *)
resolveAPI = APIFunction[{"spec" -> "RawJSON"},
   resolveFDC[#spec] &, "JSON"];


(* ===================== D. Deploy (run once, as pirk0) ===================== *)

(* Evaluate the two CloudDeploy lines below in an authenticated Wolfram Cloud
   session (CloudConnect[]). Two endpoints, two concerns. They are real
   statements, not commented-out — running this file in an authenticated session
   (re)deploys both. *)

CloudDeploy[resolveAPI,  CloudObject["ResolveFDC"],          Permissions -> "Public"]
CloudDeploy[foodnomsAPI, CloudObject["BuildFoodNomsRecipe"], Permissions -> "Public"]

(* 1) ResolveFDC — name(s) -> ranked USDA candidates, each WITH its per-100 g
      nutrients (so you can pick the best entry on the numbers, not just the name):

     curl -s https://www.wolframcloud.com/obj/pirk0/ResolveFDC \
       --data-urlencode 'spec={"queries":["butternut squash raw","dry soybeans"],"n":5}'
     -> {"results":[{"query":"...","candidates":[
          {"fdcId":...,"description":"...","dataType":"...",
           "baseAmount":100,"baseUnit":"gram","nutrients":{...}},...]},...]}

   2) BuildFoodNomsRecipe — already-resolved ingredients -> ONE raw .foodnoms
      file. The response body IS the file, so pipe it straight to disk with -o.
      One call, one file; keep `ingredients` identical and vary only `emit`
      ("recipe" default, or a companion-food name listed in the recipe's notes):

     # recipe (default) -> writes Soup.foodnoms directly
     curl -s https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe -o Soup.foodnoms \
       --data-urlencode 'spec={"name":"My Soup","emit":"recipe",
         "ingredients":[{"fdcId":169295,"quantity":500,"patch":{"sodium":200}}]}'

     # a companion provenance file (name copied from the recipe's notes field)
     curl -s https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe -o Patch.foodnoms \
       --data-urlencode 'spec={"name":"My Soup",
         "emit":"Squash, winter, butternut, raw Patch",
         "ingredients":[{"fdcId":169295,"quantity":500,"patch":{"sodium":200}}]}'

   No JSON envelope: warnings + the companion-file menu live in the recipe
   collection's `notes`; whole-recipe totals are not returned — read them back
   from the file with foodnomsTotals[ByteArray[BinaryReadList["Soup.foodnoms"]]]
   (or foodnomsDecode to inspect the JSON). An unknown emit warns (in notes) and
   falls back to the recipe; a patch-free recipe yields only the recipe file. *)

