# Recipes — Family Vegetarian Cooking Project

## 🍽️ Latest recipes

*The 10 most recently created dishes (recipes + Anja's cooks), newest first. Kept current on every new dish (see `CLAUDE.md`).*

1. **[Creamy Tomato, Coconut & Spinach Sauce v2](recipes/stovetop-mains/creamy-tomato-coconut-spinach-sauce-v2.md)** — 2026-07-02
2. **[Creamy Tomato, Coconut & Spinach Sauce](recipes/stovetop-mains/creamy-tomato-coconut-spinach-sauce.md)** — 2026-07-02
3. **[Super-Quick Hasselback Jacket Potatoes](recipes/oven-mains/hasselback-jacket-potatoes.md)** — 2026-07-01
4. **[Smooth Onion–Tomato Gravy (base sauce)](recipes/stovetop-mains/onion-tomato-gravy.md)** — 2026-06-30
5. **[Ras el Hanout Spelt with Air-Fried Butternut & Mixed Beans](recipes/grains/ras-el-hanout-spelt-butternut-beans.md)** — 2026-06-27
6. **[Cold Buckwheat, Asparagus & Black-Eyed Bean Salad (Gado-Gado-Style)](recipes/salads/cold-buckwheat-asparagus-blackeyed-salad.md)** — 2026-06-24
7. **[Aubergine Parmigiana (Anja)](anjas-cooking/aubergine-parmigiana.md)** — 2026-06-20
8. **[Creamy Coconut–Tomato Veg & Chickpea Curry](recipes/stovetop-mains/coconut-tomato-veg-chickpea-curry.md)** — 2026-06-18
9. **[Lobia Masala with Air-Fried Butternut](recipes/stovetop-mains/lobia-masala-butternut.md)** — 2026-06-16
10. **[Vegetable & Potato Soup (Anja)](anjas-cooking/vegetable-potato-soup.md)** — 2026-06-15

---

A working project for developing, iterating, and tracking family recipes.
Holger Pirk's home kitchen, vegetarian, family of five.

This directory contains everything needed for a Claude Code instance to continue
recipe development without prior conversation history.

---

## How to navigate this project

**Start here if you're a new Claude Code instance:**

> **Picking up mid-stream?** Read **`docs/ONBOARDING.md`** first — operational tooling, the gotchas you won't guess (the working tree gets rewound by a concurrent agent!), and the current state of play.

1. Read `CLAUDE.md` — hard rules that fire every session (auto-loaded by Claude Code)
2. Read `docs/CONTEXT.md` — family, equipment, dietary preferences, working conventions
3. Read `docs/RECIPE_FORMAT.md` — exact specification for how recipe files are structured
4. Read `docs/TECHNIQUES.md` — cooking techniques and equipment-specific knowledge developed through iteration
5. Read `docs/RATINGS.md` — the relational database of family ratings, with full schema spec at the top
6. Read `docs/Nussinow_Cooking_Times.md` — authoritative pressure-cooking reference

Reference docs for specific dish families and project infrastructure:

- `design/SHAKSHUKA.md` — single-serving breakfast profiles (7 shakshuka variants + sauerkraut hash + bulk paste design)
- `design/SOLO-HOLGER.md` — single-serving recipes for Holger alone (e.g. Post-Workout Cream); out of the ratings system
- `design/CORN-SOUPS.md` — 7-profile corn soup matrix with predicted scores and prediction-vs-actual analysis
- `docs/PANTRY.md` — staples always in stock; recipe-design reference
- `docs/EXPERIMENTS.md` — active hypothesis tests and ablation protocols (e.g. Lara smoked paprika, Japanese corn soup white-vs-red miso)
- `docs/IDEAS.md` — recipe-idea backlog: external recipes to adapt + flavour directions to try, before they're speced or cooked
- `docs/FOODNOMS_FORMAT.md` — spec for generating `.foodnoms` files (LZFSE-compressed JSON); samples in `examples/`
- `docs/USDA_FDC.md` — pulling authentic USDA nutrition via Wolfram → FoodNoms blocks; helper in `tools/fdc-lookup.wl`
- `docs/BWFO_GRAPHQL.md` — pulling BuyWholeFoodsOnline product macros/price/URL via their Magento GraphQL API (curl + jq, GET not POST); ingredients aren't exposed
- `docs/RECIPE_NUTRITION_GENERATOR.md` — playbook: recipe `.md` → USDA → `.foodnoms` file + written-back Nutrition table
- `docs/MEAL_LOGGING.md` — logging *eaten* food: weigh-by-difference (before/after photos) → `.foodnoms` meal file; uncertainty policy (10 % weighed / 30 % photo-only)
- `Books/README.md` — index of reference booklets/ebooks (The Flavor Equation, Salt Fat Acid Heat, The Food Lab, Modernist Cuisine Vol 2, Cooked) with per-book TOC + page citations; consult and cite like the Nussinow tables

Individual recipe files live under `recipes/`, grouped by dish type.

**Anja's own cooks** live under `anjas-cooking/` — logged minimally (name · ingredients · nutrition · FoodNoms link, no method); see its `README.md`. Rated in `docs/RATINGS.md` like everything else.

---

## File organization

```
Recipes/
├── README.md                                  This file
├── CLAUDE.md                                  Hard rules (auto-loaded by Claude Code)
│
├── Books/                                     Reference booklets/ebooks (PDFs) + index
│   └── README.md                              Per-book TOC + page citations (consult like Nussinow)
│
├── docs/                                      Project documentation
│   ├── CONTEXT.md                             Family, equipment, conventions
│   ├── RECIPE_FORMAT.md                       Recipe file format spec
│   ├── TECHNIQUES.md                          Cooking techniques and gotchas
│   ├── RATINGS.md                             Relational ratings database
│   ├── PANTRY.md                              Staples-in-stock reference
│   ├── EXPERIMENTS.md                         Hypothesis tests and ablation protocols
│   ├── FOODNOMS_FORMAT.md                     .foodnoms file format spec
│   ├── USDA_FDC.md                            USDA FoodData Central → FoodNoms (via Wolfram)
│   ├── BWFO_GRAPHQL.md                         BuyWholeFoodsOnline product data via GraphQL (curl)
│   ├── RECIPE_NUTRITION_GENERATOR.md          Recipe -> USDA -> .foodnoms + Nutrition table
│   └── Nussinow_Cooking_Times.md              Pressure-cooking reference
│
├── tools/                                     Helper scripts
│   └── fdc-lookup.wl                          USDA FDC fetch + map to FoodNoms (Wolfram)
│
├── design/                                    Dish-family design libraries
│   ├── CORN-SOUPS.md                          Corn soup 7-profile matrix
│   ├── SHAKSHUKA.md                           Breakfast profile library
│   └── SOLO-HOLGER.md                         Solo Holger recipes (Post-Workout Cream etc.)
│
└── recipes/
    ├── soups/
    │   ├── creamy-shiitake-soup-thai.md       Cooked v1 — 7.96 avg
    │   ├── creamy-shiitake-soup-thai-v2.md    Planned redesign
    │   ├── creamy-corn-soup-nordic.md         Cooked v1 — qualitative ratings only
    │   ├── creamy-corn-soup-westafrican.md    Planned, not yet cooked
    │   ├── creamy-corn-soup-japanese.md       Cooked v1 — 7.66 avg (red miso variant)
    │   ├── creamy-corn-soup-japanese-v2.md    Planned hypothesis test (white miso)
    │   ├── creamy-corn-soup-indian.md         Tikka-spiced corn soup with chickpeas
    │   ├── creamy-corn-soup-mexican.md        Mexican corn soup, tinned kidney beans
    │   ├── creamy-corn-soup-mexican-low-effort.md   Mexican corn soup, unattended ~90 min
    │   ├── creamy-corn-soup-mexican-2026-06-02.md   Mexican corn soup, dried-bean variant
    │   ├── butternut-butterbean-soup.md       Squash + butter bean soup
    │   └── cauliflower-potato-soup-kasha.md   Tikka-spiced soup with kasha
    │
    ├── oven-mains/
    │   ├── indian-roasted-veg-bake.md         Two-wave oven bake, tomato-curry sauce (v1)
    │   ├── indian-roasted-veg-bake-v2.md      Lara/Jannes-friendlier redesign, creamy corn-tofu sauce
    │   ├── roasted-veg-mediterranean.md       Rosemary-roasted veg tray + kasha
    │   └── roasted-veg-two-profiles.md        Split-tray Med + Indian roasted veg
    │
    ├── stovetop-mains/
    │   ├── thai-yellow-butternut-curry.md     Cooked v1 — 8.06 avg
    │   ├── aubergine-passata-amaranth.md      Aubergine braise — historical 8.6/10 avg
    │   └── squash-mash-tofu-gravy.md          Carb-loading squash mash + tofu
    │
    └── grains/
        ├── courgette-pea-risotto.md           Carb-loading risotto + tofu
        └── nordic-asparagus-rice-salad.md     Cold composed salad, build-your-own
```

---

## Common workflows

### Cooking an existing recipe → record ratings

1. Open the relevant recipe file. Note the planned amounts.
2. After cooking, optionally fill in "Actual used" column in the ingredients table.
3. Collect ratings from family members (out of 10).
4. Update `docs/RATINGS.md` per the schema spec at the top of that file:
   - Change `iterations` row status from `planned` to `cooked`, add date
   - Add one `ratings` row per person
   - Add `remarks` for iteration-specific feedback
   - Promote cross-cutting patterns to `observations` if relevant

### Designing a new recipe

1. Sketch ingredients, method, timeline in conversation with the user.
2. Once finalized, write recipe to `recipes/{category}/{recipe-name}.md` following `docs/RECIPE_FORMAT.md`.
3. Add a row to `dishes` table in `docs/RATINGS.md`.
4. Add an `iterations` row with status=`planned` (or `cooked` if already made).

### Iterating on a recipe (v2, v3, ...)

- **Small refinements** (ingredient quantities, method clarifications): edit the existing recipe file in place.
- **Substantial reformulations** (different core ingredients, different cooking approach): create a new `{recipe-name}-v2.md` file to preserve the earlier version for comparison.
- Either way, add a new `iterations` row in `docs/RATINGS.md` with the new version number.

The Indian Roasted Vegetable Bake v1→v2 pair is the cleanest worked example in the archive of substantial reformulation responding to family preferences. See observation #12 in `docs/RATINGS.md` for the iteration analysis.

### Visualizing cooking timelines

Recipe timelines are rendered at markdown render-time via a Wolfram Cloud endpoint.
See `docs/TECHNIQUES.md` for the endpoint URL and parameter structure.

---

## Migration status — complete

The parent directory `~/Documents/Claude-Interchange/` contained legacy PDF and `.wl` (Wolfram Language) files from earlier recipe development sessions. **All recipe content has been migrated to markdown in this directory.**

Migrated:
- 13 cooked-historical recipes (PDFs + `.wl` files) recovered as `.md`
- `breakfast-flavor-profiles.pdf` → integrated into `design/SHAKSHUKA.md`
- `corn-soup-flavor-profiles.pdf` → integrated into `design/CORN-SOUPS.md`

The only PDF remaining in the parent directory unrelated to this project is `jannes_5k_plan.pdf` (a running plan, out of scope).

**Legacy source files (PDFs and `.wl`) are not stored in this directory but are available on request from the user.** If you need to consult them — e.g. to reconstruct a migration decision, check pre-migration nutrition numbers, or compare planned-vs-cooked drift — ask the user and they will provide them.

---

## Communication preferences (from the user)

- Direct, concise responses
- Metric units throughout
- Specific quantities preferred over vague descriptions
- Ask clarifying questions when uncertain
- State assumptions explicitly
- Push back when reasoning has gaps
- 🐙 ("the okaytopus") signals user approval
- Week begins on Monday
- Use Wolfram, never Python, for any computation

---

## Tools and external systems

- **Ninja ML750** combined pressure cooker / air fryer (primary cooking tool)
- **FoodNoms** nutrition tracking app (±30% mode; midpoint is the working number)
- **Wolfram Cloud** timeline rendering endpoint (see `docs/TECHNIQUES.md`)
- **HealthFit** running data — not relevant to this project but mentioned occasionally
- **Vegan Under Pressure** by Jill Nussinow — authoritative pressure-cooking reference (see `docs/Nussinow_Cooking_Times.md`)
