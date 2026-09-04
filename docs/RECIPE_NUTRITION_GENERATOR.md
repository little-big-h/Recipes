# Recipe Nutrition Generator (USDA → FoodNoms + Nutrition table)

A **playbook for another Claude**. Given a recipe markdown file, produce two
things from authentic USDA data:

1. a **`.foodnoms` recipe file** (importable into FoodNoms), and
2. a **USDA-sourced Nutrition table written back into the recipe `.md`**
   (plus a reconciled `Est. kcal` column).

It ties together the existing specs — read them first:

- `FOODNOMS_FORMAT.md` — the `.foodnoms` file shape (§6 recipe, §8 nutrients, §11 patches).
- `RECIPE_FORMAT.md` — the recipe `.md` Ingredients/Nutrition table conventions.
- `../tools/js/README.md` — the tool that does steps 2–4.

```
recipe.md ─▶ parse ingredients+amounts        (Step 1, by hand)
          ─▶ resolve each to a USDA fdcId     (Step 2, cli.js search — you judge)
          ─▶ write a recipe JSON spec         (Step 3)
          ─▶ cli.js build                     (Step 4: fetch, compute, write the file,
                                               cross-check against Wolfram)
          ─▶ write back the Nutrition table   (Step 5)
```

> **Where the work happens:** USDA lookup, the nutrition arithmetic and
> `.foodnoms` assembly all run **locally in `tools/js`** (Node, zero
> dependencies). Never Python; never hand-build the JSON; never rely on the
> Wolfram endpoint to produce the file. The endpoint is still used — as a
> download link and as an independent cross-check — see **Appendix A**.

---

## Prerequisites

- Node ≥ 20. `cd tools/js && npm test` should pass (69 tests, offline).
- The recipe `.md` to process.

That is the whole list. There is no Wolfram kernel step, and nothing to paste
into an evaluator.

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

```bash
cd tools/js
node cli.js search "butternut squash raw" 5
```

Output is `fdcId · dataType · description`, ranked by USDA relevance. **The tool
never auto-picks** — picking the top hit unseen is how "Squash, winter,
butternut, raw" quietly becomes a butternut squash *soup* record. Rank candidates
by dataType preference: **Foundation > SR Legacy > FNDDS > Branded**
(see `USDA_FDC.md`).

Use `node cli.js food <fdcId>` to see a candidate's full per-100 g block before
committing — useful when two records differ in which nutrients they even carry
(the one that actually has `sugars`/`calcium` is usually the one you want).

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

**Fallback when there is no good USDA match** (pantry/compound items), in order:

1. **The curated map** — `tools/ingredient-map.json`, referenced by `"ref"`
   (exact name or `foodID`). This wins over USDA where it has an entry; that is
   what it is for. See `INGREDIENT_MAP.md`.
2. Reuse the `nutrients` from an existing `../examples/*.foodnoms` entry.
3. A `local:` custom food from label data, or calories-only from the recipe's
   `Est. kcal`. No `source`; treat it as an estimate.

---

## Step 3 — Write the recipe JSON spec

```json
{
  "name": "Creamy Butternut & Soy Bean Soup [10-06-26] ✴️",
  "servings": 5,
  "ingredients": [
    { "fdcId": 2685570, "grams": 1918, "note": "butternut squash, cubed" },
    { "fdcId": 174270,  "grams": 326,  "note": "dry soybeans" },
    { "ref": "Hon-Mirin", "grams": 40, "unit": "milliliter" }
  ]
}
```

- `fdcId` pins a USDA record; `ref` looks up the curated map.
- `grams` is the quantity in the block's base unit. Metric only.
- `unit` defaults to `gram`; use `milliliter` for liquids.
- `uncertainty` — the per-entry tier (0 / 10 / 30). Required for **meal logs**
  (`collectionType: 2`); see `MEAL_LOGGING.md` → Uncertainty policy. For a recipe
  file it can be omitted.
- `note` becomes the entry's note.
- `"foodnoms": { … }` carries build options — `collectionType` (3 = recipe,
  default; 2 = meal), `emit`, `totalServingSize`, `uncertainty`.

**Density:** USDA values are per 100 g. For `milliliter`-measured liquids they
apply per 100 ml assuming density ≈ 1 g/ml. Flag oils/syrups (density ≈ 0.9) if
the amount is large enough to matter.

**Patching a USDA record.** When a record is right about the food but missing or
wrong on a nutrient, do **not** edit the numbers — that destroys the provenance.
Add a `patch` (the 3-tier weightless patch, `FOODNOMS_FORMAT.md` §11):

