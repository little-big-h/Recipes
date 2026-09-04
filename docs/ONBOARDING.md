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
- **`.foodnoms` files are JSON in a thin LZFSE container**, not text. The ones we
  write are **uncompressed** (`'bvx-'` + length + raw JSON + `'bvx$'`), so
  `tools/js` reads and writes them with no codec. Use
  `node tools/js/cli.js build` to write and `lib/foodnoms-file.js`'s
  `foodnomsDecode` to read; spec in `FOODNOMS_FORMAT.md` §2.
  **There is no Python exception any more** — that carve-out existed only because
  Wolfram has no LZFSE encoder, and is withdrawn. FoodNoms's *own* exports are
  compressed (`bvxn`/`bvx2`) and cannot currently be read in-repo; re-export from
  the app instead.
- **Reading PDFs / label photos:** the `Read` tool needs `poppler-utils`
  (`apt-get install -y poppler-utils`) for `pdftoppm`/`pdftotext`. `pypdf` is
  installed but has a broken `_cffi_backend` in this env — use `pdftotext -layout`
  (text) or `pdftoppm -png` + `Read` the image instead.
- **`WebFetch` 403s** on most retailer/manufacturer/USDA pages (bot/WAF blocking:
  milk.co.uk, clearspring.co.uk, fdc.nal.usda.gov, …). Fall back to **`WebSearch`**
  to recover label values, or fetch via the USDA **API** (below), not the website.
  The *website* blocks bots; the **API** (`api.nal.usda.gov`) does not.
- **`tools/js` is the nutrition engine** — USDA lookups, recipe totals and
  `.foodnoms` assembly, all local (Node ≥ 20, zero dependencies). `cd tools/js &&
  npm test` to check it. Retries and an on-disk USDA cache are built in; don't
  hand-roll either.
- **Wolfram is for charts and the timeline endpoint only** (MCP
  `…WolframLanguageEvaluator`), per CLAUDE.md. It is no longer in the nutrition
  path. `BuildFoodNomsRecipe` still hosts the download link and serves as an
  independent cross-check — `cli.js build` diffs against it automatically.

---

## 3. Nutrition / FoodNoms workflow (the bulk of recent work)

- **Resolution source of truth:** `tools/ingredient-map.json` (keyed by `foodID`,
  full per-100 nutrients). Human-readable table + provenance notes in
  `docs/INGREDIENT_MAP.md`. **Match a recipe ingredient by name here first**; only
  hit USDA when it's absent.
- **New USDA lookups:** `node tools/js/cli.js search "<name>"` then
  `cli.js food <fdcId>` — documented in `docs/USDA_FDC.md`. It never auto-picks;
  you judge the candidates and pin the id. USDA "carbohydrate, by difference"
  **already includes fibre** (US-style).
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

- **Restocking in Singapore** (the move happened, Aug 2026; the run-down is over —
  buying is allowed). `PANTRY.md` was rebuilt from zero and marks every item
  ✅ confirmed / ❓ unconfirmed / 🛒 absent; **only ✅ can be used without a flag.**
  The UK list is retired at `archive/PANTRY-UK-TEDDINGTON.md` — label data, not
  stock. (`CLAUDE.md`, `PANTRY.md`.)
- **Defaults:** avocado oil **≤3 g/dish** (the dose rule survives even if the oil
  changes); ⚠ **"milk" no longer resolves** — the semi-skimmed/milk.co.uk default
  died with the move, so ask rather than assume; breakfast "passata" → the
  **Organic Chopped Tomatoes** tin (UK label — also needs re-sourcing).
  (`PANTRY.md`, `INGREDIENT_MAP.md`.)
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
  js/                     THE nutrition tool: USDA lookup, totals, .foodnoms
                          (cli.js + lib/ + tests; see tools/js/README.md)
  fdc-lookup.wl           RETAINED FOR REFERENCE — the mapping spec lib/nutrients.js
                          was ported from. Don't run it for new work.
  foodnoms-cloud.wl       DEPLOYED endpoint source: BuildFoodNomsRecipe + ResolveFDC
                          ($fnVersion + changelog; redeploy = Holger runs CloudDeploy as pirk0)
                          Hosts the download link + the cross-check; no longer builds files.
