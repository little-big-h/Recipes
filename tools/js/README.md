# `tools/js` — local USDA lookup & recipe nutrition

Local Node replacement for the two Wolfram jobs that were failing:

| Job | Was | Now |
|---|---|---|
| **A** — fetch USDA FoodData Central records, map to FoodNoms nutrient keys | `tools/fdc-lookup.wl`, run inside a Wolfram Cloud APIFunction | `lib/fdc.js` + `lib/nutrients.js`, local |
| **B** — scale per-100 g blocks by quantity, sum whole-recipe totals, **assemble the `.foodnoms` file** | `buildFoodNomsRecipe` in `tools/foodnoms-cloud.wl`, server-side | `lib/recipe.js` + `lib/foodnoms-file.js`, local |
| **C** — serve a clickable URL | Wolfram Cloud | **unchanged — still Wolfram Cloud** |

Job C is now hosting *only*: serving a URL is the one thing a local script cannot
do, and 52 recipe files embed those links. Producing the file is job B and
happens here. See *Why the endpoints were failing* below.

Zero dependencies. Node ≥ 20 (needs global `fetch`).

## Usage

```bash
cd tools/js

node cli.js search "butternut squash raw"   # rank FDC candidates — judge, then pin the fdcId
node cli.js food 169295                     # per-100 g FoodNoms block for one record
node cli.js compute examples/butternut-soup.json
node cli.js build   examples/butternut-soup.json   # writes the .foodnoms file
node cli.js url     examples/butternut-soup.json
node cli.js cache-clear                     # drop cached USDA records
npm test                                    # 69 tests, fully offline
```

## Generating the file, and checking it

`cli.js build` writes a real `.foodnoms` locally. The container is not
compressed — LZFSE compression is unavailable in Wolfram, but the LZFSE
container permits an uncompressed block, `'bvx-'` + uint32-LE length + raw JSON +
`'bvx$'`, and that variant is verified to import into FoodNoms
(Holger, 2026-06-12). So the file is plain JSON in a 12-byte wrapper.

That leaves **two independent implementations of the same format** — this repo's
JS and the deployed Wolfram APIFunction. An unchecked second implementation is
just an untested fork, so `build` diffs them automatically whenever the endpoint
is reachable:

```
wrote Butternut and Red Lentil Soup.foodnoms (7264 bytes)

  ✓ equivalent to the Wolfram endpoint (recipe JSON + totals)
```

Three outcomes:

- **✓ equivalent** — the file is trustworthy.
- **endpoint unreachable** — the file still stands; it no longer depends on
  Wolfram. Reported, not silently ignored.
- **✗ differs** — the diff is printed and the exit code is 1. Do not ship the
  file: two implementations disagreeing means one has a bug.

### The differential suite

```bash
npm run test:live      # 15 differential cases against the deployed endpoint
```

`npm test` is offline and always runnable. `npm run test:live` is the
differential suite: each case builds a recipe locally, asks the endpoint to build
the same one, and diffs the decoded JSON and the totals. It covers single and
multi-ingredient recipes, curated-map and mixed sources, millilitre units, meals
(`collectionType 2`), mixed uncertainty tiers, an explicit `totalServingSize`,
both standalone emit modes, patches (including the patched/unpatched ordering
trap), unicode names — the only check that the two `cleanFilename`
implementations agree — a 12-ingredient URL-length probe, and the deployed
`$fnVersion`.

When the endpoint is unreachable **every case skips** rather than failing. An
outage is not a defect in our code, and a suite that goes red to mean "Wolfram is
down" teaches people to ignore red.

Patched cases travel the endpoint's `fdcIds` path, so the endpoint does its own
USDA lookups for those — that is why there are only two.

The comparison is **semantic, not byte-for-byte**. Both sides serialise the same
JSON, but key order follows each implementation's association order and floats
print differently (Wolfram's `N[…,6]` vs JS's shortest round-trip). A byte diff
would fire on every run over differences FoodNoms cannot see, and we would learn
to ignore it. Numbers compare to a relative epsilon of 1e-6; the totals are
diffed separately from the recipe JSON, since the totals are what a Nutrition
block quotes.

`search` never auto-picks. Picking the top hit unseen is how "Squash, winter,
butternut, raw" quietly becomes a butternut squash *soup* record — so the
candidates are printed for a human, and the chosen `fdcId` gets pinned in the
recipe JSON.

## Recipe input

```json
{
  "name": "Butternut & Red Lentil Soup [04-09-26] ✴️",
  "servings": 4,
  "ingredients": [
    { "fdcId": 169295, "grams": 900, "note": "butternut squash, peeled & cubed" },
    { "ref": "Oil (Avocado)", "grams": 20, "uncertainty": 0 }
  ],
  "foodnoms": { "collectionType": 3 }
}
```

