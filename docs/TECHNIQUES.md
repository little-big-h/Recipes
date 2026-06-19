# Cooking Techniques and Equipment Notes

Hard-won knowledge from recipe iteration. This file complements `RECIPE_FORMAT.md` (which is about file format) by documenting actual cooking practice.

---

## Ninja ML750 — pressure cooker / air fryer rules

The Ninja is the primary cooking tool. These rules were established through trial-and-error.

### Release strategy

**Never use immediate (quick) release.** Heats and humidifies the kitchen unnecessarily, can split delicate ingredients. Always use natural or delayed release. Holger prefers natural release; delayed (10-min auto) is acceptable for predictability.

### Heat-up time scales with load mass

Heat-up time must be treated as cooking time — not "extra waiting." For thermal-degradation-sensitive ingredients (e.g. corn losing sweetness), this matters significantly.

| Load mass | Heat-up time (from room temp) |
|:----------|:-----------------------------:|
| ~1 kg | 18–21 min |
| ~1.5 kg | 25–28 min |
| ~2 kg | 30–35 min |
| ~2.5 kg | 38–42 min |
| ~4–5 kg | 50–60 min |

**Second-stage heat-up** (liquid already hot, opening to add an ingredient and resealing): ~10–15 min regardless of mass.

**Frozen ingredients** (e.g. frozen corn) add ~8–12 min to heat-up.

### Layering for tomato-based dishes

For tomato-acidic dishes that risk scorching:

1. Water first (bottom of pot)
2. Vegetables on top of water
3. Thick sauce / tomato on top of vegetables
4. **Do not stir before sealing** — prevents scorching at the base

### Pressure level selection

| Pressure | Temp | Use for |
|:---------|:-----|:--------|
| **High** | ~120°C | Legumes, dense roots, grains |
| **Low** | ~107°C | Delicate vegetables, corn (for blending — preserves sweetness), anything where texture matters |

### Pressure-cook times (concise reference)

Detailed times in `Nussinow_Cooking_Times.md`. Quick reference:

| Ingredient | HP, natural release |
|:-----------|:--------------------|
| Potato / sweet potato | 0–1 min |
| Cauliflower, squash, courgette | 0–3 min |
| Carrot, beetroot, hard squash | 5–8 min |
| Corn (for blending) | 30 min **low pressure** (preserves sweetness) |
| Black-eyed beans (unsoaked) | 6–7 min |
| Soybeans (unsoaked) | 35–45 min |
| Soybeans (soaked overnight) | 17–20 min |
| Lentils (any colour) | 4–6 min |
| Other dried legumes | See Nussinow table — varies significantly |

**Low-pressure times** (for legumes): Nussinow does not provide systematic data. Working multiplier is **LP ≈ 1.5–2× HP**, extrapolated from Q10 thermal kinetics. Treat as approximation; track results.

### Pot-in-pot vs basket-in-pot

- **Pot-in-pot**: sealed inner vessel, separate liquid → cooks *slower* than direct submersion (extra thermal mass, no convective mixing). Not used in our recipes.
- **Basket-in-pot**: perforated basket sitting in the main cooking liquid → effectively **direct submersion**. Beans cook at the same rate as if loose. This is what we use for two-stage corn+bean cooks.

---

## Spice work

### Toasting whole spices

The single most impactful technique upgrade across the breakfast profiles.

- **Cumin seeds**: dry pan, medium heat, 30–45 sec until fragrant. Grind in mortar.
- **Mustard seeds** (black or brown): dry pan, 1–3 min until they begin popping. Hold whole or grind coarsely.
- **Toasted mustard ≠ raw mustard chemistry** — toasting denatures myrosinase, which kills the pungent-mustard development pathway. Toasted mustard is nutty and earthy rather than sinus-clearing.
- **Holger's preference:** the toasted-then-ground form (nutty/earthy) as an *earthy backbone* in spiced dishes — e.g. the Tikka shakshuka. Toast until popping, cool, grind; add with the ground spices.

