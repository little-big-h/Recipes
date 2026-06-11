# Ingredient → FoodNoms ID map

Name → `foodID` for ingredients already used in the project's recipe
`.foodnoms` files (`examples/`, `collectionType 3`). This is the **primary
resolution source** for the recipe-nutrition generator
(`RECIPE_NUTRITION_GENERATOR.md`): match a recipe ingredient here first to reuse
Holger's own curated record; fall back to a fresh USDA lookup
(`USDA_FDC.md` / `tools/fdc-lookup.wl`) only when an ingredient is absent.

`kcal/100` is per 100 g (or 100 ml for `ml` units), **normalised** from each
entry's stored `baseAmount`. Full per-100 nutrients for every row are in
[`../tools/ingredient-map.json`](../tools/ingredient-map.json) (keyed by `foodID`).

> **Monitoring.** USDA-sourced rows link their **`usda`** tag to the live
> [FoodData Central](https://fdc.nal.usda.gov/) page for that `fdcId` — a one-click
> spot-check on whether USDA has revised the underlying numbers. (`ciqual` /
> `local` / `openai` / `label` records have no FDC page.)

> Note the `serving`-unit rows (e.g. the openai 'Ground Cumin'/'Garlic Powder',
> 'Spring Onion') store nutrients per *serving*, not per 100 g — prefer a
> gram-based record (or a USDA fallback) when you need a per-gram basis.

> **Breakfast passata.** For breakfast / shakshuka recipes, resolve "passata" to
> **`Organic Chopped Tomatoes (Tinned)` (`local:0B0EBB36-4389-4601-BFF1-AD27B2DFD124`)**
> — Holger's actual tin, from its label: **19 kcal/100 g, salt 0.1 g (sodium
> 40 mg), carbs 3 g, sugars 3 g, fibre 0.9 g, protein 1.1 g**. Micros (potassium,
> calcium, iron, magnesium, folate…) are **estimated by scaling USDA crushed
> tomato `170501` by the energy-density ratio (19/32 ≈ 0.59)** — the label carries
> none and this chopped tin is more dilute than USDA crushed. This is a
> **committed estimate**, not pending verification: FoodNoms has no micro path, so
> it stands as final. Supersedes the earlier `foodnoms:usda:170501` approximation.

> **Milk.** Resolve a plain "milk" to **semi-skimmed**, **milk.co.uk** values
> (`Milk (Semi-Skimmed)`, `local:24C74E7A-6DD7-4CB8-821D-DB3BDCF9CB0D`): 47 kcal,
> 3.6 g protein, 1.8 g fat, 124 mg calcium per 100 ml. Holger's standard — use it
> whenever a recipe just says "milk" unless it specifies whole/skimmed.

