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
   'bvx$'. FoodNoms's own exports are compressed ('bvxn' LZVN / 'bvx2' LZFSE-v2),
   but all three decode through Apple's one LZFSE reader, and the uncompressed
   'bvx-' variant is VERIFIED to import into FoodNoms (Holger, 2026-06-12). So a
   bvx- file is plain JSON in a thin wrapper — that's by design, not a bug. We
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

(* ---------------------------------------------------------------------------
   RESILIENT FETCH  (added 2026-08-24, after a whole-afternoon outage)

   The free FDC key is rate-limited to ~1000 requests/day per IP, and EVERY
   ingredient of a recipe costs one call. When the API rate-limits (HTTP 429),
   errors, or times out, URLExecute[..., "RawJSON"] returns $Failed -- not an
   association.

   The old code fed that straight into Lookup and the get[] accessors. Those
   carry List/Association patterns, so they did not fail -- they simply STAYED
   UNEVALUATED and rode all the way into the response as symbolic junk:

       "calories" -> fdcEnergyKcal[Lookup[data$79191, "foodNutrients", {}]]
       "fdcId"    -> {}["fdcId"]

   ExportByteArray[..., "RawJSON"] cannot encode that, so the caller saw an
   opaque  400 {"Success":false,"Failure":"Failed to encode HTTPResponse"}
   with no hint that USDA was the problem.

   Because a per-ingredient failure probability p compounds, an n-ingredient
   recipe succeeded only (1-p)^n of the time. That presents as "large recipes
   are broken" while single-ingredient calls mostly work -- but it is NOT a
   size limit, and retrying the whole request is the worst possible response
   (it multiplies the FDC traffic that caused the rate-limit in the first
   place, and bills Wolfram Cloud time for each attempt).

   Three fixes: retry a transient failure in place, MEMOISE successful lookups
   so a repeated fdcId is free (the dominant traffic saving -- one soup can
   otherwise re-fetch the same carrot record dozens of times), and fail LOUDLY
   with a Failure that names the fdcId and says what to do about it.
--------------------------------------------------------------------------- *)

$FDCMaxTries = 3;
$FDCCache = <||>;   (* fdcId -> raw record; successes only *)

(* one FDC GET, retried; returns the decoded association or $Failed *)
fdcFetch[spec_] := Module[{r},
  Do[
   r = Quiet @ Check[URLExecute[spec, "RawJSON"], $Failed];
   (* a rate-limit or error body still decodes to an association, but carries
      an "error" key -- treat that as failure rather than as data *)
   If[AssociationQ[r] && ! KeyExistsQ[r, "error"], Return[r, Module]],
   {$FDCMaxTries}];
  $Failed];

fdcUnavailable[what_] := Failure["fdcUnavailable", <|
   "MessageTemplate" -> "USDA FoodData Central lookup failed for `w`. The free \
API key is rate-limited to ~1000 requests/day per IP and each ingredient costs \
one request, so a burst of large recipes exhausts it. Wait for the daily reset \
or set $FDCApiKey to another key. Do NOT retry in a loop.",
   "MessageParameters" -> <|"w" -> what|>, "what" -> what|>];