**Different rates**: cumin and mustard toast at very different speeds. Toast separately.

### Chili rehydration

- **Soak dried chilies in just-boiled water** for 10–15 min until pliable. Reserve soaking water (good for added depth in many dishes).
- **Scissor**, don't blend — less mess.
- Co-soaking dried chilies + toasted mustard seeds in a single bowl works well as a unified "spice soak" for Indian-style shakshuka.

### Mortar and pestle workflow

- **Pound garlic to paste** in the mortar (gives the smoothest distribution in oil).
- **Ginger goes in the mortar with garlic** if fresh; if dried, it joins the spice bloom instead.
- **Cumin residue in the mortar** flavours subsequent ingredients pounded in it — feature, not bug. Pound garlic *after* grinding cumin.
- Do not pound ground spices in the mortar — no benefit, just wear on the stone.

### Spice bloom in oil

Order matters:

1. **Whole aromatics first** (pounded garlic, fresh ginger paste, smashed lime leaves): 30–60 sec in hot oil
2. **Ground spices** (toasted cumin, tikka masala, paprika, etc.): 30 sec — ground spices burn fast
3. **Tomato paste**, if used: 1 min until darkened
4. **Wet ingredients** (chili soak, passata, stock): deglaze immediately

Ground spices scorch easily. Have the next ingredient ready before the spice bloom starts.

### Bloom curry paste

For Thai curries: bloom the paste in oil for **1–2 minutes** until fragrant. This is the most critical step for curry-based dishes.

### Dried ginger

