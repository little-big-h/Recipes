# Experiments and Ablations

Protocols for hypothesis tests, ablations, and structured experiments within the recipe project. Distinct from `TECHNIQUES.md` (settled cooking practice) — this file captures *open questions* and the procedures designed to answer them.

Pattern: each experiment has a **hypothesis**, a **protocol**, a **measurement plan**, and an **outcome** field (filled in after the experiment runs).

---

## Active experiments

### 1. Lara smoked paprika ablation

**Hypothesis**: Lara has a *sensory* aversion to smoked paprika (suspected from recipe-pattern observation, never directly tested).

**Pre-step (do this first, before the blind test):**

Ask Lara to *characterise* what she dislikes about smoked paprika:

- Sharp / hot?
- Bitter?
- Sour?
- Funky / fermented?
- Smoky (specifically)?
- Upfront or aftertaste?

Her answer shapes the experimental protocol. For example:
- "Bitter aftertaste" → include other bitter-finish controls (cocoa nibs, certain leafy greens, dark roasted spices) so we can distinguish smoked-paprika-specific from bitterness-in-general.
- "Smoky" → test against other smoky ingredients (chipotle, lapsang souchong) to isolate whether the issue is smoke aroma vs paprika itself.
- "I don't know, just don't like it" → run the blind test as designed; behavioural-vs-sensory will remain ambiguous.

Capture her answer verbatim in this file before running the test.

**Protocol (blind test):**

- Substrate: 50 g plain mashed potato (neutral carrier).
- Dose: ¼ tsp smoked paprika.
- Carrier: 5 ml mild olive oil (bloom the paprika briefly in oil, off heat, to release colour and aroma without changing chemistry significantly).
- Three samples: (a) substrate only, (b) substrate + plain paprika (sweet, non-smoked), (c) substrate + smoked paprika.
- Blinded — Lara does not know which is which.
- Rate each on a 1–5 scale and describe what she tastes.

**Measurement plan:**

- A score gap between (b) sweet paprika and (c) smoked paprika of >1 point on the 5-scale, with consistent description ("smoky," "bitter," etc.) attributable to the smoked variant, supports a sensory aversion.
- Equal scores for (b) and (c) suggest the dislike is behavioural / contextual rather than sensory.

**Behavioural-vs-sensory caveat:**

Even a clean negative result (no sensory aversion) does not prove she will accept smoked paprika in everyday meals. Lara's preferences may be increasingly behavioural. The ablation result informs *what we cook* — it does not guarantee *what she eats*.

**Outcome:** *(unfilled — experiment not yet run)*

---

### 2. Japanese corn soup white miso vs red miso (v1 → v2)

**Hypothesis**: Red miso intensity caused Jannes's drop to 6.0 in v1 and the unusually wide family spread (3.0 points). White miso at the matched-intensity substitution (30 g white ≈ 18 g red) should reduce the spread and lift Jannes's score back toward his usual 7.0–7.5 range, while preserving the dish's character for the adult palate.

**Protocol:**

- Single-variable change: 30 g white miso substituted for 18 g red miso. All other amounts held constant (Tsuyu 104 ml, dashi-soy 10 ml, mirin 30 ml, bok choi 400 g).
- Same cooking method, same garnishes, same serving conditions.

**Measurement plan:**

- Family ratings out of 10, same five raters as v1.
- Compare per-person delta vs v1.
- Predicted outcomes:
  - Jannes: 6.0 → 7.0+ (red miso intensity hypothesised cause of drop)
  - Holger: 9.0 → 8.0–8.5 (some loss of adult-palate edge expected)
  - Anja, Julina, Lara: roughly held
  - Family spread should narrow from 3.0 toward ~1.5–2.0

**Outcome:** *(unfilled — v2 not yet cooked)*

See recipe file: `../recipes/soups/creamy-corn-soup-japanese-v2.md`. Also `RATINGS.md` remark #17.

---

## Closed / superseded experiments

*(none yet)*

---

## Conventions

- One section per experiment. Number sequentially; do not reuse numbers when superseded.
- When an experiment closes, move it to "Closed / superseded" and add an Outcome paragraph with what was learned. Do not delete.
- Cross-reference recipe files and `RATINGS.md` remarks where relevant.
- Behavioural / contextual confounds get a dedicated note in each protocol — sensory experiments don't transfer cleanly to everyday eating behaviour.