docs/BWFO_GRAPHQL.md      BuyWholeFoodsOnline product data via Magento GraphQL (curl+jq)
Books/README.md           reference-book index (cite by page, like Nussinow)
```

---

## 6. State of play

### Update (2026-07-01) — endpoint is now directly reachable + testable

- **⚠ Two separate quotas sit behind the endpoints — and both cost money when you retry.**
  Diagnosed 2026-08-24 after an afternoon of escalating failures:
  | symptom | meaning | what to do |
  |:--|:--|:--|
  | `400 "Failed to encode HTTPResponse"` | a **USDA FDC** lookup failed (free key is **~1000 req/day per IP**, and *every ingredient is one call*) | stop; wait for the daily reset, or swap `$FDCApiKey` |
  | `531 "the owner's resource limit has been reached"` | **Wolfram Cloud** account resource limit | stop; wait, or top up credits |
  | `503` + `Retry-After` (endpoint ≥ v6) | the same FDC failure, now reported honestly and naming the fdcId | as above |

  **Never retry-until-200.** Each attempt bills Wolfram Cloud time and (on the FDC
  path) burns more of the very quota that caused the failure. Before v6 the failure
  was *silent* — a dead lookup left unevaluated expressions in the result, so the
  per-ingredient failure rate `p` compounded to `1-(1-p)^n` for an n-ingredient
  recipe. That reads as "big recipes are broken"; it is not a size limit. **Check
  `emit=version` against `$fnVersion` before believing any of this is fixed live.**

- **`wolframcloud.com` is allowlisted now.** The older note below ("container egress
  blocks wolframcloud, can't test the endpoint") is **obsolete** — you can `curl` the
  `BuildFoodNomsRecipe` / `ResolveFDC` / `RenderTimeline` endpoints directly from the
  container (use `dangerouslyDisableSandbox: true` on the Bash call). Verify every
  generated file/link yourself: request the same URL with `-H 'Accept: application/json'`
  (totals/warnings view), and decode the actual bytes with the `lzfse` Python one-liner
  (§2) to inspect structure. This caught real bugs (a wrong FDC id; a 40× vitamin-D error).
- **Endpoint has a version hook.** `curl '…/BuildFoodNomsRecipe?emit=version' -H 'Accept:
  application/json'` → `{"endpointVersion":N}`. Compare N to `$fnVersion` in
  `tools/foodnoms-cloud.wl`: equal ⇒ live endpoint is current; different (or a
  recipe-shaped response) ⇒ **redeploy pending**. **Bump `$fnVersion` on every
  behaviour change** (changelog is at the constant). The endpoint only redeploys when
  **Holger runs the two `CloudDeploy` lines as `pirk0`** — you can't deploy; commit +
  flag it and ask.
- **Standalone product foods** (`emit=food` entry / `emit=fooddef` reusable Foods-library
  food — prefer fooddef): per-100 g nutrients, `baseAmount:100`, a **fixed 100 g/ml
  serving weight with an empty serving-size label**, `brandOwner` for the shop, and a
  **stable foodID auto-hashed from name|brand|kcal** (omit `customFoodIds`). *Why fixed
  100:* FoodNoms forces "Amounts Represent = Serving Size" on import (even its own
  exports), so a pack-weight serving would misread; pinning 100 keeps per-serving ==
  per-100. Food-level `urlString`/`notes` are **inert** (FoodNoms drops them) — keep
  product URLs in the repo. Full spec + the two shapes in `FOODNOMS_FORMAT.md`.
- **BuyWholeFoodsOnline product data:** pull macros/price/URL via their Magento GraphQL
  API (`docs/BWFO_GRAPHQL.md` — `curl` + `jq`, **GET not POST**, browser UA). Ingredients
  are **not** exposed. Reachable from the container.
- **Reference books** live in `Books/` with an index (`Books/README.md`) — The Flavor
  Equation, Salt Fat Acid Heat, The Food Lab, Modernist Cuisine Vol 2, Cooked. Cite by
  page like the Nussinow tables.
- **Playwright/Chromium** is preinstalled (headless browsing), but the agent proxy can
  reject some sites (`ERR_CONNECTION_CLOSED`) — the GraphQL/`curl` path beat the browser
  for BWFO. `poppler-utils`/`pypdf` gaps from the old note may or may not still apply;
  `pypdf` worked this session for indexing the Books PDFs.

*(The 2026-06-27 snapshot below is kept for history; where it conflicts with the above,
the above wins.)*

