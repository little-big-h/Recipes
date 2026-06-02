# Claude Code Project Instructions — Recipes/

This file is read automatically at session start. **For full project context, read `README.md` first, then `docs/CONTEXT.md`.** This file contains only the hard rules that absolutely need to fire on every session — keep it short.

---

## Hard rules

- **Use Wolfram, never Python** for any computation. Explicit user preference.
- **Metric units throughout** — grams, millilitres, °C. Never imperial.
- **Recipe nutrition totals are for the whole recipe** — never per serving, never per 100g.
- **Ratings are out of 10**, one decimal place. 9–10 = exceptional. See `docs/RATINGS.md` schema for the data model.
- **Week begins on Monday.**
- **🐙 ("the okaytopus") signals user approval** from Holger. Mirror it when appropriate, never overuse it.
- **Currency: GBP (£).**
- **Never use immediate (quick) release on the Ninja pressure cooker.** Natural or delayed only. See `docs/TECHNIQUES.md`.
- **Every ingredient gets a unique emoji prefix** used consistently in the ingredient table, method, and notes. See `docs/RECIPE_FORMAT.md`.

## Don't touch

- **Do not edit `.md` files in the parent directory** (`~/Documents/Claude-Interchange/`). The canonical recipe files all live in `Recipes/`. Parent-directory duplicates are stale and pending file-hygiene decisions Holger has not made yet.
- **Do not delete or "tidy up" legacy artifacts** (PDFs, `.wl` files, emacs autosaves like `#name.md#` or `.#name.md`, the `RECIPE_FORMAT copy.md.bak.md` orphan, timeline SVGs) without asking. File hygiene is a deferred decision.
- **Do not touch `.obsidian/`** or `.claudian/` unless the user explicitly asks.

## Forward-protocol decisions

- **FoodNoms-verified nutrition:** replace estimated nutrition with FoodNoms-verified totals **as recipes are cooked again**. No retroactive batch-update work. When you update a recipe's nutrition block, remove any "estimates, not FoodNoms-verified" caveat in the corresponding `remarks` row.
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
- **Wolfram Cloud timeline endpoint** rendering — never visually spot-checked for the encoded URLs in current recipes.
- **Ingredient nutrition data source** — no master `n100` Wolfram library has been located in the project; computation workflow for new recipes is unconfirmed (likely "Holger looks up values in FoodNoms, Claude computes totals in Wolfram").
- **Post-Workout Cream** (Holger solo recipe) — exists in earlier conversational memory, not on disk anywhere. Whether to capture as a Recipes/ file is undecided.
- **Pantry/staples list** — recurring ingredients (white miso, liquid aminos, nutritional yeast, shiitake powder, capers, amaranth, defatted peanut flour, whole spices) are not collated.