- `fdcId` pins a USDA record; `ref` looks up `tools/ingredient-map.json` by
  `foodID` or exact name. Curated map wins where it has an entry — that is what
  it is for.
- `nutrients` gives a one-off literal per-100 g block, for a food that is
  neither a USDA generic nor a reusable product — a whole restaurant dish
  logged from a weighed portion. This is the meal-log case
  (`docs/MEAL_LOGGING.md`: one dish = one entry, a single whole-dish estimate,
  never decomposed and never added to the curated map):
  ```json
  { "name": "Mixed Plate: fusilli+pesto, tofu, inari, nigiri", "grams": 467.5,
    "uncertainty": 10,
    "nutrients": { "calories": 135, "protein": 6.3, "carbs": 14.6, "fat": 6.3, "fiber": 2.2 } }
  ```
- `grams` is the quantity in the block's base unit. Metric only.
- `uncertainty` is the per-entry tier (0 / 10 / 30) from `docs/MEAL_LOGGING.md`.
- `foodnoms` passes options to the URL builder (`collectionType`, `emit`,
  `uncertainty`, `totalServingSize`, `includeUrls`).

Totals are **whole-recipe** (CLAUDE.md). Per-serving is derived only when
`servings` is given, and always printed alongside the total, never instead of it.

## Patches (the 3-tier weightless patch, FOODNOMS_FORMAT §11)

A USDA record is sometimes right about a food but missing a nutrient, or wrong
about one. Editing the numbers in place would destroy the provenance — the entry
would claim to be USDA record N while not matching it. So add a `patch`:

```json
{
  "fdcId": 169242,
  "grams": 30,
  "patch": { "vitaminD": 17.6 },
  "patchNote": "Sun-drying gills-up converts ergosterol to D2; the raw USDA record predates that step."
}
```

`build` then writes three linked objects — the recipe plus two companion files:

| | what it holds |
|---|---|
| the recipe entry | `(per100 + delta)/100` as **per-gram** nutrients (`baseAmount: 1`) |
| `<food> Patch` | the delta **alone**, as a reusable 1-serving food |
| `🩹 <food> #Patched` | 100 g of the **untouched** USDA food + one serving of the patch |

So the arithmetic stays visible and auditable, and the USDA half is still exactly
what USDA published. Companion ids are a stable hash of the food name, so a
companion emitted in a later call still links to the recipe referencing it.
`patchNote` defaults to a line naming the record and every adjustment.

Two consequences worth knowing:

- **A patched ingredient goes back through the endpoint's `fdcIds` column** in
  the generated URL. `patchFor[]` keys the patch columns off an `fdcId` and the
  `custom*` path has no equivalent, so that one ingredient reintroduces a
  server-side FDC call. A `custom*` URL would silently hand back an *unpatched*
  file, which is worse. Unpatched ingredients still travel inline.
- **Ingredient order is regrouped** (patched first) when any patch is present,
  because the endpoint builds the `fdcIds` column before the `custom*` one — if
  the two sides disagreed, every `collectionSortIndex` would be off by one and
  the cross-check would light up. `build` warns when it reorders.

A patch on a non-USDA ingredient is refused: there is no provenance to preserve.

Try it: `node cli.js build examples/patched-shiitake-broth.json`

## Why the endpoints were failing

`BuildFoodNomsRecipe` has always had two input paths:

- `fdcIds` + `grams` — **the endpoint calls `api.nal.usda.gov` itself**, once per
  ingredient, while the caller waits.
- `custom*` — nutrients supplied verbatim in the query string.
  `passthroughFoodEntry` does **zero network I/O**.

Everything brittle lived in the first path. The free FDC key allows ~1000
requests/day per IP, every ingredient costs one, and a per-ingredient failure
probability `p` compounds as `(1-p)^n` across `n` ingredients — which presents as
"large recipes are broken" while single lookups mostly work. On a bad day that
surfaced as a 503, or as the opaque
`400 {"Success":false,"Failure":"Failed to encode HTTPResponse"}` dissected at
length in `tools/fdc-lookup.wl`.

So: resolve and compute locally, emit the `custom*` form. The endpoint keeps the
one job it is genuinely good at and a local script cannot do — serving a stable
URL that mints the file on click — and stops doing the job that made it fail.

Being local buys two more things Wolfram Cloud could not:

- **A cache that survives.** Records are cached to `tools/js/.cache/fdc/`
  (git-ignored). Wolfram's memo was per-invocation, so it was thrown away
  between HTTP requests; on disk, a record fetched once is free forever.
  Measured on the 9-ingredient example: **1.83 s cold → 0.06 s cached.**
