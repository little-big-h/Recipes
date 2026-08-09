# Claude Code Project Instructions — Recipes/

This file is read automatically at session start. **For full project context, read `README.md` first, then `docs/CONTEXT.md`; see `docs/ONBOARDING.md` for tooling/operational notes + current state.** This file contains only the hard rules that absolutely need to fire on every session — keep it short.

---

## ⚠ Active constraint — pantry run-down (temporary, until ~Aug 2026)

**Holger is moving to Singapore in ~2 months (~August 2026).** Until the move:

- **Do not buy — or recommend buying — new ingredients.** Design recipes around what is already in stock.
- **Prioritise using up the spices and pastes on hand** — favour dishes and substitutions that deplete the pantry.
- If a recipe would call for something not stocked, suggest an **in-stock substitute or omission**, never a purchase.

*(Delete this section after the move.)*

---

## Hard rules

- **Use Wolfram, never Python** for any computation. Explicit user preference.
- **Never manually parse JSON.** Don't hand-roll string surgery or call `ImportString`/`Interpreter["RawJSON"]` in a function body. Let the framework do it declaratively — an `APIFunction` parameter interpreter, `Import`/`URLExecute` with a format, etc. (Holger, emphatic.)
- **Metric units throughout** — grams, millilitres, °C. Never imperial.
- **Recipe nutrition totals are for the whole recipe** — never per serving, never per 100g.
- **Ratings are out of 10**, one decimal place. 9–10 = exceptional. See `docs/RATINGS.md` schema for the data model.
- **Week begins on Monday.**
- **🐙 ("the okaytopus") signals user approval** from Holger. Mirror it when appropriate, never overuse it.
- **Currency: GBP (£).**
- **Never use immediate (quick) release on the Ninja pressure cooker.** Natural or delayed only. See `docs/TECHNIQUES.md`.
- **Every ingredient gets a unique emoji prefix** used consistently in the ingredient table, method, and notes. See `docs/RECIPE_FORMAT.md`.
- **Always embed the rendered `RenderTimeline` image** in a recipe's Timeline section — never a textual-only timeline. It renders at page-view (the URL *is* the artifact), so it's effectively free. Labels must be **ASCII-only** (a `°`/`é`/emoji yields a blank chart). See `docs/RECIPE_FORMAT.md` → Timeline.
- **Every meal-log entry gets an uncertainty tier — never leave it blank.** When logging *eaten* food to a `.foodnoms` meal (`collectionType=2`), set `uncertainty` **per entry** via `customUncertainties` / `fdcUncertainties`: **0** = weighed raw whole food *or* a fully-labelled packaged item (portion and composition both known), **10** = weighed prepared/cooked dish (portion exact, composition estimated), **30** = photo-only *or* an assumed portion. A single sitting normally mixes tiers. See `docs/MEAL_LOGGING.md` → Uncertainty policy.
- **Always embed a FoodNoms download link** (`BuildFoodNomsRecipe` URL) in a recipe's Nutrition section — just like the timeline image, the `.foodnoms` file is only generated when the link is clicked, so the URL *is* the artifact and it's effectively free. Verify it first via the JSON view (`-H 'Accept: application/json'`, HTTP 200, totals matching the Nutrition table). See `docs/RECIPE_FORMAT.md` → Nutrition.
- **Charts/diagrams: Wolfram, delivered as PNG preview + code.** Build every plot in Wolfram (never Python plotting). Deliver **two things**: a **PNG preview** (render the graphic via the Wolfram MCP — it hosts the image; `curl` the URL to embed/send) **and** the **self-contained Wolfram code** ending in `Export["…​.pdf"/".svg", plot]` so Holger produces the vector himself. Don't chunk-transport the vector unless asked. Follow the `dataviz` skill (validated categorical palette, direct labels, one axis).
- **Name every Claude-generated recipe with a `[DD-MM-YY]` creation-date suffix and a trailing ✴️** (marks it Claude-made), e.g. `Creamy Butternut & Soy Bean Soup [10-06-26] ✴️`. The stamp goes in the collection `name`. See `docs/FOODNOMS_FORMAT.md`.
- **Keep the "🍽️ Latest recipes" list at the very top of `README.md` current.** Whenever you add a new recipe file under `recipes/` **or a new entry under `anjas-cooking/`**, prepend it to that list (newest first, with its creation date) and drop the oldest so it stays at **10**. It must be the first thing seen in the repo — Holger's standing request.

