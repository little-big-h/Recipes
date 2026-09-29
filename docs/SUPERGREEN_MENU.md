# Supergreen (Singapore) — menu ingredient & nutrition reference

Source: https://www.supergreen.sg/menu (ingested 2026-09-29). This is a
build-your-own salad-bowl chain — base + toppings + protein + dressing.

## What Supergreen publishes vs. what's estimated here

Supergreen's own menu gives **calories and protein only**, per stated serving
weight, for every signature bowl and every build-your-own component. No carbs,
fat, sugar, fibre, sodium or micros are published anywhere on the menu.

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
5. **Micros** (iron, calcium, magnesium, potassium, zinc, vitamin D, vitamin
   B12, folate) are committed best-estimates (per `CLAUDE.md`'s micros
   policy — no FoodNoms verification path exists for these regardless).
   Two scaling rules, by ingredient category:
   - **Protein-source items** (meat, fish, egg, tofu, edamame, chickpea
     relish): micros scale with `label protein ÷ analog protein` — iron,
     zinc, B12 and folate concentrate in the muscle/organ/legume tissue
     itself, so they track protein content specifically, not overall mass.
   - **Vegetable and dressing/oil items**: micros scale with the same
     carb+fat density factor used for fibre/sugar — mineral content in a
     whole-food veg item tracks overall mass, not any one macro.
6. **Signature bowls** are reconciled the same way, but the "analog ratio"
   (for carbs/fat) and the micro baselines (for iron etc.) are the *average*
   across the bowl's listed components (equal weight — Supergreen doesn't
   publish the gram-split within a bowl), anchored to the bowl's own
   published total kcal/protein.

Every row below satisfies `4×protein + 4×carbs + 9×fat == published kcal`
by construction — that's the whole point of doing it this way instead of
guessing a whole independent macro profile.

**Status for `.foodnoms` purposes:** kcal + protein = label-sourced
(uncertainty tier 0 once weighed). Carbs/fat/fibre/sugar/sodium/micros here
are still an *estimate*, just one constrained to match the label — treat as
uncertainty 10 territory unless Holger says otherwise, and say so in the
entry's note if this table informed the figures used. Micros specifically are
committed best-estimates per the standing micros policy — never caveat them
as "pending verification," there's no verification path for micros anyway.

---

## Signature bowls (per 100g, reconciled)

### Macros

| Bowl | kcal | Protein | Carbs | Sugars | Fat | Fibre | Sodium | Price | Allergens |
|:--|--:|--:|--:|--:|--:|--:|--:|--:|:--|
| Grilled Salmon Bowl | 113 | 9.1g | 10.6g | 6.9g | 3.8g | 0.7g | 121mg | $15.30 | Gluten, Soy, Fish, Eggs, Sesame |
| Yakiniku Beef Bowl | 201 | 11.4g | 13.3g | 7.6g | 11.3g | 1.8g | 485mg | $13.80 | Gluten, Eggs, Sesame, Soy, Allium, Peanuts |
| Teriyaki Chicken Bowl | 105 | 6.7g | 11.0g | 5.5g | 3.8g | 1.2g | 359mg | $12.30 | Gluten, Eggs, Soy, Allium |
| Lean Chicken Bowl | 98 | 10.5g | 7.4g | 3.5g | 3.0g | 1.3g | 323mg | $12.30 | Gluten, Allium, Eggs, Soy |
| Mala Prawn Bowl | 95 | 6.5g | 8.0g | 5.0g | 4.1g | 0.8g | 199mg | $13.80 | Gluten, Eggs, Soy, Allium, Shellfish, Dairy |
| Smoked Duck Bowl | 111 | 8.1g | 10.3g | 7.1g | 4.1g | 0.8g | 281mg | $12.30 | Allium, Gluten, Sesame, Shellfish, Eggs, Soy |
| Vegan Power Bowl | 100 | 3.8g | 14.2g | 7.1g | 3.1g | 2.0g | 121mg | $12.30 | Allium |

### Micros