```json
{
  "fdcId": 169242, "grams": 30,
  "patch": { "vitaminD": 17.6 },
  "patchNote": "Sun-dried gills-up: ergosterol converts to D2; the raw record predates that step."
}
```

`build` then writes two companion `.foodnoms` files alongside the recipe — the
delta alone, and a "🩹 … #Patched" recipe showing the untouched USDA food plus
the patch, so the arithmetic stays auditable. Details and the two consequences
(URL routing, ingredient regrouping) are in `../tools/js/README.md` → Patches.

---

## Step 4 — Build the file

```bash
node cli.js compute recipe.json   # inspect the totals first
node cli.js build   recipe.json   # write the .foodnoms + cross-check
```

`compute` prints whole-recipe totals and — importantly — a **partial-coverage**
list naming any nutrient that only some ingredients reported. Those totals are
*floors*, not totals; say so rather than quoting them flat.

`build` writes the file and then diffs it against the Wolfram endpoint's
rendering of the same recipe. **Report the outcome, never swallow it:**

- **✓ equivalent** — say so; the file is trustworthy.
- **endpoint unreachable** — the file still stands (it does not depend on
  Wolfram). Say it was *not* cross-checked.
- **✗ differs** — **stop.** Do not ship the file or quote its numbers. Show the
  diff; two implementations disagreeing means one has a bug worth finding.

Save the file as `../examples/<Recipe Name> <ddmmyy>.foodnoms` (FoodNoms' own
naming: date slashes dropped). The download filename `build` chooses already
strips the `[DD-MM-YY]` stamp, emoji and `#`, and spells `&` as `and`; the full
stamped name is kept as the in-file collection name.

---

## Step 5 — Write back the Nutrition table

