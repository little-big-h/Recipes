# Recipe Nutrition Generator (USDA → FoodNoms + Nutrition table)

A **playbook for another Claude**. Given a recipe markdown file, produce two
things from authentic USDA data:

1. a **`.foodnoms` recipe file** (importable into FoodNoms), and
2. a **USDA-sourced Nutrition table written back into the recipe `.md`**
   (plus a reconciled `Est. kcal` column).

It ties together the three existing specs — read them first:

- `FOODNOMS_FORMAT.md` — the `.foodnoms` file shape (§6 recipe, §8 nutrients).
- `USDA_FDC.md` + `../tools/fdc-lookup.wl` — the data source and helper functions.
- `RECIPE_FORMAT.md` — the recipe `.md` Ingredients/Nutrition table conventions.

```
recipe.md ─▶ parse ingredients+amounts ─▶ resolve each to a USDA fdcId
          ─▶ fetch per-100g blocks (Wolfram) ─▶ build .foodnoms file
          ─▶ compute whole-recipe totals (Wolfram) ─▶ write back Nutrition table
```

> **Computation rule:** nutrition totals are computed in **Wolfram, never
> Python** (project rule). The hosted endpoint below also emits the `.foodnoms`
> file **bytes** in Wolfram (uncompressed LZFSE block), so the whole pipeline is
> Python-free — the only client step is writing bytes to disk.

---

## Hosted endpoint (preferred) — `BuildFoodNomsRecipe`

Steps 2–5 below are deployed as a single Wolfram Cloud Object so you don't have to
paste `fdc-lookup.wl` or hand-assemble JSON each session. Source of truth:
`../tools/foodnoms-cloud.wl` (Section A is a synced copy of `fdc-lookup.wl`; re-sync
+ redeploy if that file changes). Deploy line (run once, authenticated as the cloud
owner): `CloudDeploy[foodnomsAPI, CloudObject["BuildFoodNomsRecipe"], Permissions -> "Public"]`.

**Call it** with a `spec` parameter — a **JSON object** (parsed server-side into
nested Associations, so the caller just sends ordinary JSON):

```json
{
  "name": "Creamy Butternut & Soy Bean Soup [10-06-26] ✴️",
  "servings": 5,
  "totalServingSize": 4778,
  "ingredients": [
    {"fdcId": 2685570, "quantity": 1918, "patch": {"sugars": 2.2}},
    {"query": "dry soybeans", "quantity": 326},
    {"foodID": "local:DC95FB78-…", "name": "Hon-Mirin", "quantity": 40,
     "unit": "milliliter", "nutrients": {"calories": 257, "carbs": 43.4}}
  ]
}
```

From the shell:

```bash
curl -s https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe \
  --data-urlencode 'spec={"name":"…","servings":5,"ingredients":[…]}'
```

Ingredient forms: **USDA** (`fdcId` or `query` + `quantity`, optional `unit`); **USDA
+ patch** (add `patch` = per-100 g nutrient deltas, optional `patchNote`,
`patchFoodID`/`patchedFoodID` to reuse stable ids); **pass-through** for non-USDA
`local:`/`ciqual:` foods (explicit `foodID` + `nutrients`, used verbatim).

**Response** (`"JSON"`): `<|"files" -> {…}, "totals" -> {…}, "warnings" -> {…}|>`.
- `files` — recipe first, then any patch + patched-food provenance objects
  (`FOODNOMS_FORMAT.md` §11). Each item: `{name, json, b64}`. Write each in pure
  Wolfram: `BinaryWrite[f["name"], BaseDecode[f["b64"]]]` (then `Close`).
- `totals` — the 16 summed slots + `salt` (= `sodium*2.5/1000`), for the `.md`
  Nutrition table (Step 5 write-back below still applies).
- `warnings` — unresolved queries, unmapped dataTypes, patch-created keys.

Then do **Step 5's write-back** (Nutrition table + `Est. kcal`) from `totals`, and
**Step 6 verify**. The manual Steps 2–5 below remain the fallback if the endpoint is
unavailable.

---

## Prerequisites

- Wolfram MCP available. The kernel is stateless and cannot read this repo, so
  **paste the contents of `../tools/fdc-lookup.wl`** into each
  `WolframLanguageEvaluator` call that needs it. The API key is already set there.
- The recipe `.md` to process.

---

## Step 1 — Parse the recipe

From the **Ingredients** table, for each row capture `{name, amount, unit}`:

