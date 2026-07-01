# Project Context

Everything a Claude Code instance needs to know about the household, the cook, the family, and the working conventions for this recipe project.

---

## The cook: Holger Pirk

- 43 years old, lives in Teddington (West London)
- Vegetarian (ovo-lacto), home cook for a family of five
- Competitive marathon runner targeting a Boston qualification (sub-2:55)
- Diagnosed with mild RED-S (Relative Energy Deficiency in Sport); working with a sports dietitian (Jenaed at Nutrition and Co)
- Tracks all nutrition in **FoodNoms**
- Does not eat after 8pm (note: dietitian Jenaed has recommended a ~21:30 pre-bed carb top-up for recovery; Holger has not adopted this. Late-evening fuelling recipe ideas should respect the 8pm cutoff unless he explicitly re-opens the question)
- Working targets: ~120g protein/day (usually exceeds at ~177g), ~3300 kcal/day intake
- Most calories from carbs and protein; limited fat use
- Health-flagged status: Vitamin D deficiency under correction (50,000 IU/week course), suppressed Free T3 from RED-S, mildly low Hb (dilutional)

### Relevance to recipe design

- High-protein, high-carb meals support athletic recovery
- Calcium matters (bone health under RED-S)
- **Salt is a positive for Holger, not a constraint.** As a high-mileage runner he sweats heavily and needs the sodium for electrolyte replacement. Do **not** minimise or flag salt in his solo dishes (breakfasts, his own portions) — report it as a neutral number.
- Salt *is* tracked for **family meals**, but for **palatability** (kids/shared portions), not health — typical family range ~10–15g. Even there it's a taste lever, not a number to drive down.
- Whole-food approach; avoids refined carbohydrates
- Doesn't optimize every meal for protein — varied appealing meals are the goal

---

## The family

| Name | Age | Diet | Notes |
|:-----|:---:|:-----|:------|
| Holger | 43 | Ovo-lacto vegetarian | The cook; recipe developer |
| Anja | adult | Vegetarian | Partner. Adventurous palate, historically highest scorer. Variance signal — when she drops, something specific is off |
| Lara | (oldest) | Vegetarian | Most selective eater. Many established food preferences (see below) |
| Julina | 13 | Eats meat | Most open-minded eater in the family |
| Jannes | 8 | Eats meat | Heat-sensitive. Dislikes cauliflower. Prefers milder, less-fermented profiles |

All family dinners are cooked vegetarian (since three of five are vegetarian and the meat eaters happily eat vegetarian).

### Lara's dietary preferences (well-established through iteration)

Lara dislikes:
- **Sourness / acid-forward dishes** — keep lime/lemon/vinegar/pickled items off the main pot; offer at the table for adults
- **Cooked peppers** (raw is fine)
- **Smoked paprika** (suspected — ablation experiment pending)
- **Warm aromatics** — possibly cinnamon, cardamom, galangal. Not firmly established but worth caution
- **Recognizable silken tofu** in the dish (fine when fully blended into a sauce)

Behavioural rather than purely sensory at times — patterns can shift. Treat as guidelines, not absolute rules.

**Implication for ablation experiments:** Lara's preferences may be increasingly *behavioural* rather than purely sensory. Even a clean negative result from a blind ablation (e.g. smoked paprika) does not prove the preference will shift in everyday eating — behavioural patterns can persist independently of taste data. Interpret sensory experiments accordingly.

**Pre-step for any Lara-focused ablation:** before running a blind taste test, ask Lara to *characterise* what she dislikes about the target ingredient — sharp/hot, bitter, sour, funky; upfront or aftertaste. The qualitative answer shapes the experimental protocol (e.g. if she says "bitter aftertaste," include other bitter-finish controls).

### Jannes-specific notes

- Heat-sensitive — build dishes mild, offer chili at the table for adults
- Recently observed: prefers milder, less-fermented profiles. Red miso noticeably underwhelmed him; white miso should be default for family dishes

### Anja-specific notes

- The variance signal: historically high scorer, so a drop indicates a specific identifiable issue worth probing
- Also heat-sensitive

### Julina-specific notes

- Most open-minded — if she drops below her usual range, something fundamental is off (not just a personal preference miss)

---

## Equipment

- **Ninja ML750** combined pressure cooker / air fryer (the workhorse — see TECHNIQUES.md for detailed usage rules)
- **Big wok** (carbon steel) for sauté, simmer, finishing
- **Large pans and pots** for general cooking
- **Two bamboo steamers** for steaming separate components
- **Microwave** (700 W; used as a fast cook-through / jumpstart station — e.g. onion softening, hasselback jacket potatoes)
- **Standalone blender** for soups and sauces
- **Oil sprayer / mister** — Holger's standard way to apply oil; ideal for getting a thin, even coat into awkward spots (e.g. down into hasselback cuts) with minimal oil

No other significant kitchen equipment used in recipes.

---

## Working conventions

### Units and measurements

- **Metric throughout** — grams, millilitres, °C
- **Ingredient quantities by weight** when possible (more accurate than volume)
- Volume only for liquids and small quantities (tsp/tbsp for spices, etc.)
- Recipe nutrition totals are for **the whole recipe** — never per serving or per 100g

### Currency

- GBP (£)

### Computation

- **Use Wolfram, never Python** — explicit user preference
- For numerical work in conversation: Wolfram Language code blocks
- Standard Wolfram totals pattern for nutrition (documented in `RECIPE_FORMAT.md`)

### Communication style with the user

- Direct, concise — no preamble or excessive caveats
- State assumptions explicitly
- Push back when reasoning has gaps; the user values being challenged
- Specific over vague
- 🐙 ("the okaytopus") signals user approval
- Week begins on Monday

---

## Project scope

This project focuses on:

1. **Family dinner recipes** — full-format markdown files with timeline visualization
2. **Single-serving breakfast variants** (shakshuka, sauerkraut hash) — captured in `../design/SHAKSHUKA.md`, not as individual recipe files
3. **Ratings tracking** — relational database in `RATINGS.md` for longitudinal feedback
4. **Pressure-cooking reference data** — `Nussinow_Cooking_Times.md`
5. **Cooking technique documentation** — `TECHNIQUES.md`

Out of scope (mentioned in conversations but not part of this project):

- Holger's running training data and race analysis
- Holger's nutrition logs (FoodNoms exports)
- Children's running plans
- Wolfram Language recipe PDF generation (deprecated in favor of markdown)