Take the totals from `cli.js compute` (or `build`'s cross-check) and map them to
the table rows, with these rules:

- **Salt** is reported, not sodium: `salt_g = sodium_total_mg * 2.5 / 1000`
  (FDC gives sodium; the tool derives `salt` for you).
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
  the computed totals (**whole recipe, never per serving**).
- **Update the provenance italic note** above the table to:
  *"Total values for the whole recipe. **USDA-derived** — per-ingredient USDA
  FoodData Central values (per 100 g) summed in `tools/js`; **not
  FoodNoms-verified** (replace on next cook per `../../docs/RATINGS.md`)."*
  Per `CLAUDE.md`, the "not FoodNoms-verified" flag **stays** — USDA is a better
  estimate, not a FoodNoms reconciliation. Only drop that flag for real
  FoodNoms-verified totals. Note the flag is **macros/salt only**: micros are
  committed best-estimates and are never caveated as pending verification.
- **Embed the FoodNoms download link** from `node cli.js url recipe.json`
  (required — `CLAUDE.md`). See **Appendix A**.
- **Reconcile the Ingredients table:** set each `Est. kcal` to
  `round(calories * amount / 100)` and update the **Total row** energy so the
  column sums to the new Nutrition Energy (`RECIPE_FORMAT.md` requires this).
- Also update the matching `remarks` row in `docs/RATINGS.md` if it carried an
  "estimates" caveat (adjust to "USDA-derived, not FoodNoms-verified").

---

## Step 6 — Verify

- **Read the entry names back.** `cli.js build`'s cross-check prints the
  endpoint's decoded recipe; check each USDA id resolved to the intended food
  (raw vs cooked, right variety, right bean). A mis-resolution shows up here
  immediately. Offline, decode the file directly — Appendix B.
- **Cross-checks:** summed entry `calories` ≈ Nutrition Energy;
  `totalServingSize` ≈ Σ ingredient mass; `Est. kcal` column sum == Total row ==
  Nutrition Energy.
- **Spot-check** one or two ingredients' fetched values against FDC.
- **Check the coverage report** from `compute` — any nutrient sourced from only
  some ingredients is a floor, and should be flagged as such rather than quoted.

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
  nori, nutritional yeast** — resolve from `tools/ingredient-map.json`, an
  existing `examples/` entry, or a `local:` custom food.
- **Omit**: sesame oil drizzle and nori/sesame garnishes if marked at-table
  (`Est. kcal` `—`).

---

# Appendix A — the Wolfram Cloud endpoints

Wolfram Cloud does **one** job now: serving a URL. Producing the file is Step 4.
Two Cloud Objects are deployed from `../tools/foodnoms-cloud.wl`:

- **`BuildFoodNomsRecipe`** — construction. Takes already-resolved ingredients
  and returns one `.foodnoms` file per call.
- **`ResolveFDC`** — the endpoint's own name→candidates search. **Superseded by
  `cli.js search`**, which is faster, cached, and does not spend the endpoint's
  FDC quota. Kept for reference.

## The download link (required in every recipe)

```bash
node cli.js url recipe.json
```

The URL **is** the artifact: clicking it issues a GET, and
`Content-Disposition: attachment` names the file — so it costs nothing to embed
and is how Holger gets the file onto a device. Embed it in the recipe's Nutrition
section.

`cli.js url` emits the `custom*` form: nutrients travel inline in the query
string and the endpoint makes **no FDC call at all**. That is what fixed the old
failure mode — see *Why the endpoints were failing* in `../tools/js/README.md`.
The exception is a patched ingredient, which must ride the `fdcIds` column
because `patchFor[]` keys off an `fdcId`.

**Query length is the live constraint.** Nutrients inline are not free: a
9-ingredient recipe is ~3.9 KB on endpoint v8, ~5.8 KB on v7, and common server
limits start at 8 KB. Check the length `cli.js url` prints on stderr for a large
recipe.

## Verifying the link

```bash
curl -s -H 'Accept: application/json' '<url>' | head -c 2000
```

Returns `{filename, recipe, totals, estKcal[], warnings}` — the same JSON view
`cli.js build` diffs against. Confirm HTTP 200 and that `totals` match the
Nutrition table. Without the `Accept` header the same URL returns the raw bytes
(`Vary: Accept` keeps caches from crossing the two views).

## Companion files via `emit`

One call → one file. Keep **all params identical** and change only `emit` to
fetch a patch companion; the recipe's `notes` lists the available names
(URL-encode them). `cli.js build` writes all of them locally in one go, so this
is only needed for the hosted copies.

## Endpoint version

`?emit=version` returns the deployed `$fnVersion`. Compare it against
`$fnVersion` in `../tools/foodnoms-cloud.wl` to tell whether a redeploy is
pending.

> **⚠ v8 is drafted but NOT deployed.** It adds `customSources` /
> `customSecondarySources` (USDA provenance on inline entries) and
> `nutrientNameSets` / `customNutrientSetIds` (interned nutrient-key lists, −33%
> URL length). Both default to empty, so all existing recipe URLs are unaffected.
> `cli.js url` still emits the v7 form until someone raises `endpointVersion` in
> `tools/js/lib/foodnoms-url.js`. Deploy steps: `../tools/js/README.md`.

## Endpoint design notes (unchanged, still true)

**No JSON crosses the wire.** Every field is its own **typed query parameter**,
parsed declaratively by the framework's interpreters (never `ImportString`, never
string surgery — see `CLAUDE.md`). The ingredient list is stored **decomposed**
(Holger's "DSM"): parallel typed arrays aligned by position, because
`CompoundElement` cannot carry typed tuples in a query string (Wolfram forbids
`DelimitedSequence[CompoundElement[…]]`). Mis-aligned column lengths → **HTTP
400** naming the offending arrays.

| Param | Type | Carries |
|---|---|---|
| `name` / `servings` / `emit` | String / Integer / String | recipe name, servings, which file |
| `collectionType` | Integer | 3 = recipe (default), 2 = meal |
| `totalServingSize` | Number (optional) | cooked yield in g; omit → Σ ingredient weights |
| `fdcIds` / `grams` | comma-lists | USDA ingredients — **endpoint resolves these itself** |
| `patchFdcIds` / `patchNutrientNames` / `patchDeltas` | comma-lists | sparse per-100 g patches |
| `customNames` / `customFoodIds` / `customQuantities` / `customUnits` | `;`-lists | inline foods |
| `customNutrientNames` / `customNutrientValues` | nested (`;` between foods, `,` within) | each inline food's block |
| `fdcUncertainties` / `customUncertainties` | aligned lists | per-entry uncertainty tier |
| `customBrands` / `customBarcodes` / `customUrls` / `customNotes` | `;`-lists | optional provenance |

---

# Appendix B — reading a `.foodnoms` already on disk

```bash
node -e 'import("./tools/js/lib/foodnoms-file.js").then(({foodnomsDecode,foodnomsTotals})=>{
  const j = foodnomsDecode(require("fs").readFileSync(process.argv[1]));
  console.log(JSON.stringify(j, null, 2));
  console.log(foodnomsTotals(j));
})' -- "path/to/recipe.foodnoms"
```

`foodnomsTotals` gives the 16 slots + derived `salt`. The container is an
**uncompressed** LZFSE block (`'bvx-'` + uint32-LE length + raw JSON + `'bvx$'`),
so this is a plain parse — no codec, and never Python.

Note FoodNoms' *own* exports are compressed (`'bvxn'` / `'bvx2'`);
`foodnomsDecode` refuses those loudly rather than parsing compressed bytes as
JSON. Read one of those in FoodNoms, or re-export.
