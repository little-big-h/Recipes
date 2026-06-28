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

> **Egress.** `wolframcloud.com` **is now in** the container's network allowlist (added 2026-06-27), so the simplest path is to **`curl` the endpoint directly**: `curl -o meal.foodnoms '…/BuildFoodNomsRecipe?…'` for the raw file bytes, or add `-H 'Accept: application/json'` to get the decoded entries + computed totals back (verify resolution + totals without cracking the `bvx-` container — see `RECIPE_NUTRITION_GENERATOR.md`). *Fallback* — for a kernel-only session, if egress is ever withdrawn, or when you must **patch per-entry `uncertainty`** in the kernel (the query param is meal-wide, see above): build the bytes in Wolfram, bridge them out with `BaseEncode[byteArray]`, then `base64 -d` locally — don't `Normal[]` the ByteArray first (that base64-encodes the *text* "{98, 118, …}", not the bytes).

---

## Uncertainty policy

Set the FoodNoms `uncertainty` field (integer percent — see `FOODNOMS_FORMAT.md`) by **how *both* the portion and the composition are known**:

| Situation | `uncertainty` | Why |
|:--|:--:|:--|
| **Weighed raw whole food** (fruit, plain salad veg) | **0** | Both knowns: the portion is weighed *and* the composition is fixed — it just *is* that food (raw strawberries, watermelon). Nothing left to estimate. |
| **Weighed prepared/cooked dish** | **10** | Portion exact; only the per-gram composition (oil, sauce, recipe) is estimated. |
| **Photo only, no scale** | **30** | Both the portion *and* the composition are guessed from the image. |

**Set uncertainty per entry, not per meal** — a single sitting can mix tiers (Blue Room 2026-06-23: raw strawberries 0, weighed tomato + mushroom 10). The endpoint's `uncertainty` query param applies one value to *all* entries, so when tiers differ: build with the common value (or `0`), then **patch each `foodEntries[]` item's `uncertainty` in the kernel** before re-emitting the `bvx-` bytes (`Append[entry, "uncertainty" -> n]`; omit the field entirely for the 0 tier).

**The weights are the certain part; the composition is the estimate.** Even a perfectly-weighed 367 g of Ma Po has unknown oil content — that's what the 10 % covers, not the gram count. The 0 tier is the case where there's no composition guess either.

---

## Reading the scale — gotchas

- **Rotated displays.** Photos are often taken from the far side, so the LCD reads upside-down (the `KNSWE` logo tells you). Rotate 180° mentally before reading.
- **Glare / refraction** washes out digits. When a digit is ambiguous, **say so and ask Holger to confirm** rather than guessing — a straight-on, glare-free shot reads cleanly.
- **Sanity-check the subtraction.** Empty-vessel weight should be plausible and consistent (e.g. 604 g empty + 364 g rice = 968 g full — the tare checks out).
- **Same vessels both shots.** If crockery is added/stacked/removed between before and after, the difference is meaningless. Spoon/ladle in both is fine — it cancels.
- **Trust a valid weigh over the photo — fine-dining plating inflates apparent volume.** A wide plate holding a charred leek, a few mushrooms and a sauce swirl can *look* like ~150 g but weigh ~70 g; the volume is mostly sauce and bare plate. Don't override a sound before/after with a larger eyeball estimate — fine-dining portions really are that small. (Blue Room 2026-06-23: the mushroom main weighed 72 g; an initial photo estimate of ~150 g was an over-count.)
- **One real way the weigh *can* lie: a tableside sauce pour.** If the "before" shot is taken *before* the sauce is poured, that mass (often +80–100 g) never hit the scale and consumed is undercounted. **Check the before photo actually shows the sauce** — if it does (as at the Blue Room), the weigh is valid; if not, fall back to a photo estimate (30 %).

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
