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

**Field evidence (real-world, not the blind test) — 2026-06-04:** Holger made egg-fried quinoa with peas, **sweet (non-smoked) paprika**, shiitake powder and garlic powder. Lara rated it **~7.7–7.8** — her near-ceiling (see RATINGS obs 5). A sweet-paprika dish hitting her ceiling is consistent with the aversion being **smoke-specific, not paprika-general**, i.e. it strengthens the "smoky" branch of the hypothesis. Caveats: not blind, not isolated (peas + shiitake + garlic also present), and the score is from memory. Suggestive, not proof — but it raises confidence that sweet paprika is safe-to-loved for Lara, which de-risks its use in family dishes (e.g. the Pinto–Butternut soup).

**Outcome (blind test):** *(unfilled — experiment not yet run)*

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

### 3. Japanese corn soup — homemade dashi vs bottled concentrate (v2 → v3)

**Hypothesis**: A real kombu-shiitake dashi backbone matches or beats the bottled-concentrate stack (Tsuyu + dashi-soy) on depth and family ratings, *at roughly half the salt*. Kombu glutamate × shiitake guanylate should supply the savoury depth that the salty Tsuyu currently provides, letting Tsuyu drop from 104 → 45 ml. If it lands, this becomes the default build for the Japanese line and a standing salt-budget win.

**Protocol:**

- Cold-brew dashi overnight (mizudashi): 20 g kombu + 11 g shiitake powder in 1800 ml water; remove kombu before cooking (never boil the kombu). Use the dashi in place of the plain water.
- Tsuyu cut 104 → 45 ml. White miso (30 g), dashi-soy (10 ml), corn, soybeans, bok choi all held at v2 levels.
- Hon-mirin 22 ml replaces 30 ml mirin-style seasoning (real mirin reads sweeter — see `TECHNIQUES.md`).
- Same cooking method, garnishes, serving conditions as v2.

**Confound (explicit):** this is **not** a clean single-variable change. Two coupled variables move together — (1) umami source (water → kombu-shiitake dashi) and (2) salt level (~11 g → ~7 g) — plus a smaller mirin change. They're coupled on purpose (real dashi is what affords the salt cut), but a ratings change can't be cleanly attributed to dashi quality vs lower salt. Under-salting is the prime suspect for any dip, especially with the kids.

**Decoupling follow-up:** if v3 is ambiguous, cook **v3b** holding total salt at ~11 g (back-fill the cut Tsuyu salt with plain salt or liquid aminos) so the *only* change from v2 is the dashi source. That isolates dashi quality from salt level.

**Measurement plan:**

- Family ratings out of 10, same five raters.
- Compare per-person delta vs v2.
- Predicted outcomes:
  - Family holds or rises → dashi swap validated, salt cut is free.
  - Adults hold, kids dip → likely under-salted, not a dashi problem; run v3b.
  - Across-the-board dip → under-salted or dashi character not landing; v3b decouples which.
  - Holger especially up → real dashi depth is the adult-palate lever red miso used to provide, minus the fermented edge Jannes disliked.

**Outcome:** *(unfilled — v3 not yet cooked)*

See recipe file: `../recipes/soups/creamy-corn-soup-japanese-v3.md`. Also `RATINGS.md` remark #33.

---

### 4. Pinto–Butternut soup: white miso vs red miso (v1 → v2)

**Hypothesis**: v1 was finished with 20 g **red** miso, and Jannes (red-averse) scored 7.0 — the floor of his usual range. Swapping to **white** miso at a matched dose should lift Jannes (and possibly tighten the family spread) while keeping the savoury depth that fixed v1's blandness. Directly parallel to the Japanese corn soup red→white test (exp #2).

**Protocol:**

- Single-variable change: 20 g white miso for 20 g red miso, whisked in off heat. Everything else held (squash/corn/pinto base, kombu pulled at end of phase 1, shiitake 8 g, aminos 30 ml, spice backbone).
- **Salt confound to control:** white miso is ~half the salt of red (~6% vs ~13%). Add a little salt or aminos so total salt matches v1 (~13 g) — otherwise the swap confounds "less fermented" with "less salty," and you can't attribute a Jannes change to fermentation.
- Same cooking method, garnishes, serving conditions.

**Measurement plan:**

- Family ratings out of 10; compare per-person delta vs v1 (Julina 8.3, Anja 8.0, Holger 8.0, Lara 7.3, Jannes 7.0; avg 7.7, spread 1.3).
- Predicted: Jannes ↑ toward 7.5+; adults roughly held or slightly softer (less fermented edge); spread narrows.

**Outcome:** *(unfilled — v2 not yet cooked)*

> **Note:** the planned `creamy-pinto-butternut-soup-v2.md` ("Bold") is **not** this test — it changes corn, cauliflower, white miso *and* the whole spice level at once, so a Jannes change there can't be attributed to the miso. The clean single-variable test (white-for-red, all else held, salt matched) still needs its own cook.

See recipe file: `../recipes/soups/creamy-pinto-butternut-soup.md` (documents the white-swap option). Also `RATINGS.md` remark #35.

---

## Closed / superseded experiments

*(none yet)*

---

## Conventions

- One section per experiment. Number sequentially; do not reuse numbers when superseded.
- When an experiment closes, move it to "Closed / superseded" and add an Outcome paragraph with what was learned. Do not delete.
- Cross-reference recipe files and `RATINGS.md` remarks where relevant.
- Behavioural / contextual confounds get a dedicated note in each protocol — sensory experiments don't transfer cleanly to everyday eating behaviour.
