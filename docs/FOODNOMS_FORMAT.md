# FoodNoms File Format (`.foodnoms`)

A spec for generating `.foodnoms` files — the share/export format of the
[FoodNoms](https://foodnoms.com) iOS nutrition app. This document is written for
**another Claude**: given a request like *"make a FoodNoms file for this recipe"*,
follow this to emit a valid file.

The canonical samples this spec is derived from live in [`../examples/`](../examples/):

| File | Type |
|------|------|
| `Spinach (Raw).foodnoms`, `Coconut Water.foodnoms`, `Bayerischer Tafel-Meerrettich.foodnoms` | individual food |
| `Flat White.foodnoms`, `Breakfast Shakshuka.foodnoms` | meal |
| `Thai Yellow Butternut Squash Curry …`, `Spinach Paneer Curry …`, `Creamy Pinto, Butternut & Corn Soup …` | recipe |

---

## 1. What a `.foodnoms` file is

A `.foodnoms` file is **a single JSON object, LZFSE-compressed**. It is *not*
plain text — opening one in an editor shows binary with stray readable
fragments. You must compress to write one and decompress to read one.

There are three logical things a file can carry, all using the same JSON:

1. **Individual food** — one database/custom food (e.g. "Spinach (Raw)").
2. **Meal** — a list of foods eaten in one sitting (e.g. "Flat White").
3. **Recipe** — an ingredient list with amounts and a yield (e.g. a curry).

Which one it is comes from `contentType` (+ `collectionType`); see §3.

---

## 2. The container: LZFSE

The payload is UTF-8 JSON wrapped in an **Apple LZFSE** stream. You can confirm
a file is LZFSE by its block magic: it starts with `bvx2` (entropy-coded) or
`bvxn` (LZVN) and ends with the terminator `bvx$`.

LZFSE is **not** available in Wolfram, and producing the file is file I/O rather
than nutrition computation, so the project's "Wolfram, not Python" rule does not
apply here — use the small Python utility below purely as the codec. It depends
on the `lzfse` package (`pip install lzfse`), which is an external tool, **not** a
dependency of this repo.

**Decode** (read an existing file):

```python
import lzfse, json
obj = json.loads(lzfse.decompress(open("Spinach (Raw).foodnoms", "rb").read()))
print(json.dumps(obj, indent=2, ensure_ascii=False))
```

**Encode** (write a new file from a Python dict / JSON):

```python
import lzfse, json
data = { ... }   # the JSON object described below
blob = lzfse.compress(json.dumps(data, ensure_ascii=False).encode("utf-8"))
open("My Food.foodnoms", "wb").write(blob)
```

**Filename.** FoodNoms names exports after the food/collection, e.g.
`Spinach (Raw).foodnoms` or `Thai Yellow Butternut Squash Curry 27/5/26.foodnoms`
(slashes from dates are stripped by the OS, hence `…Curry 27526.foodnoms` on
disk). Use the food/collection `name` as the filename; the extension is
`.foodnoms`.

---

## 3. Top-level structure

The root JSON object always has `version` and `contentType`. The rest depends on
the type:

| Type | `contentType` | Arrays present | `collectionType` | Collection-only fields |
|------|:---:|---|:---:|---|
| Individual food | `3` | `foods[]` | — | — |
| Meal | `2` | `foodCollections[]` + `foodEntries[]` | `2` | — |
| Recipe | `2` | `foodCollections[]` + `foodEntries[]` | `3` | `totalServingSize`, `servings`, `servingSizeUnit` |

- `version`: always `2` (file-format version; the per-object `version` is `1`).
- `contentType`: `3` = a standalone food, `2` = a collection (meal or recipe).
- A collection file has exactly one entry in `foodCollections[]` (the header)
  and one or more `foodEntries[]` (the members/ingredients).
- A meal vs a recipe is told apart **only** by `collectionType` (`2` vs `3`) and
  the presence of the recipe yield fields.

---

## 4. Type A — Individual food (`contentType: 3`)

```jsonc
{
  "version": 2,
  "contentType": 3,
  "foods": [
    {
      "name": "Spinach (Raw)",
      "foodID": "local:85082DF3-65C6-415F-B4C2-425696EE7DBB",
      "version": 1,
      "baseAmount": 100,            // nutrients are stated PER baseAmount baseUnit
      "baseUnit": "gram",
      "traits": 0,
      "isHidden": false,
      "nutrients": { "calories": 23, "protein": 2.86, "carbs": 3.63, "fat": 0.39, "...": 0 },
      "measures": [                 // optional alternative serving sizes
        { "descriptionQuantity": 1, "descriptionText": "cup", "unit": "gram", "value": 30, "traits": 0 }
      ],
      "barcode": "5059572001514",   // optional (branded products)
      "brandOwner": "M&S"           // optional (branded products)
    }
  ]
}
```

A minimal custom food only needs `name`, `foodID` (a `local:<UUID>`), `version`,
`baseAmount`, `baseUnit`, `traits`, `nutrients` (at least `calories`). `measures`,
`barcode`, `brandOwner`, `isHidden` are optional.

---

## 5. Type B — Meal (`contentType: 2`, `collectionType: 2`)

A meal is a collection header plus the foods eaten. No yield fields.

```jsonc
{
  "version": 2,
  "contentType": 2,
  "foodCollections": [
    { "name": "Flat White", "collectionType": 2, "version": 1, "traits": 0 }
  ],
  "foodEntries": [
    {
      "name": "Coffee (Espresso)",
      "foodID": "foodnoms:usda:2345938",
      "source": "usda",
      "secondarySource": "survey_fndds_food",
      "versionID": "10383953",
      "version": 1,
      "baseAmount": 100,
      "baseUnit": "gram",
      "traits": 0,
      "uncertainty": 0,
      "quantity": 50,               // amount actually eaten, in baseUnit
      "measure": { "unit": "milliliter", "value": 1, "traits": 0 },
      "measures": [ { "unit": "gram", "descriptionText": "fl oz", "descriptionQuantity": 1, "value": 30, "traits": 0 } ],
      "nutrients": { "calories": 9, "protein": 0.12, "carbs": 1.67, "fat": 0.18, "caffeine": 212, "...": 0 }
    }
    // … one object per food in the sitting
  ]
}
```

---

## 6. Type C — Recipe (`contentType: 2`, `collectionType: 3`)

Identical to a meal, but `collectionType` is `3` and the header carries the
yield (`totalServingSize` = total cooked weight, `servings`, `servingSizeUnit`).
Each `foodEntries[]` object is an ingredient with its `quantity`.

```jsonc
{
  "version": 2,
  "contentType": 2,
  "foodCollections": [
    {
      "name": "Thai Yellow Butternut Squash Curry 27/5/26",
      "collectionType": 3,
      "version": 1,
      "traits": 0,
      "totalServingSize": 3180,     // total yield (cooked weight) …
      "servingSizeUnit": "gram",    // … in this unit
      "servings": 1                 // number of servings the recipe yields
    }
  ],
  "foodEntries": [
    {
      "name": "Butternut Squash (Raw)",
      "foodID": "foodnoms:usda:2685570",
      "source": "usda",
      "secondarySource": "foundation_food",
      "versionID": "16552153",
      "version": 1,
      "baseAmount": 100,
      "baseUnit": "gram",
      "traits": 0,
      "uncertainty": 0,
      "quantity": 1387,             // grams of this ingredient in the recipe
      "measure": { "unit": "gram", "value": 1, "traits": 0 },
      "measures": [ { "unit": "gram", "descriptionText": "medium butternut squash", "descriptionQuantity": 1, "value": 1000, "traits": 0 } ],
      "nutrients": { "calories": 48.13, "protein": 1.15, "carbs": 10.51, "fat": 0.17, "...": 0 }
    }
    // … one object per ingredient
  ]
}
```

---

## 7. Field reference

### `foodCollections[]` (the collection header)

| Field | Meaning |
|-------|---------|
| `name` | Meal/recipe name (used as the filename). |
| `collectionType` | `2` = meal, `3` = recipe. |
| `version` | `1`. |
| `traits` | Flag bitfield, normally `0`. |
| `totalServingSize` | Recipe only — total yield in `servingSizeUnit`. |
| `servingSizeUnit` | Recipe only — e.g. `"gram"`. |
| `servings` | Recipe only — number of servings produced. |

### Food object (`foods[]`) and food entry (`foodEntries[]`)

| Field | Where | Meaning |
|-------|-------|---------|
| `name` | both | Display name. |
| `foodID` | both | Identity; see schemes below. |
| `version` | both | `1`. |
| `baseAmount` | both | The amount the `nutrients` are stated for (usually `100`). |
| `baseUnit` | both | `"gram"`, `"milliliter"`, or `"serving"`. |
| `traits` | both | Flag bitfield, normally `0`. |
| `nutrients` | both | Per-`baseAmount` values (see §8). |
| `measures` | both (opt.) | Alternative serving sizes (see below). |
| `barcode` / `brandOwner` | both (opt.) | For branded products. |
| `isHidden` | `foods[]` (opt.) | `false`. |
| `quantity` | `foodEntries[]` | Amount used/eaten, in `baseUnit`. **Required for entries.** |
| `measure` | `foodEntries[]` | The single chosen serving for this entry. |
| `uncertainty` | `foodEntries[]` | `0`. |
| `source` / `secondarySource` | `foodEntries[]` (opt.) | Data provenance (see below). |
| `versionID` | both (opt.) | Numeric id of the database food revision. |
| `collectionSortIndex` | `foodEntries[]` (opt.) | Display order within the collection. |

### `measure` / `measures[]` (serving sizes)

```jsonc
{ "unit": "gram", "value": 30, "descriptionQuantity": 1, "descriptionText": "cup", "traits": 0 }
```

- `unit` — the unit `value` is expressed in (usually `gram`/`milliliter`;
  occasionally `serving` or `kilocalorie`).
- `value` — how many `unit` one serving weighs (e.g. one "cup" = 30 g).
- `descriptionQuantity` + `descriptionText` — the human label
  (`1` × `"cup"`). Omit both for a bare unit serving.
- `measure` (singular, entries only) is the *selected* serving; `measures[]` is
  the *list of options*. A simple gram-based entry can use
  `"measure": { "unit": "gram", "value": 1, "traits": 0 }`.

### `foodID` schemes

| Pattern | Meaning | Companion fields |
|---------|---------|------------------|
| `local:<UUID>` | User custom/local food. Use this for anything you invent. | — |
| `foodnoms:usda:<id>` | USDA database food. | `source:"usda"`, `secondarySource` ∈ `sr_legacy_food` / `survey_fndds_food` / `foundation_food`, numeric `versionID` |
| `foodnoms:ciqual:<id>` | French CIQUAL database. | `source:"ciqual"`, `secondarySource:"ciqual"` |
| `foodnoms:openai:<UUID>` | AI-estimated food. | `source:"fn"`, `secondarySource:"openai"` |
| `foodnoms:fn:<UUID>` | FoodNoms community contribution. | `source:"fn"`, `secondarySource:"contribution"` |
| `foodnoms:<UUID>` | FoodNoms built-in/verified food. | numeric `versionID` |

**When generating:** unless you are copying a real database id from an existing
file, mint a fresh uppercase UUID and use `local:<UUID>`. Don't fabricate
`usda:`/`ciqual:` ids — they must match real database rows.

---

## 8. `nutrients` reference

`nutrients` values are stated **per `baseAmount` of `baseUnit`** (typically per
100 g). To compute what a `foodEntries[]` item actually contributes:

```
contribution = nutrients[key] × quantity / baseAmount
```

Only `calories` is effectively required; include whatever else you have. All keys
are optional and default to absent (treat as 0).

| Unit | Keys |
|------|------|
| **kcal** | `calories` |
| **grams** | `protein`, `carbs`, `sugars`, `fiber`, `fat`, `fatSaturated`, `fatTrans`, `fatMonounsaturated`, `fatPolyunsaturated`, `water`, `alcohol` |
| **mg** | `sodium`, `potassium`, `calcium`, `iron`, `magnesium`, `zinc`, `phosphorus`, `copper`, `manganese`, `chlorine`, `cholesterol`, `caffeine`, `vitaminC`, `vitaminE`, `niacin`, `thiamin`, `riboflavin`, `vitaminB6`, `pantothenicAcid` |
| **µg** | `selenium`, `folate`, `vitaminA` (RAE), `vitaminD`, `vitaminB12`, `vitaminK`, `biotin`, `iodine` |

(Units follow FoodNoms' standard nutrient conventions; macros and water in g,
minerals in mg, trace vitamins/minerals in µg.)

---

## 9. Authoring checklist (for another Claude)

1. **Pick the type:** standalone food → §4; one sitting → §5; recipe with
   amounts/yield → §6.
2. **Build the JSON** per that section. Defaults that almost always hold:
   `version: 2` (root), `version: 1` (objects), `traits: 0`, `uncertainty: 0`,
   `baseAmount: 100`, `baseUnit: "gram"`.
3. **Identity:** for custom foods, mint `local:<fresh-UUID>`. Only reuse
   `foodnoms:usda:…`/`ciqual:…` ids copied verbatim from real data.
4. **Nutrients:** stated per `baseAmount`; include at least `calories`.
5. **Entries:** every `foodEntries[]` item needs `quantity` (amount in
   `baseUnit`) and a `measure`.
6. **Recipe header:** set `totalServingSize`, `servingSizeUnit`, `servings`.
7. **Encode** with the LZFSE snippet in §2 and save as `<name>.foodnoms`.

---

## 10. Worked round-trip

Author a tiny custom food and write the file:

```python
import lzfse, json, uuid

food = {
    "version": 2,
    "contentType": 3,
    "foods": [{
        "name": "Tahini (Light)",
        "foodID": f"local:{str(uuid.uuid4()).upper()}",
        "version": 1,
        "baseAmount": 100,
        "baseUnit": "gram",
        "traits": 0,
        "isHidden": False,
        "nutrients": {
            "calories": 595, "protein": 17, "carbs": 21, "fat": 54,
            "fatSaturated": 7.6, "fiber": 9.3, "sodium": 30, "calcium": 426
        },
        "measures": [
            {"descriptionQuantity": 1, "descriptionText": "tbsp", "unit": "gram", "value": 15, "traits": 0}
        ]
    }]
}

blob = lzfse.compress(json.dumps(food, ensure_ascii=False).encode("utf-8"))
open("Tahini (Light).foodnoms", "wb").write(blob)

# verify it round-trips
assert json.loads(lzfse.decompress(blob))["foods"][0]["name"] == "Tahini (Light)"
```

The resulting `Tahini (Light).foodnoms` imports into FoodNoms as a custom food.