| Bowl | Iron | Calcium | Magnesium | Potassium | Zinc | Vit D | Vit B12 | Folate |
|:--|--:|--:|--:|--:|--:|--:|--:|--:|
| Grilled Salmon Bowl | 1.0mg | 85mg | 20mg | 278mg | 0.6mg | 1.9µg | 0.49µg | 17µg |
| Yakiniku Beef Bowl | 2.2mg | 103mg | 38mg | 325mg | 1.9mg | 0.3µg | 0.57µg | 71µg |
| Teriyaki Chicken Bowl | 0.9mg | 35mg | 25mg | 302mg | 0.6mg | 0.4µg | 0.25µg | 29µg |
| Lean Chicken Bowl | 1.4mg | 41mg | 33mg | 299mg | 0.9mg | 0.4µg | 0.26µg | 93µg |
| Mala Prawn Bowl | 0.8mg | 39mg | 25mg | 327mg | 0.5mg | 0.03µg | 0.34µg | 27µg |
| Smoked Duck Bowl | 1.3mg | 86mg | 25mg | 202mg | 0.9mg | 0µg | 0.07µg | 12µg |
| Vegan Power Bowl | 1.3mg | 40mg | 32mg | 358mg | 0.6mg | 0µg | 0µg | 72µg |

| Bowl | Serving weight | Ingredients |
|:--|--:|:--|
| Grilled Salmon Bowl | 430g | Grilled Salmon, Fresh Cucumber, Purple Cabbage, Roasted Pumpkin, Sesame Tofu, Honey Lime Dressing |
| Yakiniku Beef Bowl | 420g | Yakiniku Beef, Sous Vide Egg, Achar, Edamame, Sesame Tofu, Ginger Soy Dressing |
| Teriyaki Chicken Bowl | 460g | Teriyaki Chicken, Fresh Cucumber, Sous Vide Egg, Sweet Potato, Broccoli, Ginger Soy Dressing |
| Lean Chicken Bowl | 420g | Rosemary Sous Vide Chicken, Hard Boiled Egg, Edamame, Broccoli, Chickpea Relish, Ginger Soy Dressing |
| Mala Prawn Bowl | 340g | Mala Prawn, Purple Cabbage, Corn, Raisins, Broccoli, Spicy Mayo Dressing |
| Smoked Duck Bowl | 395g | Smoked Duck, Fresh Cucumber, Kimchi, Sesame Tofu, Roasted Baby Corn, Honey Lime Dressing |
| Vegan Power Bowl | 370g | Edamame, Corn, Purple Cabbage, Chickpea Relish, Sweet Potato, Raisins, Mint Jalapeño Dressing |

(Scale these per-100g figures by the bowl's actual serving weight, or better,
the weighed portion, for a real log.)

---

## Build Your Own Bowl (from $10.30) — reconciled per 100g

**⚠ About the "Menu Serving" column below.** These are Supergreen's own default
portion sizes, listed **only** so a build can be split into components at
roughly the right *relative* proportions and caloric density — e.g. "the soba
base is about twice the mass of the seaweed topping." **They are never the
actual weight of what got eaten.** Once the real weighed total (before/after
on the scale) is known, rescale every component proportionally so the
components' weights sum to that real total — the menu-serving numbers are a
*ratio* input, not grams to log directly. Building a `.foodnoms` entry off the
raw menu-serving grams instead of the weighed portion is exactly the mistake
this column exists to prevent, not invite.

### Bases (pick up to 2)

**Macros**

| Base | Menu Serving | kcal | Protein | Carbs | Sugars | Fat | Fibre | Sodium | Allergens |
|:--|--:|--:|--:|--:|--:|--:|--:|--:|:--|
| Romaine Lettuce | 45g | 18 | 2.2g | 1.9g | 0.7g | 0.2g | 1.2g | 8mg | — |
| Brown Rice | 130g | 162 | 3.7g | 34.0g | 0.3g | 1.2g | 2.6g | 5mg | — |
| Fusilli Pasta | 100g | 181 | 6.0g | 35.7g | 0.9g | 1.6g | 2.6g | 1mg | Gluten |
| Soba Noodle | 100g | 121 | 5.0g | 25.0g | 0.6g | 0.1g | 2.3g | 68mg | Gluten |

