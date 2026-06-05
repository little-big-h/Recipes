# Recipe Format Standard

Recipes are stored as **Markdown** in `~/Documents/Claude-Interchange/`.
No PDF generation. Print directly from the markdown renderer of your choice.

Each recipe produces one file: `{recipe_name}.md`

Timeline images are rendered at markdown render-time via the Wolfram Cloud
endpoint — no local SVG files needed.

---

## Markdown Structure

Each file is plain GitHub-Flavored Markdown — **no HTML tables, no `<script>`
blocks** — so it renders identically in GitHub, Obsidian, Bear, etc.:

```
# Recipe Title

*Subtitle.*

---

## Ingredients
## Timeline
## Method
## Nutrition
## Design notes (optional)
## Cook log (optional)
```

---

## Ingredient Category Column

Each ingredient's category is shown in a dedicated **Type** column in the
ingredients table, using a coloured-circle emoji. This renders everywhere
(GitHub included) — unlike the old inline-style / jQuery row colouring,
which only worked in Obsidian and has been **removed**.

### Category → circle

| Category | Circle | (was hex) |
|:---------|:------:|:----------|
| Vegetables | 🟢 | `#d9f2d9` |
| Aromatics | 🟡 | `#fcf5cc` |
| Spices / Pastes | 🟠 | `#fae0d1` |
| Stock | ⚪ | `#ebebeb` |
| Protein | 🔵 | `#e0ebfa` |
| Seasoning | 🟣 | `#ebd9f5` |
| Acid | 🟤 | `#faedd9` |

These seven circles are **reserved** for the Type column and the legend.
Do not use them — or any other coloured circle/square — as an ingredient
emoji (see *Ingredient table structure* below).

---

## Ingredients Table

### Legend

A single **italic line placed immediately *below* the ingredients table**,
keying only the categories present in the recipe, in canonical order:

```markdown
*Legend: 🟢 Vegetables · 🟡 Aromatics · 🟠 Spices / Pastes · ⚪ Stock · 🔵 Protein · 🟣 Seasoning · 🟤 Acid*
```

### Ingredient table structure

Plain markdown table with **four columns**: Type, Ingredient, Planned, Actual used.

- **Type** holds the category circle (see the map above). It and the legend
  are the *only* places the coloured circles appear.
- **No in-table category section headers.** The Type column carries the category.

**Ingredients are sorted strictly by time of use** — the sequence in which
each ingredient is first added in the method. Ingredients used at the same
step follow the order they appear in that step.

**No timing instructions in ingredient names.** Order and colour-coding
already convey when each ingredient is used. Keep only functional notes
that describe *how* an ingredient is prepared or handled:

- `(remove before blending)` — needs to come out before the blender step
- `(kept whole)` — preparation instruction
- `(no soak needed)` / `(no soak)` — saves the cook a decision
- `(whisk into stock first)` — prevents clumping
- `(whisk in off heat, never boil)` — critical technique note
- `(use what you have)` — quantity is flexible
- `(taste — very salty)` — salt warning
- `(garnish)` — served raw on top
- `(at table)` — not cooked in

Do **not** include timing phrases like `(add at stage 2)`, `(from t=90)`,
`(add just before blending)`, `(steamed separately from t=70)`.

**Ingredient emojis are representational only.** Every ingredient has a
**unique emoji** prefix in the Ingredient column, used consistently across
the table, the method, and the notes. **Never use a coloured circle or
square** (🟢🟡🟠🔵🟣🟤⚫⚪🔴 / 🟥🟨🟦🟫⬜ …) as an ingredient emoji — those
abstract shapes are reserved for the category system. Pick the most
evocative food / plant / utensil emoji available; an approximate match is
fine (e.g. cumin 🌰, paprika 🌶️, miso 🍶) as long as it is unique within
the file.

**Category circles never appear in the method or notes** — only the
representational ingredient emoji does, to avoid information overload. The
circles live solely in the Type column and the legend.

### Standard categories
- Vegetables · Aromatics · Spices / Pastes · Stock · Protein · Seasoning · Acid

---

## Nutrition Table

Single 4-column table — macros left, micros right, 8 rows each.

**Always report totals for the whole recipe** — never per serving or per 100g.

