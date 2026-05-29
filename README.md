# Recipes — Family Vegetarian Cooking Project

A working project for developing, iterating, and tracking family recipes.
Holger Pirk's home kitchen, vegetarian, family of five.

This directory contains everything needed for a Claude Code instance to continue
recipe development without prior conversation history.

---

## How to navigate this project

**Start here if you're a new Claude Code instance:**

1. Read `CLAUDE.md` — hard rules that fire every session (auto-loaded by Claude Code)
2. Read `CONTEXT.md` — family, equipment, dietary preferences, working conventions
3. Read `RECIPE_FORMAT.md` — exact specification for how recipe files are structured
4. Read `TECHNIQUES.md` — cooking techniques and equipment-specific knowledge developed through iteration
5. Read `RATINGS.md` — the relational database of family ratings, with full schema spec at the top
6. Read `Nussinow_Cooking_Times.md` — authoritative pressure-cooking reference

Reference docs for specific dish families and project infrastructure:

- `SHAKSHUKA.md` — single-serving breakfast profiles (7 shakshuka variants + sauerkraut hash + bulk paste design)
- `SOLO-HOLGER.md` — single-serving recipes for Holger alone (e.g. Post-Workout Cream); out of the ratings system
- `CORN-SOUPS.md` — 7-profile corn soup matrix with predicted scores and prediction-vs-actual analysis
- `PANTRY.md` — staples always in stock; recipe-design reference
- `EXPERIMENTS.md` — active hypothesis tests and ablation protocols (e.g. Lara smoked paprika, Japanese corn soup white-vs-red miso)

Individual recipe files are at the top level.

---

## File organization

```
Recipes/
├── README.md                                  This file
├── CLAUDE.md                                  Hard rules (auto-loaded by Claude Code)
├── CONTEXT.md                                 Family, equipment, conventions
├── RECIPE_FORMAT.md                           Recipe file format spec
├── TECHNIQUES.md                              Cooking techniques and gotchas
├── SHAKSHUKA.md                               Breakfast profile library
├── SOLO-HOLGER.md                             Solo Holger recipes (Post-Workout Cream etc.)
├── CORN-SOUPS.md                              Corn soup 7-profile matrix
├── PANTRY.md                                  Staples-in-stock reference
├── EXPERIMENTS.md                             Hypothesis tests and ablation protocols
├── RATINGS.md                                 Relational ratings database
├── Nussinow_Cooking_Times.md                  Pressure-cooking reference
│
│   ── Current project recipes ──
├── thai-yellow-butternut-curry.md             Cooked v1 — 8.06 avg
├── creamy-shiitake-soup-thai.md               Cooked v1 — 7.96 avg
├── creamy-shiitake-soup-thai-v2.md            Planned redesign
├── creamy-corn-soup-nordic.md                 Cooked v1 — qualitative ratings only
├── creamy-corn-soup-westafrican.md            Planned, not yet cooked
├── creamy-corn-soup-japanese.md               Cooked v1 — 7.66 avg (red miso variant)
├── creamy-corn-soup-japanese-v2.md            Planned hypothesis test (white miso)
│
│   ── Migrated from legacy sources (cooked-historical) ──
├── courgette-pea-risotto.md                   Carb-loading risotto + tofu
├── squash-mash-tofu-gravy.md                  Carb-loading squash mash + tofu
├── aubergine-passata-amaranth.md              Aubergine braise — historical 8.6/10 avg
├── butternut-butterbean-soup.md               Squash + butter bean soup
├── cauliflower-potato-soup-kasha.md           Tikka-spiced soup with kasha
├── creamy-corn-soup-indian.md                 Tikka-spiced corn soup with chickpeas
├── creamy-corn-soup-mexican.md                Mexican corn soup, tinned kidney beans
├── creamy-corn-soup-mexican-low-effort.md     Mexican corn soup, unattended ~90 min
├── nordic-asparagus-rice-salad.md             Cold composed salad, build-your-own
├── roasted-veg-mediterranean.md               Rosemary-roasted veg tray + kasha
├── roasted-veg-two-profiles.md                Split-tray Med + Indian roasted veg
├── indian-roasted-veg-bake.md                 Two-wave oven bake, tomato-curry sauce (v1)
└── indian-roasted-veg-bake-v2.md              Lara/Jannes-friendlier redesign, creamy corn-tofu sauce
```

---

## Common workflows

### Cooking an existing recipe → record ratings

1. Open the relevant recipe file. Note the planned amounts.
2. After cooking, optionally fill in "Actual used" column in the ingredients table.
3. Collect ratings from family members (out of 10).
4. Update `RATINGS.md` per the schema spec at the top of that file:
   - Change `iterations` row status from `planned` to `cooked`, add date
   - Add one `ratings` row per person
   - Add `remarks` for iteration-specific feedback
   - Promote cross-cutting patterns to `observations` if relevant

### Designing a new recipe

1. Sketch ingredients, method, timeline in conversation with the user.
2. Once finalized, write recipe to `{recipe-name}.md` following `RECIPE_FORMAT.md`.
3. Add a row to `dishes` table in `RATINGS.md`.
4. Add an `iterations` row with status=`planned` (or `cooked` if already made).

### Iterating on a recipe (v2, v3, ...)

- **Small refinements** (ingredient quantities, method clarifications): edit the existing recipe file in place.
- **Substantial reformulations** (different core ingredients, different cooking approach): create a new `{recipe-name}-v2.md` file to preserve the earlier version for comparison.
- Either way, add a new `iterations` row in `RATINGS.md` with the new version number.

The Indian Roasted Vegetable Bake v1→v2 pair is the cleanest worked example in the archive of substantial reformulation responding to family preferences. See observation #12 in `RATINGS.md` for the iteration analysis.

### Visualizing cooking timelines

Recipe timelines are rendered at markdown render-time via a Wolfram Cloud endpoint.
See `TECHNIQUES.md` for the endpoint URL and parameter structure.

---

## Migration status — complete

The parent directory `~/Documents/Claude-Interchange/` contained legacy PDF and `.wl` (Wolfram Language) files from earlier recipe development sessions. **All recipe content has been migrated to markdown in this directory.**

Migrated:
- 13 cooked-historical recipes (PDFs + `.wl` files) recovered as `.md`
- `breakfast-flavor-profiles.pdf` → integrated into `SHAKSHUKA.md`
- `corn-soup-flavor-profiles.pdf` → integrated into `CORN-SOUPS.md`

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
- **Wolfram Cloud** timeline rendering endpoint (see TECHNIQUES.md)
- **HealthFit** running data — not relevant to this project but mentioned occasionally
- **Vegan Under Pressure** by Jill Nussinow — authoritative pressure-cooking reference (see `Nussinow_Cooking_Times.md`)
