# Project Context

Everything a Claude Code instance needs to know about the household, the cook, the family, and the working conventions for this recipe project.

---

## The cook: Holger Pirk

- 43 years old, lives in Teddington (West London)
- Vegetarian (ovo-lacto), home cook for a family of five
- Competitive marathon runner targeting a Boston qualification (sub-2:55)
- Diagnosed with mild RED-S (Relative Energy Deficiency in Sport); working with a sports dietitian (Jenaed at Nutrition and Co)
- Tracks all nutrition in **FoodNoms**
- Does not eat after 8pm
- Working targets: ~120g protein/day (usually exceeds at ~177g), ~3300 kcal/day intake
- Most calories from carbs and protein; limited fat use
- Health-flagged status: Vitamin D deficiency under correction (50,000 IU/week course), suppressed Free T3 from RED-S, mildly low Hb (dilutional)

### Relevance to recipe design

- High-protein, high-carb meals support athletic recovery
- Calcium matters (bone health under RED-S)
- Salt budget tracked per recipe — typical target ~10–15g salt per family meal
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
- **Microwave** (rarely used in recipes; mentioned for completeness)
- **Standalone blender** for soups and sauces

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
2. **Single-serving breakfast variants** (shakshuka, sauerkraut hash) — captured in `SHAKSHUKA.md`, not as individual recipe files
3. **Ratings tracking** — relational database in `RATINGS.md` for longitudinal feedback
4. **Pressure-cooking reference data** — `Nussinow_Cooking_Times.md`
5. **Cooking technique documentation** — `TECHNIQUES.md`

Out of scope (mentioned in conversations but not part of this project):

- Holger's running training data and race analysis
- Holger's nutrition logs (FoodNoms exports)
- Children's running plans
- Wolfram Language recipe PDF generation (deprecated in favor of markdown)