```markdown
| Macro | Total | Micro | Total |
|:------|------:|:------|------:|
| Energy | 1873 kcal | Iron | 16.3 mg |
| Protein | 54 g | Calcium | 754 mg |
| Carbohydrates | 198 g | Zinc | 16.2 mg |
| — of which sugars | 54 g | Magnesium | 524 mg |
| Fat | 100 g | Potassium | 4781 mg |
| — of which saturates | 75 g | Vitamin D | 0.4 µg |
| Fibre | 26 g | Vitamin B12 | 0.0 µg |
| Salt | 16 g | Folate | 427 µg |
```

### Computing nutrition values

Use Wolfram — never Python. No division by servings.

```wolfram
(* Vector: {kcal, prot, carb, sugar, fat, sat, fibre, salt,
            iron, calcium, zinc, magnesium, potassium, vitD, B12, folate} *)
n100 = <| "ingredient" -> {...}, ... |>;
amounts = <| "ingredient" -> grams, ... |>;
totals = N[Total[Table[n100[k] * amounts[k] / 100.0, {k, Keys[amounts]}]], 4];
```

---

## Method

Numbered steps. Every ingredient mention is emoji-prefixed on every
occurrence. Soak/prep notes go in a blockquote before step 1.

### Pressure cooker settings

**Every pressure cook step must state all three settings explicitly:**
- **Pressure level:** high or low
- **Timing:** minutes at pressure
- **Release method:** natural, delayed, or immediate

Never use immediate (quick) release.

Format in method text: inline at the end of the seal instruction.

```
Seal — high pressure, 15 min, natural release.
```

For multi-stage pressure cooking, each stage gets its own step with full
settings stated.

### Time references in method text

Write time references in plain English — never use `~t=85` or similar
shorthand. Use "at about 85 minutes" or "once stage 2 is underway
(at about 90 minutes)".

---

## Timeline

Rendered at markdown render-time via the Wolfram Cloud endpoint.
No local SVG files. Embed as a markdown image:

```markdown
![Cooking Timeline](https://www.wolframcloud.com/obj/pirk0/RenderTimeline?steps=<encoded>&syncs=<encoded>)
```

### Endpoint

`https://www.wolframcloud.com/obj/pirk0/RenderTimeline`

### Parameters

**`steps`** — JSON object. Keys are track names (shown in legend).
Track order = top-to-bottom row order = **order of first device use**.

**`syncs`** — JSON array of vertical dashed milestone lines.

```json
[
  {"t": 85,  "color": "#1E3A5F", "label": "Add beans"},
  {"t": 125, "color": "#1F4D7A", "label": "Ninja done"},
  {"t": 142, "color": "#595959", "label": "Ready"}
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

Sync line colors: use a darkened version of the triggering device's color,
or `#595959` (neutral grey) for the final "Ready" marker.

---

## Ninja Pressure Cooker Rules

**Never use immediate (quick) release** — heats and humidifies the kitchen.
Always use natural or delayed release.

Heat-up time scales with load mass:

| Load | Heat-up (room temp) |
|------|---------------------|
| ~1 kg | 18–21 min |
| ~1.5 kg | 25–28 min |
| ~2 kg | 30–35 min |
| ~2.5 kg | 38–42 min |
| ~4–5 kg | 50–60 min |

Second-stage heat-up (liquid already hot): ~10–15 min regardless of mass.
Frozen ingredients add ~8–12 min. Tomato-based dishes: water → veg →
sauce on top, do not stir before sealing.

**Pressure level:**
- **High pressure** (~120°C): legumes, dense roots, grains
- **Low pressure** (~107°C): delicate vegetables, corn for blending,
  anything where texture matters

**Pressure cook by ingredient** (verified against Nussinow_Cooking_Times.md):
- Potato / sweet potato: 0–1 min high
- Cauliflower, squash, courgette: 0–3 min high
- Carrot, beetroot, hard squash: 5–8 min high
- Corn (for blending): 30 min low (preserves sweetness)
- Black-eyed beans (unsoaked): 6–7 min high
- Soybeans (soaked overnight): 17–20 min high
- Soybeans (unsoaked): 35–45 min high
- Lentils (any): 4–6 min high
- Other dried legumes (unsoaked): see Nussinow table for specific bean


---