- **Retries that actually retry.** While building this, two raw `curl` calls to
  FDC died with `Connection reset by peer` and the same lookups through
  `lib/fdc.js` succeeded on retry.

## Endpoint v8 — drafted, pending deploy

Two limits of the `custom*` path need one endpoint change between them. Both are
drafted in `tools/foodnoms-cloud.wl` (`$fnVersion = 8`) and **not yet deployed**.

1. **Provenance.** `passthroughFoodEntry` always *read* `source` /
   `secondarySource` off an ingredient, but no query parameter *set* them — so a
   caller that knew the exact `fdcId` still produced entries indistinguishable
   from hand-typed ones. v8 adds `customSources` / `customSecondarySources`.

2. **URL length.** `customNutrientNames` was **53% of the URL** (3260 of 5776
   chars on the 9-ingredient example) — the same ~35 keys repeated per
   ingredient, holding only **3 distinct key sets across 9 foods**. v8 adds
   `nutrientNameSets` (each distinct set once) + `customNutrientSetIds` (a
   1-based index per food).

Measured on `examples/butternut-soup.json`:

| | v7 | v8 |
|---|---|---|
| URL length | 5776 | **3874** (−33%) |
| `source: "usda"` on entries | ✗ | ✓ |

That moves the ceiling from roughly 12 to 18 ingredients before an 8 KB server
limit bites.

Both parameters default to `{}`, so existing callers and all 52 recipe URLs in
the repo are unaffected. Note the saving only pays at a realistic key count: with
two nutrients per food, interning saves a few chars while the provenance columns
add ~190. There is a test pinning both behaviours.

### Deploying it

```bash
# 1. current live version (expect 7 before, 8 after)
curl -sS 'https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe?emit=version' \
     -H 'Accept: application/json'

# 2. redeploy — evaluate the CloudDeploy lines at the end of tools/foodnoms-cloud.wl
#    in an authenticated Wolfram Cloud session, as pirk0

# 3. re-probe, then raise the client default
```

Until step 3, `buildFoodNomsUrl` emits the v7 form. Opt in per call with
`{"foodnoms": {"endpointVersion": 8}}` in the recipe JSON; raise the default in
`lib/foodnoms-url.js` once the probe returns 8.

## Known gaps

**⚠ Nothing here has been validated against the live endpoint.** Wolfram Cloud
returned `503 Scheduled Upgrade` throughout this work, so the generated URL has
never been fetched and the v8 patch has never been executed — there is no
Wolfram kernel in this environment either, so it is verified only by review and
a delimiter-balance check. Jobs A and B are tested and verified against live FDC;
the handoff to Job C is **unverified**.

When the cloud is back:

```bash
node cli.js url examples/butternut-soup.json | xargs -0 curl -sS -H 'Accept: application/json' | head -c 2000
```

Check HTTP 200 and that `totals` match `node cli.js compute` — the same
verification `docs/RECIPE_FORMAT.md` already requires for a Nutrition block. Do
this on v7 *before* deploying v8, so a failure has only one possible cause.

## Fidelity notes

Two mapping traps from `fdc-lookup.wl` are reproduced deliberately, with tests,
because both yield plausible-looking wrong numbers rather than errors:

- **Energy.** Foundation foods often carry no plain `Energy` row, only the
  Atwater variants — fixture `2685570` has Atwater General `48.1323` and Atwater
  Specific `41.7165`, a 15% spread, so the preference order matters. The
  `unitName === "KCAL"` filter excludes the parallel kJ row.
- **Vitamin D.** A prefix match on `"Vitamin D (D2 + D3)"` also matches
  `"Vitamin D (D2 + D3), International Units"`, and the IU row is listed *first*.
  Fixture `171287` (egg) has IU `82` before µg `2` — the old bug emitted "82 µg",
  41x high. Exact-match the µg row; fall back to IU/40 only when it is absent.

A nutrient absent from a record is **omitted, never zeroed** — a missing row
means "not measured", and zeroing it silently understates a recipe total.
`compute` therefore reports per-nutrient coverage and flags totals that are
really floors (e.g. *manganese: from 4 of 9 ingredients*).

Fixtures under `test/fixtures/` are real recorded USDA records, so the suite runs
offline. A suite that hit the live API would burn the same daily quota the cache
exists to protect, and would go red whenever USDA did.

## API key

Uses the project's free FDC key (the same one committed in `tools/fdc-lookup.wl`).
Override with `FDC_API_KEY=... ` to spend a different key's quota.