**Micros**

| Base | Iron | Calcium | Magnesium | Potassium | Zinc | Vit D | Vit B12 | Folate |
|:--|--:|--:|--:|--:|--:|--:|--:|--:|
| Romaine Lettuce | 0.54mg | 19mg | 8mg | 139mg | 0.13mg | 0µg | 0µg | 76µg |
| Brown Rice | 0.72mg | 14mg | 62mg | 124mg | 0.87mg | 0µg | 0µg | 6µg |
| Fusilli Pasta | 1.43mg | 10mg | 26mg | 64mg | 1.00mg | 0µg | 0µg | 71µg |
| Soba Noodle | 0.93mg | 12mg | 22mg | 44mg | 0.82mg | 0µg | 0µg | 16µg |

### Cold/hot toppings (pick 4)

**Macros**

| Topping | Menu Serving | kcal | Protein | Carbs | Sugars | Fat | Fibre | Sodium | Allergens |
|:--|--:|--:|--:|--:|--:|--:|--:|--:|:--|
| Japanese Cucumber | 45g | 27 | 2.2g | 4.2g | 2.0g | 0.1g | 0.6g | 2mg | — |
| Sweet Corn | 45g | 62 | 2.2g | 11.5g | 2.5g | 0.8g | 1.3g | 15mg | — |
| Edamame | 45g | 129 | 11.9g | 9.4g | 2.1g | 4.9g | 4.9g | 6mg | — |
| Kimchi | 50g | 24 | 2.0g | 2.7g | 1.1g | 0.6g | 1.8g | 498mg | Gluten, Shellfish, Allium |
| Japanese Seaweed | 50g | 50 | 0.0g | 10.9g | 0.7g | 0.7g | 0.6g | 600mg | Gluten |
| Cherry Tomato | 55g | 29 | 1.8g | 4.9g | 3.3g | 0.3g | 1.5g | 5mg | — |
| Raisin | 25g | 352 | 4.0g | 82.8g | 61.9g | 0.5g | 3.9g | 11mg | — |
| Purple Cabbage | 25g | 32 | 0.0g | 7.5g | 3.9g | 0.2g | 2.1g | 27mg | — |
| Hard Boiled Egg | 55g | 149 | 12.7g | 1.1g | 1.1g | 10.4g | 0.0g | 124mg | Eggs |
| Sous Vide Egg | 55g | 155 | 12.7g | 0.8g | 0.7g | 11.2g | 0.0g | 124mg | Eggs |
| Chickpea Relish | 60g | 108 | 5.0g | 18.2g | 3.2g | 1.7g | 5.1g | 300mg | Allium |
| Oven-Baked Broccoli | 90g | 77 | 3.3g | 11.1g | 2.8g | 2.1g | 4.6g | 40mg | — |
| Sesame Tofu | 90g | 194 | 13.3g | 7.1g | 0.9g | 12.5g | 1.3g | 380mg | Gluten, Eggs, Sesame, Soy |
| Roasted Pumpkin | 80g | 80 | 1.25g | 17.4g | 5.8g | 0.6g | 2.9g | 5mg | — |
| Achar | 55g | 404 | 9.1g | 34.2g | 20.5g | 25.6g | 6.8g | 550mg | Soy, Allium, Peanuts, Sesame |
| Jalapeños | 40g | 17.5 | 0.75g | 3.0g | 1.7g | 0.3g | 1.4g | 900mg | Allium |
| Roasted Baby Corn | 60g | 50 | 0.0g | 11.3g | 5.2g | 0.5g | 3.5g | 5mg | — |
| Roasted Sweet Potato | 80g | 119 | 0.0g | 29.4g | 6.0g | 0.1g | 4.7g | 36mg | — |

**Micros**

