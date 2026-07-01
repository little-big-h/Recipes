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

## Hosted endpoints (preferred) — `ResolveFDC` + `BuildFoodNomsRecipe`

Steps 2–5 below are deployed as **two** Wolfram Cloud Objects, kept deliberately
separate because they are different kinds of operation:

- **`ResolveFDC`** — *resolution* (Step 2). A fuzzy, ranked **name → USDA candidates**
  search. Its output is options **to be judged**, never auto-committed.
- **`BuildFoodNomsRecipe`** — *construction* (Steps 3–5). A deterministic
  **resolved-ingredients → `.foodnoms` + totals** function. It takes only `fdcId`s (or
  pass-through foods) and never searches.

Source of truth: `../tools/foodnoms-cloud.wl` (Section A is a synced copy of
`fdc-lookup.wl`; re-sync + redeploy if that changes). Deploy once, authenticated as the
cloud owner:
`CloudDeploy[resolveAPI, CloudObject["ResolveFDC"], Permissions -> "Public"]` and
`CloudDeploy[foodnomsAPI, CloudObject["BuildFoodNomsRecipe"], Permissions -> "Public"]`.

**No JSON crosses the wire.** Every field is its own **typed query parameter**, parsed
declaratively by the framework's interpreters (never `ImportString`, never string
surgery — see CLAUDE.md). The ingredient list is stored **decomposed** (Holger's "DSM"):
parallel typed arrays, aligned by position — `CompoundElement` can't carry typed tuples
in a query string (Wolfram forbids `DelimitedSequence[CompoundElement[…]]`). Build URLs
with `URLBuild` so values are percent-encoded — that carries the `✴️`/`🩹` glyphs as
UTF-8 with no shell-mangling and no `\uXXXX` games.

### 1. Resolve (Step 2) — you pick the `fdcId`

```bash
curl -s 'https://www.wolframcloud.com/obj/pirk0/ResolveFDC?queries=butternut%20squash%20raw;dry%20soybeans&n=5'
```
`queries` is a `;`-separated list. → `{"results":[{"query":"…","candidates":[{"fdcId":…,`
`"description":"…","dataType":"…","baseAmount":100,"baseUnit":"gram","nutrients":{…}},…]},…]}`.
Each candidate carries its **per-100 g nutrients**, so you can pick on the numbers, not
just the name (e.g. the record that actually has `sugars`/`calcium`). Rank by `dataType`
(Foundation > SR Legacy > FNDDS > Branded) and food-identity match, **ask when ambiguous**.
Advisory only — `BuildFoodNomsRecipe` won't pick for you.

### 2. Build (Steps 3–5) — already-resolved ingredients only

`BuildFoodNomsRecipe` emits **one raw `.foodnoms` file per call**, chosen by `emit`
(default `recipe`). Parameters:

| Param | Type | Carries |
|---|---|---|
| `name` / `servings` / `emit` | String / Integer / String | recipe name, servings, which file |
| `totalServingSize` | Number (optional) | cooked yield in g; omit → Σ ingredient weights |
| `fdcIds` / `grams` | comma-lists (Integer / Number) | USDA ingredients, **positionally aligned** |
| `patchFdcIds` / `patchNutrientNames` / `patchDeltas` | comma-lists | sparse per-100 g patches (patch applies to that fdcId) |
| `customNames` / `customFoodIds` / `customQuantities` / `customUnits` | `;`-lists | non-USDA foods (label / `local:`), nutrition given directly |
| `customNutrientNames` / `customNutrientValues` | nested (`;` between foods, `,` within) | each custom food's nutrient block |

```bash
# squash soup: 7 USDA ingredients + a sugars patch on the butternut + a custom (Hon-Mirin)
curl -s -o "Creamy Butternut & Soy Bean Soup.foodnoms" \
  'https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe?name=Creamy+Butternut+%26+Soy+Bean+Soup&servings=5&fdcIds=168436,2707442,170926,174270,2685570,2709767,2707439&grams=16,80,6.5,326,1918,850,52&patchFdcIds=2685570&patchNutrientNames=sugars&patchDeltas=2.2&customNames=Hon-Mirin&customFoodIds=local:DC95FB78-…&customQuantities=40&customUnits=milliliter&customNutrientNames=calories,carbs,sugars,fat,sodium&customNutrientValues=189,46,38,0.5,60'
```

Ingredient kinds: **USDA** (an `fdcIds`/`grams` pair); **USDA + patch** (also list its
fdcId in `patchFdcIds` with the nutrient/delta); **custom** (a `custom*` column set —
nutrition supplied directly, for non-USDA foods). Mis-aligned column lengths → **HTTP
400** naming the offending arrays.

**Response — content-negotiated on the `Accept` header** (same URL, two views of the
one recipe resource):

- **`Accept: application/json` → the JSON view (preferred for the write-back).** Returns
  `{filename, recipe, totals (16 slots + salt), estKcal[], warnings}` as plain JSON — no
  `bvx-` wrapper. This is the fast path for **Step 5**: `totals` is computed for you (no
  client-side LZFSE decode), `estKcal[]` reconciles the Ingredients column, and
  `recipe.foodEntries[].name` lets you **verify each USDA id resolved to the right food**
  (a raw-vs-cooked / wrong-bean mismatch shows up here immediately). `warnings` is surfaced
  as a top-level array.
  ```bash
  curl -s -H 'Accept: application/json' \
    'https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe?name=Soup&fdcIds=169295&grams=500'
  ```
- **Default (no/other `Accept`, e.g. a browser or `curl -o`) → the raw `.foodnoms` bytes**
  (`application/octet-stream`), so a GET on the URL or `curl -o recipe.foodnoms …` still
  writes the file directly. `Vary: Accept` is set so caches don't cross the two views.

For a `.foodnoms` you only have **on disk** (no rebuild), still read totals back with
`foodnomsTotals[ByteArray[BinaryReadList["recipe.foodnoms"]]]` (16 slots + `salt`);
`foodnomsDecode` returns the JSON to inspect. **`warnings` + the companion-file menu** are
*also* written into the recipe collection's **`notes`** (visible in FoodNoms and via
`foodnomsDecode`) — unknown `emit`, unmapped dataType, or a skipped ingredient surface there.

