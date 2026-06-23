# Meal Logging — Weigh-by-Difference

How Holger logs *eaten* food (restaurant meals, plated portions) into FoodNoms, and how Claude turns a pair of photos into a `.foodnoms` meal file.

This is for **food consumed**, distinct from recipe development (`RECIPE_NUTRITION_GENERATOR.md`). The numbers are committed best-estimates, never FoodNoms-verified.

---

## The method

For each dish, Holger takes **two photos with the dish on a kitchen scale**:

1. **Before** — full dish on the scale (bowl/plate + any spoon/ladle included).
2. **After** — the emptied dish, **same vessels and utensils still on the scale**.

**Consumed weight = before − after.** The bowl, plate and spoon cancel out, so the difference is exactly what was eaten — no need to tare or weigh empty crockery.

### Claude's job

1. **Read both LCDs** from the photos and subtract.
2. **Scale** a per-100 g nutrition estimate for that dish to the eaten grams.
3. **Build** a FoodNoms meal file via the deployed **`BuildFoodNomsRecipe`** endpoint — one **custom food entry per dish**, `customQuantities` = eaten grams. **Pass `collectionType=2`** so it emits a *meal* (`collectionType 2`, no yield fields), not a recipe — a meal logs each dish into the diary separately, which is what eaten food wants. Hand back the **download link** (the endpoint *is* the file creator).

> **Live endpoint.** The `collectionType=2` (meal) switch is **deployed and live** (verified 2026-06-21): a meal call returns `collectionType 2` with no yield fields. Per-entry uncertainty still has to be patched in the kernel (see Uncertainty policy below) since the query param is meal-wide.

> **Egress.** `wolframcloud.com` is **not** in the repo container's network allowlist, so `curl`-ing the endpoint from here fails. To deliver an actual file, build the bytes in the Wolfram kernel and bridge them out as base64 (`BaseEncode`), then `base64 -d` locally — don't `Normal[]` the ByteArray first (that base64-encodes the *text* "{98, 118, …}", not the bytes).

---

## Uncertainty policy

Set the FoodNoms `uncertainty` field (integer percent — see `FOODNOMS_FORMAT.md`) by **how *both* the portion and the composition are known**:

| Situation | `uncertainty` | Why |
|:--|:--:|:--|
| **Weighed raw whole food** (fruit, plain salad veg) | **0** | Both knowns: the portion is weighed *and* the composition is fixed — it just *is* that food (raw strawberries, watermelon). Nothing left to estimate. |
| **Weighed prepared/cooked dish** | **10** | Portion exact; only the per-gram composition (oil, sauce, recipe) is estimated. |
| **Photo only, no scale** | **30** | Both the portion *and* the composition are guessed from the image. |

**Set uncertainty per entry, not per meal** — a single sitting routinely mixes tiers (Blue Room 2026-06-23: raw strawberries 0, weighed tomato 10, photo-estimated mushroom 30). The endpoint's `uncertainty` query param applies one value to *all* entries, so for a mixed-method meal: build with `uncertainty=0`, then **patch each `foodEntries[]` item's `uncertainty` in the kernel** before re-emitting the `bvx-` bytes (`Append[entry, "uncertainty" -> n]`; omit the field entirely for the 0 tier).

**The weights are the certain part; the composition is the estimate.** Even a perfectly-weighed 367 g of Ma Po has unknown oil content — that's what the 10 % covers, not the gram count. The 0 tier is the case where there's no composition guess either.

---

## Reading the scale — gotchas

- **Rotated displays.** Photos are often taken from the far side, so the LCD reads upside-down (the `KNSWE` logo tells you). Rotate 180° mentally before reading.
- **Glare / refraction** washes out digits. When a digit is ambiguous, **say so and ask Holger to confirm** rather than guessing — a straight-on, glare-free shot reads cleanly.
- **Sanity-check the subtraction.** Empty-vessel weight should be plausible and consistent (e.g. 604 g empty + 364 g rice = 968 g full — the tare checks out).
- **Same vessels both shots.** If crockery is added/stacked/removed between before and after, the difference is meaningless. Spoon/ladle in both is fine — it cancels.
- **Tableside sauce pours invalidate the weigh** (fine dining). If the "before" weigh is taken *before* the waiter pours a sauce, the poured mass (often +80–100 g) is never on the scale, so before − after **undercounts** what was eaten. Tell: an implausibly small consumed weight against a clearly substantial plate (Blue Room 2026-06-23: weighed difference said 72 g for a full mushroom main; the photo showed ~150 g). **Fall back to a photo + menu portion estimate (30 %)** for that dish.

---

## Worked example — Pearl of China lunch, 2026-06-21

Four dishes, all weighed (→ `uncertainty=10`):

| Dish | Before | After | Eaten | kcal | P | C | Fat | Salt |
|:--|--:|--:|--:|--:|--:|--:|--:|--:|
| 3-Mushroom & Beancurd Soup | 1531 | 1200 | 331 g | 135 | 8 | 13 | 5 | 2.3 |
| Steamed rice | 968 / +73 | 604 | 437 g | 568 | 12 | 122 | 1 | 0.0 |
| Veg Ma Po Beancurd | 975 | 608 | 367 g | 420 | 20 | 22 | 28 | 4.4 |
| Sweet & Sour Beancurd (HK) | 463 | 307 | 156 g | 250 | 11 | 33 | 11 | 1.3 |
| **Total** | | | **1291 g** | **1372** | **51** | **190** | **45** | **8.0** |

Macros 55 % carb / 15 % protein / 30 % fat. Built as a single 4-entry `.foodnoms` meal file, `totalServingSize=1291`, `uncertainty=10`.