| Topping | Iron | Calcium | Magnesium | Potassium | Zinc | Vit D | Vit B12 | Folate |
|:--|--:|--:|--:|--:|--:|--:|--:|--:|
| Japanese Cucumber | 0.32mg | 19mg | 15mg | 170mg | 0.23mg | 0µg | 0µg | 8µg |
| Sweet Corn | 0.27mg | 1mg | 20mg | 148mg | 0.27mg | 0µg | 0µg | 10µg |
| Edamame | 2.27mg | 63mg | 64mg | 436mg | 1.40mg | 0µg | 0µg | 311µg |
| Kimchi | 0.57mg | 37mg | 14mg | 182mg | 0.34mg | 0µg | 0µg | 9µg |
| Japanese Seaweed | 2.61mg | 179mg | 128mg | 60mg | 0.36mg | 0µg | 0µg | 234µg |
| Cherry Tomato | 0.34mg | 13mg | 14mg | 297mg | 0.21mg | 0µg | 0µg | 19µg |
| Raisin | 1.97mg | 52mg | 33mg | 783mg | 0.23mg | 0µg | 0µg | 5µg |
| Purple Cabbage | 0.82mg | 46mg | 16mg | 248mg | 0.20mg | 0µg | 0µg | 54µg |
| Hard Boiled Egg | 1.20mg | 51mg | 10mg | 127mg | 1.06mg | 2.0µg | 1.30µg | 44µg |
| Sous Vide Egg | 1.20mg | 51mg | 10mg | 127mg | 1.06mg | 2.0µg | 1.30µg | 44µg |
| Chickpea Relish | 1.62mg | 28mg | 27mg | 163mg | 0.84mg | 0µg | 0µg | 97µg |
| Oven-Baked Broccoli | 1.02mg | 65mg | 29mg | 440mg | 0.56mg | 0µg | 0µg | 88µg |
| Sesame Tofu | 2.95mg | 389mg | 33mg | 134mg | 1.78mg | 0µg | 0µg | 17µg |
| Roasted Pumpkin | 1.55mg | 41mg | 23mg | 659mg | 0.62mg | 0µg | 0µg | 17µg |
| Achar | 2.56mg | 68mg | 60mg | 512mg | 1.37mg | 0µg | 0µg | 34µg |
| Jalapeños | 0.23mg | 11mg | 14mg | 178mg | 0.19mg | 0µg | 0µg | 25µg |
| Roasted Baby Corn | 0.87mg | 49mg | 64mg | 470mg | 0.87mg | 0µg | 0µg | 33µg |
| Roasted Sweet Potato | 0.87mg | 43mg | 35mg | 478mg | 0.43mg | 0µg | 0µg | 16µg |

### Proteins (pick 1; +$2 per additional)

**Macros**

| Protein | Menu Serving | kcal | Protein | Carbs | Sugars | Fat | Fibre | Sodium | Allergens |
|:--|--:|--:|--:|--:|--:|--:|--:|--:|:--|
| Teriyaki Chicken | 100g | 208 | 18.0g | 12.9g | 9.7g | 9.4g | 0.3g | 550mg | Gluten, Soy |
| Roasted Smoked Duck | 80g | 198 | 18.75g | 0.0g | 0.0g | 13.6g | 0.0g | 550mg | Gluten |
| Rosemary Sous Vide Chicken | 80g | 136 | 27.5g | 0.4g | 0.0g | 2.8g | 0.1g | 65mg | Allium |
| Yakiniku Beef | 80g | 355 | 21.25g | 9.6g | 6.4g | 25.7g | 0.3g | 450mg | Gluten, Soy, Allium |
| Oven-Baked Salmon | 100g | 209 | 23.0g | 0.0g | 0.0g | 13.0g | 0.0g | 60mg | Fish |
| Sichuan Mala Prawn | 65g | 174 | 23.1g | 3.7g | 1.2g | 7.4g | 0.4g | 500mg | Gluten, Shellfish, Soy, Sesame |

**Micros**

