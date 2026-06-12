# Handoff: add a `totalServingSize` query param to `BuildFoodNomsRecipe`

**Goal:** let callers set the recipe's `totalServingSize` (the cooked yield) explicitly via the URL, instead of back-calculating a zero-nutrient water ingredient. Both methods should coexist — water still works; the param overrides.

**Key shortcut:** the *builder* already supports this. `buildFoodNomsRecipe` (≈line 319) reads:

```wolfram
totalSize = Lookup[spec, "totalServingSize", Total[Lookup[#, "quantity", 0] & /@ entries]];
```

So it already honours a `spec["totalServingSize"]` key and falls back to the ingredient-sum when absent. **Don't touch the builder.** You only need to plumb the query param → `spec`. Three small edits, all in Section C:

## 1. Add the parameter

Add to the `foodnomsAPI = APIFunction[{ ... }]` list (put it next to `"servings"`):

```wolfram
"totalServingSize" -> opt["Number", Missing[]],
```

Use `Missing[]` as the default so "not supplied" is distinguishable from a real `0`.

## 2. Thread it into the spec

In `specFromParams[a_]`. The function currently returns a bare association ending in `"ingredients" -> Join[...]`. Wrap that return so the key is added **only when a number was supplied** (otherwise the builder's fallback must win — passing `Missing[]` as the value would break the `Lookup` default):

```wolfram
Join[
  <|"name" -> a["name"], "servings" -> a["servings"], "emit" -> a["emit"],
    "ingredients" -> Join[ (* …existing USDA + custom MapThreads, unchanged… *) ]|>,
  If[NumberQ[a["totalServingSize"]], <|"totalServingSize" -> a["totalServingSize"]|>, <||>]]
```

## 3. Redeploy

Re-run the `BuildFoodNomsRecipe` `CloudDeploy` line in Section D from an authenticated session (`CloudConnect[]`). The endpoint is `Permissions -> "Public"`.

## Verify

Param overrides ingredient-sum, totals untouched:

```wolfram
b = URLRead["https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe?name=T&servings=4&fdcIds=170501&grams=500&totalServingSize=4380", "BodyByteArray"];
ImportByteArray[Take[b,{9,-5}],"RawJSON"]["foodCollections"][[1]]["totalServingSize"]   (* expect 4380, not 500 *)
```

Also confirm a request *without* the param still returns the ingredient-sum (regression check on the `Missing[]`→fallback path).

## Doc

Add the param to the usage comment block at the bottom of the file (Section D, near the custom-food example) and to `docs/FOODNOMS_FORMAT.md` where the endpoint contract is described — one line: `totalServingSize=<grams>` sets the recipe yield; omit to use Σ ingredient weights.

**Gotcha:** `DelimitedSequence` isn't involved here (it's a scalar), so no nesting concerns. Keep Section A (the synced `fdc-lookup.wl` copy) untouched.
