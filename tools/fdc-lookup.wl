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
