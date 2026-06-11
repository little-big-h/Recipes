# Agent Onboarding — Operational Playbook & State of Play

For a fresh Claude (or other agent) picking up work in this repo, including on
something *adjacent* to recipe development. `README.md` and `CLAUDE.md` cover the
**what** (project, family, rules); this covers the **how** (tooling, gotchas you
won't guess) and the **current state**. Read this first if you're joining mid-stream.

---

## 1. Read order

1. `CLAUDE.md` — hard rules, auto-loaded every session (don't skip; it's short).
2. `README.md` — navigation + file map.
3. `docs/CONTEXT.md` — the cook (Holger), family palates, equipment, conventions.
4. This file — operational tooling + current state.
5. Then the topic docs as needed (`FOODNOMS_FORMAT`, `INGREDIENT_MAP`, `RATINGS`,
   `TECHNIQUES`, `RECIPE_FORMAT`, `RECIPE_NUTRITION_GENERATOR`, `PANTRY`, …).

---

## 2. Operational gotchas (NOT obvious — these will bite you)

- **The working tree gets rewound.** A concurrent process periodically resets this
  container's checkout to an *older* commit, mid-session. **Always sync before you
  edit**, and again before you commit:
  ```bash
  git fetch origin main -q
  [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ] && git reset --hard origin/main
  ```
  Commit and **push promptly** (`git push origin main`, retry with backoff on
  network errors). Don't sit on uncommitted work — it can vanish. Expect occasional
  fast-forward rejects / merge conflicts from the other agent; re-sync and re-apply.
- **`.foodnoms` files are LZFSE-compressed JSON**, not text. Needs the `lzfse`
  Python package (`pip install lzfse` — external, not a repo dependency). This is
  the one sanctioned exception to the "Wolfram, never Python" rule: the codec is
  file-I/O, not computation. Decode/encode one-liners are in `FOODNOMS_FORMAT.md` §2.
- **Reading PDFs / label photos:** the `Read` tool needs `poppler-utils`
  (`apt-get install -y poppler-utils`) for `pdftoppm`/`pdftotext`. `pypdf` is
  installed but has a broken `_cffi_backend` in this env — use `pdftotext -layout`
  (text) or `pdftoppm -png` + `Read` the image instead.
- **`WebFetch` 403s** on most retailer/manufacturer/USDA pages (bot/WAF blocking:
  milk.co.uk, clearspring.co.uk, fdc.nal.usda.gov, …). Fall back to **`WebSearch`**
  to recover label values, or fetch via the USDA **API** (below), not the website.
- **Wolfram is the compute engine** (MCP `…WolframLanguageEvaluator`), per
  CLAUDE.md. Used for nutrition math *and* USDA FDC API calls. It can be flaky —
  wrap food-detail fetches in a retry (`While` loop, ~4 tries) and check
  `AssociationQ` before parsing.

---

## 3. Nutrition / FoodNoms workflow (the bulk of recent work)

- **Resolution source of truth:** `tools/ingredient-map.json` (keyed by `foodID`,
  full per-100 nutrients). Human-readable table + provenance notes in
  `docs/INGREDIENT_MAP.md`. **Match a recipe ingredient by name here first**; only
  hit USDA when it's absent.
- **New USDA lookups:** USDA FoodData Central API (key + `tools/fdc-lookup.wl`
  helper documented in `docs/USDA_FDC.md`). Pattern in Wolfram: `foods/search` →
  `food/{fdcId}?format=full` → pull energy (kcal) + macros + micros into a per-100
  block. USDA "carbohydrate, by difference" **already includes fibre** (US-style).
- **Building files:** `docs/FOODNOMS_FORMAT.md` is the spec (contentType /
  collectionType, fields, the **carbs convention**, and the **patch pattern** §11).
  `docs/RECIPE_NUTRITION_GENERATOR.md` is the end-to-end playbook.
- **Conventions that bite (all in the linked docs):**
  - **Carbs are US-style — include fibre.** EU/UK labels exclude it, so `carbs =
    label_carbs + fibre` for label-sourced records. Tell: `fiber > carbs` ⇒ wrong.
  - **Micros are committed best-estimates.** FoodNoms verifies macros/salt only (no
    micro path) — never caveat micros as "pending verification."
  - **Salt is not a concern for Holger** — he's an endurance runner (electrolytes).
    Report it; don't flag it. (Family-meal palatability is a separate, milder thing.)
  - **Recipe naming:** append `[DD-MM-YY] ✴️` to every Claude-generated recipe
    `name` (creation date + the Claude-made star). Stamp lives in the collection
    `name`.
  - **Patch pattern:** to fix a gap in a USDA record without mutating it, use the
    3-file patch pattern (FOODNOMS_FORMAT §11) — a weightless patch *food* + a
    `🩹 … #Patched` sub-recipe. Example trio in `examples/`.

---

## 4. Standing preferences / decisions (digest — full text in the linked docs)

- **Pantry run-down** until the ~Aug 2026 Singapore move: use up stock, recommend
  in-stock subs, **don't buy**. Cinnamon is a flagged use-up priority. (`CLAUDE.md`,
  `PANTRY.md`.)
