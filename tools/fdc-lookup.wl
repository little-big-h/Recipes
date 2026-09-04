(* ::Package:: *)

(* fdc-lookup.wl — USDA FoodData Central → FoodNoms nutrient blocks

   Why this exists / how it runs:
   The Claude Code sandbox cannot reach api.nal.usda.gov (network allowlist).
   But the Wolfram kernel behind the Wolfram MCP executes server-side (Wolfram
   Cloud), where URLExecute CAN reach the FDC API. So load/paste these
   definitions into a WolframLanguageEvaluator call and they work — returning the
   exact USDA records FoodNoms itself uses, per 100 g, mapped to FoodNoms keys.

   Usage (inside a Wolfram evaluation):
     fdcSearch["butternut squash raw"]      (* name -> {fdcId, description, dataType} *)
     fdcToFoodNoms[2685570]                   (* fdcId -> per-100g FoodNoms block *)
     fdcToFoodNomsByName["raw spinach"]       (* search + map top hit in one call *)

   Uses format=full: the abridged format ROUNDS values and OMITS some nutrients
   (e.g. sugars on FNDDS foods), so it does not match FoodNoms' stored numbers.
   Full carries unrounded amounts and the complete panel.

   API key: the project key is set below. It's a free FDC key (rate-limited to
   ~1000 req/day per IP); the repo is private. Override per-session if needed:
     $FDCApiKey = "..."   (sign-up: https://fdc.nal.usda.gov/api-key-signup.html)

   Output is per 100 g / 100 ml, i.e. baseAmount 100 — ready to drop into a
   .foodnoms nutrients block (see docs/FOODNOMS_FORMAT.md). dataType maps to the
   format's secondarySource via fdcSecondarySource[].
*)

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
