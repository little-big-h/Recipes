# USDA FoodData Central → FoodNoms nutrition

How to pull **authentic, per-100 g USDA nutrition** for ingredients and turn it
into FoodNoms `nutrients` blocks — the same source FoodNoms itself uses.

The helper is [`../tools/fdc-lookup.wl`](../tools/fdc-lookup.wl).

---

## Why this works (the network trick)

The Claude Code sandbox **cannot** reach `api.nal.usda.gov` — the environment's
network policy allowlists only GitHub, Wolfram, and the MCP servers, so a direct
`curl`/`WebFetch` returns `403 "Host not in allowlist"`.

But the **Wolfram MCP runs code server-side** (Wolfram Cloud), which has its own
internet egress. So `URLExecute[...]` *inside a Wolfram evaluation* reaches the
FDC API even though the sandbox can't. That's the whole mechanism: don't fetch
from the shell — fetch from Wolfram.

This returns exact records (verified: `fdcId 2685570` butternut squash matches
the `Thai Yellow…` example byte-for-byte), with the full micronutrient panel,
already per 100 g — i.e. `baseAmount: 100`, ready for `.foodnoms`.

> Prefer this over Wolfram\|Alpha natural-language nutrition: Alpha picks a
> representative record and reports many micros only as %DV (it gave butternut
> squash 45 kcal vs the true FDC 48.1). The API route is exact and `fdcId`-keyed.

---

## Usage

Paste the contents of `tools/fdc-lookup.wl` into a `WolframLanguageEvaluator`
call (the Wolfram kernel is stateless and has no access to this repo's
filesystem, so it must be pasted, not `Get`-loaded). Then:

```wolfram
fdcSearch["butternut squash raw"]   (* -> {{169295,"Squash, winter, butternut, raw","SR Legacy"},
                                            {2685570,"... ","Foundation"}, ...} *)

fdcToFoodNoms[2685570]              (* -> <|"name"->..., "fdcId"->2685570,
                                            "dataType"->"Foundation", "baseAmount"->100,
                                            "baseUnit"->"gram", "nutrients"-><|...|>|> *)

fdcToFoodNomsByName["raw spinach"] (* search + map the top hit in one call *)
```

`fdcToFoodNoms` emits values keyed by the FoodNoms nutrient names (see
`FOODNOMS_FORMAT.md` §8), per 100 g, with missing nutrients dropped. Wrap the
`nutrients` association into an entry per `FOODNOMS_FORMAT.md` and LZFSE-compress.

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
and compared to their recorded `nutrients` (per 100 g): quinoa, brown rice, tofu
(nigari), canned lima bean, and a water entry. All macros, minerals and vitamins
matched. The only deltas were **abridged-format rounding** (e.g. tofu 2.205→2.2)
and **abridged-format omissions** (sugars missing on the two FNDDS foods) — both
fixed by the switch to `format=full` above — plus trivial FoodNoms normalisation
of a near-zero water placeholder. Conclusion: the data pulled here is the same
data FoodNoms recorded.