| Protein | Iron | Calcium | Magnesium | Potassium | Zinc | Vit D | Vit B12 | Folate |
|:--|--:|--:|--:|--:|--:|--:|--:|--:|
| Teriyaki Chicken | 0.52mg | 8mg | 22mg | 192mg | 0.75mg | 0.08µg | 0.22µg | 3µg |
| Roasted Smoked Duck | 2.66mg | 11mg | 16mg | 201mg | 1.87mg | 0µg | 0.39µg | 5µg |
| Rosemary Sous Vide Chicken | 0.62mg | 10mg | 26mg | 227mg | 0.89mg | 0.09µg | 0.27µg | 4µg |
| Yakiniku Beef | 2.76mg | 19mg | 22mg | 338mg | 5.10mg | 0µg | 2.13µg | 6µg |
| Oven-Baked Salmon | 0.36mg | 9mg | 28mg | 401mg | 0.52mg | 11.5µg | 2.93µg | 5µg |
| Sichuan Mala Prawn | 0.64mg | 67mg | 50mg | 332mg | 1.67mg | 0µg | 1.92µg | 4µg |

*(Salmon's the standout for vitamin D — everything else on this menu is
essentially zero. Beef and duck lead on iron/zinc/B12, as expected for red
meat/organ-adjacent cuts.)*

### Dressings (pick 1; +$1 per additional)

**Macros**

| Dressing | Menu Serving | kcal | Protein | Carbs | Sugars | Fat | Fibre | Sodium | Allergens |
|:--|--:|--:|--:|--:|--:|--:|--:|--:|:--|
| Japanese Roasted Sesame | 40g | 335 | 4.0g | 15.2g | 10.1g | 28.7g | 0.8g | 900mg | Gluten, Eggs, Sesame, Soy |
| Honey Mustard | 40g | 268 | 2.0g | 18.7g | 14.0g | 20.5g | 0.9g | 500mg | Gluten, Eggs, Soy |
| Ginger Soy | 40g | 330 | 4.0g | 48.3g | 32.2g | 13.4g | 1.3g | 1400mg | Gluten, Soy, Allium |
| Honey Lime | 40g | 425 | 0.5g | 75.9g | 60.7g | 13.3g | 0.4g | 250mg | Gluten |
| Spicy Mayo | 40g | 488 | 1.5g | 5.6g | 3.7g | 51.0g | 0.2g | 600mg | Gluten, Eggs, Soy, Allium |
| Balsamic Vinegar | 40g | 510 | 0.3g | 11.7g | 9.3g | 51.4g | 0.0g | 300mg | — |
| Extra Virgin Olive Oil | 40g | 900 | 0.0g | 0.0g | 0.0g | 100.0g | 0.0g | 0mg | — |
| Mint Jalapeño | 40g | 335 | 1.0g | 15.1g | 7.5g | 30.1g | 2.5g | 450mg | Allium |

**Micros**

| Dressing | Iron | Calcium | Magnesium | Potassium | Zinc | Vit D | Vit B12 | Folate |
|:--|--:|--:|--:|--:|--:|--:|--:|--:|
| Japanese Roasted Sesame | 0.84mg | 84mg | 25mg | 68mg | 1.27mg | 0µg | 0µg | 4µg |
| Honey Mustard | 0.28mg | 14mg | 5mg | 56mg | 0.19mg | 0µg | 0µg | 3µg |
| Ginger Soy | 1.34mg | 27mg | 40mg | 403mg | 0.81mg | 0µg | 0µg | 13µg |
| Honey Lime | 0.19mg | 9mg | 6mg | 57mg | 0.19mg | 0µg | 0µg | 2µg |
| Spicy Mayo | 0.09mg | 5mg | 2mg | 14mg | 0.14mg | 0.19µg | 0.09µg | 2µg |
| Balsamic Vinegar | 0.35mg | 12mg | 6mg | 58mg | 0.12mg | 0µg | 0µg | 1µg |
| Extra Virgin Olive Oil | 0.56mg | 1mg | 0mg | 1mg | 0mg | 0µg | 0µg | 0µg |
| Mint Jalapeño | 1.25mg | 50mg | 25mg | 251mg | 0.75mg | 0µg | 0µg | 13µg |

