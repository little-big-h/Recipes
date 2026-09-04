# USDA FoodData Central → FoodNoms nutrition

How to pull **authentic, per-100 g USDA nutrition** for ingredients and turn it
into FoodNoms `nutrients` blocks — the same source FoodNoms itself uses.

> ## ⚠ Read this first — the tool is now `tools/js`
>
> **Use [`../tools/js`](../tools/js/README.md), not the Wolfram helpers below.**
>
> ```bash
> cd tools/js
> node cli.js search "butternut squash raw"   # ranked candidates
> node cli.js food 169295                     # per-100 g FoodNoms block
> ```
>
> `../tools/fdc-lookup.wl` is **retained for reference** — its nutrient-mapping
> logic is the spec `lib/nutrients.js` was ported from, and its comments document
> two traps worth understanding (see *Mapping traps* below). Do not run it for new
> work: it burns the FDC quota without the local cache, and its results are not
> cross-checked.
>
> The Cloud Objects (`ResolveFDC`, `BuildFoodNomsRecipe`) still exist. Their only
> remaining job is **hosting the download link and providing an independent
> cross-check** — see `RECIPE_NUTRITION_GENERATOR.md` → Appendix A.

---

## Network access (corrected 2026-09-04)

**`api.nal.usda.gov` is reachable directly.** Verified: HTTP 200 on both
`/foods/search` and `/food/{id}?format=full` from the session container.

> **Superseded.** This document previously stated that the sandbox could not
> reach the FDC API and that routing `URLExecute` through Wolfram Cloud's
> server-side egress was the necessary workaround. That was true under an earlier
> network policy and is **no longer true** — it was the sole architectural reason
> the FDC call lived inside a Wolfram APIFunction, and removing it is what
> `tools/js` is. A transient connection reset can still occur; `lib/fdc.js`
> retries with backoff.

Fetching locally also buys a cache that survives between runs
(`tools/js/.cache/fdc/`, git-ignored). The free key allows ~1000 requests/day per
IP and every ingredient costs one, so this matters: measured on a 9-ingredient
recipe, **1.83 s cold → 0.06 s cached**.

The API returns exact records (verified: `fdcId 2685570` butternut squash matches
the `Thai Yellow…` example byte-for-byte), with the full micronutrient panel,
already per 100 g — i.e. `baseAmount: 100`, ready for `.foodnoms`.

> Prefer this over Wolfram\|Alpha natural-language nutrition: Alpha picks a
> representative record and reports many micros only as %DV (it gave butternut
> squash 45 kcal vs the true FDC 48.1). The API route is exact and `fdcId`-keyed.

---

## Usage

```bash
cd tools/js

node cli.js search "butternut squash raw" 5
#   169295  SR Legacy        Squash, winter, butternut, raw
#  2685570  Foundation       Squash, winter, butternut, raw

node cli.js food 2685570
# { "name": "…", "fdcId": 2685570, "dataType": "Foundation",
#   "baseAmount": 100, "baseUnit": "gram", "nutrients": { … } }
```

Values are keyed by the FoodNoms nutrient names (see `FOODNOMS_FORMAT.md` §8),
per 100 g, with **missing nutrients dropped rather than zeroed** — a missing row
means "not measured", and zeroing it would silently understate a recipe total.

To go from blocks to a finished file, don't assemble entries by hand: write a
recipe JSON and run `cli.js build` (`RECIPE_NUTRITION_GENERATOR.md` Steps 3–4).
There is no compression step — the container is an uncompressed LZFSE block.

---

## Mapping traps

Two USDA quirks produce plausible-looking wrong numbers rather than errors. Both
are handled in `lib/nutrients.js` and pinned by tests; know them before trusting
any hand-read of a record.

- **Energy.** Foundation foods often carry **no plain `Energy` row at all**, only
  `Energy (Atwater General Factors)` and `Energy (Atwater Specific Factors)` —
  which can differ by 15% (fdcId 2685570: 48.13 vs 41.72 kcal). Prefer plain
  `Energy`, then Atwater General, then Atwater Specific; and filter on
  `unitName == "KCAL"` or you may pick up the parallel kJ row.