---

### Snapshot (as of 2026-06-27)

**⚠ Tooling changes this session — read before doing FoodNoms work:**

- **The Wolfram Language MCP tool is DISABLED** (Holger turned it off). Do **not**
  rely on a local Wolfram kernel for building `.foodnoms` or doing nutrition math.
  Use the **`BuildFoodNomsRecipe` Wolfram Cloud endpoint** instead — it sums and
  builds the file server-side, and **its download URL *is* the file** (so an endpoint
  URL doubles as a shareable/embeddable link). For local file work without Wolfram:
  build `bvx-` uncompressed bytes in `bash` (`'bvx-'` + uint32-LE length + JSON +
  `'bvx$'`), transform existing files with `jq`, and do any arithmetic in `awk`
  (not Python — the only sanctioned Python is the `lzfse` codec for reading FoodNoms
  exports, §2).
- **Container egress blocks `wolframcloud.com`** — you **cannot fetch or test the
  endpoint from here**. Build endpoint URLs, but **have Holger click-test one** before
  trusting a batch. (Open: the **Thai shakshuka download URL is awaiting his
  click-test** — if it errors, the fix is centralised in the SHAKSHUKA.md ref-def block.)
- **To deliver an actual file from the container**, build the `bvx-` bytes locally and
  `SendUserFile` (the base64-bridge trick in `MEAL_LOGGING.md` is now unnecessary —
  just write the file and send it).

**Holger's real "Breakfast Shakshuka" base records** (decoded from his FoodNoms export
this session — align shakshuka files to these, *not* ad-hoc local records):
- Tomato = **`foodnoms:usda:170501`** "Tomatoes (Crushed, Canned)", **32 kcal/100 g,
  186 mg Na** (salted — NOT the 19-kcal no-salt "Passata" local some earlier files used).
- Egg = **`foodnoms:01CB05E2-622D-47D0-AEF3-FF93CA40D7AC`**, logged as **2 × large (50 g)**, vit-D 2.
- Spinach = `foodnoms:usda:168462` "Spinach (Raw)"; Nooch = `local:A79EC48D-C9A5-43A9-9F24-C57821BECF60`.

**Shakshuka meal-file regime** (`design/SHAKSHUKA.md`): collectionType **2**,
**uncertainty 0** (committed values — Holger overrode the MEAL_LOGGING 10% "prepared
dish" tier; these are recipe-spec, treat as committed), all seasonings merged into one
**named** "Spices & Seasonings — <constituents>" line. Per-profile download URLs live in
the **"FoodNoms downloads"** section (reference-style defs) and link from **every matrix
column header and every profile section heading**. *Open offers Holger may take up:*
(a) pull **nooch** out into its own line to match his Breakfast Shakshuka exactly;
(b) strip the **old collectionType-3 "⬇ Download" recipe links** still sitting in some
profile sections (superseded by the header links).

**Recent cooks logged this session:**
- **Cold Buckwheat, Asparagus & Black-Eyed Bean Salad** — cooked & rated (family avg
  **8.32**; RATINGS remark 44). **PC kasha method validated** (0-min / low pressure /
  10-min defined release, absorption — firm, predictable). Lara's 7.2 = the **900 g
  cold-blanched asparagus** (situational, not a standing flag). New people-note signals:
  **Jannes dislikes rocket/peppery leaves**; **Julina not keen on nutty/peanut dressings**.
  *Open:* the PC kasha **water amount** is still "TBD" in the recipe; bean-firmness not
  separately confirmed (presumed fine).
- **Thai green shakshuka** — redesigned for umami (shiitake 4 g added *with the passata*,
  **not** bloomed; fry the paste hard; aminos 10→15 ml). First cook **8.4** — now canonical.
  *Open:* which fix carried it; whether the optional coconut-milk splash was used.

- **A second agent commits to this repo concurrently** (the source of the tree rewinds in
  §2). Don't assume your last push is still `HEAD` — re-sync. This session was developed on
  branch `claude/mirin-kombu-cooking-TQbeN` and **fast-forward-merged to `main`**.
- **Date skew:** the environment's `currentDate` read **2026-06-27**, but cook logs /
  `.foodnoms` stamps this session used **2026-06-25 / `[25-06-26]`** and bash mtimes show
  Jun 27 — stamps may be off by ~2 days. Confirm the date with Holger before stamping.
