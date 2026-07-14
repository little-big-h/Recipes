# BuyWholeFoodsOnline — product & nutrition data via GraphQL

How to pull **product data and per-100 g macros** from
[buywholefoodsonline.co.uk](https://www.buywholefoodsonline.co.uk/) (BWFO), a
Magento-based UK wholefoods retailer. This is the reliable path for BWFO product
labels (the shop Holger orders from) — a companion to `docs/USDA_FDC.md` (USDA
generics) and the FoodNoms build pipeline.

> **Verified live 2026-07-01** from this project's environment (curl through the
> agent proxy reaches the host fine). Learned/handed over by a prior session.

---

## Access method — GraphQL, not HTML

**Do NOT scrape the HTML pages** — it's a JS-rendered SPA and the
listing/product pages are Cloudflare-protected. Hit the Magento **GraphQL API**
directly with `curl`:

- **Use GET, not POST.** POST to `/graphql` returns a Cloudflare **403** block
  page; GET queries pass cleanly (`curl -sG … --data-urlencode 'query={…}'`).
- **Always send a normal browser User-Agent** (a bare curl UA gets blocked):

```
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
```

- **Never use Python** for any part of this (fetch, parse, clean, output) — the
  project rule. Use `curl` + `jq`.

Endpoint: `https://www.buywholefoodsonline.co.uk/graphql`

---

## Single product — the common case

**By name** (fuzzy `match` — when you only have the display name):

```
curl -sG 'https://www.buywholefoodsonline.co.uk/graphql' -H "User-Agent: $UA" -H 'Store: default' \
  --data-urlencode 'query={products(filter:{name:{match:"chopped tomatoes"}}){total_count items{sku name url_key price_range{minimum_price{final_price{value}}}nutritional_tab{label value code}}}}'
```

**By SKU** (exact `eq` — when you already have it, e.g. from a category pull):

```
… --data-urlencode 'query={products(filter:{sku:{eq:"CONFSKU947572"}}){total_count items{sku name url_key nutritional_tab{value code}}}}'
```

> ⚠ **Do NOT filter by `url_key` with `eq`.** It is schema-valid (appears in
> `ProductAttributeFilterInput`) but **non-functional** — it silently ignores
> the filter and returns the whole ~2400-product catalog. `url_key` also rejects
> `match`. **Always check `total_count`:** thousands = your filter was ignored,
> results are garbage. Use `name:{match}` or `sku:{eq}`.

---

## Categories

Slug → uid (slug = last path segment of the listing URL,
`…/healthy-snacks-treats` → `healthy-snacks-treats`):

```
… --data-urlencode 'query={categoryList(filters:{url_key:{eq:"healthy-snacks-treats"}}){uid name}}'
```

Browse the whole tree:

```
… --data-urlencode 'query={categories{items{uid name url_key children{uid name url_key children{uid name url_key}}}}}'
```

All products in a category (`pageSize:250` covers any category seen so far;
check `total_count` / `page_info.total_pages` and paginate with `currentPage`):

```
… -H 'Store: default' --data-urlencode 'query={products(filter:{category_uid:{in:["MTI2"]}},pageSize:250,currentPage:1){total_count page_info{total_pages}items{sku name url_key price_range{minimum_price{final_price{value}}}nutritional_tab{label value code}}}}'
```

If unsure which fields filter, introspect rather than guess — but **test with a
known item and check `total_count`**, since schema-valid ≠ functional here:

```
… --data-urlencode 'query={__type(name:"ProductAttributeFilterInput"){inputFields{name}}}'
```

---

## Parsing `nutritional_tab`