- **Vitamin D.** A prefix match on `"Vitamin D (D2 + D3)"` also matches
  `"Vitamin D (D2 + D3), International Units"`, and **the IU row is usually
  listed first**. Egg (fdcId 171287) lists IU `82` before µg `2` — reading the
  first match gave "82 µg", 41× too high. Take the µg row by exact name; fall
  back to IU/40 only when it is absent.

---

## Picking the right record

A search returns several `dataType`s for the same food. Rule of thumb:

1. **Foundation** — best: directly analysed, richest micronutrient coverage.
2. **SR Legacy** — solid historical reference data.
3. **Survey (FNDDS)** — modelled "as eaten"; good fallback, used by many of the
   FoodNoms examples.
4. **Branded** — manufacturer label data; only when you specifically want a product.

When you write the entry, you can set `foodID: "foodnoms:usda:<fdcId>"`,
`source: "usda"`, and map the chosen `dataType` to `secondarySource` with
`fdcSecondarySource[]`: Foundation→`foundation_food`, SR Legacy→`sr_legacy_food`,
Survey (FNDDS)→`survey_fndds_food`.

---

## Caveats

- **Full format, not abridged.** The helper requests `format=full`. The
  `abridged` format **rounds** values (e.g. tofu MUFA 2.205 → 2.2) and **omits**
  some nutrients (sugars is absent on several FNDDS foods), so it does not match
  FoodNoms' stored numbers; full carries the unrounded, complete panel. (Full
  rows are shaped `{"nutrient": {"name","unitName"}, "amount"}`, hence the
  `fdcRow*` accessors; unit matching is case-insensitive.)
- **Sugars naming.** Total sugars appears as either *Sugars, total including
  NLEA* or *Total Sugars* depending on dataset; `fdcSugars` matches both and
  excludes *added* sugars.
- **Energy field.** Foundation foods often have no plain `Energy/KCAL` row; the
  helper falls back to *Energy (Atwater General Factors)* then *Specific*
  (`fdcEnergyKcal`). This is why butternut resolves to 48.1 kcal, not blank.
- **API key.** `DEMO_KEY` is rate-limited (~30 req/hr, 1000/day per IP) and is
  easy to trip on a batch (returns HTTP 429 `OVER_RATE_LIMIT`). For real work set
  a free key: `$FDCApiKey = "..."` (sign-up:
  <https://fdc.nal.usda.gov/api-key-signup.html>).
- **Coverage.** Not every food carries every micronutrient; absent keys are
  omitted rather than zeroed.
- **Provenance.** These are authentic USDA values, but per project policy a recipe
  is only "FoodNoms-verified" once reconciled in FoodNoms on a real cook — USDA
  lookups are high-quality *estimates*, not a substitute for that step.

---

## Verification

Five randomly-picked USDA-sourced entries from `examples/` were re-fetched live
(with `format=full`) and compared to their recorded `nutrients` (per 100 g):
**158/163 fields exact.**

| Ingredient | fdcId | dataType | Result |
|---|---|---|---|
| Quinoa (Uncooked) | 168874 | SR Legacy | 31/31 exact |
| Tofu (Hard, Nigari) | 174291 | SR Legacy | 30/30 exact |
| Brown Rice, Raw | 169703 | SR Legacy | 36/36 exact |
| Lima Bean (Canned) | 2709850 | FNDDS | 31/33 |
| No Water | 2710706 | FNDDS | 30/33 |

The three SR Legacy foods are byte-exact. The five residual deltas are all on
FNDDS entries and are FoodNoms-side, not API errors: trivial normalisation of a
near-zero water placeholder (No Water: `sodium 0 vs 3`, `water 100 vs 99.9`,
`copper 0 vs 0.008`) and ~0.06% precision on two Lima Bean values (`carbs
18.62 vs 18.6`, `water 70.64 vs 70.6`).

This also confirmed the move from `abridged` to `full`: with abridged, tofu's
fats came back rounded (`2.205→2.2`) and sugars was missing on the FNDDS foods;
with full, both are exact. Conclusion: the data pulled here is the same data
FoodNoms recorded.