- ~1.5g dried ginger powder ≈ 8g fresh ginger by aromatic intensity
- Dried ginger goes in the **spice bloom**, not the mortar (it's a ground spice, not a fresh aromatic)
- **Scorches faster** than other ground spices — keep the bloom moving and have liquid ready

### Bhuna — frying the masala (low-fat deglaze method)

*Bhuna* (from *bhunao*, "to fry/roast") is frying a masala until its **water cooks off** and its **surface browns** — trading raw, watery, sharp flavours for deep, cooked, caramelised ones. The flavour is built *on the pan* (the brown *fond*) and folded back in. It's the single biggest lever for depth/umami in tomato- and onion-based dishes, and the project's standing answer to "low on umami" in the Indian profiles (which forbid soy/nooch).

**Why low-fat needs a different method.** A classic high-fat bhuna signals "done" when the **oil separates out** ("*tel chhodna*"). At the project's ~3 g oil you never get that clean oil-release — so the masala sticks, and the temptation is to pull it early (→ raw, flat). Instead, reach the same depth by **deglazing**:

1. **Medium heat**, stir/scrape near-constantly.
2. Fry until the paste **catches and a brown film (fond) forms** on the pan.
3. **Splash in a little liquid** (water, the chili-soak liquid, a spoon of passata) and **scrape the fond up** so it dissolves back in — that fond is concentrated Maillard browning = umami. You're harvesting it, not cleaning the pan.
4. Let it cook down and **catch again → splash → scrape**. Repeat **3–5×**.
5. Each cycle deposits and re-dissolves a layer of browning → progressively darker, deeper masala. **Burn-proof**, because the fond never sits dry-and-dark long enough to scorch.

The repetition *is* the bhuna. A 90-sec fry = one thin layer (flat); five deglaze cycles = restaurant-deep.

**Read it, don't time it:**
- **Colour:** bright red/orange → brick → deep brick-brown.
- **Smell** (most reliable): sharp raw-tomato/raw-spice → mellow, sweet, *cooked*, slightly nutty. When the raw-tomato smell is gone, it's there.
- **Texture:** thickens, pulls together glossy, comes away from the pan cleanly.

**Three failure modes:** pulled too early (raw/flat — the common one, born of fear of burning); heat too high (scorches before it cooks); too little movement / no deglazing (burns where it sticks → makes you pull early → vicious cycle).

**Pan:** heavy-based or non-stick is far more forgiving at low fat. Stainless sticks hardest but gives the *best* fond — fine, just deglaze diligently.

**The bigger upgrade — onion base.** The real Indian umami engine isn't tomato, it's **onion bhuna'd to deep gold-brown** before anything else (8–12 min, *past* pale, to the edge of catching), then ginger-garlic, then spices, then tomato. The breakfast shakshukas skip onion for speed (part of why they read lighter on umami); for the family curries (dahl, lobia) do the onion base — it out-umamis any amount of nooch. Practice drill: brown onions properly once and taste raw-vs-browned; that's ~80 % of a great curry base.

**Microwave-and-blend onion shortcut.** A restaurant-base trick (glebekitchen lineage): **microwave** the onions to soften and drive off water (no browning — the microwave can't Maillard), then **blend** to a purée. The purée — pre-softened, partly dehydrated, huge surface area — then **browns much faster and reduces to a smooth base** when you fry it. **Crucial: it's *prep*, not the browning.** You still have to bhuna the purée to develop Maillard depth and cook off the raw-onion harshness; skip it and it reads pale and sulfurous (worse than browned diced onion). At low fat a purée sticks/spits and forms less fond, so lean hard on the deglaze method and give it patience. Best for batching a base ahead or the family curries; the solo shakshukas skip onion anyway.

**Bhuna vs. Western sautéed / caramelised onions.** They overlap but aren't the same — and the gap is where most home curries fall short:
- Western **sauté** → soften + light golden; onions stay as recognisable *pieces* folded in.
- Western **caramelise** → low-and-slow, sweet, jammy *strands* you can still see.
- **Bhuna** → onions fried *with* ginger-garlic, spices and tomato until they **collapse and dissolve into a deep-brown paste** that becomes the invisible *body of the gravy*.
- Four real differences: (1) **endpoint** — dissolve into the sauce, not a garnish; (2) **chemistry** — Maillard-forward (savoury/roasty) rather than caramelisation-forward (sweet/jammy); (3) **spices fried *in***, not added after, so it's one integrated brown base; (4) the **fry→catch→deglaze→repeat rhythm** with "fat separates" as the done-signal. Analogy: caramelised onions are the sweet *topping* on a burger; bhuna onion masala is the deep savoury *foundation* of a curry you can no longer see but absolutely taste. A long Western caramelise gets you partway, but stays jammy-sweet-and-intact; bhuna pushes past into savoury, dissolved, spiced, fat-separated — which is why it reads as umami and a sauté doesn't.

**Further reading**
- [Hari Ghotra — *How to Cook Onions* (for curry)](https://www.harighotra.co.uk/blog/how-to-cook-onions) — an Indian chef's breakdown of the onion-cooking stages and why deep browning matters.
- [Tigers & Strawberries — *Cutting and Browning Onions for Proper Flavor in Indian Food*](http://www.tigersandstrawberries.com/2008/03/24/cutting-and-browning-onions-for-proper-flavor-in-indian-food/) — long-form on getting the onion base right.
- [PotsandPans India — *Perfect Bhuna Technique: Getting the Right Masala Texture*](https://www.potsandpans.in/blogs/articles/perfect-bhuna-technique-getting-the-right-masala-texture) — the bhuna step itself, texture cues.
- [Glebe Kitchen — *Easy curry recipe technique (nearly restaurant style)*](https://glebekitchen.com/easy-curry-recipe-technique-nearly-restaurant-style/) — British-Indian restaurant base-gravy approach (where the bhuna/deglaze rhythm comes from).
- [Swasthi's Recipes — *Chicken Bhuna Masala*](https://www.indianhealthyrecipes.com/chicken-bhuna-masala/) — bhuna in practice in a full dish.

**Books**
- **Nik Sharma, *The Flavor Equation* (2020)** — a molecular-biologist's account of *why* browning builds flavour (Maillard, aroma molecules concentrating in residual fat). The science under this whole entry.
- **Julie Sahni, *Classic Indian Cooking* (1980)** — the most technique-exhaustive English-language Indian cookbook; bhuna and onion-browning explained in unusual depth.
- **Madhur Jaffrey, *An Invitation to Indian Cooking* (1973)** — the foundational Western introduction to Indian technique and the *bhuno* process.
- **J. Kenji López-Alt, *The Food Lab* (2015)** — not Indian, but the clearest lay explanation of the Maillard/caramelisation mechanics behind browning.

See **`docs/READING.md`** for the full reference shelf (with audiobook availability) and an own-words technique digest of Julie Sahni's *Classic Indian Cooking*.

---

## Specific ingredient handling

### Silken tofu

- **Blend smooth** before adding to a sauce — Lara dislikes recognizable silken tofu in the dish
- **Add off heat or on lowest simmer** — boiling hard splits the emulsion. If it goes grainy, add a splash of coconut milk and pull off heat
- For peanut-based dishes: whisk peanut flour into coconut milk first to avoid clumping

### Skim cottage cheese

- Add off heat or on lowest simmer to prevent splitting (same rule as silken tofu)

### Miso (red and white)

- **Never boil** — destroys aromatic compounds and live cultures
- Whisk in off heat as the final seasoning step
- **White miso (shiro)**: mild, sweet, ~6% salt by weight
- **Red miso (aka)**: assertive, fermented-forward, ~13% salt by weight
- **Substitution ratio**: 30g white ≈ 18g red (matches both salt and flavour intensity)
- **Red miso is an adult-palate move** — children (Jannes especially) often prefer white. Default to white for family meals.

### Kombu and homemade dashi

The vegetarian umami backbone. Kombu (dried kelp) supplies **glutamate**; shiitake supplies **guanylate**. The two multiply each other — the same synergy bottled dashi gets from bonito (inosinate), but fully vegetarian. We already stock shiitake powder, so kombu completes the pair.

**Handling rules:**

- **For *dashi*, never let the kombu boil.** This is a clean-stock rule, not a property of kombu. The glutamate you want is fully extracted at low/no heat; a hard boil adds nothing on that axis but *also* pulls out alginates (slimy), excess mannitol and bitter, iodine-heavy compounds that muddy a clear stock. Two acceptable methods:
  1. **Mizudashi (cold brew)** — steep kombu in cold water in the fridge, 3 h to overnight. Zero heat. Easiest and most reliable.
  2. **Hot extraction** — steep cold ≥30 min, then heat to just below a simmer (~60–80°C) and **remove the kombu before it boils**.
- **Don't rinse off the white powder** on the surface — that's mannitol (umami). Wipe with a damp cloth only.
- **Ratio**: ~10–20 g kombu per litre of water. Add shiitake powder (or a couple of dried shiitake) to the brew for the glutamate + guanylate synergy.

**Pressure-cooker note (for dashi):** do **not** put kombu into the Ninja for a full pressure cycle *when the goal is dashi* — that's the hard boil that muddies the stock. Cold-brew the dashi *separately*, remove the kombu, then use the finished dashi as the cooking liquid in place of plain water. Boiling the already-extracted *liquid* is fine. (Boiling a kombu strip *into* a bean pot is a different goal entirely — see the next note.)

**Two low-effort uses:**

- **A strip in with the beans — the deliberate exception to the no-boil rule.** Drop one piece of kombu in with soybeans / black-eyed beans in the Ninja. Here you *want* it to cook hard: it softens the bean skins, transfers glutamate and minerals, and the kombu itself goes soft and edible. The sliminess and stronger extraction that would ruin a clear dashi are harmless — even useful as body — in a thick, opaque bean pot. The goal is flavouring the dish, not refining a stock, so "never boil" simply doesn't apply.
- **Spent kombu → tsukudani.** After making dashi, slice the kombu into ribbons and simmer with a splash of mirin + soy into a savoury condiment. No waste.

**Two health flags (both on-brief for this household):**

- **Calcium-rich** — useful given the RED-S bone-health flag.
- **Iodine — the most iodine-dense food there is.** Given the suppressed Free T3 from RED-S, use kombu moderately (a strip in dashi a few times a week is beneficial; daily heavy-handed use can overshoot iodine). Don't mainline it.

**Salt:** kombu and homemade kombu-shiitake dashi are essentially salt-free, unlike the bottled Tsuyu / dashi-soy concentrates. Replacing bottled-concentrate flavour with real dashi is the main lever for cutting the salt budget on the Japanese line.

### Mirin (real / hon-mirin)

- **Hon-mirin ≠ aji-mirin.** Real hon-mirin is fermented (~14% alcohol) and brings genuine umami and a glaze sheen. "Mirin-style seasoning" (aji-mirin) is glucose syrup + additives + added salt, <1% alcohol — sweetness only. Don't treat them as interchangeable.
- **Cook off the alcohol (nikiri)** — let it sizzle 20–30 sec in a hot pan, or give the dish a brief simmer before the no-boil miso stage. Alcohol fully cooks off (fine for kids and the 8pm cutoff).
- **Reads sweeter and more umami than aji-mirin** at the same volume — when converting a recipe written for the old stuff, start ~25% lower (e.g. corn soup mirin 30 ml → 22 ml).
- **Negligible salt** (unlike aji-mirin) — essentially free against the salt budget.
- **Best new use:** teriyaki-style glazes for air-fried tofu/veg (mirin + dashi-soy or liquid aminos, reduced to a syrup) — the application the fake stuff couldn't do.
- **Dry substitute:** Shaoxing works when the dish has enough other umami/sweetness to compensate (confirmed in the Holger-solo shakshuka — see `SHAKSHUKA.md`).

### Tomato sauce / passata

- **Acidity slows vegetable softening** — avoid braising delicate vegetables directly in heavily acidic sauce. Cook veg separately if texture matters.
- Tomato paste benefits from blooming in hot oil (1 min) before adding liquid — deepens colour and umami.

### Bok choi

- Two viable approaches:
  1. **Steam separately** (~4–6 min) — preserves crunch and visual contrast; serve on top
  2. **Shred fine and fold into hot soup off heat** — wilts in 30–60 sec; stems retain slight crunch
- Chinese rather than Japanese, but sits comfortably in pan-East-Asian soups

### Banana blossom

- Air frying produces crispy shreds (garnish), not cohesive pulled texture
- Thorough drying is critical regardless of method
- **Season before air frying** (unlike chickpeas which need late seasoning)

### Roasted chickpeas

- Add seasonings **only in the final 3–5 min** to prevent burning
- Store in a **paper bag**, not airtight container (retains crispness)

### Sauerkraut (for the hash variant)

- Cook the sauerkraut fully first, then push to the side of the pan
- Bloom spices in oil on the empty side — prevents spices burning while waiting for the sauerkraut to cook
- Poaching eggs directly on top of the sauerkraut works better than frying eggs separately (less sticking on stainless steel)

### Kaffir / Makrut lime leaves

- "Kaffir" is the colonial-era English name; "makrut" is the original Thai name and preferred modern term (kaffir is an ethnic slur in southern Africa). Same plant: *Citrus hystrix*.
- **Bruise lightly** in your palm before adding (cracks the surface, releases aromatic oils) — don't tear (makes removal harder)
- Remove with tongs before blending or serving

### Coconut milk

- Standard reference: **Biona Organic Light, 9% fat** — actual values: 90 kcal, 9g fat (7.9g sat), 1.7g carbs, 0.9g sugars per 100ml
- Light coconut milk has surprisingly little sugar; most of the perceived sweetness comes from fat character, not actual sugars

---

## Wolfram Cloud timeline rendering

Recipes include a Gantt-style cooking timeline visualizing device usage over time. Rendered at markdown render-time via a Wolfram Cloud endpoint.

### Endpoint

```
https://www.wolframcloud.com/obj/pirk0/RenderTimeline
```

### Usage

Embed in markdown as a regular image link:

```markdown
![Cooking Timeline](https://www.wolframcloud.com/obj/pirk0/RenderTimeline?steps=<url-encoded-json>&syncs=<url-encoded-json>)
```

### Parameters

**`steps`**: JSON object. Keys are track names (shown in legend). Each track has a `color` and `steps` array. Each step is `[start_min, end_min, label]`. Track order in the JSON = top-to-bottom row order in the rendered image = order of first device use chronologically.

```json
{
  "Ninja": {
    "color": "#5A8CD1",
    "steps": [
      [0, 5, "Load corn + soybeans"],
      [5, 123, "High pressure 35 min + release"]
    ]
  },
  "Wok": {
    "color": "#5AAD5A",
    "steps": [[100, 110, "Saute spring onion"]]
  }
}
```

**`syncs`**: JSON array of vertical dashed milestone lines.

```json
[
  {"t": 123, "color": "#1F4D7A", "label": "Ninja done"},
  {"t": 138, "color": "#595959", "label": "Ready"}
]
```

URL-encode each JSON value before inserting into the query string.

### Device colour palette

| Device | Hex |
|:-------|:----|
| Ninja | `#5A8CD1` |
| Blender | `#B772B7` |
| Wok / Pan | `#5AAD5A` |
| Steamer | `#D17A3A` |
| Oven | `#D1A83A` |
| Air fryer | `#3AB5B5` |

Sync line colours: use a darkened version of the triggering device's colour, or `#595959` (neutral grey) for the final "Ready" marker.

---

## Wolfram Cloud recipe-nutrition endpoints

Turning a list of USDA ingredients into a `.foodnoms` recipe is deployed as **two**
Cloud Objects, parallel to the timeline endpoint above. They are split on purpose:
**resolution** (fuzzy name → candidates, to be judged) is a different operation from
**construction** (resolved ids → file, deterministic). Source of truth:
`../tools/foodnoms-cloud.wl`; full playbook: `RECIPE_NUTRITION_GENERATOR.md`.

**No JSON crosses the wire** — every field is its own typed query parameter, parsed
declaratively by the framework's interpreters (no `ImportString`, no string surgery; see
CLAUDE.md). Build URLs with `URLBuild`, which percent-encodes everything, so the `✴️`/`🩹`
glyphs ride as UTF-8 with no shell-mangling.

### 1. `ResolveFDC` — ingredient name → ranked USDA candidates

```bash
curl -s 'https://www.wolframcloud.com/obj/pirk0/ResolveFDC?queries=butternut%20squash%20raw;dry%20soybeans&n=5'
```

`queries` is a `;`-list. Returns `{"results":[{"query":…,"candidates":[{"fdcId","description",`
`"dataType","baseAmount":100,"baseUnit":"gram","nutrients":{…}},…]},…]}` — each candidate
with its **per-100 g nutrients**, so you can choose on the numbers (which record has
`sugars`, `calcium`, etc.), not just the name. Advisory — **you pick** the `fdcId` (rank by
`dataType`: Foundation > SR Legacy > FNDDS > Branded, plus food-identity match).

### 2. `BuildFoodNomsRecipe` — resolved ingredients → one downloadable `.foodnoms`

**The response body is the raw `.foodnoms` bytes** (`application/octet-stream`), not a
JSON envelope — so a browser GET or `-o` writes the file straight to disk. **One file per
call**, picked by `emit` (default `recipe`); deterministic `local:` foodIDs keep companion
files linked across calls.

The spec is **decomposed** (DSM): the ingredient list is parallel typed arrays, aligned by
position (`CompoundElement` can't carry typed tuples in a query — Wolfram forbids
`DelimitedSequence[CompoundElement[…]]`).

| Param | Type | Carries |
|---|---|---|
| `name` / `servings` / `emit` | String / Integer / String | name, servings, which file |
| `totalServingSize` | Number (optional) | cooked yield in g; omit → Σ ingredient weights |
| `fdcIds` / `grams` | comma-lists | USDA ingredients, positionally aligned |
| `patchFdcIds` / `patchNutrientNames` / `patchDeltas` | comma-lists | sparse per-100 g patches |
| `customNames` / `customFoodIds` / `customQuantities` / `customUnits` | `;`-lists | non-USDA foods |
| `customNutrientNames` / `customNutrientValues` | nested (`;` foods, `,` fields) | each custom food's nutrient block |

```bash
# recipe (default) -> writes Soup.foodnoms; its notes list the companion files
curl -s -o Soup.foodnoms \
  'https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe?name=Soup&fdcIds=169295&grams=500&patchFdcIds=169295&patchNutrientNames=sodium&patchDeltas=200'
# a companion file: same params, add &emit=<url-encoded name from notes>
curl -s -o Patch.foodnoms \
  'https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe?name=Soup&fdcIds=169295&grams=500&patchFdcIds=169295&patchNutrientNames=sodium&patchDeltas=200&emit=Squash%2C%20winter%2C%20butternut%2C%20raw%20Patch'
```

Mis-aligned column lengths → **HTTP 400** naming the offending arrays. No envelope, so the
sidecar data lives **in the file**:
- **Totals** — not returned; read back with
  `foodnomsTotals[ByteArray[BinaryReadList["Soup.foodnoms"]]]` → 16 slots + `salt`
  (= `sodium_mg * 2.5 / 1000`). `foodnomsDecode` returns the JSON.
- **Warnings + the companion-file menu** — written into the recipe collection's
  **`notes`**. Unknown `emit` falls back to the recipe; a patch-free recipe yields only
  the recipe file.

**Clickable download link (markdown).** Because the spec is plain query params, the URL
itself is a one-click markdown download link (GET; the `attachment` header names the file).
Build it with `URLBuild["…/BuildFoodNomsRecipe", {"name"->…, "fdcIds"->…, …}]`; query
strings cap ≈8 KB (a recipe is ~0.5 KB). Live example in
`../recipes/soups/butternut-soybean-soup.md`. The saved **filename** is sanitized
(`cleanFilename`): `[DD-MM-YY]` stamp + emoji + `#` dropped, `&`→`and` — so `Soup [10-06-26] ✴️`
saves as `Soup.foodnoms`; the full stamped name stays as the in-file collection name.

### Notes

- The `.foodnoms` bytes are an **uncompressed LZFSE block** (`bvx-`…`bvx$`) built in
  Wolfram — no Python (`FOODNOMS_FORMAT.md` §2).
- `Permissions -> "Public"`. The embedded FDC API key is never returned in responses.

---

## Recipe iteration philosophy

### Iteration taxonomy

Two distinct kinds of recipe iteration; treat them differently:

- **Seasoning tweak** — same core ingredients and cooking approach, change to spice profile / umami stack / acid handling / salt level. Examples: Japanese corn soup v1→v2 (red miso → white miso, all else held), Thai shiitake soup v1→v2 (yellow-only paste, reduced shiitake & tofu, no dashi soy). Prefer **single-variable changes** for clean attribution of effect on family ratings.
- **Structural ingredient swap** — core ingredients or cooking approach changes; the dish is conceptually different but in the same family. Example: Indian Roasted Vegetable Bake v1→v2 (removed cauliflower + peppers, replaced tomato-curry sauce with creamy corn + silken tofu base, added chickpeas and carrots). Usually motivated by structural family-preference conflicts that seasoning tweaks can't fix.

This distinction also drives the file convention below.

### When to update existing file vs create new vN file

- **Update in place** for refinements: ingredient quantity tweaks, method clarifications, format fixes, small substitutions
- **New `-vN.md` file** for substantial reformulations: different core ingredients, different cooking approach, when you want to preserve the previous version for direct A/B comparison

Roughly: seasoning tweaks may go either way (in place if minor, new file if you want to A/B). Structural swaps almost always warrant a new file.

### Experiment design

When designing v2+ iterations, prefer **single-variable changes** for clean attribution of effects. Example: red miso → white miso v2 holds Tsuyu, dashi-soy, mirin, bok choi all constant. If everything were changed at once, the family's reaction couldn't be cleanly attributed.

State the hypothesis and predicted outcomes in the recipe file's preamble or in an "Experiment design notes" section.

### Tracking actual-used quantities

The third column of the ingredient table is "Actual used" — left blank in the planned recipe, filled in after cooking if quantities deviated from plan. This captures the real recipe over time and surfaces patterns ("we always need more X than planned").

### Salt calibration

Salt is tracked across **family** recipes for **palatability** (the table has to work for the kids) — it is **not** a health constraint for Holger himself. As a high-mileage runner he benefits from the sodium (electrolyte replacement), so don't minimise salt in his solo dishes. The table below is for *estimating* the salt content of major sources, not for driving it down:

| Source | Salt content |
|:-------|:-------------|
| Yellow curry paste (Mae Ploy) | ~10% by weight |
| White miso | ~6% |
| Red miso | ~13% |
| Tsuyu concentrate (Clearspring) | ~8g per 100ml |
| Dashi-soy sauce (Emma Basic) | ~14g per 100ml |
| Stock cubes | ~2.5g per cube |
| Liquid aminos | ~3g per 30ml |

Typical salt totals for full family recipes: ~10–15g (variance by recipe style) — a palatability range for shared meals, not a cap, and not applicable to Holger's own portions.

### Flat dish? It needs umami, not salt

The most useful tasting diagnostic in the project. **When a dish tastes flat/hollow and your hand reaches for the salt, the deficit is usually umami, not salt.** The tell: you add salt, it's *still* not right, so you add more, and now it's too salty and you're chasing it with acid (lemon/sumac/vinegar) to rebalance. That **salt → acid-rescue spiral is the fingerprint of an umami hole** — salt and acid can't fill it.

Fix: add an umami source, *then* re-taste for salt (you'll usually need less than you thought).

- **Match the cuisine.** Indian → bloom tomato paste (bhuna), browned onion, kasoori methi, yoghurt. Japanese/East-Asian → miso (off heat), dashi-soy, kombu-shiitake dashi. Mexican/Med → tomato paste, capers, the bean-cooking liquor. Soy/miso/aminos in a tikka muddy it — keep umami in-cuisine.
- **Glutamate × guanylate/inosinate multiply** — pairing two sources (e.g. kombu + shiitake, tomato + mushroom) is more than additive.
- **Cross-cuisine shortcut: mushroom powder.** A small pinch boosts umami with little cuisine signature. **Porcini** integrates most seamlessly (deep, neutral, "rich" not "Asian"); plain white/cremini is most invisible; **shiitake** (stocked) works but is a touch more East-Asian-recognisable — keep the dose small.

Validated twice: Anja's flat stew (rescued with shiitake powder) and the Tikka shakshuka (came out flat with no umami anchor → over-salted → sumac rescue; the cure was tomato paste, not salt).

---

## Gotchas (one-liners)

- **Lemongrass is fibrous** — use paste, or smash whole stalks and remove like bay leaves; never serve as fragments
- **Red cabbage bleeds** in alkaline cooking liquids (turns blue-grey-green). Use as raw garnish, not cooked-in
- **Lentils cook much faster than the format file used to suggest** — 4–6 min HP, not 8–10
- **Tsuyu varies between bottles** — taste before committing the full amount; one bottle being heavier than another can swing salt by 5g
- **Bird's eye chilies (dried)** rehydrate well in just-boiled water; serve at the table as a per-person heat option