- **Name** — strip the leading ingredient emoji and any parenthetical handling
  notes (`(garnish)`, `(no soak)`, `(taste — very salty)`, …). Keep the food
  identity and state words (raw/cooked/canned/dried) — they drive matching.
- **Amount** — use **Actual used** if filled in, else **Planned**.
- **Unit** — `g` → `gram`, `ml` → `milliliter`.
- **Non-mass amounts** (`4–5 stalks`, `1 tbsp`, `generous`): resolve to grams in
  Step 2 via a USDA `measures[]` entry; if none, estimate and flag.
- **Exclusions** — items with `Est. kcal` of `—`, or marked `(garnish)` /
  `(at table)`, are at-table extras: **omit** them from both the `.foodnoms`
  entries and the totals (per `FOODNOMS_FORMAT.md` §6 "omit, don't zero").
- **Removed-before-serving** items (e.g. kombu): include at their small leached
  contribution if the recipe gives one, else omit. Mirror the recipe's intent.

---

## Step 2 — Resolve each ingredient to a USDA `fdcId` (semi-automatic)

For each included ingredient, run `fdcSearch[query]` with a cleaned query (drop
brand/notes; add `raw`/`cooked` as the method implies). Rank candidates by
dataType preference: **Foundation > SR Legacy > FNDDS > Branded**
(see `USDA_FDC.md`).

**Decide automatically vs ask — the semi-automatic rule:**

- **Auto-accept** when the top sensible candidate is an *(almost) exact* match —
  ALL of:
  - its description's core food noun matches the ingredient, **and**
  - the state/prep qualifiers are compatible (raw vs cooked, canned, variety),
    **and**
  - it is a generic (non-Branded) record for a generic ingredient.

  i.e. there is no competing choice that would *materially* change the nutrition.
  Proceed silently and record the pick.

- **Ask for confirmation** (via `AskUserQuestion`) when there is significant
  discrepancy or ambiguity:
  - no candidate matches the core food;
  - the best candidates differ in a way that moves nutrition meaningfully
    (raw vs cooked, dried vs fresh, different variety/brand);
  - only Branded hits exist for a generic ingredient (or vice-versa);
  - it is a compound/prepared pantry item not cleanly in USDA — e.g. **white
    miso, tsuyu, dashi-soy, hon-mirin, coconut aminos, shiitake powder,
    nutritional yeast, curry paste**.

  When asking, present the ingredient, the cleaned query, and a short candidate
  table (`fdcId · description · dataType`) with **your recommended pick first**.

**Fallback when there is no good USDA match** (pantry/compound items):
1. reuse the `nutrients` from an existing `../examples/*.foodnoms` entry for that
   item if one exists (search by name); else
2. create a `local:<UUID>` custom food from label data, or calories-only from the
   recipe's `Est. kcal`. Set `foodID: "local:<UUID>"`, **no** `source`, and treat
   it as an estimate.

---

## Step 3 — Fetch per-100 g blocks (Wolfram)

Paste `fdc-lookup.wl`, then for each matched id call `fdcToFoodNoms[fdcId]`.
Collect, per ingredient: `{fdcId, dataType, nutrients (per 100 g), amount, unit}`.

- USDA values are **per 100 g**. For `milliliter`-measured liquids, apply them
  per 100 ml assuming density ≈ 1 g/ml. Flag oils/syrups (density ≈ 0.9) if the
  amount is large enough to matter.

---

## Step 4 — Build the `.foodnoms` recipe file

Per `FOODNOMS_FORMAT.md` §6 (recipe = `contentType 2`, `collectionType 3`):

- **Header** `foodCollections[0]`:
  `{name, collectionType: 3, version: 1, traits: 0, totalServingSize: Σ amounts
  (g), servingSizeUnit: "gram", servings}`.
