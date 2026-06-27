# Family Dish Ratings

Tracking log of family ratings and notes for each dish cooked. Schema is lightly denormalized relational; see "Schema specification" below for table structure and update rules.

**Scoring:** out of 10. 9–10 = exceptional. Individual scale calibration varies (Anja's 8 ≠ Lara's 8) — averages are directional, not absolute.

---

## Schema specification

### Tables

- **people** (`name` PK, `notes`)
- **dishes** (`name` PK, `cuisine`)
- **iterations** (`(dish, version)` compound PK, `status`, `date_cooked`, `recipe_file`)
  - FK: `dish` → `dishes.name`
- **ratings** (no PK; natural uniqueness on `(dish, version, person)`)
  - columns: `dish`, `version`, `person`, `score`
  - FK: `(dish, version)` → `iterations`, `person` → `people.name`
- **remarks** (`remark_id` PK, `dish`, `version`, `text`)
  - FK: `(dish, version)` → `iterations`
- **observations** (`obs_id` PK, `scope`, `text`)
  - `scope` is free text — can be a single person name, comma-separated names, "family", or "kids"

### Field conventions

| field | format / allowed values |
|:------|:------------------------|
| `name` (people, dishes) | unique within table; case-sensitive |
| `cuisine` | free text (Thai, Nordic, West African, Japanese, Mexican, Indian, European, Italian, etc.) |
| `version` | `v1`, `v2`, `v3` … (lowercase `v` + integer) |
| `status` | `cooked`, `planned`, or `cooked-historical` |
| `date_cooked` | `YYYY-MM-DD` when known; `YYYY-MM` if only month known; `—` for planned, unknown, or historical |
| `recipe_file` | markdown link `[filename.md](./filename.md)`, relative to this directory |
| `score` | decimal 0.0–10.0, one decimal place |
| `remark_id`, `obs_id` | sequential integers; do not reuse when deleting |

**Status semantics:**
- `planned` — recipe written, not yet cooked
- `cooked` — cooked under the current project, ratings collected
- `cooked-historical` — cooked before the project's rating system; migrated from a legacy source (PDF or Wolfram Language file). Ratings may be aggregate only (recorded in remarks) or absent entirely

### How to update

**After cooking a dish for the first time** (existing recipe):
1. Add row to `iterations` with `status=cooked`, today's date, link to recipe file
2. Add one row to `ratings` per family member who scored it
3. Add rows to `remarks` for any iteration-specific feedback ("too salty", "Anja loved the cabbage", etc.)
4. Promote any general patterns to `observations` if they extend beyond this iteration

**After cooking a subsequent version** (existing dish):
1. Add new `iterations` row with new `version` (e.g., `v2`) and `status=cooked`
2. Add `ratings` rows
3. Add `remarks` for feedback
4. Compare to previous versions in remarks if useful ("Jannes improved from 7.0 to 7.5 — heat strategy validated")

**When planning a new version before cooking:**
1. Add `iterations` row with `status=planned`, `date_cooked=—`
2. Add a `remarks` row describing the planned changes from previous version
3. The `recipe_file` column should point to the updated recipe file (whether the same file modified, or a new `-v2.md` file)

**When adding a new dish concept:**
1. Add row to `dishes` with name and cuisine
2. Add `iterations` row (cooked or planned)
3. Recipe file goes in `~/Documents/Claude-Interchange/Recipes/`, format per `RECIPE_FORMAT.md`

**When updating people notes:**
- Edit the `notes` field as new dietary preferences emerge
- Notes drive recipe design defaults — keep accurate

### Recipe file convention

When does a new version warrant a new file (`-v2.md`) vs editing the existing one?

- **Update existing file** for refinements, ingredient quantity tweaks, method clarifications, format fixes
- **New `-vN.md` file** for substantial reformulations (different core ingredients, different cooking approach) where you want to preserve the previous version for reference and comparison

### Maintenance rules

- `remark_id` and `obs_id` are sequential; do not reuse ids when deleting rows
- `iterations.status` transitions from `planned` → `cooked`; update `date_cooked` at the same time
- When an observation generalises beyond a single iteration, move it from `remarks` to `observations`
- When an observation gets superseded or proven wrong, edit rather than delete (preserve audit trail in surrounding context)

---

## people

