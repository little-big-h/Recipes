# Recipe Format Standard

Recipes are stored as **Markdown** in `~/Documents/Claude-Interchange/`.
No PDF generation. Print directly from the markdown renderer of your choice.

Each recipe produces one file: `{recipe_name}.md`

Timeline images are rendered at markdown render-time via the Wolfram Cloud
endpoint — no local SVG files needed.

---

## Markdown Structure

Each file begins with a **MultiMarkdown jQuery snippet** for ingredient
row colour-coding, followed by the document content:

```
<!--
XHTML Header: <script> ... </script>
-->

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

## Ingredient Row Colour-Coding

Rows in the ingredients table are colour-coded by category using a
**MultiMarkdown metadata jQuery snippet** at the top of each file.

### Standard colour palette

| Category | Hex | Wolfram |
|:---------|:----|:--------|
| Vegetables | `#d9f2d9` | `RGBColor[0.85, 0.95, 0.85]` |
| Aromatics | `#fcf5cc` | `RGBColor[0.99, 0.96, 0.80]` |
| Spices / Pastes | `#fae0d1` | `RGBColor[0.98, 0.88, 0.82]` |
| Stock | `#ebebeb` | `RGBColor[0.92, 0.92, 0.92]` |
| Protein | `#e0ebfa` | `RGBColor[0.88, 0.92, 0.98]` |
| Seasoning | `#ebd9f5` | `RGBColor[0.92, 0.85, 0.96]` |
| Acid | `#faedd9` | `RGBColor[0.98, 0.93, 0.85]` |

Only include categories present in the recipe — omit unused ones from the legend.

### Row numbering

`:nth-child(n)` counts within `tbody` — so `n=1` is the first data row,
`n=2` the second, etc. The header row (`thead`) is excluded automatically
by using `find('tbody tr')`.

Since ingredients are sorted by time of use (not grouped by category),
rows of the same colour are typically non-contiguous.

### Snippet template

```markdown
<!--
XHTML Header: <script>
    (function($){
        $(function(){
            var $rows=$('table').eq(1).find('tbody tr');
            $rows.filter(':nth-child(1),:nth-child(11),...').css('background-color','#d9f2d9');
            $rows.filter(':nth-child(2),:nth-child(3),...').css('background-color','#fcf5cc');
            $rows.filter('...').css('background-color','#fae0d1');
            $rows.filter('...').css('background-color','#ebebeb');
            $rows.filter('...').css('background-color','#e0ebfa');
            $rows.filter('...').css('background-color','#ebd9f5');
            $rows.filter('...').css('background-color','#faedd9');
        });
    })(jQuery);
    </script>
-->
```

Key points:
- Target `.eq(1)` (second table) since the legend table comes first
- Use `find('tbody tr')` to exclude the column header row from colouring
- List every row index explicitly — rows of the same category are non-contiguous

---

## Ingredients Table

### Legend

An inline-styled HTML table placed immediately before the markdown
ingredients table. Since it is the first `<table>` in the document,
the jQuery (which targets `.eq(1)`) leaves it unstyled. Only include
categories present in the recipe.

```html
<table><tbody><tr>
<td style="background:#d9f2d9;padding:3px 10px">Vegetables</td>
<td style="background:#fcf5cc;padding:3px 10px">Aromatics</td>
<td style="background:#fae0d1;padding:3px 10px">Spices / Pastes</td>
<td style="background:#ebebeb;padding:3px 10px">Stock</td>
<td style="background:#e0ebfa;padding:3px 10px">Protein</td>
<td style="background:#ebd9f5;padding:3px 10px">Seasoning</td>
<td style="background:#faedd9;padding:3px 10px">Acid</td>
</tr></tbody></table>
```

### Ingredient table structure

Plain markdown table with **three columns**: Ingredient, Planned, Actual used.

**No in-table category headers.** Categories are indicated solely by row colour.

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

Every ingredient must have a **unique emoji** prefix, used consistently
in both the table and the method text.

### Standard categories (for colour assignment)
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
