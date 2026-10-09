# Pantry and Staples — Singapore

What's in stock in Holger's kitchen. Useful for recipe design — if it's here and marked ✅, you can call on it without asking.

> 🆕 **Rebuilt from scratch 2026-08-10, after the move from Teddington.** The old UK list is retired at [`archive/PANTRY-UK-TEDDINGTON.md`](archive/PANTRY-UK-TEDDINGTON.md) — don't design against it, but do read it for label data on products that are also sold here, and for the pantry that pre-August-2026 recipes were written against.
>
> **The run-down is over.** Buying is allowed again; the "propose an in-stock substitute, never a purchase" rule is lifted.

## How to read this file

The kitchen is being restocked from zero, so **nothing is assumed**. Every item carries a marker:

| | Meaning | What to do when designing |
|---|---|---|
| ✅ | **Confirmed in the Singapore kitchen** — bought or logged since arriving | Use freely, no flag needed |
| ❓ | **Not confirmed.** Was UK standing stock, or is trivially available locally, but nobody has said it's here | Usable, but **flag it in the recipe** as "confirm you have this" |
| 🛒 | **Known absent** — needs buying | Flag as a shopping requirement |

Promote ❓ → ✅ as Holger confirms items; that's the working mechanism for refilling this file. Until the ✅ list is substantial, err toward flagging.

For salt-content calibration (relevant to salt budgeting in recipes), see the **Salt calibration** table in `TECHNIQUES.md`.

---

## ✅ Confirmed in Singapore

Short by design — this is only what there's actual evidence for.

### Umami / seasoning

- ✅ **Kombu Shiitake Dashi powder — Nature's Glory / Muso, *No Bonito*** (150 g or 1 kg; also 10 g × 10 sachets). Ingredients: oligosaccharide (tapioca, sweet potato), sea salt, yeast extract, shiitake mushroom powder 4.8%, kombu powder (*Laminaria japonica*) 0.2%. **✅ vegan.** ⚠ Nature's Glory sells a **Katsuo** version of the same product that contains bonito — check the tub says *No Bonito*. Per 100 g: **120 kcal, 2 g protein, 27.6 g carb (3 g sugars, fibre-folded), 1 g fat, salt 11.4 g** (sodium 4570 mg); iodine ~400 µg, an estimate from the 0.2% kombu. **Dose: 1 tsp (~3.5 g) per 150 ml → 0.40 g salt per bowl**, i.e. 0.27 g salt/100 ml — right in the band our well-received dishes sit in, so the label dose needs no adjustment (unlike the UK tsuyu, which was diluted hard). This is the **guaranteed-vegetarian dashi** that the old bottled tsuyu/dashi-soy always needed a label check for; it replaces both.
- ✅ **Tom yum paste — HollyFarms "Tom Yum Koong"** (227 g jar, barcode `8888260000235`, product of Thailand). **✅ Vegetarian** — lemongrass, galanga, soya bean oil, chilli, sugar, water, kaffir lime leaves, onion, salt, citric acid (E330), MSG. No shrimp paste, no fish sauce; the name is the dish, not the contents. Per 100 g: **333 kcal, ~0 g protein, 33.4 g carb, 23.3 g fat, salt ~15.7 g**. ⚠ Declared salt is higher than the ingredient order suggests — conservative upper bound, taste. ⚠⚠ **It scorches** (Holger, 2026-08-15). At **20 g sugars per 100 g** the sugar caramelises and burns before the aromatics have cooked out, so the bhuna-style "fry it hard until it darkens" cue used elsewhere in this project is **wrong for this jar**. Instead: more fat than usual (~5 g, worth breaking the ≤3 g rule for), **medium heat, 60–90 seconds**, stop when it smells cooked and the oil takes colour, and **wet it immediately**. Err early — the "fat visibly separates" cue arrives too late here. **No tamarind** (unlike the Mae Ploy vegan jar), umami is MSG rather than fermented soy, and it is saltier and fattier — see the swap comparison in the archived file before substituting one for the other in an old recipe.

### Dairy / milks

