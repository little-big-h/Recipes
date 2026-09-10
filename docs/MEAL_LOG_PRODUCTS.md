# Meal-log products — already-estimated packaged/bakery items

Per-100g nutrition estimates already built for specific, repeatably-bought products
Holger snacks on, so a fresh session (in particular the `foodnoms-nutrition` routine,
which gets **no conversation history** — see `.claude/skills/foodnoms-nutrition/SKILL.md`)
doesn't have to re-derive them from scratch or guess blind when one of these shows up
in a logged meal. **Check here before estimating a bakery/packaged product's nutrition
by eye** — if it's listed, reuse the numbers below (scaled to the logged weight);
if not, estimate from label/ingredients per `docs/MEAL_LOGGING.md` and consider adding
the result here afterwards.

This is a different concern from `tools/ingredient-map.json` / `docs/INGREDIENT_MAP.md`,
which is scoped to **recipe ingredients** (`collectionType 3`, things Holger cooks with).
These are **meal-log foods** (`collectionType 2`, things Holger eats out) — a one-off
restaurant dish still gets a fresh per-dish estimate per `MEAL_LOGGING.md`, but a
*named, repeatably-bought product* (a specific bakery's specific pastry) is worth
keeping around, since Holger returns to the same bakeries.

None of these are FoodNoms-verified or label-sourced unless noted — they're
estimated from ingredients/bakery style, same status as any other meal-log estimate
(uncertainty 10 once a weight is attached, per the usual two-question test).

---

## Oishii Bakery (Singapore)

| Product | kcal | Protein | Carbs | Sugars | Fat | Fibre | Notes |
|:--|--:|--:|--:|--:|--:|--:|:--|
| Baked Tapioca-Pandan (木薯糕/タピオカパンダン) | 213 | 2.1g | 36.0g | — | 7.1g | 0.9g | Baked cassava/coconut-milk/pandan cake. Logged once at 128.2g (Sep 6). |
| Pandan Kaya (bar in box) | 326 | 4.4g | 41.7g | — | 15.5g | 0.5g | Pandan sponge + coconut-egg kaya jam bar. |
| Chiffon Pandan (S) | 315 | 5.2g | 39g | 26g | 15g | 0.6g | Plain pandan chiffon cake. Same product type identified twice this project (once from a photo alone, once from this shelf label) — figures reused between the two. |
| Toast Cake (HA HA) / 土司蛋糕 | 279 | 6.3g | 42.6g | 26g | 8.0g | 0.5g | Castella-style egg sponge loaf. |
| Mini Rolls Pandan | 327 | 3.9g | 38.2g | — | 17.7g | 0.5g | Pandan sponge roll, cream filling, gula melaka drizzle. |
| Gula Melaka-Onde | 370 | 4.4g | 44.5g | — | 19.7g | 3.3g | Pandan sponge + palm sugar syrup soak + desiccated coconut topping (the coconut is why fibre/fat run higher than the other pandan items). |

## Mandarin Oriental Singapore

| Product | kcal | Protein | Carbs | Sugars | Fat | Fibre | Sodium | Notes |
|:--|--:|--:|--:|--:|--:|--:|--:|:--|
| Four Treasures Mooncake — Assorted Nuts with Royal Chilli Sauce | 460 | 8g | 52g | 28g | 24g | 3g | 250mg | 2026 "Moonlit Harmony" collection. Halal-certified — confirmed no ham/lard. Traditional 五仁-style mixed-nut filling with a chilli twist. |

## Wu Pao Chun (Holland Village)

Taiwanese artisan bakery — butter/cream-forward reputation; no published nutrition
panel found for either, so these estimates lean toward the richer end of plausible
(see the conversation where this was flagged as lower-confidence than usual: the
top-down and bottom-up passes weren't independent signals here, both built from the
same "rich butter scone" prior).

| Product | kcal | Protein | Carbs | Sugars | Fat | Fibre | Notes |
|:--|--:|--:|--:|--:|--:|--:|:--|
| Classic Scone (招牌司康) | 380 | 6.7g | 43.4g | ~12g | 19.4g | 1.2g | Cake flour, dairy whipping cream, butter, egg yolk, buttermilk (from label). |
| Cocoa Scone (巧克力司康) | 392 | 6.5g | 45.1g | — | 20.5g | 1.6g | As Classic + cocoa chips. |

---

## Adding a new product here

When a meal-log dish turns out to be a specific, repeatably-bought bakery/packaged
product (not a one-off restaurant plate — see `MEAL_LOGGING.md`'s "never decompose a
restaurant dish" rule, which still applies to *composition*, just not to whether the
*whole-product estimate* is worth keeping), add a row: product name, per-100g macros,
and a one-line note on what it's made of and where the estimate came from. Keep it
grouped by vendor.