#### Emitting each file

One call → one file. The recipe and each patch-provenance object (`FOODNOMS_FORMAT.md`
§11) are separate files; their `local:` foodIDs are **deterministic** (hashed from the
food name), so a companion file fetched in a later call still links to the recipe. Keep
**all params identical** and change only `emit` — the recipe's `notes` lists the companion
names (URL-encode them):

```bash
# recipe (default) — its notes list the companions
curl -s -o "Soup.foodnoms" \
  'https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe?name=Soup&fdcIds=169295&grams=500&patchFdcIds=169295&patchNutrientNames=sodium&patchDeltas=200'
# a companion: same params, add &emit=<url-encoded name>
curl -s -o "Patch.foodnoms" \
  'https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe?name=Soup&fdcIds=169295&grams=500&patchFdcIds=169295&patchNutrientNames=sodium&patchDeltas=200&emit=Squash%2C%20winter%2C%20butternut%2C%20raw%20Patch'
```

#### Clickable download link (markdown)

Because the spec is plain query params, the same URL **is** a markdown download link —
clicking issues a GET and the `Content-Disposition: attachment` header names the file. No
POST body needed. Build it with `URLBuild["…/BuildFoodNomsRecipe", {"name"->…, "fdcIds"->…, …}]`
(percent-encodes everything, glyphs included). Query strings cap ≈8 KB; a typical recipe is
~0.5 KB. A worked link lives in the squash-soup recipe's Nutrition section
(`../recipes/soups/butternut-soybean-soup.md`).

The **download filename** is sanitized server-side (`cleanFilename`): the `[DD-MM-YY]`
stamp, emoji and `#` are dropped and `&`→`and`, so `…&name=…Soup [10-06-26] ✴️` saves as
`… Soup.foodnoms` (and the `🩹 … #Patched` companion as `… Patched.foodnoms`). The full stamped name is kept as the in-file collection name (the
"description" FoodNoms shows), so pass `name` with the stamp as normal.

Then do **Step 5's write-back** (Nutrition table + `Est. kcal`) from `foodnomsTotals`
on the downloaded file, and **Step 6 verify**. The manual Steps 2–5 below remain the
fallback if the endpoints are unavailable.

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

- **Round-trip** the build: re-request with `Accept: application/json` and confirm
  `recipe.foodEntries[]` names/quantities and that each USDA id resolved to the intended
  food (raw vs cooked, right variety). No decode needed — this is the JSON view. (For a
  file already on disk, `foodnomsDecode[ByteArray[BinaryReadList[…]]]` in Wolfram is the
  decode path; never `lzfse`/Python.)
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