- ✅ **Soya milk — F&N NutriSoy "Fresh Soya Milk, No Sugar Added"** (946 ml chilled carton, barcode `8888200619442`, Nutri-Grade A, vegan). Ingredients: **non-GM soya beans, calcium carbonate, stabiliser, vitamin D3 (plant based), flavouring** — no added sugar, no added salt. Per 100 ml: **42 kcal, 4.32 g protein, 1.8 g carb (0.8 sugars), 2.0 g fat (0.4 sat), 0.12 g fibre, salt 0.08 g, calcium 200 mg, vitamin D 0.65 µg.** Atwater lands 42.7 vs 42 declared — clean label. **This is the fortified soya drink the pantry needed, and it is better than the one it replaces**: at **200 mg calcium/100 ml** it carries roughly double a typical fortified drink (the retired M&S carton was ~120 mg) and its **4.32 g protein/100 ml** beats it too. ⚠ **No B12** — the M&S carton had it, this doesn't, so dishes built on it lose that contribution entirely. ⚠ The **stabiliser is unnamed**; it helps against acid curdling but **does not repeal the rule** — soy protein still flocculates near pH 4.5, so add off heat and never boil after. ⚠ Note the carton is **946 ml, not 1 litre** — recipes written for a round litre are ~5% short. Used in `recipes/soups/tom-yum-broccoli-carrot-chickpea-soup.md`.
  - **The "Omega" variant declares 145 mg ALA per 100 ml** (2026-10-04). ⚠ **Probably not fortification.** Soybean oil is 7–8% ALA and the carton carries 2.0 g fat per 100 ml, which accounts for 140–160 mg on its own — the declared 145 sits inside that window with nothing left over. The **plain** carton has the same 2.0 g fat, so it likely carries similar ALA undeclared. Compare the two fat figures before paying a premium for the Omega one. ⚠ **It does not close the omega-3 gap either way**: a 250 ml glass is 0.36 g against a ~1.6 g/day adequate intake, so the whole 946 ml carton is still less than a single tablespoon of ground flax (2.2 g). ⚠ **`tools/js` cannot store this** — `lib/nutrients.js` carries only total saturated/mono/poly fat, with no ALA, LA, EPA or DHA field, so any omega figure read off a label has to live here in prose rather than in the map.

### Sweet / spreads

- ✅ **Kaya (coconut jam) — Killiney "Singapore Kaya"** (barcode `8885004910843`, product of Singapore). Ingredients: **sugar, eggs, coconut milk, modified starch (E1442), pandan leaves extract** — no artificial sweetener, no chemical preservatives. ⚠ **Contains egg — vegetarian, not vegan.** ⚠ **Refrigerate after opening.** Per 100 g: **287 kcal, 4 g protein, 52.7 g carb (50.7 g sugars), 6.7 g fat (4.7 saturated), 0.7 g fibre, salt 0.12 g, cholesterol 101 mg.** Atwater lands 288 vs 287 declared — clean label, and the carb figure is already total (no fibre fold). **Label serving is 15 g = 43 kcal**, which is a realistic scrape on toast. Micros are a committed estimate from the reconstructed composition (~45% sugar, ~30% egg, ~20% coconut milk), which independently reproduces the declared protein, fat and cholesterol to within 5%. **Half of this jar by weight is sugar** — treat it as a condiment in gram quantities, not a spread applied by eye.

### Fats / liquids

- ✅ **Coconut cream — Ayam Brand "Pure Coconut Cream", 270 ml can.** Ingredients: **coconut kernel extract (100%)** — no gum, no emulsifier, no additives, vegan. Per 100 ml: **285 kcal, 3.1 g protein, 4.0 g carb (3.9 sugars), 28.5 g fat (25.5 saturated), sodium 19 mg.** Label is internally clean — Atwater lands on 285 exactly, so nothing needed reconstructing. **Two consequences of the missing gums, both practical.** It *separates in the can*, so the thick top layer can be cracked and used to fry a curry paste — the classic Thai method, and enough to replace added oil in a dish entirely. And it *splits more readily under hard heat* than a stabilised light coconut milk, so it must not boil. ⚠ This is **cream, not milk** — at 28.5% fat it is roughly **three times** the fat of the retired Biona Light 9% reference, so it is not a drop-in for recipes calibrated against that. Used in `recipes/soups/tom-yum-broccoli-carrot-chickpea-soup.md`.

### Grains

