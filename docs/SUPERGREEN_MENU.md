# Supergreen (Singapore) — menu ingredient & nutrition reference

Source: https://www.supergreen.sg/menu (ingested 2026-09-29). This is a
build-your-own salad-bowl chain — base + toppings + protein + dressing.
Several logged meals this project (soba/tofu/broccoli/edamame/kimchi bowls)
look like they could be Supergreen bowls — unconfirmed, not retroactively
corrected (Holger's call, 2026-09-29: past logs stand, use this data going
forward).

## What Supergreen publishes vs. what's estimated here

Supergreen's own menu gives **calories and protein only**, per stated serving
weight, for every signature bowl and every build-your-own component. No carbs,
fat, sugar, fibre or sodium are published anywhere on the menu.

**Method used below — kcal and protein are the anchor, everything else is
solved to stay consistent with them:**

1. **Protein** = Supergreen's published value, unchanged. Where Supergreen
   doesn't give protein (a few build-your-own items, all dressings), a
   typical-composition estimate is used instead, held fixed — never scaled
   by calorie density, since a richer dressing is richer in oil/sugar, not
   protein.
2. **Carbs and fat** are solved so that `4×protein + 4×carbs + 9×fat` equals
   Supergreen's published calories *exactly*, splitting the remainder between
   carbs and fat using a typical-composition analog for that ingredient (e.g.
   raw romaine lettuce for "Romaine Lettuce", plain cooked rice for "Brown
   Rice") to fix the *ratio*, not the absolute amount.
3. **Fibre and sugar** are scaled from the same analog, in proportion to how
   much the solved carbs+fat differ from the analog's own carbs+fat — so a
   denser preparation gets proportionately denser fibre/sugar too.
4. **Sodium** is taken as the analog's typical absolute value, un-scaled —
   salt content is a seasoning choice, not something that tracks calorie
   density the way macros do.
5. **Signature bowls** are reconciled the same way, but the "analog ratio" is
   the average across the bowl's listed components (equal weight — Supergreen
   doesn't publish the gram-split within a bowl), anchored to the bowl's own
   published total kcal/protein.

Every row below satisfies `4×protein + 4×carbs + 9×fat == published kcal`
by construction — that's the whole point of doing it this way instead of
guessing a whole independent macro profile.

**Micros beyond sodium are out of scope here** (too many SKUs to pre-tabulate
at reasonable confidence — iron/calcium/vitamins vary batch-to-batch for
fresh veg anyway). When a specific Supergreen bowl is actually logged, pull
those from `docs/USDA_FDC.md` / `tools/ingredient-map.json` per the usual
`docs/MEAL_LOGGING.md` playbook, using the component list here to know what
to look up.

**Status for `.foodnoms` purposes:** kcal + protein = label-sourced
(uncertainty tier 0 once weighed). Carbs/fat/fibre/sugar/sodium here are
still an *estimate*, just one constrained to match the label — treat as
uncertainty 10 territory unless Holger says otherwise, and say so in the
entry's note if this table informed the figures used.

---

## Signature bowls (per 100g, reconciled)

| Bowl | kcal | Protein | Carbs | Sugars | Fat | Fibre | Sodium | Price | Allergens |
|:--|--:|--:|--:|--:|--:|--:|--:|--:|:--|
| Grilled Salmon Bowl | 113 | 9.1g | 10.6g | 6.9g | 3.8g | 0.7g | 121mg | $15.30 | Gluten, Soy, Fish, Eggs, Sesame |
| Yakiniku Beef Bowl | 201 | 11.4g | 13.3g | 7.6g | 11.3g | 1.8g | 485mg | $13.80 | Gluten, Eggs, Sesame, Soy, Allium, Peanuts |
| Teriyaki Chicken Bowl | 105 | 6.7g | 11.0g | 5.5g | 3.8g | 1.2g | 359mg | $12.30 | Gluten, Eggs, Soy, Allium |
| Lean Chicken Bowl | 98 | 10.5g | 7.4g | 3.5g | 3.0g | 1.3g | 323mg | $12.30 | Gluten, Allium, Eggs, Soy |
| Mala Prawn Bowl | 95 | 6.5g | 8.0g | 5.0g | 4.1g | 0.8g | 199mg | $13.80 | Gluten, Eggs, Soy, Allium, Shellfish, Dairy |
| Smoked Duck Bowl | 111 | 8.1g | 10.3g | 7.1g | 4.1g | 0.8g | 281mg | $12.30 | Allium, Gluten, Sesame, Shellfish, Eggs, Soy |
| Vegan Power Bowl | 100 | 3.8g | 14.2g | 7.1g | 3.1g | 2.0g | 121mg | $12.30 | Allium |

(Serving weights and ingredient lists unchanged from Supergreen's menu — see
below for what's in each. These per-100g figures are the reconciled versions;
scale by the bowl's actual serving weight, or better, the weighed portion, for
a real log.)

| Bowl | Serving weight | Ingredients |
|:--|--:|:--|
| Grilled Salmon Bowl | 430g | Grilled Salmon, Fresh Cucumber, Purple Cabbage, Roasted Pumpkin, Sesame Tofu, Honey Lime Dressing |
| Yakiniku Beef Bowl | 420g | Yakiniku Beef, Sous Vide Egg, Achar, Edamame, Sesame Tofu, Ginger Soy Dressing |
| Teriyaki Chicken Bowl | 460g | Teriyaki Chicken, Fresh Cucumber, Sous Vide Egg, Sweet Potato, Broccoli, Ginger Soy Dressing |
| Lean Chicken Bowl | 420g | Rosemary Sous Vide Chicken, Hard Boiled Egg, Edamame, Broccoli, Chickpea Relish, Ginger Soy Dressing |
| Mala Prawn Bowl | 340g | Mala Prawn, Purple Cabbage, Corn, Raisins, Broccoli, Spicy Mayo Dressing |
| Smoked Duck Bowl | 395g | Smoked Duck, Fresh Cucumber, Kimchi, Sesame Tofu, Roasted Baby Corn, Honey Lime Dressing |
| Vegan Power Bowl | 370g | Edamame, Corn, Purple Cabbage, Chickpea Relish, Sweet Potato, Raisins, Mint Jalapeño Dressing |

---

## Build Your Own Bowl (from $10.30) — reconciled per 100g

### Bases (pick up to 2)

| Base | kcal | Protein | Carbs | Sugars | Fat | Fibre | Sodium | Allergens |
|:--|--:|--:|--:|--:|--:|--:|--:|:--|
| Romaine Lettuce | 18 | 2.2g | 1.9g | 0.7g | 0.2g | 1.2g | 8mg | — |
| Brown Rice | 162 | 3.7g | 34.0g | 0.3g | 1.2g | 2.6g | 5mg | — |
| Fusilli Pasta | 181 | 6.0g | 35.7g | 0.9g | 1.6g | 2.6g | 1mg | Gluten |
| Soba Noodle | 121 | 5.0g | 25.0g | 0.6g | 0.1g | 2.3g | 68mg | Gluten |

### Cold/hot toppings (pick 4)

| Topping | kcal | Protein | Carbs | Sugars | Fat | Fibre | Sodium | Allergens |
|:--|--:|--:|--:|--:|--:|--:|--:|:--|
| Japanese Cucumber | 27 | 2.2g | 4.2g | 2.0g | 0.1g | 0.6g | 2mg | — |
| Sweet Corn | 62 | 2.2g | 11.5g | 2.5g | 0.8g | 1.3g | 15mg | — |
| Edamame | 129 | 11.9g | 9.4g | 2.1g | 4.9g | 4.9g | 6mg | — |
| Kimchi | 24 | 2.0g | 2.7g | 1.1g | 0.6g | 1.8g | 498mg | Gluten, Shellfish, Allium |
| Japanese Seaweed | 50 | 0.0g | 10.9g | 0.7g | 0.7g | 0.6g | 600mg | Gluten |
| Cherry Tomato | 29 | 1.8g | 4.9g | 3.3g | 0.3g | 1.5g | 5mg | — |
| Raisin | 352 | 4.0g | 82.8g | 61.9g | 0.5g | 3.9g | 11mg | — |
| Purple Cabbage | 32 | 0.0g | 7.5g | 3.9g | 0.2g | 2.1g | 27mg | — |
| Hard Boiled Egg | 149 | 12.7g | 1.1g | 1.1g | 10.4g | 0.0g | 124mg | Eggs |
| Sous Vide Egg | 155 | 12.7g | 0.8g | 0.7g | 11.2g | 0.0g | 124mg | Eggs |
| Chickpea Relish | 108 | 5.0g | 18.2g | 3.2g | 1.7g | 5.1g | 300mg | Allium |
| Oven-Baked Broccoli | 77 | 3.3g | 11.1g | 2.8g | 2.1g | 4.6g | 40mg | — |
| Sesame Tofu | 194 | 13.3g | 7.1g | 0.9g | 12.5g | 1.3g | 380mg | Gluten, Eggs, Sesame, Soy |
| Roasted Pumpkin | 80 | 1.25g | 17.4g | 5.8g | 0.6g | 2.9g | 5mg | — |
| Achar | 404 | 9.1g | 34.2g | 20.5g | 25.6g | 6.8g | 550mg | Soy, Allium, Peanuts, Sesame |
| Jalapeños | 17.5 | 0.75g | 3.0g | 1.7g | 0.3g | 1.4g | 900mg | Allium |
| Roasted Baby Corn | 50 | 0.0g | 11.3g | 5.2g | 0.5g | 3.5g | 5mg | — |
| Roasted Sweet Potato | 119 | 0.0g | 29.4g | 6.0g | 0.1g | 4.7g | 36mg | — |

### Proteins (pick 1; +$2 per additional)

| Protein | kcal | Protein | Carbs | Sugars | Fat | Fibre | Sodium | Allergens |
|:--|--:|--:|--:|--:|--:|--:|--:|:--|
| Teriyaki Chicken | 208 | 18.0g | 12.9g | 9.7g | 9.4g | 0.3g | 550mg | Gluten, Soy |
| Roasted Smoked Duck | 198 | 18.75g | 0.0g | 0.0g | 13.6g | 0.0g | 550mg | Gluten |
| Rosemary Sous Vide Chicken | 136 | 27.5g | 0.4g | 0.0g | 2.8g | 0.1g | 65mg | Allium |
| Yakiniku Beef | 355 | 21.25g | 9.6g | 6.4g | 25.7g | 0.3g | 450mg | Gluten, Soy, Allium |
| Oven-Baked Salmon | 209 | 23.0g | 0.0g | 0.0g | 13.0g | 0.0g | 60mg | Fish |
| Sichuan Mala Prawn | 174 | 23.1g | 3.7g | 1.2g | 7.4g | 0.4g | 500mg | Gluten, Shellfish, Soy, Sesame |

### Dressings (pick 1; +$1 per additional)

| Dressing | kcal | Protein | Carbs | Sugars | Fat | Fibre | Sodium | Allergens |
|:--|--:|--:|--:|--:|--:|--:|--:|:--|
| Japanese Roasted Sesame | 335 | 4.0g | 15.2g | 10.1g | 28.7g | 0.8g | 900mg | Gluten, Eggs, Sesame, Soy |
| Honey Mustard | 268 | 2.0g | 18.7g | 14.0g | 20.5g | 0.9g | 500mg | Gluten, Eggs, Soy |
| Ginger Soy | 330 | 4.0g | 48.3g | 32.2g | 13.4g | 1.3g | 1400mg | Gluten, Soy, Allium |
| Honey Lime | 425 | 0.5g | 75.9g | 60.7g | 13.3g | 0.4g | 250mg | Gluten |
| Spicy Mayo | 488 | 1.5g | 5.6g | 3.7g | 51.0g | 0.2g | 600mg | Gluten, Eggs, Soy, Allium |
| Balsamic Vinegar | 510 | 0.3g | 11.7g | 9.3g | 51.4g | 0.0g | 300mg | — |
| Extra Virgin Olive Oil | 900 | 0.0g | 0.0g | 0.0g | 100.0g | 0.0g | 0mg | — |
| Mint Jalapeño | 335 | 1.0g | 15.1g | 7.5g | 30.1g | 2.5g | 450mg | Allium |

*(Ginger Soy at 1400mg sodium/100g is the standout — a full 40g serving is
560mg, before whatever's on the base/toppings. Worth flagging if Holger's
tracking sodium.)*

---

## Using this for a logged meal

For a build-your-own bowl, identify base(s) + 4 toppings + protein + dressing
from the photo/description, weigh the portion (before/after), and build the
`.foodnoms` recipe JSON as separate ingredient entries — one per component,
literal `nutrients` block taken from the reconciled per-100g figures above,
scaled to each component's actual weighed or estimated share of the bowl.
For a signature bowl logged whole, use that bowl's reconciled per-100g row
directly against the weighed total. Note in the entry (or a `patchNote`) that
figures came from `docs/SUPERGREEN_MENU.md`'s kcal/protein-anchored
reconciliation, not a from-scratch estimate — that's a materially different
provenance from an ordinary bottom-up guess and worth keeping visible.