Each item's `nutritional_tab` is a list of `{label, value, code}`, **all per
100 g**. Map by `code` (note the source's typo `enery`):

| code | field |
|:--|:--|
| `lb_enery_kcal` | kcal |
| `lb_fat` | fat |
| `lb_saturates` | saturates |
| `lb_carbohydrates` | carbs |
| `lb_sugars` | sugars |
| `lb_fibre` | fibre |
| `lb_protein` | protein |
| `lb_salt` | salt |

`price_range.minimum_price.final_price.value` = price in GBP. Product URL =
`https://www.buywholefoodsonline.co.uk/{url_key}.html`. Some items (herbs,
non-food) have an **empty `nutritional_tab`** — expected, not an error.

> ⚠ **`lb_carbohydrates` does NOT include fibre — fold it in before this reaches
> FoodNoms.** UK/EU labels (which is what this API returns) report `lb_carbohydrates`
> and `lb_fibre` as two independent lines; FoodNoms expects the **US FDA convention**,
> where fibre is a *subset* of the carbs total. Passing the raw UK figures straight
> through makes FoodNoms reject the food (`fiber + sugars` exceeds `carbs`) whenever
> fibre is non-trivial relative to carbs — bitten twice already (BWFO dried onion
> flakes: 35.3 g carbs / 36.5 g fibre; BWFO cacao nibs: 6 g carbs / 23.4 g fibre).
> **Always compute `carbs_for_foodnoms = lb_carbohydrates + lb_fibre`** before
> building the `customNutrientValues` — sugars stays as-is (already a subset either
> way). Do this for every BWFO ingredient with a fibre value worth mentioning, not
> just the ones that happen to trip the validator obviously.

**Ingredients are NOT exposed.** There is no ingredients field; `description.html`
/ `short_description.html` are marketing copy only (verified on the tinned
tomatoes). If a recipe needs the ingredient list, take it from the physical
label or state it as inferred — the API gives macros, price and URL, not
ingredients.

### Cleaning

Values are strings and inconsistent. Strip whitespace/tabs. Treat `Nil`,
`trace`, or any `<x` (e.g. `<1`, `<0.01`) as **0** and note you did so. Leave
genuinely absent fields blank rather than guessing.

### Data-quality cross-check

For every row with nutrition, compute a sanity energy (EU Atwater; missing → 0):

```
calc_kcal = 9*fat + 4*carb + 4*protein + 2*fibre
```

Flag any row where `|calc_kcal − label_kcal| / label_kcal > 0.25` as a **likely
label error**, not a real value. (This catches e.g. a dropped digit at the
source, or per-cake energy mislabelled as per-100 g.)

---

## Correctness checks (run before trusting output elsewhere)

Against the snacks category (uid `MTI2`, slug `healthy-snacks-treats`):
- `total_count` ≈ **144**.
- **Giant Salted Corn** (`sku eq "CONFSKU947682"`) = 434 kcal · 14 fat · 1.8 sat
  · 68 carb · 0.5 sugar · 6.7 fibre · 5.7 protein · 2 salt · £4.11.
- highest protein in that category = **Edamame Beans Roasted & Salted**, 43 g/100 g.
- the data-quality flag catches **Vegan Hickory Smoked Jerky Strips** (label 21.4
  kcal vs calc ~414 — dropped digit) and both **Kallo chocolate rice cake thins**
  (label ~230 vs calc ~490 — per-cake energy as per-100 g).

---

## If blocked

A Cloudflare HTML block page (`"Attention Required"` / `cf-error` in the body)
instead of JSON: retry **once** after a short delay with the UA header set. If it
persists, **don't hammer it** — BWFO will sustain a block across requests and
page loads. A different network path (host/IP, or a real browser session) helps
more than retrying harder.

---

## → FoodNoms

Feed the parsed per-100 g macros into `BuildFoodNomsRecipe` as a **custom food**
(estimate micros from the nearest USDA generic, per project policy):

- **`customBrands`** → `brandOwner` = `"Buy Whole Foods Online"` (the shop — the
  provenance that FoodNoms keeps).
- **Omit `customFoodIds`** → a stable UUID is auto-derived from name|brand|kcal.
- **`emit=fooddef`** for a reusable Foods-library entry (recommended); the
  serving is pinned to 100 g automatically (no serving-size param — FoodNoms
  forces per-serving on import; see FOODNOMS_FORMAT § *Serving size*).
- Keep the **product URL** here in this doc / the recipe file — **not** in the
  food. FoodNoms drops food-level `urlString`/`notes` on import (inert), so
  `customUrls`/`customNotes` don't survive a round-trip.

See `docs/FOODNOMS_FORMAT.md` and `docs/RECIPE_NUTRITION_GENERATOR.md`.
