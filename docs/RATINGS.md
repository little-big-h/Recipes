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
| Lara | Selective eater. Dislikes: sourness, cooked peppers (raw fine), smoked paprika (suspected — but sweet paprika well-tolerated/loved, see obs 17), warm aromatics (galangal/cinnamon/cardamom — not firmly established), recognisable silken tofu (fine when fully blended) |
| Julina | 13yo. Most open-minded eater in the family |
| Anja | Adventurous. Historically highest scorer. Variance signal — drops indicate specific issues |
| Holger | Recipe developer. Vegetarian, marathon training |
| Jannes | 8yo. Heat-sensitive. Dislikes cauliflower. Prefers milder profiles — fermented depth (red miso) underwhelmed him |

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

---

## observations

| obs_id | scope | text |
|:------:|:------|:-----|
| 1 | family | Family acid tolerance lower than initially assumed. Default: keep acid (lime/lemon/vinegar/pickled items) off main pot, offer at the table |
| 2 | Jannes, Anja | Heat-sensitive. Build dishes mild, offer chili at the table for adults |
| 3 | Anja | Variance signal — historically highest scorer; significant drops indicate specific identifiable issues |
| 4 | Julina | Most open-minded eater; a drop from her means something fundamental is off |
| 5 | Lara | 7.8 is her near-ceiling rating. Hitting it means the dish has cleared all her thresholds simultaneously |
| 6 | Jannes | Appears to prefer milder, less-fermented profiles. Red miso intensity flagged as a likely turn-off. For family-friendly versions of dishes with miso, default to white miso. **Reinforced 2026-06-05:** the Pinto–Butternut soup was finished with red miso and Jannes scored 7.0 (floor of his range) — consistent with the pattern, though a milder effect than his Japanese-soup drop to 6.0 (red miso was a smaller dose here, 20 g in a 4.7 kg pot) |
| 7 | family | Red miso pulls dishes in an adult-palate direction (Holger, Anja, Julina all rated highly). Use sparingly for family meals; works well for solo or adult-only cooks |
| 8 | family | The corn soup matrix has 7 profiles with predicted scores (see `../design/CORN-SOUPS.md`). Where actuals exist (Japanese cooked v1), predictions were directionally accurate but model under-predicted Holger and over-predicted Jannes — both effects consistent with the red-miso hypothesis. Nordic prediction missed badly on Julina (predicted 8.0, actual disliked) — "open-minded" assumption was over-extended |
| 9 | project | Recipe files routinely diverge from matrix design specs (e.g. Mexican corn soup matrix specifies dried kidney beans 250g; cooked recipe uses 4×400g tinned). When recipes diverge, the recipe file represents the actual cook and supersedes the matrix. Matrix specs are preserved as design intent / starting point for new iterations |
| 10 | project | **Build-your-own / split-tray is a recurring design pattern** for handling mixed family preferences. Used in: Nordic White Asparagus & Rice Salad (everyone assembles their plate from separate components), Mediterranean & Indian Roasted Vegetable Tray (two trays in oven simultaneously, choose your side), and the corn soup recipes generally (lime/tamarind at table). Effective for seasoning-level differences; less effective when structural ingredients (peppers, cauliflower) are problematic for someone |
| 11 | Lara, project | **The roasted-veg legacy recipes (Mediterranean + two-profile) are the most Lara-difficult dishes in the project** — they stack 3+ flagged ingredients (cooked peppers, smoked paprika, acid finish) per recipe. Any future cook of these should consider Lara-friendlier variants (drop peppers, halve paprika, move acid to table) or accept that Lara may eat selectively from build-your-own components |
| 12 | project | **The Indian Roasted Vegetable Bake v1→v2 evolution is the cleanest example in the legacy archive of recipe iteration responding to family preferences.** v1 carried both Jannes (cauliflower) and Lara (cooked peppers) concerns; v2 explicitly removes both, replacing with carrots and chickpeas. Sauce base also reworked: tomato-acid in v1 → creamy corn-tofu in v2. Worth studying as a template for "structural ingredient swap" iteration — distinct from "seasoning tweak" iteration which is more common across other dishes (see Japanese corn soup v1→v2, Thai shiitake soup v1→v2) |
| 13 | project | **Legacy PDF vs current recipe drift is a meaningful signal, not noise.** When a legacy PDF and a current Recipes/ version differ, the difference falls into one of two categories: (a) **planned → cooked drift** (e.g. Thai Shiitake Soup: PDF planned 20.5g salt, cooked actual 24g — quantitative shift during cooking), or (b) **design evolution** (e.g. West African corn soup: PDF black turtle beans + dried red chili → current black-eyed beans + scotch bonnet — qualitative redesign for authenticity / matrix-compliance). The current Recipes/ version is the authoritative latest state in both cases. Legacy PDFs preserve design history and are useful for understanding "what got changed and why" — not for cooking from |
| 14 | project | **Nutrition-value provenance is uncertain for current-project recipes.** Migrated `cooked-historical` recipes are explicitly flagged as estimates. The current-project recipes (Thai shiitake, Thai butternut curry, Japanese corn soup) carry precise-looking nutrition blocks but their provenance was never confirmed — they may be FoodNoms-verified, derived from Wolfram built-in data, or carried over from legacy PDFs. Forward protocol: replace with FoodNoms-verified totals as recipes are cooked again; do not assume current values are verified |
| 15 | Creamy Corn Soup — West African | v1 | **Asked Holger about legacy black turtle beans (no recall).** The legacy 2 kg PDF used dried black turtle beans 250 g; the current planned recipe uses dried black-eyed beans (matrix-aligned). Holger does not remember whether the original black-turtle cook worked well. Current black-eyed-bean recipe stands as the planned cook — decide post-cook whether to revisit black turtle if results don't land. Do not re-raise the legacy comparison unless new evidence appears |
| 16 | Aubergine · Passata · Amaranth | v1 | **Asked Holger about the 8.6/10 fourth rater (no recall).** Remark #20 speculated the missing fourth rater was Lara, given cooked peppers + smoked paprika. Holger does not remember. Treat as unresolvable from memory. Do not re-raise the question; if the dish is cooked again under the project, collect fresh ratings against the current five-person panel |
| 17 | Lara | **Sweet paprika well-tolerated — likely loved.** 2026-06-04 egg-fried quinoa (sweet paprika + shiitake powder + garlic powder + frozen peas) scored ~7.7–7.8 from Lara, at her near-ceiling (obs 5). Strengthens the reading that her aversion is to *smoke*, not paprika (see `EXPERIMENTS.md` #1 field evidence). Practical default: sweet (non-smoked) paprika is a safe, even high-scoring seasoning for Lara — reserve the concern for *smoked* paprika specifically. Not a controlled test (multiple components, score from memory), so confidence raised, not settled. **Second data point (2026-06-05):** Lara 7.3 on the sweet-paprika Pinto–Butternut soup — another solid score on a sweet-paprika-forward dish, consistent with the smoke-not-paprika reading |