## Don't touch

- **Do not edit `.md` files in the parent directory** (`~/Documents/Claude-Interchange/`). The canonical recipe files all live in `Recipes/`. Parent-directory duplicates are stale and pending file-hygiene decisions Holger has not made yet.
- **Do not delete or "tidy up" legacy artifacts** (PDFs, `.wl` files, emacs autosaves like `#name.md#` or `.#name.md`, the `RECIPE_FORMAT copy.md.bak.md` orphan, timeline SVGs) without asking. File hygiene is a deferred decision.
- **Do not touch `.obsidian/`** or `.claudian/` unless the user explicitly asks.

## Forward-protocol decisions

- **Nutrition ground truth = the USDA → FoodNoms pipeline.** Generate recipe nutrition from authentic USDA FoodData Central values (resolved via `docs/INGREDIENT_MAP.md` first, USDA fallback `docs/USDA_FDC.md` / `tools/fdc-lookup.wl`), computed in Wolfram, per the playbook `docs/RECIPE_NUTRITION_GENERATOR.md`. **These USDA-derived numbers supersede any ad-hoc per-100 g estimates.** Still flagged **"USDA-derived, not FoodNoms-verified"** — only a real FoodNoms reconciliation on a cook clears that.
- **FoodNoms-verified nutrition:** replace USDA-derived totals with FoodNoms-verified totals **as recipes are cooked again**. No retroactive batch-update work. When you update a recipe's nutrition block, remove any "not FoodNoms-verified" caveat in the corresponding `remarks` row.
- **Macros vs micros — FoodNoms verifies only macros.** A FoodNoms reconciliation on a cook verifies **energy, macros and salt** (logged against labels); it has **no micronutrient verification path**. So micros (potassium, calcium, magnesium, iron, zinc, folate, vitamins…) are **committed best-estimates**: compute the best estimate available — label macros + micros borrowed/scaled from the nearest USDA generic, flagged with method — and **treat it as final**. Do **not** caveat micros as "pending FoodNoms verification" or tell Holger to verify them there; the "not FoodNoms-verified" flag is **macros/salt only**. (Holger's decision, 2026-06.)
- **Nutrition provenance is uncertain for some current-project recipes.** The `cooked-historical` migrated recipes are flagged as estimates. The current-project recipes (Thai shiitake, Thai butternut curry, Japanese corn soup) were *not* flagged but their provenance was never confirmed. Treat them as unverified until Holger confirms.

## Communication style

- Direct, concise. No preamble or excessive caveats.
- State assumptions explicitly.
- Push back when reasoning has gaps — the user values being challenged.
- Specific over vague.
- Ask clarifying questions when uncertain rather than guessing.

## Open questions / deferred decisions

These are unresolved and should not be unilaterally decided by Claude:

- **Parent-directory file hygiene** (stale duplicates, orphans, autosaves, SVGs) — leave / archive / delete.
- **Obsidian XHTML-header rendering** of the jQuery colour-coding snippets — never visually verified.
- ~~**Wolfram Cloud timeline endpoint** rendering — never visually spot-checked.~~ **Resolved 2026-06-28:** spot-checked via curl → SVG → PNG; the endpoint renders correctly. Caveat found: **labels must be ASCII-only** (a `°`/`é`/`–`/emoji yields a valid-but-empty SVG, HTTP 200). See the ASCII-only warning in `docs/RECIPE_FORMAT.md` → Timeline.
- **Ingredient nutrition data source** — no master `n100` Wolfram library has been located in the project; computation workflow for new recipes is unconfirmed (likely "Holger looks up values in FoodNoms, Claude computes totals in Wolfram").
- **Post-Workout Cream** (Holger solo recipe) — exists in earlier conversational memory, not on disk anywhere. Whether to capture as a Recipes/ file is undecided.
- **Pantry/staples list** — recurring ingredients (white miso, liquid aminos, nutritional yeast, shiitake powder, capers, amaranth, defatted peanut flour, whole spices) are not collated.
