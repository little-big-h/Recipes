// nutrients.js — FDC record -> per-100 g block keyed by FoodNoms nutrient names.
//
// Faithful port of `fdcToFoodNoms` from tools/fdc-lookup.wl. The two traps that
// cost real debugging time there are reproduced deliberately, with their
// reasoning, because both produce plausible-looking wrong numbers rather than
// errors:
//
//   1. Energy. Foundation foods often carry no plain Energy/KCAL row at all, only
//      the Atwater variants. Matching on name alone also matches the KJ row, so
//      the unit filter is load-bearing.
//   2. Vitamin D. A prefix match on "Vitamin D (D2 + D3)" also matches
//      "Vitamin D (D2 + D3), International Units", and the IU row usually comes
//      first — emitting IU as micrograms, 40x too high (an egg's 82 IU became
//      "82 ug"). Exact-match the ug row; fall back to IU/40 only when absent.

/** Full-format rows look like {nutrient: {name, unitName}, amount}. */
const rowName = (r) => r?.nutrient?.name ?? '';
const rowUnit = (r) => (r?.nutrient?.unitName ?? '').toUpperCase();
const rowAmount = (r) => (typeof r?.amount === 'number' ? r.amount : undefined);

/**
 * Energy in kcal, preferring a plain Energy row and falling back to Atwater.
 * The `unitName === 'KCAL'` filter excludes the parallel KJ rows.
 */
export function energyKcal(rows) {
  const pick = (name) =>
    rowAmount(rows.find((r) => rowName(r) === name && rowUnit(r) === 'KCAL'));
  for (const name of [
    'Energy',
    'Energy (Atwater General Factors)',
    'Energy (Atwater Specific Factors)',
  ]) {
    const v = pick(name);
    if (v !== undefined) return v;
  }
  return undefined;
}

/**
 * Total sugars, robust to "Sugars, total including NLEA" vs "Total Sugars".
 * Excludes added sugars, which are a subset and would double-count.
 */
export function totalSugars(rows) {
  return rowAmount(
    rows.find((r) => {
      const n = rowName(r).toLowerCase();
      return n.includes('sugars') && n.includes('total') && !n.includes('added');
    }),
  );
}

function vitaminD(rows) {
  const exact = (name) => rowAmount(rows.find((r) => rowName(r) === name));
  const ug = exact('Vitamin D (D2 + D3)');
  if (ug !== undefined) return ug;
  const iu = exact('Vitamin D (D2 + D3), International Units');
  return iu === undefined ? undefined : iu / 40; // 1 ug === 40 IU, exact
}

/** FoodNoms key -> exact FDC nutrient name. */
const EXACT = {
  protein: 'Protein',
  fat: 'Total lipid (fat)',
  carbs: 'Carbohydrate, by difference',
  fiber: 'Fiber, total dietary',
  fatSaturated: 'Fatty acids, total saturated',
  fatTrans: 'Fatty acids, total trans',
  fatMonounsaturated: 'Fatty acids, total monounsaturated',
  fatPolyunsaturated: 'Fatty acids, total polyunsaturated',
  cholesterol: 'Cholesterol',
  water: 'Water',
  sodium: 'Sodium, Na',
  potassium: 'Potassium, K',
  calcium: 'Calcium, Ca',
  iron: 'Iron, Fe',
  magnesium: 'Magnesium, Mg',
  zinc: 'Zinc, Zn',
  phosphorus: 'Phosphorus, P',
  copper: 'Copper, Cu',
  manganese: 'Manganese, Mn',
  selenium: 'Selenium, Se',
  caffeine: 'Caffeine',
  vitaminE: 'Vitamin E (alpha-tocopherol)',
  niacin: 'Niacin',
  thiamin: 'Thiamin',
  riboflavin: 'Riboflavin',
  vitaminB6: 'Vitamin B-6',
  pantothenicAcid: 'Pantothenic acid',
  folate: 'Folate, total',
  vitaminA: 'Vitamin A, RAE',
  vitaminB12: 'Vitamin B-12',
  vitaminK: 'Vitamin K (phylloquinone)',
  iodine: 'Iodine, I',
  biotin: 'Biotin',
};

/** dataType -> .foodnoms secondarySource (docs/FOODNOMS_FORMAT.md §7). */
export function secondarySource(dataType) {
  switch (dataType) {
    case 'Foundation':
      return 'foundation_food';
    case 'SR Legacy':
      return 'sr_legacy_food';
    case 'Survey (FNDDS)':
      return 'survey_fndds_food';
    default:
      return undefined;
  }
}

/**
 * Map a raw full-format FDC record to a per-100 g FoodNoms block.
 * Absent nutrients are omitted entirely rather than zeroed — a missing row means
 * "not measured", and zeroing it would silently understate a recipe total.
 */
export function toFoodNomsBlock(record) {
  const rows = record.foodNutrients ?? [];
  const exact = (name) => rowAmount(rows.find((r) => rowName(r) === name));

  const nutrients = { calories: energyKcal(rows) };
  for (const [key, name] of Object.entries(EXACT)) nutrients[key] = exact(name);
  nutrients.sugars = totalSugars(rows);
  nutrients.vitaminD = vitaminD(rows);
  // "Vitamin C" ~~ ___ in the Wolfram original: a prefix match, because the row
  // is named "Vitamin C, total ascorbic acid".
  nutrients.vitaminC = rowAmount(rows.find((r) => rowName(r).startsWith('Vitamin C')));

  for (const k of Object.keys(nutrients)) {
    if (nutrients[k] === undefined) delete nutrients[k];
  }

  return {
    name: record.description,
    fdcId: record.fdcId,
    dataType: record.dataType,
    baseAmount: 100,
    baseUnit: 'gram',
    nutrients,
  };
}