- ✅ **Black rice — Nature's Glory "Organic Black Wild Rice"** (1 kg, barcode `8888536273103`, product of Thailand, certified organic, non-GMO). ⚠ **The printed panel's macro rows are simply wrong.** It states, explicitly per 100 g: 363 kcal, carbohydrate 43.8 g, protein 4 g, fat 1.3 g — which Atwaters to **203 kcal, a 44% shortfall**. ⚠ **Corrected 2026-08-11 from a photo of the actual bag:** the label says *(100g)* for the whole block, so the earlier "macros are per ~55 g serving" reading was wrong even though its numbers were close by accident. The macro rows are understated by a factor of **1.79**; scaling them to meet the declared calories gives **78.4 g carb, 7.2 g protein, 2.3 g fat**, which Atwaters to 363.1 against 363 declared and sits close to literature black rice (~75 g carb, ~8.5 g protein, ~3.2 g fat). Fibre is not declared at all — use **~4.9 g/100 g**. **The micro rows appear correct as printed** and are used unscaled: calcium 13.1 mg, iron 2.0 mg, phosphorus 137.6 mg, B1 0.27 mg, B2 0.03 mg, B3 1.46 mg, vitamin E 0.24 mg. So it is the macro rows specifically that are in error, not the whole panel. Label cooking notes: wash 2–3×; 1 cup rice : 1.5 cups water; **pressure cook 45 min**, or soak overnight for a shorter cook.
- ✅ **Pearl barley** (bought 2026-08-11, brand not recorded). USDA `170284`: 352 kcal, 9.9 g protein, 77.7 g carb, 15.6 g fibre, 1.2 g fat per 100 g dry. **Not interchangeable with the hulled barley or the oshimugi below** — pearl barley is the whole pearled grain and needs **19–22 min HP for pilaf, ~30 min for porridge**; oshimugi is steamed and rolled flat and cooks in a fraction of that. Barley's **3–8% beta-glucan** is higher than oats and is what makes it go creamy without cream; it also means it keeps thickening as it cools. Porridge: **40 min Low, natural release, 1 : 6 with UHT milk**, single load, loosened at the bowl with hot water if needed — see `TECHNIQUES.md` → overnight holds, which covers both the food-safety arithmetic and how to keep bite in it.
- ✅ **Hulled (pot) barley — Karthika "Barley Seed"** (250 g, barcode `8906152232752`, product of India, from Little India). **This is the whole grain with only the inedible hull removed — bran and germ intact**, and it is the third barley product in this kitchen; do not conflate the three. Identified by direct comparison against a bag of Pasar pearl barley: the Karthika grains are visibly **tan, slimmer and pointed** where pearl barley is chalky white, plump and abraded smooth all over. No nutrition panel on the pack; valued at USDA `170283`: **354 kcal, 12.5 g protein, 73.5 g carb, 17.3 g fibre, 2.3 g fat** per 100 g dry. Against pearl barley that is **+26% protein and +11% fibre**.
  **This is the porridge fix.** The intact bran is what holds chew through a 40-min cycle *and* an 8-hour hold, which pearled grain structurally cannot do. ⚠ **But it must be soaked** — Nussinow gives hulled barley at 25–35 min HP *soaked*, which is ~38–53 min at Low; unsoaked it is well beyond the 40-min cycle, since 40 min at Low is only ~27 min HP-equivalent. **Soak during the DAY** — inner vessel loaded with barley + UHT milk in the morning, fridge all day — **then the standard 40 min Low in the evening.** ⚠ Not an overnight soak: the overnight is the sterilised hold. Safety is unaffected either way — 40 min already delivers ~90 log reductions, and longer only adds margin (`TECHNIQUES.md`).
- ✅ **Oshimugi (pressed barley) — Mugibijin**, 50 g sachets. Note the pack size: it drives the congee ratios (150 g black rice : 50 g barley : 800 g milk, pot-in-pot).

---

## ❓ Not confirmed — flag before relying on

These were UK standing stock and/or are trivially available in Singapore, but **nobody has confirmed they're in this kitchen.** Treat every one as a question until it's been answered.

### Umami / fermented