| Ingredient | foodID | Unit | kcal/100 | Source |
|:-----------|:-------|:----:|--------:|:-------|
| Ancho Chile (Dried) | `foodnoms:usda:169396` | gram | 281.0 | [usda](https://fdc.nal.usda.gov/food-details/169396/nutrients) |
| Asparagus | `foodnoms:usda:2709767` | gram | 20.0 | [usda](https://fdc.nal.usda.gov/food-details/2709767/nutrients) |
| Biona Light Coconut Milk | `local:2FD209A7-4292-467D-BE37-E9E704F325F0` | gram | 90.0 | local |
| Black Bean | `foodnoms:usda:2707359` | gram | 181.0 | [usda](https://fdc.nal.usda.gov/food-details/2707359/nutrients) |
| Black Sesame Seeds | `foodnoms:openai:5177cfb0-eca3-4468-94f5-98589ed8dd1f` | gram | 580.0 | fn |
| Bok Choi | `local:7A94FF9B-E956-4FDA-B07E-5F139C778EBB` | gram | 13.0 | local |
| Bok Choy (Raw) | `foodnoms:usda:2685572` | gram | 20.259 | [usda](https://fdc.nal.usda.gov/food-details/2685572/nutrients) |
| Broccoli | `foodnoms:usda:2709643` | gram | 39.0 | [usda](https://fdc.nal.usda.gov/food-details/2709643/nutrients) |
| Butternut Squash (Raw) | `foodnoms:usda:2685570` | gram | 48.1323 | [usda](https://fdc.nal.usda.gov/food-details/2685570/nutrients) |
| Cabbage | `foodnoms:usda:2709775` | gram | 34.0 | [usda](https://fdc.nal.usda.gov/food-details/2709775/nutrients) |
| Capers (Canned) | `foodnoms:usda:172238` | gram | 23.0 | [usda](https://fdc.nal.usda.gov/food-details/172238/nutrients) |
| Carrot | `foodnoms:usda:2709660` | gram | 44.0 | [usda](https://fdc.nal.usda.gov/food-details/2709660/nutrients) |
| Cauliflower | `foodnoms:usda:2709777` | gram | 25.0 | [usda](https://fdc.nal.usda.gov/food-details/2709777/nutrients) |
| Chickpea (Dry) | `foodnoms:usda:2644282` | gram | 382.998 | [usda](https://fdc.nal.usda.gov/food-details/2644282/nutrients) |
| Cinnamon (Ground) | `foodnoms:usda:171320` | gram | 247.0 | [usda](https://fdc.nal.usda.gov/food-details/171320/nutrients) |
| Cirio Canned Tomatoes | `local:5202374B-110E-4719-8237-CBB28AA7BC97` | gram | 25.0 | local |
| Corn (Frozen, Cooked, No Added Fat) | `foodnoms:usda:2709911` | gram | 81.0 | [usda](https://fdc.nal.usda.gov/food-details/2709911/nutrients) |
| Creamy Oat Organic | `foodnoms:fn:9fc7c5bc-930b-4ed9-8e93-3bbb8227ff77` | milliliter | 146.0 | fn |
| Cumin Seeds | `foodnoms:openai:e276b2c8-e28b-4bd5-939c-95d42714ab92` | gram | 375.0 | fn |
| Dashi-Soy Sauce (Emma Basic) | `local:0159CF00-07C8-45B4-9844-6C34731320D9` | milliliter | 50.0 | local |
| Dried Coriander | `foodnoms:openai:31a17dc5-eacb-4320-956b-8f8579f13e1c` | gram | 300.0 | fn |
| Dried Ginger Powder | `foodnoms:usda:170926` | gram | 335.0 | [usda](https://fdc.nal.usda.gov/food-details/170926/nutrients) |
| Dry Soybeans | `foodnoms:usda:174270` | gram | 446.0 | [usda](https://fdc.nal.usda.gov/food-details/174270/nutrients) |
| Egg, whole, raw, fresh | `foodnoms:usda:171287` | gram | 143.0 | [usda](https://fdc.nal.usda.gov/food-details/171287/nutrients) |
| Eggplant / Aubergine (Raw) | `foodnoms:usda:169228` | gram | 25.0 | [usda](https://fdc.nal.usda.gov/food-details/169228/nutrients) |
| Frozen Corn | `local:4EFFC781-4E3D-4F60-8738-7B2D15D65F51` | gram | 88.0 | local |
| Garlic (Raw) | `foodnoms:usda:2709786` | gram | 143.0 | [usda](https://fdc.nal.usda.gov/food-details/2709786/nutrients) |
| Garlic Powder | `foodnoms:openai:c12d3878-957a-4223-9800-cbe0fb4e5e2c` | serving | 1800.0 | fn |
| Ginger Root (Raw) | `foodnoms:usda:169231` | gram | 80.0 | [usda](https://fdc.nal.usda.gov/food-details/169231/nutrients) |
| Goji Berries, Dried | `foodnoms:openai:75acc603-2922-45a0-8f77-75b549022191` | gram | 346.6667 | fn |
| Green Curry Paste | `foodnoms:fn:a05efb9a-50d4-43c2-9338-17b8ff67a92a` | gram | 68.0 | fn |
| Ground Cumin | `foodnoms:openai:1a2ce535-7207-4a5d-bd3a-6be2f1dc84bd` | serving | 2600.0 | fn |
| Harissa Spice Mix | `local:A2A80202-62A6-4F50-9DF6-5265FFFEFE69` | gram | 259.0 | label (19.59 g salt/100 g) |
| Hon-Mirin | `local:DC95FB78-1ED4-44FC-AFF6-71C2C8CC0EBA` | milliliter | 189.0 | label (Clearspring Mikawa) |
| Kecap Manis (Chi Wan) | `local:8A7FF9A0-FFAF-4E89-905F-1983CEDDB5E9` | milliliter | 122.0 | label (Chi Wan) |
| Kidney Beans | `foodnoms:usda:2707379` | gram | 177.0 | [usda](https://fdc.nal.usda.gov/food-details/2707379/nutrients) |
| Kombu (removed before cooking) | `local:C64E654B-E028-4547-B160-C1559BE0D34E` | gram | 15.0 | local |
| Lemon Juice (Raw) | `foodnoms:usda:167747` | gram | 22.0 | [usda](https://fdc.nal.usda.gov/food-details/167747/nutrients) |
| Lemongrass Paste | `foodnoms:fn:12201ed0-e2ef-4495-884f-0e5016e3630a` | gram | 47.0 | fn |
| Lima Bean (From Canned) | `foodnoms:usda:2709850` | gram | 122.0 | [usda](https://fdc.nal.usda.gov/food-details/2709850/nutrients) |
| Milk (Semi-Skimmed) — **default for "milk"** | `local:24C74E7A-6DD7-4CB8-821D-DB3BDCF9CB0D` | milliliter | 47.0 | milk.co.uk |
| Miso | `foodnoms:usda:2707439` | gram | 198.0 | [usda](https://fdc.nal.usda.gov/food-details/2707439/nutrients) |
| MORI-NU (Tofu, Silken, Firm) | `foodnoms:usda:172461` | gram | 62.0 | [usda](https://fdc.nal.usda.gov/food-details/172461/nutrients) |
| Mung Bean Sprouts | `foodnoms:usda:169957` | gram | 30.0 | [usda](https://fdc.nal.usda.gov/food-details/169957/nutrients) |
| Mustard Seeds (Ground) | `foodnoms:usda:170929` | gram | 508.0 | [usda](https://fdc.nal.usda.gov/food-details/170929/nutrients) |
| Nori Flakes (garnish) | `local:3514212A-FDC4-43BD-8C21-0A3AAF51F4F2` | serving | 200.0 | local |
| Nutritional Yeast Flakes | `local:A79EC48D-C9A5-43A9-9F24-C57821BECF60` | gram | 349.0 | local (Buy Whole Foods) |
| Nuts (Coconut Meat, Dried - Desiccated) (Not Sweetened) | `foodnoms:usda:170170` | gram | 660.0 | [usda](https://fdc.nal.usda.gov/food-details/170170/nutrients) |
| Oil (Avocado) | `foodnoms:46D6CFD7-5184-4C62-A572-0F04A6D25009` | gram | 884.0 | local |
| Onion | `foodnoms:usda:2709795` | gram | 38.0 | [usda](https://fdc.nal.usda.gov/food-details/2709795/nutrients) |
| Onions (Raw) | `local:15D34B6C-810A-4BBD-A684-61D1EF24B4E3` | gram | 40.0 | local |
| Organic Cacao Nibs (Raw) | `local:E57DAC40-A68B-4AB1-96D1-402DE270A396` | gram | 637.0 | label + est. micros |
| Organic Chopped Tomatoes (Tinned) — breakfast passata | `local:0B0EBB36-4389-4601-BFF1-AD27B2DFD124` | gram | 19.0 | label (macros) + usda micros |
| Organic Coconut Aminos Original | `local:2FDB7E98-F5BD-4A1A-BE20-7B9F178EC9A5` | milliliter | 84.0 | local (Biona Organic) |
| Paprika | `foodnoms:ciqual:11049` | gram | 318.0 | ciqual |
| Peanut Flour (Defatted) | `local:2E3428F1-76AC-4FD4-82A6-40F6BB4E58EC` | gram | 380.0 | label (Buy Whole Foods) |
| Pinto Bean | `foodnoms:usda:2707371` | gram | 191.0 | [usda](https://fdc.nal.usda.gov/food-details/2707371/nutrients) |
| Sesame Oil (at-table drizzle) | `local:A3FD9459-082A-44C6-A5A7-ABA3B8597FD2` | serving | 0.0 | local |
| Sesame Seeds (garnish) | `local:6C8317A7-F72D-4964-B711-B2E0A7CAF4B3` | serving | 5200.0 | local |
| Shiitake Mushroom | `foodnoms:usda:1999628` | gram | 44.095 | [usda](https://fdc.nal.usda.gov/food-details/1999628/nutrients) |
| Shiitake Mushroom Powder | `foodnoms:openai:6b16585d-3026-4f43-a844-f6af002e6615` | gram | 287.5 | fn |
| Shiitake Powder | `foodnoms:usda:168436` | gram | 296.0 | [usda](https://fdc.nal.usda.gov/food-details/168436/nutrients) |
| Skyr (Plain) | `local:EE24CBCF-4FAC-4898-AE05-A67B6710617F` | gram | 63.0 | local (estimate) |
| Soy Sauce | `foodnoms:usda:2707442` | gram | 53.0 | [usda](https://fdc.nal.usda.gov/food-details/2707442/nutrients) |
| Spinach | `foodnoms:usda:2709614` | gram | 27.0 | [usda](https://fdc.nal.usda.gov/food-details/2709614/nutrients) |
| Spinach (Raw) | `foodnoms:usda:168462` | gram | 23.0 | [usda](https://fdc.nal.usda.gov/food-details/168462/nutrients) |
| Spring Onion | `local:EFC1C598-5279-4952-8CB9-922499A0BF10` | serving | 480.0 | local |
| Rice Wine (Cooking) | `local:1D392317-7844-41F9-8260-701F147AC6C1` | milliliter | 120.0 | local (estimate) |
| Tamarind | `foodnoms:usda:2709269` | gram | 239.0 | [usda](https://fdc.nal.usda.gov/food-details/2709269/nutrients) |
| Toasted Sesame Oil | `local:6A4AE1C2-7310-4968-9B44-EC519652DFE2` | gram | 884.0 | local |
| Tomatoes (Crushed, Canned, No Added Salt) — breakfast passata | `foodnoms:usda:170501` | gram | 32.0 | [usda](https://fdc.nal.usda.gov/food-details/170501/nutrients) |
| Tsuyu Concentrate (Clearspring) | `local:1E1601EF-06F2-4CDE-9E28-FE455B639CE1` | milliliter | 44.4444 | local |
| Water (for the dashi brew) | `local:3DC78E20-3965-4D2F-BFC1-433AB12B9AE7` | milliliter | 0.0 | local |
| White Miso | `local:0CF95E20-08C5-4FFF-B889-E25F0B144CF9` | gram | 190.0 | local |
| Yellow Curry Paste | `foodnoms:fn:8c5c376f-dd7e-4d72-9394-2ccad763aaa4` | gram | 153.0 | fn |
| Yellow Onion (Raw) | `foodnoms:usda:790646` | gram | 38.0 | [usda](https://fdc.nal.usda.gov/food-details/790646/nutrients) |