(* name -> ranked candidate records, or a Failure *)
fdcSearch[query_String, n_Integer : 5] := Module[{data},
  data = fdcFetch[<|
     "Scheme" -> "https", "Domain" -> "api.nal.usda.gov",
     "Path" -> "/fdc/v1/foods/search",
     "Query" -> {"api_key" -> $FDCApiKey, "query" -> query,
        "pageSize" -> ToString[n]}|>];
  If[! AssociationQ[data],
   Return[fdcUnavailable["search \"" <> query <> "\""], Module]];
  {#["fdcId"], #["description"], #["dataType"]} & /@ Lookup[data, "foods", {}]
];

(* raw FDC record (full format). Memoised on SUCCESS ONLY, so a transient
   failure is retried on the next call rather than cached forever. *)
fdcFood[fdcId_] := Module[{r},
  If[KeyExistsQ[$FDCCache, fdcId], Return[$FDCCache[fdcId], Module]];
  r = fdcFetch["https://api.nal.usda.gov/fdc/v1/food/" <> ToString[fdcId] <>
     "?api_key=" <> $FDCApiKey <> "&format=full"];
  If[AssociationQ[r] && KeyExistsQ[r, "foodNutrients"],
   $FDCCache[fdcId] = r,
   $Failed]];

(* drop memoised records (e.g. to pick up a corrected USDA row) *)
fdcClearCache[] := ($FDCCache = <||>;);

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
fdcToFoodNoms[fdcId_] := Module[{data, fn, get, vitD},
  data = fdcFood[fdcId];
  (* HARD STOP on a failed lookup. Without this the unevaluated accessors below
     travel into the caller's response and surface as an unencodable 400. *)
  If[! (AssociationQ[data] && KeyExistsQ[data, "foodNutrients"]),
   Return[fdcUnavailable["fdcId " <> ToString[fdcId]], Module]];
  fn = Lookup[data, "foodNutrients", {}];
  (* match by exact nutrient name; unit defaults to "any" *)
  get[pat_, unit_ : _] := fdcRowAmt @ SelectFirst[fn,
    StringMatchQ[fdcRowName[#], pat] && MatchQ[fdcRowUnit[#], unit] &, <||>];
  (* Vitamin D in micrograms. The old "Vitamin D (D2 + D3)" ~~ ___ pattern ALSO
     matched "Vitamin D (D2 + D3), International Units" (IU), and SelectFirst
     grabbed whichever row came first -- usually the IU one -- so IU was emitted
     as ug: 40x too high (egg 82 IU -> "82 ug"; shiitake 154 IU -> "154 ug").
     Take the ug row by EXACT name (the IU row's name has a longer suffix, so it
     is excluded); fall back to IU/40 (1 ug == 40 IU, exact) only when the ug row
     is absent, so IU-only foods still resolve to correct micrograms. *)
  vitD = With[{ug = get["Vitamin D (D2 + D3)"]},
    If[NumberQ[ug], ug,
     With[{iu = get["Vitamin D (D2 + D3), International Units"]},
      If[NumberQ[iu], iu/40., Missing[]]]]];
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
      "vitaminA" -> get["Vitamin A, RAE"], "vitaminD" -> vitD,
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

(* download filename only -- the in-file collection name (the "description")
   keeps the full stamp. Drop the [DD-MM-YY] suffix, emoji (✴️ stamp, 🩹 glyph,
   variation selectors) and '#', and spell '&' as 'and'. *)
cleanFilename[s_String] := Module[{x = s},
  x = StringDelete[x, RegularExpression["\\s*\\[\\d{2}-\\d{2}-\\d{2}\\]"]];
  x = StringDelete[x, RegularExpression[
     "[\\x{2600}-\\x{27BF}\\x{2B00}-\\x{2BFF}\\x{FE00}-\\x{FE0F}\\x{1F000}-\\x{1FAFF}]"]];
  x = StringDelete[x, "#"];
  x = StringReplace[x, "&" -> "and"];
  StringTrim @ StringReplace[x, RegularExpression["\\s{2,}"] -> " "]];

(* the 16 nutrient slots summed for the whole-recipe totals (RECIPE_FORMAT.md) *)
$totalsSlots = {"calories", "protein", "carbs", "sugars", "fat", "fatSaturated",
   "fiber", "sodium", "iron", "calcium", "zinc", "magnesium", "potassium",
   "vitaminD", "vitaminB12", "folate"};

(* standard per-100 g USDA ingredient entry. `unc` is this entry's uncertainty
   (integer percent); 0 -> omit the field entirely (the FoodNoms "no estimate"
   tier), per the meal-logging uncertainty policy. *)
usdaFoodEntry[block_, qty_, unit_, sortIdx_, unc_ : 0] := DeleteMissing @ <|
   "name" -> block["name"],
   "foodID" -> "foodnoms:usda:" <> ToString[block["fdcId"]],
   "source" -> "usda",
   "secondarySource" -> fdcSecondarySource[block["dataType"]],
   "version" -> 1, "baseAmount" -> 100, "baseUnit" -> unit,
   "traits" -> 0, "uncertainty" -> If[TrueQ[unc > 0], Round[unc], Missing[]],
   "quantity" -> qty,
   "measure" -> <|"unit" -> unit, "value" -> 1, "traits" -> 0|>,
   "nutrients" -> block["nutrients"],
   "collectionSortIndex" -> sortIdx|>;

(* pass-through entry for non-USDA (local:/ciqual:) foods: nutrients given verbatim.
   `nutrients` are ALWAYS per 100 baseUnit; baseAmount 100, a bare 1-gram measure,
   the given quantity (the recipe-ingredient shape). The standalone-food shaping
   (100-unit serving) is applied later in the emit=food / emit=fooddef branches. *)
passthroughFoodEntry[ing_, sortIdx_, unc_ : 0] := Module[
  {unit = Lookup[ing, "unit", Lookup[ing, "baseUnit", "gram"]]},
  DeleteMissing @ <|
   "name" -> Lookup[ing, "name", "Ingredient"],
   "foodID" -> ing["foodID"],
   "source" -> Lookup[ing, "source", Missing[]],
   "secondarySource" -> Lookup[ing, "secondarySource", Missing[]],
   "version" -> 1,
   "baseAmount" -> Lookup[ing, "baseAmount", 100],
   "baseUnit" -> unit,
   "traits" -> 0, "uncertainty" -> If[TrueQ[unc > 0], Round[unc], Missing[]],
   "quantity" -> ing["quantity"],
   "measure" -> <|"unit" -> unit, "value" -> 1, "traits" -> 0|>,
   "nutrients" -> ing["nutrients"],
   "brandOwner" -> Lookup[ing, "brandOwner", Missing[]],
   "barcode" -> Lookup[ing, "barcode", Missing[]],
   "urlString" -> Lookup[ing, "urlString", Missing[]],
   "notes" -> Lookup[ing, "notes", Missing[]],
   "collectionSortIndex" -> sortIdx|>];

(* the default serving for a standalone food: a 100-baseUnit metric weight
   (value 100, traits 1) with NO descriptionQuantity -- i.e. the serving-size
   label is left empty, just the 100 g/ml weight. FoodNoms forces "amounts
   represent = serving size" on import, so pinning the weight to 100 keeps the
   numbers reading as per-100. Used by the emit=food / emit=fooddef branches. *)
serving100[unit_] := <|"unit" -> unit, "value" -> 100, "traits" -> 1|>;

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
  {name, servings, ctype, ings, warnings = {}, entries = {}, aux = {}, totalSize,
   recipeJson, recipeCollection, auxRecs, emit, selected, notes,
   selectedName, selectedJson, defaultUnc, fe, fjson, fdef, i = 0},
  name = Lookup[spec, "name", "Untitled Recipe"];
  servings = Lookup[spec, "servings", 1];
  (* collectionType: 3 = recipe (default; carries the yield fields), 2 = meal
     (a list of foods eaten, no yield). See FOODNOMS_FORMAT.md 5 vs 6. *)
  ctype = Lookup[spec, "collectionType", 3];
  ings = Lookup[spec, "ingredients", {}];
  (* FoodNoms 'uncertainty' is an INTEGER percent 0-100 (verified from a FoodNoms
     export: 30% serialises as 30, NOT 0.3). The meal-wide `uncertainty` is the
     DEFAULT; each ingredient may carry its own (per-entry tiers 0/10/30, set via
     the fdcUncertainties / customUncertainties columns). 0 -> field omitted. *)
  defaultUnc = Round @ Lookup[spec, "uncertainty", 0];

  Do[
    Module[{ing = rawIng, fdcId, block, patch, qty, unit, note, trio, thisUnc},
     qty = Lookup[ing, "quantity", 0];
     unit = Lookup[ing, "unit", "gram"];
     patch = Lookup[ing, "patch", <||>];
     thisUnc = Lookup[ing, "uncertainty", defaultUnc];
     Which[
      (* pass-through: explicit foodID + nutrients given verbatim *)
      KeyExistsQ[ing, "nutrients"] && KeyExistsQ[ing, "foodID"],
        AppendTo[entries, passthroughFoodEntry[ing, i, thisUnc]],
      (* USDA-resolved by a known fdcId (with or without a patch).
         NB: no fuzzy name search here — resolution is a separate concern
         (the ResolveFDC endpoint). An ingredient must arrive already resolved. *)
      KeyExistsQ[ing, "fdcId"],
        fdcId = ing["fdcId"];
        block = fdcToFoodNoms[fdcId];
        (* USDA lookup failed (rate limit / outage / dead id): abort the whole
           build and report WHICH ingredient. Building on regardless is what
           used to emit an unencodable response and an opaque 400. *)
        If[FailureQ[block], Throw[block, "fdcFail"]];
        If[fdcSecondarySource[block["dataType"]] === Missing[],
         AppendTo[warnings,
          block["name"] <> ": unmapped USDA dataType '" <> ToString @ block["dataType"] <> "'"]];
        If[AssociationQ[patch] && Length[patch] > 0,
         note = Lookup[ing, "patchNote",
           "USDA record " <> ToString[fdcId] <> " patched: " <>
            StringRiffle[KeyValueMap[#1 <> " +" <> ToString[#2] &, patch], ", "] <> "."];
         trio = patchTrio[block, patch, qty, note,
           Lookup[ing, "patchFoodID", Missing[]], Lookup[ing, "patchedFoodID", Missing[]], i];
         AppendTo[entries, If[TrueQ[thisUnc > 0],
            Append[trio["entry"], "uncertainty" -> Round[thisUnc]], trio["entry"]]];
         AppendTo[aux, trio["patchFood"]];
         AppendTo[aux, trio["patchedFood"]];
         If[trio["missing"] =!= {},
          AppendTo[warnings,
           block["name"] <> ": patch created previously-missing key(s) " <>
            ToString[trio["missing"]]]],
         (* else: plain USDA entry *)
         AppendTo[entries, usdaFoodEntry[block, qty, unit, i, thisUnc]]],
      (* unresolved: neither a known fdcId nor a pass-through food — skip, don't guess *)
      True,
        AppendTo[warnings,
         "Ingredient " <> ToString @ Lookup[ing, "name", Lookup[ing, "query", "#" <> ToString[i]]] <>
          " is unresolved (needs `fdcId`, or `foodID`+`nutrients`); skipped. Use ResolveFDC first."]
      ]];
    i++,
    {rawIng, ings}];

  (* uncertainty is now applied PER ENTRY in the loop above (each entry's own
     tier, or defaultUnc) -- no blanket post-pass. *)
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
  (* emit=food: a STANDALONE food in ENTRY form (contentType 1, FOODNOMS_FORMAT
     §4a) -- a one-item foodEntries[], NO collection. baseAmount 100 (nutrients
     per 100) and a pinned 100-unit serving (quantity 1), so FoodNoms' forced
     "amounts represent = serving size" reads as per-100. *)
  If[emit === "food",
   fe = If[entries === {}, $Failed, KeyDrop[First[entries], "collectionSortIndex"]];
   If[Length[entries] > 1,
    AppendTo[warnings, "emit=food emits only the first food; " <>
      ToString[Length[entries] - 1] <> " other(s) ignored"]];
   If[fe === $Failed, AppendTo[warnings, "emit=food: no resolved food to emit"]];
   fe = If[fe === $Failed, fe,
     With[{u = Lookup[fe, "baseUnit", "gram"]},
      Join[fe, <|"baseAmount" -> 100, "quantity" -> 1,
        "measure" -> serving100[u], "measures" -> {serving100[u]}|>]]];
   fjson = <|"version" -> 2, "contentType" -> 1,
      "foodEntries" -> If[fe === $Failed, {}, {fe}]|>;
   Return[<|
     "name" -> cleanFilename[If[fe === $Failed, "Food", Lookup[fe, "name", "Food"]]] <> ".foodnoms",
     "bytes" -> foodnomsBytes[fjson], "json" -> fjson, "warnings" -> warnings|>]];
  (* emit=fooddef: a STANDALONE food DEFINITION (contentType 3) -- a reusable
     "save to your Foods library" entry: foods[] with baseAmount 100, the pinned
     100-unit serving in measures[], isHidden:false. Drops the entry-only
     quantity/measure/uncertainty. *)
  If[emit === "fooddef",
   fe = If[entries === {}, $Failed, First[entries]];
   If[Length[entries] > 1,
    AppendTo[warnings, "emit=fooddef emits only the first food; " <>
      ToString[Length[entries] - 1] <> " other(s) ignored"]];
   If[fe === $Failed, AppendTo[warnings, "emit=fooddef: no resolved food to emit"]];
   fdef = If[fe === $Failed, <||>,
     Join[
       KeyTake[fe, {"name", "foodID", "brandOwner", "baseUnit", "nutrients"}],
       <|"baseAmount" -> 100, "measures" -> {serving100[Lookup[fe, "baseUnit", "gram"]]},
         "version" -> 1, "traits" -> 0, "isHidden" -> False|>]];
   fjson = <|"version" -> 2, "contentType" -> 3,
      "foods" -> If[fe === $Failed, {}, {fdef}]|>;
   Return[<|
     "name" -> cleanFilename[If[fe === $Failed, "Food", Lookup[fe, "name", "Food"]]] <> ".foodnoms",
     "bytes" -> foodnomsBytes[fjson], "json" -> fjson, "warnings" -> warnings|>]];
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
  recipeCollection = If[ctype === 2,
    (* meal: no yield fields *)
    <|"name" -> name, "collectionType" -> 2, "version" -> 1, "traits" -> 0|>,
    (* recipe: carries the cooked-yield fields *)
    <|"name" -> name, "collectionType" -> 3, "version" -> 1, "traits" -> 0,
      "totalServingSize" -> totalSize, "servingSizeUnit" -> "gram",
      "servings" -> servings|>];
  If[notes =!= "", AppendTo[recipeCollection, "notes" -> notes]];
  recipeJson = <|"version" -> 2, "contentType" -> 2,
    "foodCollections" -> {recipeCollection}, "foodEntries" -> entries|>;

  {selectedName, selectedJson} = If[selected === "recipe",
    {name, recipeJson}, {selected["name"], selected["json"]}];

  <|"name" -> cleanFilename[selectedName] <> ".foodnoms", "bytes" -> foodnomsBytes[selectedJson],
    "json" -> selectedJson, "warnings" -> warnings|>];


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
  (* Every hit costs its own FDC call on top of the search, so one 5-candidate
     query is 6 requests against a ~1000/day key. Guard BOTH stages: a Failure
     mapped over with /@ used to decompose into junk like {}["fdcId"], which
     then could not be JSON-encoded ("Failed to export to JSON"). *)
  <|"results" -> Function[q,
     Module[{hits = fdcSearch[q, n]},
      If[FailureQ[hits],
       <|"query" -> q, "candidates" -> {},
         "error" -> TemplateApply[hits["MessageTemplate"], hits["MessageParameters"]]|>,
       <|"query" -> q,
         "candidates" -> Function[hit,
            Module[{block = fdcToFoodNoms[hit[[1]]]},
             <|"fdcId" -> hit[[1]], "description" -> hit[[2]], "dataType" -> hit[[3]],
               "baseAmount" -> 100, "baseUnit" -> "gram",
               "nutrients" -> If[FailureQ[block], <||>, block["nutrients"]]|>]] /@ hits|>]]] /@ qs|>];


(* ================= C. APIFunctions (decomposed query params) =============

   NO JSON CROSSES THE WIRE. The earlier design took the spec as a JSON string
   and parsed it -- but a JSON file-interpreter can't read a GET query string
   (so clickable links 400'd), and hand-parsing JSON is against the rules
   (CLAUDE.md). Instead every field is its own typed query parameter, parsed
   DECLARATIVELY by the framework's interpreters -- no ImportString, no string
   surgery. Holger's "DSM" (decomposition storage model): one column per
   attribute. CompoundElement can't help here -- Wolfram explicitly forbids
   DelimitedSequence[CompoundElement[..]] ("nvldnesting") and CompoundElement
   won't split a delimited string -- so the ingredient list is stored as
   PARALLEL TYPED ARRAYS, aligned by position:

     fdcIds,grams                          -- USDA ingredients
     patchFdcIds,patchNutrientNames,patchDeltas  -- sparse per-100g patches
     custom* (';'-separated; nutrient arrays nested ';'/',')  -- foods sent inline
     nutrientNameSets,customNutrientSetIds  -- intern table for the repeated
                                               nutrient-key lists (v8, optional)

   specFromParams stitches the columns back into the row-shaped spec that
   buildFoodNomsRecipe already consumes, after a length-alignment guard. *)

opt[interp_, def_] := <|"Interpreter" -> interp, "Default" -> def|>;

(* per-ingredient patch: the (key,delta) pairs whose patchFdcIds entry is `id` *)
patchFor[id_, a_] := AssociationThread[
   Pick[a["patchNutrientNames"], a["patchFdcIds"], id] ->
   Pick[a["patchDeltas"],        a["patchFdcIds"], id]];

(* attach a per-entry uncertainty to an ingredient assoc, unless none was given
   (Missing) -- absent key => the builder uses the meal-wide default *)
addUnc[base_, u_] := If[MissingQ[u], base, Append[base, "uncertainty" -> Round[u]]];

(* a per-group uncertainty column, padded to Missing when omitted (length 0) so it
   aligns with its ingredient group; length is guarded in specFromParams *)
uncCol[col_, n_] := If[Length[col] === n, col, ConstantArray[Missing[], n]];

(* attach optional provenance to a custom food: source url + note (blank omits),
   brand (-> brandOwner) and barcode. So a scraped product food carries its page
   (urlString/notes), its shop/brand, and — for a packaged product — the EAN/UPC
   off the pack, which is what lets FoodNoms match a scan to this food. *)
addMeta[base_, url_, note_, brand_, barcode_] := Module[{b = base},
  If[StringQ[url] && StringTrim[url] =!= "", b = Append[b, "urlString" -> url]];
  If[StringQ[note] && StringTrim[note] =!= "", b = Append[b, "notes" -> note]];
  If[StringQ[brand] && StringTrim[brand] =!= "", b = Append[b, "brandOwner" -> brand]];
  If[StringQ[barcode] && StringTrim[barcode] =!= "",
   b = Append[b, "barcode" -> StringTrim[barcode]]];
  b];

(* attach USDA provenance to a PASSTHROUGH food. passthroughFoodEntry has always
   read "source"/"secondarySource" off the ingredient, but no query parameter set
   them -- so a caller that resolved USDA itself and sent the nutrients inline
   (the custom* path) produced entries indistinguishable from hand-typed ones,
   even when it knew the exact fdcId. That is now the normal way to build a
   recipe: tools/js resolves FDC locally so this endpoint never touches the
   network (see tools/js/README.md), and without these two columns doing so
   silently downgraded provenance. Blank omits, so the columns stay optional. *)
addSource[base_, src_, sec_] := Module[{b = base},
  If[StringQ[src] && StringTrim[src] =!= "", b = Append[b, "source" -> StringTrim[src]]];
  If[StringQ[sec] && StringTrim[sec] =!= "",
   b = Append[b, "secondarySource" -> StringTrim[sec]]];
  b];

(* a per-custom-food string column, padded to "" when omitted (length 0) *)
strCol[col_, n_] := If[Length[col] === n, col, ConstantArray["", n]];

(* ---- nutrient-name interning -------------------------------------------------
   customNutrientNames repeats the SAME ~35 keys for every ingredient, and it is
   the single largest thing in the query string: measured on a 9-ingredient
   recipe it was 3260 of 5776 chars (53%) -- while carrying only 3 DISTINCT key
   sets. Since the whole point of the custom* path is to keep the FDC call off
   this endpoint, and that means shipping nutrients through the URL, that column
   is what decides how many ingredients fit before a recipe hits a server's
   query-length limit (commonly 8 KB).

   So: send each distinct key set once in `nutrientNameSets`, and give each food
   a 1-based index into it via `customNutrientSetIds`.

   Backward compatible by construction -- when customNutrientSetIds is empty this
   returns customNutrientNames untouched, which is every existing caller and all
   52 recipe URLs currently in the repo. The two forms are mutually exclusive
   rather than merged: a caller that sent both would have two disagreeing sources
   of truth for the same column and no way to say which wins. *)
resolveNutrientNames[a_] := Module[
  {ids = a["customNutrientSetIds"], sets = a["nutrientNameSets"],
   n = Length[a["customNames"]]},
  If[ids === {}, Return[a["customNutrientNames"], Module]];
  If[a["customNutrientNames"] =!= {},
   Return[Failure["internConflict", <|"err" ->
      "customNutrientSetIds and customNutrientNames are mutually exclusive: \
send the nutrient names EITHER once each in nutrientNameSets (indexed by \
customNutrientSetIds) OR inline per food in customNutrientNames"|>], Module]];
  If[sets === {},
   Return[Failure["internConflict", <|"err" ->
      "customNutrientSetIds given but nutrientNameSets is empty"|>], Module]];
  If[Length[ids] =!= n,
   Return[Failure["internConflict", <|"err" ->
      "customNutrientSetIds must be the same length as the custom* arrays"|>], Module]];
  If[! AllTrue[ids, IntegerQ[#] && 1 <= # <= Length[sets] &],
   Return[Failure["internConflict", <|"err" -> StringJoin[
      "every customNutrientSetIds entry must be a 1-based index into \
nutrientNameSets (1..", ToString[Length[sets]], "); got ",
      ToString[ids]]|>], Module]];
  sets[[#]] & /@ ids];

(* foodID for a custom food: the caller's id if given, else a STABLE local: UUID
   derived by hashing name | brand | caloric density (per-100g calories). Same
   product -> same id across calls, so callers can omit customFoodIds entirely.
   name/brand are lower-cased + trimmed so trivial casing/spacing doesn't fork it. *)
foodIDfor[given_, name_, brand_, nutr_] :=
  If[StringQ[given] && StringTrim[given] =!= "",
   given,
   mkLocalID @ StringRiffle[{
      ToLowerCase @ StringTrim @ ToString[name],
      ToLowerCase @ StringTrim @ ToString[brand],
      ToString @ Lookup[nutr, "calories", ""]}, "|"]];

(* parsed params (columns) -> the row-shaped spec, or a Failure if columns misalign *)
specFromParams[a_] := Module[{errs = {}, nn},
  (* Resolve the interned form (nutrientNameSets + customNutrientSetIds) to a
     plain per-food name list FIRST, so every guard and the builder below see one
     shape and neither has to know interning exists. Its own errors are returned
     immediately rather than accumulated: with the column unresolved, the
     length guards would all fire too and bury the real cause. *)
  nn = resolveNutrientNames[a];
  If[FailureQ[nn], Return[nn, Module]];
  If[Length[a["fdcIds"]] =!= Length[a["grams"]],
   AppendTo[errs, "fdcIds and grams must be equal length"]];
  If[! Equal @@ Length /@ {a["patchFdcIds"], a["patchNutrientNames"], a["patchDeltas"]},
   AppendTo[errs, "patchFdcIds/patchNutrientNames/patchDeltas must be equal length"]];
  If[! Equal @@ Length /@ {a["customNames"], a["customQuantities"],
       a["customUnits"], nn, a["customNutrientValues"]},
   AppendTo[errs, "all custom* arrays must be equal length"]];
  (* customFoodIds is OPTIONAL: empty -> every id auto-derived from name|brand|kcal *)
  If[! MemberQ[{0, Length[a["customNames"]]}, Length[a["customFoodIds"]]],
   AppendTo[errs, "customFoodIds must be empty (auto-derived) or the same length as the custom* arrays"]];
  If[(Length /@ nn) =!= (Length /@ a["customNutrientValues"]),
   AppendTo[errs, "each custom food's nutrient names/values must match in length"]];
  (* per-entry uncertainty columns are OPTIONAL: each must be empty (use the
     meal-wide default) or exactly its group's length *)
  If[! MemberQ[{0, Length[a["fdcIds"]]}, Length[a["fdcUncertainties"]]],
   AppendTo[errs, "fdcUncertainties must be empty or the same length as fdcIds"]];
  If[! MemberQ[{0, Length[a["customNames"]]}, Length[a["customUncertainties"]]],
   AppendTo[errs, "customUncertainties must be empty or the same length as the custom* arrays"]];
  (* optional per-custom-food source url / note columns: empty or aligned *)
  If[! MemberQ[{0, Length[a["customNames"]]}, Length[a["customUrls"]]],
   AppendTo[errs, "customUrls must be empty or the same length as the custom* arrays"]];
  If[! MemberQ[{0, Length[a["customNames"]]}, Length[a["customNotes"]]],
   AppendTo[errs, "customNotes must be empty or the same length as the custom* arrays"]];
  If[! MemberQ[{0, Length[a["customNames"]]}, Length[a["customBrands"]]],
   AppendTo[errs, "customBrands must be empty or the same length as the custom* arrays"]];
  If[! MemberQ[{0, Length[a["customNames"]]}, Length[a["customBarcodes"]]],
   AppendTo[errs, "customBarcodes must be empty or the same length as the custom* arrays"]];
  (* optional USDA-provenance columns: empty or aligned, like every other one *)
  If[! MemberQ[{0, Length[a["customNames"]]}, Length[a["customSources"]]],
   AppendTo[errs, "customSources must be empty or the same length as the custom* arrays"]];
  If[! MemberQ[{0, Length[a["customNames"]]}, Length[a["customSecondarySources"]]],
   AppendTo[errs, "customSecondarySources must be empty or the same length as the custom* arrays"]];
  If[errs =!= {}, Return[Failure["badLengths", <|"err" -> StringRiffle[errs, "; "]|>]]];
  Join[
   <|"name" -> a["name"], "servings" -> a["servings"], "emit" -> a["emit"],
     "uncertainty" -> a["uncertainty"], "collectionType" -> a["collectionType"],
     "ingredients" -> Join[
       MapThread[
         addUnc[<|"fdcId" -> #1, "quantity" -> #2, "patch" -> patchFor[#1, a]|>, #3] &,
         {a["fdcIds"], a["grams"], uncCol[a["fdcUncertainties"], Length[a["fdcIds"]]]}],
       MapThread[
         (* `nnames`, not `nn` -- the enclosing Module already binds nn to the
            resolved name column, and shadowing it here would read as a bug. *)
         Function[{nm, fid0, qty, un, nnames, nv, unc, url, note, brand, barcode,
            src, sec},
          With[{nutr = AssociationThread[nnames -> nv]},
           addUnc[addSource[addMeta[
              <|"name" -> nm, "foodID" -> foodIDfor[fid0, nm, brand, nutr],
                "quantity" -> qty, "unit" -> un, "nutrients" -> nutr|>,
              url, note, brand, barcode], src, sec], unc]]],
         {a["customNames"], strCol[a["customFoodIds"], Length[a["customNames"]]],
          a["customQuantities"], a["customUnits"],
          nn, a["customNutrientValues"],
          uncCol[a["customUncertainties"], Length[a["customNames"]]],
          strCol[a["customUrls"], Length[a["customNames"]]],
          strCol[a["customNotes"], Length[a["customNames"]]],
          strCol[a["customBrands"], Length[a["customNames"]]],
          strCol[a["customBarcodes"], Length[a["customNames"]]],
          strCol[a["customSources"], Length[a["customNames"]]],
          strCol[a["customSecondarySources"], Length[a["customNames"]]]}]]|>,
   (* totalServingSize only when a number was supplied, else the builder's
      ingredient-sum fallback must win (Missing would break its Lookup default) *)
   If[NumberQ[a["totalServingSize"]], <|"totalServingSize" -> a["totalServingSize"]|>, <||>]]];

(* CONTENT NEGOTIATION on the `Accept` request header -- ONE resource, two
   representations of the same recipe, same URL:

     Accept: application/json   -> a plain JSON view: the decoded recipe
                                   (foodCollections + foodEntries, no 'bvx-'
                                   wrapper) PLUS computed `totals` (16 slots +
                                   salt), per-ingredient `estKcal`, and
                                   `warnings`. Lets a caller read totals and the
                                   resolved entry descriptions WITHOUT decoding
                                   the LZFSE container client-side.
     anything else (the default,
       incl. browsers' text/html
       and application/octet-stream)
                                -> the raw .foodnoms bytes, exactly as before, so
                                   a browser GET or `curl -o` still lands the file
                                   (the clickable download link is unaffected).

   `Vary: Accept` is set on every response so a shared cache never serves the
   JSON view to a client that asked for the file (or vice-versa). The request
   header is read with HTTPRequestData (guarded -- falls back to the bytes view
   if headers are unavailable). Filename via Content-Disposition (RFC 5987);
   cleanFilename strips the [date] stamp + emoji and spells '&' as 'and' for the
   FILENAME only -- the in-file collection name keeps the full "...[DD-MM-YY] ✴️"
   stamp. *)
(* Deployed-version marker. BUMP BY 1 on every change that alters endpoint
   behaviour, in the same commit. `?emit=version` (below) returns it, so a caller
   can compare the LIVE endpoint against this authored value and tell whether a
   redeploy is pending -- see the deploy section's version-check snippet.
   Changelog:
     v1  brand (brandOwner) + serving size + version hook + customUrls/notes
     v2  serving-size fix + emit=fooddef (contentType-3 Foods-library food)
     v3  stable auto foodIDs = hash(name|brand|per-100g kcal) when id omitted
     v4  standalone serving pinned to 100 baseUnit (FoodNoms forces per-serving)
     v5  serving = bare 100-unit metric weight; serving-size label left empty
     v6  FDC fetch made resilient: retry + memoise + fail loudly. A failed USDA
         lookup used to leave UNEVALUATED expressions in the result, which then
         could not be JSON-encoded, so the caller got an opaque 400 "Failed to
         encode HTTPResponse". Worse, the failure was per-ingredient, so an
         n-ingredient recipe broke (1-(1-p)^n) of the time -- it read as "large
         recipes are broken" when the real cause was the ~1000 req/day FDC key
         limit. Now: 503 + Retry-After + a message naming the fdcId, and
         successful lookups are cached so repeats are free.
     v7  customBarcodes column. The .foodnoms FORMAT has always carried an
         optional `barcode` on a food (see FOODNOMS_FORMAT.md) -- FoodNoms uses
         it to match a scanned pack to the food -- but there was no way to set
         one through this endpoint, so every packaged product we built was
         unscannable. Now aligned with the other custom* columns.
     v8  Two changes, both serving the same shift: FDC resolution moved OUT of
         this endpoint and into tools/js (local Node), so a recipe now arrives
         via the custom* path with nutrients already inline and this endpoint
         makes no network call at all. v6 made the built-in FDC fetch survivable;
         v8 makes not needing it the normal path.
         (a) customSources / customSecondarySources. passthroughFoodEntry always
             read source/secondarySource off the ingredient, but nothing could
             SET them, so a caller that knew the exact fdcId still produced
             entries indistinguishable from hand-typed ones. Now settable.
         (b) nutrientNameSets + customNutrientSetIds -- intern the repeated
             nutrient-key lists. customNutrientNames was 53% of a 9-ingredient
             URL (3260 of 5776 chars) while holding only 3 distinct key sets, and
             query length is what caps how many ingredients fit.
         Both are opt-in and default to {}: existing callers, and all 52 recipe
         URLs in the repo, are unaffected.
   (pre-versioning: vitamin-D read fixed to micrograms, not the IU row.) *)
$fnVersion = 8;

foodnomsAPI = APIFunction[
   {"name" -> opt["String", "Untitled Recipe"], "servings" -> opt["Integer", 1],
    "emit" -> opt["String", "recipe"],
    "totalServingSize" -> opt["Number", Missing[]],
    "uncertainty" -> opt["Number", 0],
    "collectionType" -> opt["Integer", 3],
    "fdcIds" -> opt[DelimitedSequence["Integer", ","], {}],
    "grams"  -> opt[DelimitedSequence["Number",  ","], {}],
    "patchFdcIds"        -> opt[DelimitedSequence["Integer", ","], {}],
    "patchNutrientNames" -> opt[DelimitedSequence["String",  ","], {}],
    "patchDeltas"        -> opt[DelimitedSequence["Number",  ","], {}],
    "customNames"      -> opt[DelimitedSequence["String", ";"], {}],
    (* optional: omit entirely, or leave an entry blank, to auto-derive a stable
       local: UUID from name|brand|kcal (foodIDfor). Provide only to pin an id. *)
    "customFoodIds"    -> opt[DelimitedSequence["String", ";"], {}],
    "customQuantities" -> opt[DelimitedSequence["Number", ";"], {}],
    "customUnits"      -> opt[DelimitedSequence["String", ";"], {}],
    "customNutrientNames"  -> opt[DelimitedSequence[DelimitedSequence["String", ","], ";"], {}],
    "customNutrientValues" -> opt[DelimitedSequence[DelimitedSequence["Number", ","], ";"], {}],
    (* optional per-entry uncertainty (integer percent), aligned with each group;
       empty -> the meal-wide `uncertainty` default applies to that group *)
    "fdcUncertainties"    -> opt[DelimitedSequence["Number", ","], {}],
    "customUncertainties" -> opt[DelimitedSequence["Number", ";"], {}],
    (* optional per-custom-food urlString/notes, aligned with the custom* arrays.
       NB (1) FoodNoms DROPS urlString/notes on a standalone food import -- they
       are inert (harmless, but don't survive); use brandOwner for provenance and
       keep the URL in the repo. NB (2) ';'-split like every custom* column, so
       the text must not contain a ';' (it would split + fail the length guard). *)
    "customUrls"  -> opt[DelimitedSequence["String", ";"], {}],
    "customNotes" -> opt[DelimitedSequence["String", ";"], {}],
    (* optional brand (-> brandOwner), aligned with the custom* arrays. Serving
       size is fixed at 100 baseUnit for standalone foods (see emit=food/fooddef),
       so there's no serving-size param -- FoodNoms forces per-serving on import. *)
    "customBrands"       -> opt[DelimitedSequence["String", ";"], {}],
    "customBarcodes"     -> opt[DelimitedSequence["String", ";"], {}],
    (* optional USDA provenance for a passthrough food, aligned with the custom*
       arrays. `customSources` is normally "usda"; `customSecondarySources` takes
       the .foodnoms dataType slug (foundation_food / sr_legacy_food /
       survey_fndds_food -- see fdcSecondarySource). Set these when the CALLER
       resolved FDC and is sending the nutrients inline, so the entry is not
       downgraded to an anonymous custom food just because this endpoint did not
       do the lookup itself. *)
    "customSources"           -> opt[DelimitedSequence["String", ";"], {}],
    "customSecondarySources"  -> opt[DelimitedSequence["String", ";"], {}],
    (* optional interned nutrient-name table -- see resolveNutrientNames. Send
       each DISTINCT key set once here, and index into it (1-based) per food with
       customNutrientSetIds, instead of repeating the same ~35 keys inline for
       every ingredient. Omit both to keep the inline customNutrientNames form. *)
    "nutrientNameSets" ->
      opt[DelimitedSequence[DelimitedSequence["String", ","], ";"], {}],
    "customNutrientSetIds" -> opt[DelimitedSequence["Integer", ";"], {}]},
   Module[{spec = specFromParams[#], r, accept, wantJson, body},
     If[#["emit"] === "version",
      (* lightweight version probe (no ingredients needed): compare the returned
         endpointVersion against $fnVersion in this file to tell if the live
         endpoint is current. *)
      HTTPResponse[ExportByteArray[<|"endpointVersion" -> $fnVersion|>, "RawJSON"],
        <|"StatusCode" -> 200,
          "Headers" -> {"Content-Type" -> "application/json", "Vary" -> "Accept"}|>],
      If[FailureQ[spec],
      HTTPResponse[spec["err"], <|"StatusCode" -> 400,
        "Headers" -> {"Content-Type" -> "text/plain", "Vary" -> "Accept"}|>],
      r = Catch[buildFoodNomsRecipe[spec], "fdcFail"];
      If[FailureQ[r],
       (* a USDA lookup failed -- say so plainly, with a 503 (upstream is the
          problem and it is transient), not a bare 400 that reads like the
          caller's payload was malformed. *)
       Return[HTTPResponse[r["what"] <> ": " <>
          TemplateApply[r["MessageTemplate"], r["MessageParameters"]],
         <|"StatusCode" -> 503, "Headers" -> {
            "Content-Type" -> "text/plain", "Vary" -> "Accept",
            "Retry-After" -> "3600"}|>]]];
      (* the request's Accept header, lower-cased; guarded -- if the header isn't
         reachable we default to "*/*" (the bytes view). *)
      accept = Quiet @ Check[
        ToLowerCase @ Lookup[
          Association @ Cases[HTTPRequestData["Headers"], (k_ -> v_) :> (ToLowerCase[k] -> v)],
          "accept", "*/*"],
        "*/*"];
      wantJson = StringContainsQ[accept, "application/json"];
      If[wantJson,
       (* JSON view: decoded recipe + computed totals + per-ingredient est. kcal
          + warnings. Same numbers the bytes view encodes, no LZFSE wrapper. *)
       body = <|
          "filename" -> r["name"],
          "recipe" -> r["json"],
          "totals" -> foodnomsTotals[r["json"]],
          "estKcal" -> (Function[e, <|
              "name" -> Lookup[e, "name", ""],
              "kcal" -> Round[Lookup[Lookup[e, "nutrients", <||>], "calories", 0] *
                  Lookup[e, "quantity", Lookup[e, "baseAmount", 100]] /
                  Lookup[e, "baseAmount", 100]]|>] /@
             Lookup[r["json"], "foodEntries", Lookup[r["json"], "foods", {}]]),
          "warnings" -> r["warnings"]|>;
       HTTPResponse[ExportByteArray[body, "RawJSON"], <|"StatusCode" -> 200,
         "Headers" -> {"Content-Type" -> "application/json", "Vary" -> "Accept"}|>],
       (* default: the raw .foodnoms bytes (unchanged) *)
       HTTPResponse[r["bytes"], <|"StatusCode" -> 200, "Headers" -> {
          "Content-Type" -> "application/octet-stream", "Vary" -> "Accept",
          "Content-Disposition" -> "attachment; filename*=UTF-8''" <> URLEncode[r["name"]]}|>]]]]] &];

(* the resolution endpoint (search only — returns candidates to judge) *)
resolveAPI = APIFunction[
   {"queries" -> opt[DelimitedSequence["String", ";"], {}], "n" -> opt["Integer", 5]},
   resolveFDC[<|"queries" -> #queries, "n" -> #n|>] &, "JSON"];


(* ===================== D. Deploy (run once, as pirk0) ===================== *)

(* Evaluate the two CloudDeploy lines below in an authenticated Wolfram Cloud
   session (CloudConnect[]). Two endpoints, two concerns. They are real
   statements, not commented-out — running this file in an authenticated session
   (re)deploys both.

   ⚠ REDEPLOY PENDING ($fnVersion 5 -- serving weight 100, empty serving-size
   label, 2026-07-01): the standalone-food serving is a 100-baseUnit metric weight
   with NO descriptionQuantity (serving-size label left blank). (v4 pinned the
   serving to 100; v3 stable auto foodIDs; v2 emit=fooddef; v1 brand + version
   hook + customUrls/notes; vitamin-D before.) The LIVE endpoint lacks this until
   BuildFoodNomsRecipe is re-run as pirk0.

   VERSION CHECK -- is the live endpoint current? Compare the live version to
   $fnVersion in this file:

     curl -s 'https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe?emit=version' \
       -H 'Accept: application/json'
     -> {"endpointVersion":1}   (matches $fnVersion => deployed is current)

   A non-JSON / recipe-shaped response means the deployed build predates the
   version hook (redeploy needed). Bump $fnVersion whenever endpoint behaviour
   changes so this check stays meaningful. *)

CloudDeploy[resolveAPI,  CloudObject["ResolveFDC"],          Permissions -> "Public"]
CloudDeploy[foodnomsAPI, CloudObject["BuildFoodNomsRecipe"], Permissions -> "Public"]

(* Every field is its own query param (GET or POST form) -- no JSON anywhere.
   Parallel arrays align by position; comma within an array, ';' between custom
   foods. URLBuild handles the percent-encoding (glyphs become UTF-8 %XX -- no
   shell-mangling, no \\u escaping needed).

   1) ResolveFDC — name(s) -> ranked USDA candidates, each WITH its per-100 g
      nutrients (so you can pick the best entry on the numbers, not just the name):

     curl -s 'https://www.wolframcloud.com/obj/pirk0/ResolveFDC?queries=butternut%20squash%20raw;dry%20soybeans&n=5'
     -> {"results":[{"query":"...","candidates":[
          {"fdcId":...,"description":"...","dataType":"...",
           "baseAmount":100,"baseUnit":"gram","nutrients":{...}},...]},...]}

   2) BuildFoodNomsRecipe — resolved ingredients -> ONE raw .foodnoms file. The
      body IS the file, so a browser GET or `curl -o` lands it directly. One call,
      one file; keep all params identical and vary only `emit` ("recipe" default,
      "food" for a standalone food — see below, or a companion-food name listed in
      the recipe's notes):

     # recipe (default): one USDA ingredient (fdcId 169295, 500 g) patched +200 sodium/100g
     curl -s -o Soup.foodnoms \
       'https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe?name=My%20Soup&fdcIds=169295&grams=500&patchFdcIds=169295&patchNutrientNames=sodium&patchDeltas=200'

     # a companion provenance file: same params, change only emit (URL-encoded name from notes)
     curl -s -o Patch.foodnoms \
       'https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe?name=My%20Soup&fdcIds=169295&grams=500&patchFdcIds=169295&patchNutrientNames=sodium&patchDeltas=200&emit=Squash%2C%20winter%2C%20butternut%2C%20raw%20Patch'

   A custom (non-USDA) food adds: customNames=Hon-Mirin&customFoodIds=local:...&
   customQuantities=40&customUnits=milliliter&customNutrientNames=calories,sugars&
   customNutrientValues=189,38  (';' separates foods; nested ','/';' for the blocks).

   Two scalar knobs: totalServingSize=<grams> sets the recipe yield (default = sum
   of ingredient weights); uncertainty=<0..100 integer percent> is the MEAL-WIDE
   DEFAULT uncertainty (e.g. uncertainty=30 for a ±30% estimate; default 0).

   PACKAGED PRODUCTS: customBarcodes (';' list, aligned with the custom* arrays)
   sets each food's `barcode` — the EAN/UPC printed on the pack. FoodNoms matches
   a scan against it, so a branded food built without one can never be scanned in.
   Empty (the default) omits the field, as do blank entries within the list:

     curl -s -o Latte.foodnoms 'https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe?\
       name=Oat%20Caffe%20Latte&emit=fooddef&customNames=Oat%20Caffe%20Latte&\
       customBrands=Oatside&customBarcodes=8885022700006&customQuantities=100&customUnits=gram&\
       customNutrientNames=calories&customNutrientValues=73'

   PER-ENTRY uncertainty (for meals that mix tiers 0/10/30 in one sitting): give
   fdcUncertainties (',' list, aligned with fdcIds/grams) and/or customUncertainties
   (';' list, aligned with the custom* arrays). Each is OPTIONAL — empty means "use
   the meal-wide default for that group"; otherwise it must match its group length.
   A value of 0 omits the field for that entry (the FoodNoms "no estimate" tier). So
   a single call now yields a correctly-tiered meal file — no kernel patching:

     # one meal, two dishes weighed (10) + one raw fruit (0)
     curl -s -o Lunch.foodnoms 'https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe?\
       name=Lunch&collectionType=2&customNames=Ma%20Po;Rice;Strawberries&customFoodIds=local:a;local:b;local:c&\
       customQuantities=367;437;120&customUnits=gram;gram;gram&\
       customNutrientNames=calories;calories;calories&customNutrientValues=114;130;32&\
       customUncertainties=10;10;0'

   STANDALONE FOOD (emit=food): a reusable FoodNoms food in entry form (contentType
   1, no collection) -- for logging a labelled product by any weight. Pass exactly
   ONE food (a USDA fdcId, or a custom food from a label) + emit=food; the first
   resolved entry is rewrapped as the food (filename + foodID come from it). Macros
   from the label, micros estimated and passed as custom nutrients:

     # custom food from a UK label (per 100 g); micros estimated
     curl -s -o 'Wasabi Peas.foodnoms' 'https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe?\
       emit=food&customNames=Wasabi%20Peas&customFoodIds=local:WASABIPEAS&customQuantities=100&customUnits=gram&\
       customNutrientNames=calories,protein,carbs,sugars,fat,fatSaturated,fiber,sodium,iron,calcium,zinc,magnesium,potassium,vitaminD,vitaminB12,folate&\
       customNutrientValues=433,12,50,4,18,1.4,16,680,2.4,50,1.5,55,470,0,0,125'

     # or straight from a USDA generic: emit=food&fdcIds=168389&grams=100

   Totals + entries without downloading the file: set the Accept header to ask
   for the JSON view (decoded recipe + `totals` + per-ingredient `estKcal` +
   `warnings`) instead of the bytes -- same URL, content-negotiated:

     curl -s -H 'Accept: application/json' \
       'https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe?name=My%20Soup&fdcIds=169295&grams=500'
     -> {"filename":"My Soup.foodnoms","recipe":{...},"totals":{...,"salt":...},
         "estKcal":[{"name":...,"kcal":...},...],"warnings":[...]}

   Default (no/other Accept, e.g. a browser or `curl -o`) still returns the raw
   .foodnoms bytes. Either way warnings + the companion-file menu also live in the
   recipe collection's `notes`; foodnomsTotals[ByteArray[BinaryReadList[
   "Soup.foodnoms"]]] (foodnomsDecode for the JSON) still reads totals back from a
   saved file. Unknown emit -> recipe (noted); patch-free recipe -> only the
   recipe file. Mis-aligned column lengths -> HTTP 400 with the offending arrays. *)