- ❓ **White miso (shiro)** — the family default (not red). ~6% salt. Widely available; Japanese brands are cheaper here than in the UK.
- ❓ **Red miso (aka)** — adult-palate only; ~13% salt.
- ✅ **Vegetarian oyster sauce — Lee Kum Kee 素食蠔油** (510 g, barcode `078895152258`, Hong Kong). Mushroom-based, **✅ vegetarian**. Per 100 g: **176 kcal, 1.8 g protein, 0.0 g fat, 42.1 g carb (29.7 g sugars), 0.6 g fibre, sodium 2920 mg = 7.30 g salt.** Atwater lands 175.6 against 176 — clean label, carbs already total. **Label serving is 18 g (1 tbsp) = 32 kcal and 1.32 g salt.** ⚠ **Read it as a sweet sauce, not just a savoury one** — 30% of its weight is sugar, which is why it glazes and clings. ⚠ Per gram it is *less* than half as salty as light soy (~15–18 g/100 g), but a tablespoon is a bigger dose than a splash of soy, so the salt per use is comparable. **Zero fat**, which makes it the right thickener-and-umami move for a low-fat gravy where soy sauce alone would need starch adding anyway — it brings sugar, body and glutamate in one bottle. ⚠ Keep refrigerated after opening.
- ❓ **Liquid aminos** — ~3 g salt per 30 ml. Standing rule: out of aminos → **soy sauce stands in**. Light soy sauce is universal here and the obvious permanent replacement.
- ✅ **Nutritional yeast** (confirmed 2026-10-01) — the salt-free glutamate lever, and essentially the only one now that kombu is out of stock. ⚠ **It is weaker than kombu per gram, not equivalent.** Free glutamate in inactive yeast flakes runs roughly 0.5–1.5 g/100 g (most of the glutamic acid is protein-bound) against dried kombu's 1.2–3.4 g/100 g, so replacing 60 g of kombu would take well over 100 g of flakes — far past the point where the cheesy/bready aroma takes over. Treat it as **a few grams of savoury roundness at zero salt cost**, not as a kombu substitute. Best placed in dishes that want a brothy/meaty register (it is what commercial vegetarian stock cubes are built on); keep it out of málà, Thai and other aromatic-led bases where the cheesy note fights the spices. ⚠ Read the tub — plain flakes are near salt-free, but seasoned versions exist. Many brands are **B12-fortified**, which would restore the contribution lost when the M&S carton was replaced by NutriSoy.
- ❓ **Shiitake powder** (guanylate; the salt-free seasoning lever) · ❓ **Hon-mirin** (real fermented, not aji-mirin).
- 🛒 **Kombu** (dried kelp) — **absent, confirmed 2026-10-01.** The dashi powder covers stock duty but *not* kombu's distinguishing property: kombu is the only **salt-free** glutamate source in this kitchen's repertoire, where every remaining one (taucheo, doubanjiang, miso, the powder's yeast extract) arrives with salt attached. Its absence tightens the salt budget on any from-scratch stock. Worth re-buying for that reason alone.

### Acid

- ❓ **Limes** — the at-table acid, kept off the main pot for Lara. Cheap and everywhere here.
- ❓ **Tamarind** — ran out before the move. **Singapore is the easy place to fix this**: wet-market tamarind pulp and Thai/Indian paste are both cheap and better than the UK jar.
- ❓ **Rice vinegar.**

### Spices and pastes

- ❓ Mild curry powder (the organic no-chilli/no-paprika one — most scorch-forgiving under dry heat; label data in the archive) · ❓ tikka masala / Madras · ❓ **smoked paprika** ⚠ Lara flag, stays flagged · ❓ sweet paprika · ❓ ras el hanout · ❓ harissa powder · ❓ shichimi · ❓ za'atar · ❓ sumac · ❓ gochujang · ❓ Mae Ploy yellow (~10% salt) and green curry paste.
- ✅ Whole: **cumin**, **fennel** (both confirmed 2026-10-02). ❓ Whole: black/brown mustard, coriander seeds, bird's-eye chillies. ❓ Ground: turmeric, ginger, coriander, cinnamon.
- ✅ **Cloves** (bought 2026-10-03). ⚠ The most overdosable spice in the cupboard — eugenol dominates a dish irreversibly and is perceptible far below the level most recipes imply. Two or three whole cloves season a whole pot; a teaspoon ruins one.
- 🛒 **Star anise · cassia** — still absent as of 2026-10-03, and between them the last thing standing between this kitchen and real five-spice. Both also sit in the hotpot base's whole-spice line, so one trip closes two gaps.
- ✅ **Thai green curry paste — The SOS Kitchen** (225 g jar, made in Singapore). **✅ Vegetarian-friendly, stated on the jar.** Ingredients w/w: **green chilli 24%**, lemongrass 19%, shallots 19%, garlic 9%, canola oil 8%, seasoning (soy) 6%, lime juice 3%, miso (soy) 3%, galangal 2%, Thai basil 2%, coriander 2%, dry spices 1.5%, lime leaves 1%, salt 0.5%. Per 100 g: **170 kcal, 3.5 g protein, 11.5 g fat (1.0 saturated), 16.5 g carb (3.5 sugars, 1.5 fibre), sodium 660 mg = 1.65 g salt.**
  - ⚠⚠ **The front says "Mild Curry Base". The back says 24% green chilli and prints three chilli symbols.** Believe the ingredient list and the chilli scale, not the front panel — this is the same shape of error as the kimchi jar, where the English said paprika and the Chinese said 辣椒粉.
  - ⚠ **It is almost certainly hotter per gram than the SOS yellow**, whose 180 g in a 4.4 kg pot was disqualifying (2026-09-24). The yellow jar does not publish its chilli percentage, so the ratio is unknown — but yellow pastes are turmeric-led and green pastes are chilli-led, and 24% is a quarter of the jar. **Dose it below the yellow, not alongside it**, until there is a cooked datapoint.
  - ✅ **It solves the citrus problem.** At **19% lemongrass and 1% lime leaves** this is the only thing in the kitchen carrying that top note since the lemongrass paste ran out and FairPrice had neither fresh stalks nor makrut leaves. The 2026-10-06 corn soup went without it.
  - ⚠ **The panel does not reconcile and the jar says why.** Atwater lands 183.5 against 170 declared. The label's own footnote states the figures are *"based on ingredients that specify value for this nutrient and 0 for those that don't"* — so it is computed from an incomplete database, not measured. Treat the macros as indicative rather than exact.
  - ⚠ Barcode not captured — the photo cuts off the leading digits. ⚠ **Refrigerate after opening, use within 30 days.**
- ✅ **Vegetarian hotpot broth — 石二鍋 (Shi Er Guo) "鮮菇百味 蔬食鍋", Vegetarian Mushroom Hot Pot Broth** (750 g retort pouch, Taiwan, imported by Chung Hwa Food Industries Singapore). **The confirmed vegetarian base** that the warning below says to go looking for — a 菌汤 mushroom type, exactly as predicted. Ingredients: water, vegetable broth (mushroom stem, cabbage, carrot), kelp seasoning liquid, maltodextrin, yeast extract, hydrolysed soy protein, MSG, sodium 5′-inosinate, sodium 5′-guanylate, caramel colour, sesame and soybean oil, **red dates and wolfberry**. No meat, fish or bonito. Per 100 g of concentrate: **32.6 kcal, 0.8 g protein, 1.4 g fat (0.2 sat), 4.2 g carb, sodium 701 mg = 1.75 g salt**; Atwater lands exactly 32.6, a clean label. **The pouch holds 13.1 g of salt.**
  - ⚠⚠ **Ignore the pack's dilution.** It says add 400 cc of water, which lands at **1.14 g salt/100 ml** — nearly four times the band this kitchen cooks in, and 3.5× the Haorenjia mala pack. **Half the pouch in ~1425 ml gives 0.36 g/100 ml** and fills one side of the yuanyang pot. Refrigerate the rest and use within days; retort pouch, no preservatives.
  - **It carries the full umami trio**, which is worth knowing: glutamate (MSG, kelp, yeast extract, hydrolysed soy), guanylate, **and inosinate**. Inosinate is the animal nucleotide by origin but is produced commercially by bacterial fermentation — so a vegetarian broth *can* reach the complete glutamate × inosinate × guanylate synergy, which a kitchen building from kombu and shiitake alone cannot. ⚠ `TECHNIQUES.md` describes inosinate as unavailable to this kitchen; that is true of whole foods, not of fermented additives.
  - ⚠ **Serving lines are transposed** — it reads "serving per package 100 g / serving size 7.5 servings" when it is 7.5 servings of 100 g. Third label in this project with that error, after the kimchi jar.
- 🚫 **Other ready-made hotpot soup bases — assume meat until the 配料表 proves otherwise.** ⚠ **Haorenjia Tomato Hot Pot Soup Base** (200 g, barcode `6920143509663`, China, distributed by Grace Cross Singapore) is **not vegetarian**: chicken essence seasoning, chicken bone extract, beef compound seasoning and 老母鸡 (old-hen) seasoning, four separate animal ingredients, plus egg and milk in the allergen line. Checked 2026-10-05, not used. **The pattern is predictable by base type:** 麻辣 bases are usually built on 牛油, beef tallow, because that is the product; **番茄 (tomato) bases very often carry chicken**, since the acidity wants a savoury counterweight and chicken extract is the cheap one; **菌汤 (mushroom) bases are the reliable vegetarian option**. Look for **素** or **全素** on the front, then still read 配料表 for 鸡 / 牛 / 鱼 / 骨 / 猪. ✅ One point in this pack's favour: its Chinese and English lists **agree** — no repeat of the kimchi jar, where the English said paprika and the Chinese said 辣椒粉.
- ✅ **Sichuan peppercorn** · ✅ **Dried red chillies** (confirmed 2026-10-01, for the hotpot base). ⚠ Neither has been pinned down further: red vs green peppercorn changes the dose by nearly half (green is sharply more numbing), and the chillies' variety and heat are unknown. Worth a photo next time either is opened.
- **Sourcing note:** most of this is *cheaper and fresher* in Singapore than it was in the UK — Little India (Tekka, Mustafa) for the Indian and Middle Eastern end, any supermarket for the Thai pastes. The exceptions are the European/Levantine items (za'atar, sumac, ras el hanout, smoked paprika), which are speciality imports here and cost more than they did.

### Aromatics — **this section inverts**

The UK list carried lemongrass paste, galangal paste and dried ginger *because the fresh forms required a special trip*. That constraint is gone.

- 🛒→✅ **Fresh lemongrass, galangal, turmeric, ginger, makrut lime leaves, pandan** are wet-market/supermarket staples here, cheap and fresh.
- **Design consequence:** stop reaching for pastes by default. Where an old recipe says "lemongrass paste" or "galangal paste," a fresh substitute is now the better call, not the aspirational one. Conversion needs establishing per aromatic — treat the first few as calibration cooks and record the ratio in `TECHNIQUES.md`.
- ❓ **Dried ginger powder** is still worth stocking for the shakshuka line (the fresh-equivalent conversion is in `TECHNIQUES.md`) — it's a different ingredient, not a compromise.

### Pulses and grains

- ❓ Dried legumes — black-eyed beans, butter beans, chickpeas, lentils, soybeans, pinto (pinto purée as fat-free body for soups). Unsoaked: 20–25 min HP, natural release.
- ❓ Tinned beans (kidney, butter, chickpea) for shortcut variants.
- ❓ Rice — long-grain default. ❓ Amaranth · ❓ kasha.
- 🛒 **Israeli couscous** and the **3 Glocken alphabet noodles** were UK/European buys; assume gone until replaced. The alphabet noodles in particular were a kid-specific item worth finding an equivalent for.
- ✅ **Sweet potato hotpot noodles — 筷手小厨 (Kuai Shou Xiao Chu) 火锅苕皮, "Sweet Potato Noodles"** (200 g pack, barcode `6975742470654`, Yihai International, made in Tianjin). Wide translucent **sheets** (苕皮), not threads — the English name is loose. Ingredients: sweet potato starch (53%), water, salt, natural flavouring. Per 100 g: **203 kcal, 0 g protein, 0 g fat, 49.9 g carb (2.4 g sugars), sodium 47 mg**. Vegetarian. Atwater lands 199.6 against 203 declared, which is rounding. **Pack total: 406 kcal, 100 g carbohydrate, 0.24 g salt.**
  - **These are pre-hydrated, not dry.** 53% starch against 47% water, so 203 kcal/100 g rather than the ~350 of a dry starch noodle. ⚠ **There is no dry-to-cooked ratio to apply** — log the pack weight. They take up some broth in the pot but nothing like a dried noodle.
  - ⚠ **The panel contradicts itself on sodium.** Serving size is 100 g and every other row is identical across the two columns, but sodium reads **47.0 mg per serving against 11.0 mg per 100 g**. One is a typo and the label gives no way to tell which. The map entry carries **47.0**, the higher figure, so sodium is not understated. The whole pack is 0.24 g salt either way against 0.06 g, which is below the noise floor of any meal it appears in.
  - Cooks in **5–8 min** in the pot. Pack also suggests stir-fry and a boiled-then-dressed cold salad.
  - Micros are **scaled from USDA cornstarch (169698)** by the carbohydrate ratio 49.9/91.27 — a purified starch carries almost nothing, and the result is 1–7 mg of each mineral per 100 g. Method flagged in the map as `label+est-micros`. Vitamins are omitted rather than written as zeros, to keep the endpoint URL short.

### Protein

- ❓ **Silken tofu** — Lara rule: blend smooth, never serve recognisable pieces. Cheaper and better here; the supermarket silken tofu is a different quality tier from Mori-Nu cartons.
- ❓ Firm tofu · ❓ skim cottage cheese (⚠ likely harder to get and pricier here than in the UK — an import item, not a staple).
- **Eggs — two a day. Buy on welfare, not on omega-3.** `Chew's Cage-Free Eggs` is the only Certified Humane line produced in Singapore (cage-free aviary barns since 2014, upgraded 2021).
  - ⚠ **The DHA egg and the cage-free egg are not the same carton, and this was briefly recommended here as if they were.** `Chew's Omega 3` (FairPrice 495350, ~$4.30/10) declares a real **EPA + DHA 100 mg per 50 g egg** against 300 mg total omega-3 — two a day would be ~200 mg/day, about 80% of the 250 mg adequate intake. But it belongs to the **"Designer Eggs"** range, which carries **no cage-free claim**; Chew's cage-free flock supplies a different SKU. The same split appears at the premium end: Little Farms stocks **Barossa Free Range** and **Barossa Omega3** as separate products, the Omega3 one claiming no housing standard, at **$1.29/egg against $0.43**. No cage-free-plus-DHA egg was found on sale here, and two unrelated producers splitting the same way suggests it is structural rather than a gap in the search.
  - **Resolution: decouple them.** The egg route's only advantage over algae oil was being food rather than a supplement, and that advantage is not worth a welfare cost for a molecule that is identical — hens and fish are both intermediaries, algae is the source. So eggs are bought cage-free, and EPA/DHA comes from algae oil, which has no welfare dimension at all. **Supplementation is Jenaed's call, not this file's.**
  - ⚠ **The test that still matters, for any future egg:** read the **EPA/DHA line**, never the "omega-3" claim on the front. Most omega-3 eggs come from **flax-fed** hens and carry their omega-3 almost entirely as ALA, with ~0 long-chain — useless here, since ALA converts poorly and converts worse in men. Chew's Omega 3 declaring a third of its omega-3 as EPA+DHA is what showed genuine marine or algal feed. ⚠ **Seng Choon "Farm 3" makes the same marketing claim but publishes no per-egg figure**, so it cannot be verified either way.
  - ⚠ Long-chain PUFAs oxidise under prolonged high heat — shakshuka's gentle poach is ideal, hard frying less so.

### Fats

- ❓ **Avocado oil** — was the default general-purpose oil. ⚠ **Expect this to be an expensive import here.** Standing rule that survives regardless of which oil: **≤3 g per dish** (limited-fat approach) — default to 3 g, never a tablespoon. If avocado oil is unreasonable, a neutral high-smoke-point local oil (rice bran, groundnut) takes the same role at the same dose; record whichever becomes the default.
- ❓ Mild olive oil (import, pricier) · ❓ sesame oil (cheap here) · ❓ tahini (~55% fat, gram quantities only; seizes in hot acid — slake first).
- ❓ **Coconut *milk*** — the 9%-fat reference was Biona Organic Light, a UK organic brand, and **several recipes are calibrated against that 9%**. The Ayam **cream** now stocked (see ✅ above) is 28.5% and does *not* substitute for it. **Still needs a local light/regular coconut milk recorded with its fat %.** Ayam make one in the same 270 ml can format, which would be the obvious thing to check first.

### Dairy / milks

- 🛒 **Milk default needs re-setting.** The old default was UK semi-skimmed at milk.co.uk values (47 kcal, 3.6 g protein, 1.8 g fat, 124 mg calcium per 100 ml). That resolution is dead — most fresh milk here is imported (Australia/Malaysia) and the panels differ. **Until a local carton is recorded, don't silently resolve a bare "milk" — ask.**
- ✅ **Fortified soya drink: solved** — F&N NutriSoy, recorded above. Better on calcium and protein than the M&S carton it replaces, worse on B12 (it has none). The warning that prompted the search still holds for *other* brands: most Asian-market soya milk is unfortified and sweetened, so read the panel rather than assuming.

### Vegetables — **the substitution that matters**

- 🛒 **Spinach → Chinese spinach (bayam / 苋菜)** for the morning shakshuka. Closest drop-in: soft leaves that wilt identically, cheapest, most local. **Kangkong** is the more emblematically Singaporean option. **Bok choy is a structural mismatch** — the stems don't wilt, so you get crisp white ribs in a soft streaked-egg dish; workable only leaves-only, or with stems sliced thin and added early.
  - ⚠ **Folate drops ~100 µg** with any of these swaps — spinach's 194 µg was about two-thirds of the shakshuka's total. Worth compensating elsewhere.
  - ✅ **Calcium improves.** Bok choy and most local greens are **low-oxalate**, so their calcium is largely absorbable, unlike spinach's oxalate-bound 99 mg. Relevant to the bone-health flag.
- ❓ Onions, garlic, the standing fresh-vegetable base — assume available, price differs (Western roots and brassicas are imports; Asian greens, gourds and roots are local and cheap).

### Specialised

- ❓ Defatted peanut flour (West African corn soup thickener) · ❓ goji berries · ❓ cacao nibs + chia (Post-Workout Cream) · ❓ Medjool dates · ❓ stock cubes (~2.5 g salt each — largely superseded by the dashi powder).
- 🛒 **BWFO seitan flour (vital wheat gluten)** — the large UK stock is gone. Available here but not a supermarket item.

---

## Sourcing in Singapore

Replaces the UK's Buy Whole Foods Online / M&S / Ocado stack. `BWFO_GRAPHQL.md` still describes a working API but is no longer Holger's shop — treat its product data as historical reference.

| Source | Best for | Notes |
|---|---|---|
| **NTUC FairPrice** | Everyday staples, house-brand basics | Densest coverage; house brands are the price floor for pantry basics |
| **Nature's Glory** ([natures-glory.com](https://www.natures-glory.com/)) | Organic grains, pulses, Japanese/macrobiotic imports, dashi, miso | Bulk sizes (1 kg dashi, 500 g kombu) at a real per-kg discount; the black rice, oshimugi and dashi came from here |
| **Sheng Siong** | Fresh produce, Asian staples | Usually cheaper than FairPrice on produce |
| **Wet market** | Fresh aromatics, greens, tofu, tamarind pulp | Where the lemongrass/galangal/makrut economics change completely vs the UK |
| **Mustafa / Tekka (Little India)** | Whole and ground spices, pulses, tamarind, Indian and Middle Eastern items | Bulk spice pricing far below UK supermarket |
| **Zenxin** | Organic vegetables, bulk | Compared against Nature's Glory earlier — different catalogues; Zenxin is produce-led, Nature's Glory dry-goods-led |

**What got cheaper:** aromatics, Asian greens, tofu, coconut milk, rice, spices, sesame oil, Japanese imports.
**What got dearer:** dairy, avocado oil, olive oil, cottage cheese, berries, Western brassicas and roots, European/Levantine spices.

---

## Open items

1. **Confirm the ❓ list.** The fastest path is Holger walking the shelves once; everything above then flips to ✅ or 🛒.
2. **Record a local milk** (panel + barcode). ~~Fortified soya drink~~ — done, NutriSoy. Plain dairy "milk" still resolves to nothing.
3. **Record a local light coconut *milk*** and its fat %, against the 9% reference several recipes assume. *(The Ayam **cream** is recorded, but at 28.5% it doesn't fill this slot.)*
4. **Decide the default cooking oil** if avocado oil is priced out; the ≤3 g rule holds either way.
5. **Calibrate fresh-vs-paste aromatic ratios** (lemongrass, galangal) and write them into `TECHNIQUES.md`.