- **Defaults:** avocado oil **≤3 g/dish**; "milk" → **semi-skimmed, milk.co.uk
  values**; breakfast "passata" → the **Organic Chopped Tomatoes** tin (local
  label). (`PANTRY.md`, `INGREDIENT_MAP.md`.)
- **Family flags** (drive every family-meal seasoning decision): Lara — no in-pot
  acid, suspected smoked-paprika + warm-aromatic (cinnamon/cardamom/galangal)
  dislikes; Jannes (8) — heat-sensitive, dislikes fermented-forward (red miso) and
  cauliflower; Anja — heat-sensitive **variance signal** (a drop = a real issue);
  Julina (13) — most open-minded (**a drop from her = something fundamental**).
  (`CONTEXT.md`, `RATINGS.md` observations.)
- **White miso is the family-default miso** (not red). Out of liquid aminos →
  soy sauce stands in.
- **Learning (RATINGS obs 18):** *whole* soy beans don't land with the kids — for a
  family butternut-bean soup, blend the beans in (the pinto-butternut model);
  reserve whole-soy-bean + dashi for Holger-solo / adults.

---

## 5. Repo map

```
CLAUDE.md                 hard rules (auto-loaded)
README.md                 navigation + file map
docs/
  ONBOARDING.md           ← you are here
  CONTEXT.md              cook, family, equipment, conventions
  RECIPE_FORMAT.md        recipe .md structure (emoji prefixes, nutrition block)
  FOODNOMS_FORMAT.md      .foodnoms spec (LZFSE JSON) + patch pattern
  RECIPE_NUTRITION_GENERATOR.md   recipe → USDA → .foodnoms playbook
  INGREDIENT_MAP.md       name → foodID table + provenance notes (USDA FDC links)
  USDA_FDC.md             FoodData Central API usage + key
  TECHNIQUES.md           equipment + technique knowledge (Ninja, dashi, salt…)
  Nussinow_Cooking_Times.md   pressure-cooking reference
  PANTRY.md               staples in stock
  RATINGS.md              relational family-ratings DB (schema at top)
  EXPERIMENTS.md          active ablations / hypothesis tests
design/                   dish-family design docs (SHAKSHUKA, CORN-SOUPS, SOLO-HOLGER)
recipes/{soups,grains,oven-mains,stovetop-mains,salads}/   recipe .md files
examples/                 .foodnoms samples (the canonical format references)
tools/
  ingredient-map.json     the resolution database (per-100 nutrients by foodID)
  fdc-lookup.wl           Wolfram USDA-fetch helper
```

---

## 6. State of play (as of 2026-06-11)

- **Heavy `.foodnoms` generation phase.** `tools/ingredient-map.json` was expanded
  a lot: soybeans/dried-ginger/shiitake-powder resolved from calories-only stubs to
  **full USDA records**; label-derived records added for harissa, the tomato tin,
  kecap manis (Chi Wan), peanut flour (Buy Whole Foods), hon-mirin (Clearspring
  Mikawa), skyr, semi-skimmed milk; **USDA FDC links** added to every USDA row in
  `INGREDIENT_MAP.md` and a `USDA` column to every recipe's ingredient table.
- **Creamy Butternut & Soy Bean Soup** is the recipe most actively iterated; cooked
  and **rated poorly (family avg 6.5, widest spread in the log)** — see RATINGS
  remark 38 / obs 18.
- **A second agent is committing to this repo concurrently** (the source of the
  tree rewinds in §2). Don't assume your last push is still `HEAD` — re-sync.