- **One `foodEntries[]` item per included ingredient:**
  - `name` (USDA description or the recipe's ingredient name),
  - USDA: `foodID: "foodnoms:usda:<fdcId>"`, `source: "usda"`,
    `secondarySource: fdcSecondarySource[dataType]`;
    fallback: `foodID: "local:<UUID>"` (no `source`),
  - `version: 1`, `baseAmount: 100`, `baseUnit` (`gram`/`milliliter`),
    `traits: 0`, `uncertainty: 0`,
  - `quantity`: the amount used (Step 1),
  - `measure: {unit: baseUnit, value: 1, traits: 0}`,
  - `nutrients`: the per-100 g block from Step 3.
- **Encode** with the LZFSE Python snippet (`FOODNOMS_FORMAT.md` §2) and save as
  `../examples/<Recipe Name> <ddmmyy>.foodnoms` (FoodNoms' own naming: date
  slashes dropped).

---

## Step 5 — Compute whole-recipe totals + write back the Nutrition table

Compute in Wolfram using the 16-nutrient vector from `RECIPE_FORMAT.md`
("Computing nutrition values"):

```wolfram
(* per-100g vectors, FoodNoms keys -> recipe's 16 slots; missing -> 0 *)
slots = {"calories","protein","carbs","sugars","fat","fatSaturated","fiber",
         "sodium",  (* -> converted to Salt below *)
         "iron","calcium","zinc","magnesium","potassium","vitaminD","vitaminB12","folate"};
n100    = <| "corn" -> (Lookup[block["corn"],   slots, 0]), ... |>;
amounts = <| "corn" -> grams, ... |>;
totals  = N[Total[Table[n100[k]*amounts[k]/100., {k, Keys[amounts]}]], 5];
```

Then map `totals` to the table rows, with these rules:

- **Salt** is reported, not sodium: `salt_g = sodium_total_mg * 2.5 / 1000`
  (FDC gives sodium).
- **Units / rounding** (match existing recipes):
  | Row | Unit | Round |
  |---|---|---|
  | Energy | kcal | whole |
  | Protein, Carbohydrates, — sugars, Fat, — saturates, Fibre, Salt | g | whole |
  | Iron, Zinc | mg | 1 dp |
  | Calcium, Magnesium, Potassium | mg | whole |
  | Vitamin D, Vitamin B12 | µg | 1 dp |
  | Folate | µg | whole |

Write back into the recipe `.md`:

- **Replace the Nutrition table** (4-col, 8 rows each — `RECIPE_FORMAT.md`) with
  the computed totals (whole recipe, never per serving).
- **Update the provenance italic note** above the table to:
  *"Total values for the whole recipe. **USDA-derived** — per-ingredient USDA
  FoodData Central values (per 100 g) summed in Wolfram; **not FoodNoms-verified**
  (replace on next cook per `../../docs/RATINGS.md`)."*
  Per `CLAUDE.md`, the "not FoodNoms-verified" flag **stays** — USDA is a better
  estimate, not a FoodNoms reconciliation. Only drop that flag for real
  FoodNoms-verified totals.
- **Reconcile the Ingredients table:** set each `Est. kcal` to
  `round(calories * amount / 100)` and update the **Total row** energy so the
  column sums to the new Nutrition Energy (`RECIPE_FORMAT.md` requires this).
- Also update the matching `remarks` row in `docs/RATINGS.md` if it carried an
  "estimates" caveat (adjust to "USDA-derived, not FoodNoms-verified").

---

## Step 6 — Verify

- **Round-trip** the `.foodnoms`: `json.loads(lzfse.decompress(...))` and confirm
  entries/quantities.
- **Cross-checks:** summed entry `calories` ≈ Nutrition Energy;
  `totalServingSize` ≈ Σ ingredient mass; `Est. kcal` column sum == Total row ==
  Nutrition Energy.
- **Spot-check** one or two ingredients' fetched values against FDC.

---

## Provenance (important)

USDA-derived totals are high-quality **estimates**, *not* FoodNoms-verified.
Keep the not-verified caveat (`CLAUDE.md` forward-protocol); only a real FoodNoms
reconciliation on a cook clears it. Flag any `ml≈g` approximations and any
custom-food fallbacks.

---

## Worked example (Japanese corn soup v3)

Running this on `recipes/soups/creamy-corn-soup-japanese-v3.md`:

- **Auto-match** (clean generic USDA hits): frozen corn, dry soybeans, onion,
  bok choi, spring onion.
- **Ask / fallback** (compound pantry items, no clean USDA generic): white miso
  (USDA *has* "Miso" — confirm), **tsuyu, dashi-soy, hon-mirin, shiitake powder,
  nori, nutritional yeast** — resolve from existing `examples/` entries or a
  `local:` custom food.
- **Omit**: sesame oil drizzle and nori/sesame garnishes if marked at-table
  (`Est. kcal` `—`).

This is the same recipe hand-built earlier; the generator replaces that manual
estimation with USDA data + a written-back Nutrition table.