| name | notes |
|:-----|:------|
| Lara | Selective eater. Dislikes: sourness, cooked peppers (raw fine), smoked paprika (suspected — but sweet paprika well-tolerated/loved, see obs 17), warm aromatics (galangal/cinnamon/cardamom — not firmly established), **assertive cumin** (suspected 2026-06-06 — called the bold Pinto soup v2 "spicy" with no chilli heat; Anja's hypothesis, likely the doubled cumin), recognisable silken tofu (fine when fully blended). **Situational (2026-06-25):** disliked the *cold-blanched* asparagus in the cold salad despite generally being fine with asparagus — likely the heavy 900 g amount / plain cold texture; watch, not a firm flag |
| Julina | 13yo. Most open-minded eater in the family. Not keen on **nutty/peanut dressings** — skipped the cold-salad peanut dressing (2026-06-25), still scored it 8.9 |
| Anja | Adventurous. Historically highest scorer. Variance signal — drops indicate specific issues |
| Holger | Recipe developer. Vegetarian, marathon training |
| Jannes | 8yo. Heat-sensitive. Dislikes cauliflower (overridden when sauced — obs 19). Dislikes **rocket / peppery salad leaves** (dropped the cold salad 6.9→8.0 once removed, 2026-06-25). Prefers milder profiles — fermented depth (red miso) underwhelmed him |

---

## dishes

| name | cuisine |
|:-----|:--------|
| Thai Yellow Butternut Squash Curry | Thai |
| Creamy Shiitake Soup | Thai |
| Creamy Corn Soup — Nordic (cold) | Nordic |
| Creamy Corn Soup — West African | West African |
| Creamy Corn Soup — Japanese | Japanese |
| Creamy Corn Soup — Indian | Indian |
| Creamy Corn Soup — Mexican | Mexican |
| Creamy Corn Soup — Mexican (Low Effort) | Mexican |
| Courgette & Pea Risotto with Pan-Fried Tofu | Italian |
| Squash Mash, Onion-Apple Gravy & Air-Fried Tofu | European |
| Aubergine · Passata · Amaranth | Mediterranean |
| Butternut Squash & Butter Bean Soup | European |
| Indian Cauliflower & Potato Soup with Kasha | Indian |
| Nordic White Asparagus & Rice Salad | Nordic |
| Mediterranean Roasted Vegetable Tray with Kasha | Mediterranean |
| Mediterranean & Indian Roasted Vegetable Tray | Fusion (Mediterranean + Indian) |
| Indian Roasted Vegetable Bake | Indian |
| Creamy Pinto, Butternut & Corn Soup | Spanish-leaning |
| Creamy Butternut & Soy Bean Soup | Japanese-leaning |
| Chickpea, Cauliflower & Spinach Tikka Curry | Indian |
| Vegetable & Potato Soup (Anja) | European |
| Lobia Masala with Air-Fried Butternut | Indian |
| Creamy Coconut–Tomato Veg & Chickpea Curry | Indian |
| Aubergine Parmigiana (Anja) | Italian |
| Cold Buckwheat, Asparagus & Black-Eyed Bean Salad | Indonesian-leaning (gado-gado) |
| Ras el Hanout Spelt with Air-Fried Butternut & Chickpeas | North African |

---

## iterations

| dish | version | status | date_cooked | recipe_file |
|:-----|:-------:|:-------|:------------|:------------|
| Thai Yellow Butternut Squash Curry | v1 | cooked | 2026-05-27 | [thai-yellow-butternut-curry.md](../recipes/stovetop-mains/thai-yellow-butternut-curry.md) |
| Creamy Shiitake Soup | v1 | cooked | 2026-05-20 | [creamy-shiitake-soup-thai.md](../recipes/soups/creamy-shiitake-soup-thai.md) |
| Creamy Shiitake Soup | v2 | planned | — | [creamy-shiitake-soup-thai-v2.md](../recipes/soups/creamy-shiitake-soup-thai-v2.md) |
| Creamy Corn Soup — Nordic (cold) | v1 | cooked | 2026-05 | [creamy-corn-soup-nordic.md](../recipes/soups/creamy-corn-soup-nordic.md) |
| Creamy Corn Soup — West African | v1 | planned | — | [creamy-corn-soup-westafrican.md](../recipes/soups/creamy-corn-soup-westafrican.md) |
| Creamy Corn Soup — Japanese | v1 | cooked | 2026-05-29 | [creamy-corn-soup-japanese.md](../recipes/soups/creamy-corn-soup-japanese.md) |
| Creamy Corn Soup — Japanese | v2 | planned | — | [creamy-corn-soup-japanese-v2.md](../recipes/soups/creamy-corn-soup-japanese-v2.md) |
| Creamy Corn Soup — Japanese | v3 | planned | — | [creamy-corn-soup-japanese-v3.md](../recipes/soups/creamy-corn-soup-japanese-v3.md) |
| Creamy Corn Soup — Indian | v1 | cooked-historical | — | [creamy-corn-soup-indian.md](../recipes/soups/creamy-corn-soup-indian.md) |
| Creamy Corn Soup — Mexican | v1 | cooked-historical | — | [creamy-corn-soup-mexican.md](../recipes/soups/creamy-corn-soup-mexican.md) |
| Creamy Corn Soup — Mexican (Low Effort) | v1 | cooked-historical | — | [creamy-corn-soup-mexican-low-effort.md](../recipes/soups/creamy-corn-soup-mexican-low-effort.md) |
| Courgette & Pea Risotto with Pan-Fried Tofu | v1 | cooked-historical | — | [courgette-pea-risotto.md](../recipes/grains/courgette-pea-risotto.md) |
| Squash Mash, Onion-Apple Gravy & Air-Fried Tofu | v1 | cooked-historical | — | [squash-mash-tofu-gravy.md](../recipes/stovetop-mains/squash-mash-tofu-gravy.md) |
| Aubergine · Passata · Amaranth | v1 | cooked-historical | — | [aubergine-passata-amaranth.md](../recipes/stovetop-mains/aubergine-passata-amaranth.md) |
| Butternut Squash & Butter Bean Soup | v1 | cooked-historical | — | [butternut-butterbean-soup.md](../recipes/soups/butternut-butterbean-soup.md) |
| Indian Cauliflower & Potato Soup with Kasha | v1 | cooked-historical | — | [cauliflower-potato-soup-kasha.md](../recipes/soups/cauliflower-potato-soup-kasha.md) |
| Nordic White Asparagus & Rice Salad | v1 | cooked-historical | — | [nordic-asparagus-rice-salad.md](../recipes/grains/nordic-asparagus-rice-salad.md) |
| Mediterranean Roasted Vegetable Tray with Kasha | v1 | cooked-historical | — | [roasted-veg-mediterranean.md](../recipes/oven-mains/roasted-veg-mediterranean.md) |
| Mediterranean & Indian Roasted Vegetable Tray | v1 | cooked-historical | — | [roasted-veg-two-profiles.md](../recipes/oven-mains/roasted-veg-two-profiles.md) |
| Indian Roasted Vegetable Bake | v1 | cooked-historical | — | [indian-roasted-veg-bake.md](../recipes/oven-mains/indian-roasted-veg-bake.md) |
| Indian Roasted Vegetable Bake | v2 | cooked-historical | — | [indian-roasted-veg-bake-v2.md](../recipes/oven-mains/indian-roasted-veg-bake-v2.md) |
| Creamy Pinto, Butternut & Corn Soup | v1 | cooked | 2026-06-05 | [creamy-pinto-butternut-soup.md](../recipes/soups/creamy-pinto-butternut-soup.md) |
| Creamy Pinto, Butternut & Corn Soup | v2 | cooked | 2026-06-06 | [creamy-pinto-butternut-soup-v2.md](../recipes/soups/creamy-pinto-butternut-soup-v2.md) |
| Creamy Butternut & Soy Bean Soup | v1 | cooked | 2026-06-10 | [butternut-soybean-soup.md](../recipes/soups/butternut-soybean-soup.md) |
| Chickpea, Cauliflower & Spinach Tikka Curry | v1 | cooked | 2026-06-12 | [chickpea-cauliflower-tikka-curry.md](../recipes/stovetop-mains/chickpea-cauliflower-tikka-curry.md) |
| Vegetable & Potato Soup (Anja) | v1 | cooked | 2026-06-15 | [vegetable-potato-soup.md](../anjas-cooking/vegetable-potato-soup.md) |
| Lobia Masala with Air-Fried Butternut | v1 | cooked | 2026-06-16 | [lobia-masala-butternut.md](../recipes/stovetop-mains/lobia-masala-butternut.md) |
| Creamy Coconut–Tomato Veg & Chickpea Curry | v1 | cooked | 2026-06-18 | [coconut-tomato-veg-chickpea-curry.md](../recipes/stovetop-mains/coconut-tomato-veg-chickpea-curry.md) |
| Aubergine Parmigiana (Anja) | v1 | cooked | 2026-06-20 | [aubergine-parmigiana.md](../anjas-cooking/aubergine-parmigiana.md) |
| Cold Buckwheat, Asparagus & Black-Eyed Bean Salad | v1 | cooked | 2026-06-24 | [cold-buckwheat-asparagus-blackeyed-salad.md](../recipes/salads/cold-buckwheat-asparagus-blackeyed-salad.md) |
| Ras el Hanout Spelt with Air-Fried Butternut & Chickpeas | v1 | planned | — | [ras-el-hanout-spelt-butternut-chickpeas.md](../recipes/grains/ras-el-hanout-spelt-butternut-chickpeas.md) |

---

## ratings

| dish | version | person | score |
|:-----|:-------:|:-------|:-----:|
| Thai Yellow Butternut Squash Curry | v1 | Lara | 7.8 |
| Thai Yellow Butternut Squash Curry | v1 | Julina | 8.7 |
| Thai Yellow Butternut Squash Curry | v1 | Anja | 8.3 |
| Thai Yellow Butternut Squash Curry | v1 | Holger | 8.0 |
| Thai Yellow Butternut Squash Curry | v1 | Jannes | 7.5 |
| Creamy Shiitake Soup | v1 | Lara | 7.8 |
| Creamy Shiitake Soup | v1 | Julina | 8.0 |
| Creamy Shiitake Soup | v1 | Anja | 9.5 |
| Creamy Shiitake Soup | v1 | Holger | 7.5 |
| Creamy Shiitake Soup | v1 | Jannes | 7.0 |
| Creamy Corn Soup — Japanese | v1 | Lara | 7.3 |
| Creamy Corn Soup — Japanese | v1 | Julina | 8.0 |
| Creamy Corn Soup — Japanese | v1 | Anja | 8.0 |
| Creamy Corn Soup — Japanese | v1 | Holger | 9.0 |
| Creamy Corn Soup — Japanese | v1 | Jannes | 6.0 |
| Creamy Pinto, Butternut & Corn Soup | v1 | Lara | 7.3 |
| Creamy Pinto, Butternut & Corn Soup | v1 | Julina | 8.3 |
| Creamy Pinto, Butternut & Corn Soup | v1 | Anja | 8.0 |
| Creamy Pinto, Butternut & Corn Soup | v1 | Holger | 8.0 |
| Creamy Pinto, Butternut & Corn Soup | v1 | Jannes | 7.0 |
| Creamy Pinto, Butternut & Corn Soup | v2 | Lara | 7.0 |
| Creamy Pinto, Butternut & Corn Soup | v2 | Jannes | 7.8 |
| Creamy Pinto, Butternut & Corn Soup | v2 | Anja | 8.0 |
| Creamy Pinto, Butternut & Corn Soup | v2 | Julina | 9.1 |
| Creamy Pinto, Butternut & Corn Soup | v2 | Holger | 8.2 |
| Creamy Butternut & Soy Bean Soup | v1 | Lara | 7.3 |
| Creamy Butternut & Soy Bean Soup | v1 | Julina | 4.0 |
| Creamy Butternut & Soy Bean Soup | v1 | Anja | 7.2 |
| Creamy Butternut & Soy Bean Soup | v1 | Holger | 8.0 |
| Creamy Butternut & Soy Bean Soup | v1 | Jannes | 5.9 |
| Chickpea, Cauliflower & Spinach Tikka Curry | v1 | Jannes | 7.8 |
| Chickpea, Cauliflower & Spinach Tikka Curry | v1 | Anja | 8.0 |
| Vegetable & Potato Soup (Anja) | v1 | Julina | 9.5 |
| Vegetable & Potato Soup (Anja) | v1 | Anja | 8.0 |
| Vegetable & Potato Soup (Anja) | v1 | Jannes | 8.0 |
| Vegetable & Potato Soup (Anja) | v1 | Lara | 7.9 |
| Vegetable & Potato Soup (Anja) | v1 | Holger | 7.6 |
| Lobia Masala with Air-Fried Butternut | v1 | Julina | 8.5 |
| Lobia Masala with Air-Fried Butternut | v1 | Jannes | 8.0 |
| Lobia Masala with Air-Fried Butternut | v1 | Anja | 8.8 |
| Lobia Masala with Air-Fried Butternut | v1 | Holger | 8.0 |
| Lobia Masala with Air-Fried Butternut | v1 | Lara | 7.5 |
| Creamy Coconut–Tomato Veg & Chickpea Curry | v1 | Julina | 9.25 |
| Creamy Coconut–Tomato Veg & Chickpea Curry | v1 | Holger | 8.8 |
| Creamy Coconut–Tomato Veg & Chickpea Curry | v1 | Anja | 8.8 |
| Creamy Coconut–Tomato Veg & Chickpea Curry | v1 | Jannes | 8.0 |
| Creamy Coconut–Tomato Veg & Chickpea Curry | v1 | Lara | 8.0 |
| Cold Buckwheat, Asparagus & Black-Eyed Bean Salad | v1 | Anja | 9.0 |
| Cold Buckwheat, Asparagus & Black-Eyed Bean Salad | v1 | Julina | 8.9 |
| Cold Buckwheat, Asparagus & Black-Eyed Bean Salad | v1 | Holger | 8.5 |
| Cold Buckwheat, Asparagus & Black-Eyed Bean Salad | v1 | Jannes | 8.0 |
| Cold Buckwheat, Asparagus & Black-Eyed Bean Salad | v1 | Lara | 7.2 |

*Nordic cold soup (v1) ratings were qualitative; see remarks. `cooked-historical` dishes have aggregate-only or no ratings — see remarks.*

---

## remarks

| remark_id | dish | version | text |
|:---------:|:-----|:-------:|:-----|
| 1 | Thai Yellow Butternut Squash Curry | v1 | Solid family-wide hit; narrowest spread (1.2) of any meal logged |
| 2 | Thai Yellow Butternut Squash Curry | v1 | Anja dropped from her usual 9+ range — worth probing what didn't land |
| 3 | Creamy Shiitake Soup | v1 | Too salty (24g) |
| 4 | Creamy Shiitake Soup | v1 | Too rich |
| 5 | Creamy Shiitake Soup | v1 | Thai profile lost |
| 6 | Creamy Shiitake Soup | v1 | Too hot for Jannes and Anja |
| 7 | Creamy Shiitake Soup | v2 | Planned changes: shiitake 100g, tofu 300g, yellow paste only (no green), Tsuyu 150ml, no dashi soy, salt down to 16g |
| 8 | Creamy Corn Soup — Nordic (cold) | v1 | Holger positive — liked beets and pickled accompaniments |
| 9 | Creamy Corn Soup — Nordic (cold) | v1 | Anja did not like pickled cucumber or onion |
| 10 | Creamy Corn Soup — Nordic (cold) | v1 | Julina did not like it at all |
| 11 | Creamy Corn Soup — Nordic (cold) | v1 | Discovered post-meal: Lara dislikes sourness — likely correlates with broader family resistance to acid-forward profiles |
| 12 | Creamy Corn Soup — Japanese | v1 | Cooked with red miso instead of planned white miso (using up jar). Recipe file updated to reflect this |
| 13 | Creamy Corn Soup — Japanese | v1 | Tsuyu used at 104ml vs planned 45ml (used up the bottle). Dashi-soy cut to 10ml and mirin bumped to 30ml to rebalance — total salt held at ~12g |
| 14 | Creamy Corn Soup — Japanese | v1 | Holger's highest-rated dish to date (9.0). Red miso + bok choi combination worked exceptionally well for adult palate |
| 15 | Creamy Corn Soup — Japanese | v1 | Jannes dropped to 6.0 — significantly below his usual range (7.0–7.5). Red miso intensity is the most likely cause |
| 16 | Creamy Corn Soup — Japanese | v1 | Widest spread of any meal logged (3.0 points, 6–9). Adult-palate dish that did not unite the family |
| 17 | Creamy Corn Soup — Japanese | v2 | Hypothesis test: same recipe as v1 but white miso 30g substituted for red miso 18g. All other amounts held constant (Tsuyu 104ml, dashi-soy 10ml, mirin 30ml, bok choi 400g). Goal: isolate whether red miso was the cause of Jannes's drop and the wide family spread |
| 18 | Courgette & Pea Risotto with Pan-Fried Tofu | v1 | Migrated from `courgette-pea-risotto.wl` Wolfram Language source. Carb-loading dinner (~4880 kcal incl. bagels, ~790g carbs). Nutrition values are estimates, not FoodNoms-verified |
| 19 | Squash Mash, Onion-Apple Gravy & Air-Fried Tofu | v1 | Migrated from `squash-mash-tofu-gravy.wl` Wolfram Language source. European carb-loading; carbs from squash rather than grain side. Beans on the side for Lara. Nutrition values are estimates, not FoodNoms-verified |
| 20 | Aubergine · Passata · Amaranth | v1 | Migrated from `aubergine-passata-amaranth.pdf` legacy source. **Aggregate rating on record: 8.6/10 family avg across four family members** (per project memory; individual scores not recovered). The "four family members" qualifier suggests one person did not rate — possibly Lara, given the recipe contains cooked peppers and smoked paprika (two of her flagged-dislike ingredients) |
| 21 | Butternut Squash & Butter Bean Soup | v1 | Migrated from `butternut-butterbean-soup.pdf` legacy source. No ratings on record. Smoked paprika marked optional in original recipe — easy to omit for Lara |
| 22 | Indian Cauliflower & Potato Soup with Kasha | v1 | Migrated from `cauliflower-potato-soup-kasha.pdf` legacy source. No ratings on record. Contains cauliflower (Jannes flagged dislike) — soup blending may mitigate but worth flagging |
| 23 | Creamy Corn Soup — Indian | v1 | Migrated from `creamy-corn-soup-indian-2kg.pdf`. No ratings on record. 2 kg corn base with 300 g dried chickpeas pot-in-pot. Asparagus (1000 g) steamed separately. Tikka masala + cumin + turmeric profile. Lara-safer than the Mexican variants — no smoked paprika, no cooked peppers |
| 24 | Creamy Corn Soup — Mexican | v1 | Migrated from `creamy-corn-soup-mexican-2kg.pdf`. No ratings on record. Diverges from ../design/CORN-SOUPS.md matrix: matrix specified dried kidney beans 250g, recipe uses 4 × 400g tinned kidney beans (~960g drained). 20g smoked paprika is significant Lara concern. Scaled-down 1kg variant noted inside the recipe file — original 1kg simmered asparagus IN the soup rather than steaming separately |
| 25 | Creamy Corn Soup — Mexican (Low Effort) | v1 | Migrated from `creamy-corn-soup-low-effort.pdf`. No ratings on record. Designed around school-pickup window: dried butter beans pot-in-pot, ~90 min unattended Ninja cook. Sauerkraut alongside is an unusual Mexican accompaniment but provides fermented depth + acidity that pairs with the lime/tamarind finish. Same 20g smoked paprika as the standard Mexican — same Lara concern |
| 26 | Nordic White Asparagus & Rice Salad | v1 | Migrated from `nordic-asparagus-rice-salad.pdf`. No ratings on record. **Most acid-forward dish in the project** — 2-3 lemons, gherkins + brine, horseradish, Dijon. Significant Lara concern. Build-your-own format helps: skip dressing + gherkins + capers for a Lara-friendly plate (rice + tofu + egg + asparagus only). Low-fat by design |
| 27 | Mediterranean Roasted Vegetable Tray with Kasha | v1 | Migrated from `roasted-veg-mediterranean.pdf`. No ratings on record. **Multiple structural Lara conflicts: cooked peppers + smoked paprika + balsamic + capers**, plus Jannes (cauliflower). Lara-friendlier substitutions noted in recipe file. Uses 0-min pressure cook in Ninja for kasha — heat-up time alone is sufficient |
| 28 | Mediterranean & Indian Roasted Vegetable Tray | v1 | Migrated from `roasted-veg-two-profiles.pdf`. No ratings on record. Split-tray design pattern: same vegetables, two seasonings (Med + Indian) cooked simultaneously on different oven shelves. **Both trays carry Lara concerns (peppers + paprika in both)** — the split-tray approach doesn't solve structural ingredient conflicts, only seasoning ones. Indian tray finished with miso-tamarind off heat; Med tray finished with capers |
| 29 | Indian Roasted Vegetable Bake | v1 | Migrated from `indian-roasted-veg-bake.pdf`. No ratings on record. Simple two-wave oven bake — cauliflower + peppers + onions + garlic first wave, broccoli + curry-tomato sauce second wave, cherry tomatoes last. **Carries both Jannes (cauliflower) and Lara (cooked peppers) concerns** — superseded by v2 which removes both |
| 30 | Indian Roasted Vegetable Bake | v2 | Migrated from `indian-roasted-veg-bake-v2.pdf`. No ratings on record. **Substantial reformulation of v1 — explicitly removes both flagged-dislike ingredients (cauliflower, peppers).** Replaces tomato-curry sauce with creamy corn + silken tofu + curry base. Adds chickpeas (air-fried in Ninja for caramelisation) and carrots. Cottage cheese served cold on the side. Lemon at end. Substantially higher protein and energy than v1 |
| 31 | Creamy Shiitake Soup | v1 | **Design history (from legacy `creamy-shiitake-soup-thai.pdf`)**: the planned/reference recipe used **wok-first sauté** (transfer to Ninja afterwards) rather than Ninja sauté throughout. Wok delivers better caramelisation than Ninja sauté mode — worth considering as a quality lever for v2. Planned PDF nutrition: 469.5 kcal × 5 servings = 2347 kcal total, 80.5 g protein, **20.5 g salt** — the cooked actual reached 24 g salt, ~3.5 g above planned. The salt jump is fully explained by Tsuyu 150 → 190 ml (used up the bottle). PDF also did not list the additional 1000 ml water that the cooked version needed to hit the 5 L stated yield |
| 32 | Creamy Corn Soup — West African | v1 | **Design history (from legacy `creamy-corn-soup-westafrican-2kg.pdf`)**: the legacy 2 kg PDF used **dried black turtle beans 250 g** and **1 dried long red chili**. The current planned recipe revises both: **dried black-eyed beans** (matrix-aligned per `../design/CORN-SOUPS.md`) and **1 whole scotch bonnet** (more authentic to the West African profile). The legacy PDF also used pot-in-pot from start in a single pressure cycle; the current recipe uses 2-stage cooking (corn under low pressure 30 min, then beans added high pressure 8 min) for better texture control on both components. All other amounts identical (peanut flour 100g, smoked paprika 16g, goji 15g, etc.) |
| 33 | Creamy Corn Soup — Japanese | v3 | Planned changes from v2: replace the 1800 ml plain water with a homemade **kombu-shiitake dashi** (cold-brewed overnight; 20 g kombu + the recipe's shiitake powder), and cut Tsuyu 104 → 45 ml so the real dashi carries the backbone. White miso, corn, soybeans, bok choi held at v2 levels. Real hon-mirin 22 ml (down from 30 ml mirin-style seasoning — reads sweeter). Net: ~half the salt (~7 g vs ~11 g). **Confounded by design** — dashi-source change and salt cut are coupled; a v3b at held salt would decouple them. Nutrition estimates only, not FoodNoms-verified. See `EXPERIMENTS.md` #3 |
| 34 | Creamy Pinto, Butternut & Corn Soup | v1 | New dish — introduces pinto beans (creamy break-down → fat-free body). Gold **part-purée** of pinto 350 g + butternut 1000 g + 500 g frozen corn (≈⅔ beans blended, ⅓ stirred back whole so pinto registers texturally rather than vanishing). **Two-phase** pressure cook: corn + squash LP 30 min first (keeps corn sweet, protects the whole-bean third), beans HP 20 min second — switched from single-stage on Holger's call (predictable bean cook + corn sweetness). Savoury backbone of **dried onion + garlic powder** (using up the jar) + cumin + **sweet (non-smoked) paprika**; kombu strip + shiitake powder for umami (glutamate × guanylate; the kombu is the bean-exception, shiitake added so the umami push doesn't lean on more iodine-heavy kombu). Steamed **broccoli only** on top (asparagus dropped). Clears all family flags — no smoked paprika, no chilli, no in-pot acid (lime at table), no cauliflower; sweet-paprika choice supported by obs 17. Nutrition estimates only, not FoodNoms-verified (~2655 kcal, 125 g protein, salt ~13 g — incl. the red miso finish added after v1 was bland; a white-miso family version lands ~12 g) |
| 35 | Creamy Pinto, Butternut & Corn Soup | v1 | **First cook 2026-06-05 — family avg 7.7, spread 1.3** (Julina 8.3, Anja 8.0, Holger 8.0, Lara 7.3, Jannes 7.0). Strong debut: everyone ≥7, no dislikes, narrow spread. Jannes in his usual 7.0–7.5 range — the mild, unfermented profile landed. **Lara 7.3 on a sweet-paprika-forward dish** adds a second data point for the smoke-not-paprika reading (see obs 17). Cook scaled up from plan: squash 1390 g, broccoli 767 g, corn 504 g; seasonings scaled ~11% to the bigger base (cumin 6.5, paprika 9, garlic 5.5); kombu held at 10 g and pulled at end of phase 1; 10 g avocado oil (not olive); aminos 40 ml (vs 30 planned); water ~1.8–2.0 L added (~1.57 L retained in the ~4.7 kg final; rest evaporated over the two-phase cook); final ~4.7 kg incl. broccoli. **Found bland at the table → 20 g red miso whisked in off heat fixed it**, now promoted into the recipe as a finishing umami/salt step (the sweet base + deliberately-pulled kombu left it under-seasoned). **Holger used red, not white** — and Jannes (red-averse) sat at 7.0, the floor of his range, so the red miso may have capped him; a white-miso v2 is the obvious single-variable test (see `EXPERIMENTS.md` #4). Nutrition still estimates, not FoodNoms-verified. |
| 36 | Creamy Pinto, Butternut & Corn Soup | v2 | Planned **bolder reformulation** (Holger's brief: "a lot bolder"). Changes from v1: **corn dropped**, **white** miso for red, **cauliflower** (steamed on top) for broccoli, and the backbone cranked — cumin 6→12 g, sweet paprika 8→12 g, garlic powder 5→8 g, + ground coriander 6 g, + **bloomed tomato paste 35 g** as the umami anchor (the fix for v1's blandness); shiitake 8→12 g, white miso 25 g, butternut 1000→1200 g (fills the corn gap). Heat mild in pot; bird's-eye chilli + lime at table for adults. **Multi-variable, so NOT the clean white-vs-red miso test (EXPERIMENTS #4).** ⚠ Cauliflower steamed on top = Jannes's flagged dislike, visible — blend it in next time if he drops. Nutrition **USDA-derived** (`creamy-pinto-butternut-soup-v2.md`, via the generator pipeline): ~2493 kcal, 110 g protein, salt ~7 g computed (white-miso sodium missing from its record → true ~9–10 g); micros conservative (some spice/paste records carry macros only). Not FoodNoms-verified. |
| 37 | Creamy Pinto, Butternut & Corn Soup | v2 | **Cooked 2026-06-06 — family avg 8.0, spread 2.1** (Julina 9.1, Holger 8.2, Anja 8.0, Jannes 7.8, Lara 7.0). The bold rework landed: avg up 7.7→8.0 vs v1, Holger's best in the line, and **Julina exceptional at 9.1**. **Jannes 7.0→7.8 — his best pinto score, despite cauliflower (his flagged dislike) steamed on top** — so either he's fine with cauliflower or the bold savoury profile overrode it; the cauliflower-on-top worry didn't materialise. The umami anchor (tomato paste + more shiitake/white miso) fixed v1's blandness — no table-rescue needed. **Lara dipped 7.3→7.0** (only faller): she described it as **"spicy" despite no chilli heat** — **Anja's hypothesis is the doubled cumin** (6→12 g, 16 g at the scaled actual). Plausible: cumin's warm pungency reads as "spicy" to her even without capsaicin. (My earlier tomato-acidity guess looks wrong; the live feedback points at cumin.) Worth a Lara cumin ablation, parallel to the smoked-paprika one (EXPERIMENTS #1). The white-miso swap *may* have helped Jannes but it's confounded with the corn/cauliflower/spice changes — not the clean white-vs-red test (EXPERIMENTS #4). Cook scaled to 1.6 kg squash (~×1.33 all round, kombu held 10 g; ~5.1 kg input). |
| 38 | Creamy Butternut & Soy Bean Soup | v1 | **First cook 2026-06-10 — family avg 6.5, spread 4.0** (Holger 8.0, Lara 7.3, Anja 7.2, Jannes 5.9, Julina 4.0). **Widest spread of any meal logged** (beats Japanese corn soup v1's 3.0). Split the table hard: the **two kids cratered** — **Julina 4.0** (far below her 8–9 norm; obs 4: a Julina drop = something *fundamental* is off) and **Jannes 5.9** (below his 7.0–7.5 floor, below even his red-miso 6.0). **Anja 7.2** (variance signal, obs 3) softened from her usual 8–9.5. Only Holger (his dish) and **Lara 7.3** (fine — no in-pot acid, no smoked paprika, ginger not galangal; cleared her flags) were content. **Leading hypothesis: the whole soy beans.** The near-twin Pinto–Butternut soup (creamy *blended* beans) scored **7.7–8.0 family-wide**; this swapped that for **whole soy beans** — beany, firm-textured, savoury — plus a dashi/miso/soy umami push. Soy beans are the differentiator and prime suspect: texture (under-tender risk flagged off the 5 h soak / 35 min cook) and/or beany-savoury flavour against sweet squash. Reads as a **Holger-solo / adult dish, not a family one.** Ask the kids whether it was the beans' *texture* or *taste*. Nutrition estimates, not FoodNoms-verified. **Correction (2026-06-16): the "whole soy beans" hypothesis was wrong — Holger reports the kids complained it was bitter, pointing at the kombu-shiitake dashi, not the beans (see obs 18).** |
| 39 | Chickpea, Cauliflower & Spinach Tikka Curry | v1 | **First cook 2026-06-12 — kids' meal, Holger not eating.** Two ratings: **Jannes 7.8, Anja 8.0** (Lara/Julina did not score). Built deliberately as a mild, pasta-forward landing after the soy-bean soup cratered the kids (remark 38): unsoaked chickpeas pressure-cooked in plain water (no tomato — acid stops beans softening), then 1000 g passata + cauliflower + 324 g whole-wheat penne + spinach simmered one-pot. **Jannes 7.8 ties his series-best (pinto v2, remark 37) and again clears cauliflower (his flagged dislike) — third straight data point that bold/mild savoury + tomato coating overrides the cauliflower aversion** (the florets simmered in tomato sauce, not steamed naked on top). Anja 8.0 in her usual range. Nutrition USDA-derived, not FoodNoms-verified (~3410 kcal, 173 g protein, 121 g fibre incl. a chickpea-record fibre patch, 8.8 g salt; finished yield 4380 g). |
| 40 | Vegetable & Potato Soup (Anja) | v1 | **Anja's own cook, 2026-06-15** — first dish logged under `anjas-cooking/`. **Family avg 8.2, spread 1.9** (Julina 9.5, Anja 8.0, Jannes 8.0, Lara 7.9, Holger 7.6). Strong family-wide hit — everyone ≥7.6, no dislikes. **The kids topped out:** Jannes 8.0 is a **new high for him** (above his 7.0–7.8 range — the mild, unfermented, simple-comfort profile is exactly his lane, obs 6), and **Lara 7.9 clears her stated ~7.8 near-ceiling** (obs 5) — a plain leek/potato soup trips none of her flags (no sourness, no smoked paprika, no warm aromatics). Julina 9.5 exceptional. **Holger lowest at 7.6** — the only one for whom "simple" undersells; his peaks are the bold/umami dishes (Japanese corn 9.0, pinto v2 8.2), and a plain potato soup is comfort, not a highlight. Sharp contrast with the soy-bean soup (remark 38, 6.5 avg, kids cratered): a simple mild comfort soup **unites** the family where the ambitious one split it. Great debut for Anja's cooking. Leek/celery/carrot/potato + Knorr veg cubes + parsley; 4800 g pot. Nutrition USDA-derived + Knorr label, not FoodNoms-verified (~1553 kcal, 40 g protein, 53 g fibre, salt 15.1 g — ~13 g from the 40 g of stock cubes). |
| 41 | Lobia Masala with Air-Fried Butternut | v1 | **First cook 2026-06-16 — family avg 8.16, spread 1.3** (Anja 8.8, Julina 8.5, Jannes 8.0, Holger 8.0, Lara 7.5). Strong family-wide hit, everyone ≥7.5 — sits with the veg soup (8.2) and pinto v2 (8.0) at the top of the family table. **Beans + butternut is fine for the family — the soy-bean soup's problem was a bitter dashi, not the beans.** Julina 8.5 (vs her 4.0 on the soy soup) and Jannes 8.0 (vs 5.9) are the clean contrast, but the differentiator is the **dashi**: this dish has none, whereas the soy soup's kombu-shiitake dashi went bitter (Holger, 2026-06-16; obs 18 corrected). Creamy/mild beans (pinto, black-eyed peas) sit squarely in the family's winning lane. **Jannes 8.0** extends his run of highs on mild-savoury dishes (veg soup 8.0, pinto v2 7.8). **Lara 7.5** even with the lemon going *into the pot* (she was away, rated later) — near her ceiling, acid-in-pot didn't hurt her here. Structure: unsoaked peas pressure-cooked in plain water (no tomato — acid rule), bhuna'd tikka-tomato sauce + white-miso umami anchor, butternut air-fried separately and folded in late to keep its caramelised edges. Nutrition USDA-derived, not FoodNoms-verified (~2151 kcal, 115 g protein, 80 g fibre, salt 6.1 g; passata salt + spice amounts estimated). |

---

| 43 | Aubergine Parmigiana (Anja) | v1 | **Anja's cook, 2026-06-20** — second dish under `anjas-cooking/`. **Ratings pending.** 1.5 kg aubergine + 1.2 kg tinned tomato baked down to a dense **1896 g** (from 2973 g input — a third lost as water). Lean for a parmigiana — only 23 g avocado oil, 15 g parmesan, 12 g nutritional yeast (the savoury cheese-substitute lift), balsamic for depth; ~1132 kcal whole, salt 5.3 g, very high fibre (71 g) from the aubergine. Nutrition USDA-derived + labels (Cirio tin, BWF nooch, balsamic est.), not FoodNoms-verified. | **First cook 2026-06-18 — family avg 8.57, spread 1.25** (Julina 9.25, Holger 8.8, Anja 8.8, Jannes 8.0, Lara 8.0). *(Anja revised 8.5→8.8 after the meal.)* **Top of the family table** — beats the veg soup (8.2) and Lobia (8.16); everyone ≥8.0, no dislikes, narrowest spread of any well-scored meal. **Two standouts.** (1) **Lara 8.0 — a new ceiling**, above her stated ~7.8 near-max (obs 5): a mild, sweet-creamy curry with no in-pot acid (lime at table), no smoked paprika, no warm aromatics, recognisable tofu *fully blended* (her one tofu condition met) — clears every flag at once. (2) **Holger 8.8 on a deliberately mild dish** — near his bold/umami peaks (Japanese corn 9.0); the browned-onion bhuna base + tomato-purée concentrate gave it adult-grade savoury depth without heat, so "mild for the kids" didn't cost him. **His 8.8 was with the at-table finish, though** — a generous squeeze of lemon + chillies in white-wine vinegar (acid *and* heat). So the mild pot is the kids' 8.0-floor base; the adult ceiling comes from the table. Textbook validation of the design's split-at-the-table approach (obs 1, 2): build mild, brighten + heat to taste. **Jannes 8.0** extends his mild-savoury run (veg soup 8.0, Lobia 8.0, pinto v2 7.8) and **again clears cauliflower** — air-fried + folded into a creamy curry, his fourth straight sauced-cauliflower pass (obs 19). **Julina 9.25** exceptional, her usual lane. Structure that worked: microwave-and-blend onion bhuna'd to deep gold as the umami engine; cauliflower air-fried separately and folded late; coconut milk + blended silken tofu off heat (no split); dried chickpeas pressure-cooked in plain water off the acid; potatoes microwave par-cooked to dodge the Ninja scorch trap. **Broccoli omitted on the night.** As-cooked 3.56 kg pot (onion 306 g, cauliflower 865 g, potato 992 g). Nutrition USDA-derived + four shop-item labels, not FoodNoms-verified (~2749 kcal, 123 g protein, 83 g fibre, salt 7.4 g). |
| 44 | Cold Buckwheat, Asparagus & Black-Eyed Bean Salad | v1 | **First cook 2026-06-24/25 — family avg 8.32, spread 1.8** (Anja 9.0, Julina 8.9, Holger 8.5, Jannes 8.0, Lara 7.2). Strong hot-day build-your-own salad; everyone ≥7.2, no dislikes. **The build-your-own format earned its keep — three of five tuned their own plate:** Jannes pulled the rocket (Italian-style leaves) → **6.9 with, 8.0 without**; Julina ate it **without the dressing** (disliked the nutty/peanut flavour) and still 8.9; Holger dressed his with the peanut dressing + coriander + **yuzu juice** (acid lift, standing in for the missing pomegranate molasses) for 8.5. **Anja 9.0** topped it. **Lara 7.2**, her floor here — she **named the asparagus** (not the dressing) as what she didn't like, *despite* generally being fine with asparagus (her words), so situational: most plausibly the **heavy 900 g cold-blanched load** dominating the bowl (~2× planned), not asparagus per se. (The dressing's acid/peanut may still have nudged her — obs 5 — but asparagus was her stated reason.) As-served ~3240 kcal (~650/serving): 250 g kasha (PC 0-min/low/10-min-release, firm), 300 g black-eyed beans (4-min HP), 900 g asparagus, 365 g raw peppers, 330 g egg, 140 g leaves; corn moved to the table, pom→10 ml balsamic. Nutrition estimates, not FoodNoms-verified. |

---

## observations

| obs_id | scope | text |
|:------:|:------|:-----|
| 1 | family | Family acid tolerance lower than initially assumed. Default: keep acid (lime/lemon/vinegar/pickled items) off main pot, offer at the table |
| 2 | Jannes, Anja | Heat-sensitive. Build dishes mild, offer chili at the table for adults |
| 3 | Anja | Variance signal — historically highest scorer; significant drops indicate specific identifiable issues |
| 4 | Julina | Most open-minded eater; a drop from her means something fundamental is off |
| 5 | Lara | ~7.8 was long her near-ceiling — hitting it means a dish cleared all her thresholds at once (veg soup 7.9, egg-fried quinoa ~7.8). **Raised 2026-06-18: the Coconut–Tomato curry pulled an 8.0 from her** — her highest logged score. A mild sweet-creamy curry with no in-pot acid, no smoked paprika, no warm aromatics, and silken tofu *fully blended* (her tofu condition) can clear 8.0. So the ceiling is ~8.0, and it takes every flag cleared simultaneously to reach it |
| 6 | Jannes | Appears to prefer milder, less-fermented profiles. Red miso intensity flagged as a likely turn-off. For family-friendly versions of dishes with miso, default to white miso. **Reinforced 2026-06-05:** the Pinto–Butternut soup was finished with red miso and Jannes scored 7.0 (floor of his range) — consistent with the pattern, though a milder effect than his Japanese-soup drop to 6.0 (red miso was a smaller dose here, 20 g in a 4.7 kg pot). **Update 2026-06-06:** v2 used **white** miso (in a bolder, tomato-anchored base) and Jannes rose to 7.8 — his best in the pinto line. Consistent with white-better-than-red for him, but confounded with the whole v2 reformulation, so suggestive not conclusive. Note he also liked the *bold* v2 — "bold savoury" suits him; it's *heat* and *fermented-funk* he's averse to, not assertive flavour per se |
| 7 | family | Red miso pulls dishes in an adult-palate direction (Holger, Anja, Julina all rated highly). Use sparingly for family meals; works well for solo or adult-only cooks |
| 8 | family | The corn soup matrix has 7 profiles with predicted scores (see `../design/CORN-SOUPS.md`). Where actuals exist (Japanese cooked v1), predictions were directionally accurate but model under-predicted Holger and over-predicted Jannes — both effects consistent with the red-miso hypothesis. Nordic prediction missed badly on Julina (predicted 8.0, actual disliked) — "open-minded" assumption was over-extended |
| 9 | project | Recipe files routinely diverge from matrix design specs (e.g. Mexican corn soup matrix specifies dried kidney beans 250g; cooked recipe uses 4×400g tinned). When recipes diverge, the recipe file represents the actual cook and supersedes the matrix. Matrix specs are preserved as design intent / starting point for new iterations |
| 10 | project | **Build-your-own / split-tray is a recurring design pattern** for handling mixed family preferences. Used in: Nordic White Asparagus & Rice Salad (everyone assembles their plate from separate components), Mediterranean & Indian Roasted Vegetable Tray (two trays in oven simultaneously, choose your side), and the corn soup recipes generally (lime/tamarind at table). Effective for seasoning-level differences; less effective when structural ingredients (peppers, cauliflower) are problematic for someone. **Strong success case (Cold Buckwheat Salad, 2026-06-25):** when component-assembly *is* the design rather than a workaround, it shines — three of five diners customised (Jannes dropped the rocket 6.9→8.0, Julina skipped the peanut dressing, Holger added yuzu) and it still averaged 8.32 with no dislikes. Each person tuned acid/heat/texture/dressing to taste |
| 11 | Lara, project | **The roasted-veg legacy recipes (Mediterranean + two-profile) are the most Lara-difficult dishes in the project** — they stack 3+ flagged ingredients (cooked peppers, smoked paprika, acid finish) per recipe. Any future cook of these should consider Lara-friendlier variants (drop peppers, halve paprika, move acid to table) or accept that Lara may eat selectively from build-your-own components |
| 12 | project | **The Indian Roasted Vegetable Bake v1→v2 evolution is the cleanest example in the legacy archive of recipe iteration responding to family preferences.** v1 carried both Jannes (cauliflower) and Lara (cooked peppers) concerns; v2 explicitly removes both, replacing with carrots and chickpeas. Sauce base also reworked: tomato-acid in v1 → creamy corn-tofu in v2. Worth studying as a template for "structural ingredient swap" iteration — distinct from "seasoning tweak" iteration which is more common across other dishes (see Japanese corn soup v1→v2, Thai shiitake soup v1→v2) |
| 13 | project | **Legacy PDF vs current recipe drift is a meaningful signal, not noise.** When a legacy PDF and a current Recipes/ version differ, the difference falls into one of two categories: (a) **planned → cooked drift** (e.g. Thai Shiitake Soup: PDF planned 20.5g salt, cooked actual 24g — quantitative shift during cooking), or (b) **design evolution** (e.g. West African corn soup: PDF black turtle beans + dried red chili → current black-eyed beans + scotch bonnet — qualitative redesign for authenticity / matrix-compliance). The current Recipes/ version is the authoritative latest state in both cases. Legacy PDFs preserve design history and are useful for understanding "what got changed and why" — not for cooking from |
| 14 | project | **Nutrition-value provenance is uncertain for current-project recipes.** Migrated `cooked-historical` recipes are explicitly flagged as estimates. The current-project recipes (Thai shiitake, Thai butternut curry, Japanese corn soup) carry precise-looking nutrition blocks but their provenance was never confirmed — they may be FoodNoms-verified, derived from Wolfram built-in data, or carried over from legacy PDFs. Forward protocol: the **USDA → FoodNoms generator** (`../docs/RECIPE_NUTRITION_GENERATOR.md`) is now the nutrition ground truth — regenerate these blocks USDA-derived as recipes are next touched/cooked; replace with FoodNoms-verified totals on a real cook. Do not assume legacy values are verified |
| 15 | Creamy Corn Soup — West African | v1 | **Asked Holger about legacy black turtle beans (no recall).** The legacy 2 kg PDF used dried black turtle beans 250 g; the current planned recipe uses dried black-eyed beans (matrix-aligned). Holger does not remember whether the original black-turtle cook worked well. Current black-eyed-bean recipe stands as the planned cook — decide post-cook whether to revisit black turtle if results don't land. Do not re-raise the legacy comparison unless new evidence appears |
| 16 | Aubergine · Passata · Amaranth | v1 | **Asked Holger about the 8.6/10 fourth rater (no recall).** Remark #20 speculated the missing fourth rater was Lara, given cooked peppers + smoked paprika. Holger does not remember. Treat as unresolvable from memory. Do not re-raise the question; if the dish is cooked again under the project, collect fresh ratings against the current five-person panel |
| 17 | Lara | **Sweet paprika well-tolerated — likely loved.** 2026-06-04 egg-fried quinoa (sweet paprika + shiitake powder + garlic powder + frozen peas) scored ~7.7–7.8 from Lara, at her near-ceiling (obs 5). Strengthens the reading that her aversion is to *smoke*, not paprika (see `EXPERIMENTS.md` #1 field evidence). Practical default: sweet (non-smoked) paprika is a safe, even high-scoring seasoning for Lara — reserve the concern for *smoked* paprika specifically. Not a controlled test (multiple components, score from memory), so confidence raised, not settled. **Second data point (2026-06-05):** Lara 7.3 on the sweet-paprika Pinto–Butternut soup — another solid score on a sweet-paprika-forward dish, consistent with the smoke-not-paprika reading |
| 19 | Jannes | **Cauliflower aversion is overridden by a tomato/savoury coating.** Jannes "dislikes cauliflower" (people note), but has now scored well on it three times running when it's *sauced*, not naked: pinto v2 (7.8, cauliflower steamed on top, remark 37) and the tikka curry (7.8, cauliflower simmered in tomato sauce, remark 39) — both his series-best. The pattern: cauliflower in an assertive savoury/tomato context passes; the flagged dislike seems to be about *plain/visible* cauliflower, not the vegetable per se. **Practical default: cauliflower is fine for Jannes if it's coated in a bold tomato or savoury sauce.** Pair with obs 6 (bold-savoury suits him; it's heat + fermented-funk he avoids). |
| 18 | Creamy Butternut & Soy Bean Soup, family | **Correction (Holger, 2026-06-16): the kids' problem was a BITTER DASHI, not the soy beans.** *Original reading (now superseded):* the whole soy beans (firm/beany texture, savoury flavour against sweet squash) were blamed for the kids cratering the soy-bean soup. **Holger clarified the kids complained it tasted bitter** — i.e. the kombu-shiitake dashi (24 g kombu + 16 g shiitake powder at the scaled cook) went bitter, not the beans. Corroborated by the **Lobia Masala (2026-06-16)**: beans + butternut with **no dashi** scored 8.16 family-wide, with Julina 4.0→8.5 and Jannes 5.9→8.0 vs the soy soup. **Lesson: the bitter-dashi pitfall is the family risk — a kombu/shiitake dashi can turn bitter (over-steeped or over-much kombu); go light, pull the kombu early, or skip it for the kids. Whole beans, soy included, are not themselves the problem.** (Lara 7.3 on the soy soup was fine — never a Lara-flag issue.) |