*(Ginger Soy at 1400mg sodium/100g is the standout on the macro side too — a
full 40g serving is 560mg, before whatever's on the base/toppings. Worth
flagging if Holger's tracking sodium.)*

---

## Using this for a logged meal

For a build-your-own bowl, identify base(s) + 4 toppings + protein + dressing
from the photo/description, weigh the portion (before/after), and build the
`.foodnoms` recipe JSON as separate ingredient entries — one per component,
literal `nutrients` block taken from the reconciled per-100g figures above
(macros and micros both).

**Use the "Menu Serving" column only to work out each component's *share* of
the bowl, then rescale to the real weighed total** — never log the raw
menu-serving grams as if they were what was actually eaten:

1. Sum the listed components' Menu Serving grams → that's the bowl's
   *implied* menu weight.
2. Each component's share = its Menu Serving ÷ that implied total.
3. Multiply each share by the **real weighed consumed grams** (the event's
   before/after figure) to get that component's actual logged weight.
4. Use that rescaled weight with the component's per-100g nutrients.

(Example: menu defaults sum to 500g for a given set of components, but the
scale says 604.6g was actually eaten — every component's weight scales up by
604.6/500 = 1.209×, not just the bowl total.) For a signature bowl logged
whole, use that bowl's reconciled per-100g row directly against the weighed
total — no per-component rescaling needed there, it's already one blended
row. Note in the entry (or a `patchNote`) that figures came from this file's
kcal/protein-anchored reconciliation, not a from-scratch estimate — that's a
materially different provenance from an ordinary bottom-up guess and worth
keeping visible.

---

## Sanity-check against already-logged bowls (2026-09-29)

Three bowls logged this project before this menu was ingested looked like
they might be Supergreen. Checked against the actual component list above:

- **Poke Bowl (salad/soba base, tofu, broccoli, chickpeas, kimchi, purple
  cabbage, wakame — 577g, logged 2026-09-27):** ingredient names map closely
  onto real Supergreen components (Soba Noodle base, Sesame Tofu,
  Oven-Baked Broccoli, Chickpea Relish, Kimchi, Purple Cabbage, and "wakame"
  ≈ Supergreen's "Japanese Seaweed"). **Likely Supergreen**, though it used
  6 toppings against the menu's stated "pick 4" limit — possibly a
  double-topping order, or the limit isn't strictly enforced. Recomputing
  its per-100g estimate using this file's actual component values (rough
  proportional blend) lands around ~83 kcal/100g, 4.4g protein/100g — close
  to the 95 kcal/100g, 5.4g protein/100g originally logged (within normal
  estimation spread, not a correction-worthy gap). Left as originally
  logged, per Holger's "past logs stand" call.
- **Salad Bowl at The Spread (lettuce/soba, firm tofu, roasted broccoli,
  shiitake, beetroot, capsicums, nori flakes, shoyu ponzu + sriracha —
  508.7g, logged 2026-09-26):** **probably NOT Supergreen.** Shiitake,
  capsicums and beetroot don't appear anywhere on Supergreen's topping list,
  and "shoyu ponzu" isn't one of their 8 dressings (closest analog, Ginger
  Soy, is a different flavour profile). The event's own subject also names
  a specific venue, "The Spread" — treat as a genuinely different vendor
  with a similar bowl concept, not a misidentified Supergreen order.
- **Carb-Load Bowl (durum macaroni + quinoa-lentil base, tofu, beetroot,
  grilled sweet potato, grilled pumpkin, falafel — 536g, logged
  2026-09-26):** **not Supergreen.** None of macaroni, a quinoa-lentil
  blend, beetroot or falafel appear anywhere on Supergreen's menu (their
  bases are Romaine/Brown Rice/Fusilli/Soba only, no falafel protein
  option). Clearly a different source.
