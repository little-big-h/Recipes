// ingredients.js — resolve an ingredient to a per-100 g nutrient block.
//
// Resolution order follows docs/RECIPE_NUTRITION_GENERATOR.md: the curated
// ingredient map wins, USDA FoodData Central is the fallback. The map exists
// because some things Holger actually cooks with have no honest USDA generic
// (a specific brand's oat milk, a CIQUAL entry, a label-read pantry item), and
// re-deriving those from a search every time would quietly swap the number.

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getFood } from './fdc.js';
import { toFoodNomsBlock, secondarySource } from './nutrients.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const MAP_PATH = join(HERE, '..', '..', 'ingredient-map.json');

let mapCache;

/** The curated map, keyed by foodID. Loaded once per process. */
export async function loadIngredientMap() {
  // Not hand-parsed: JSON.parse is the framework doing it declaratively.
  mapCache ??= JSON.parse(await readFile(MAP_PATH, 'utf8'));
  return mapCache;
}

/** Normalise a curated map entry into the same shape toFoodNomsBlock returns. */
function blockFromMapEntry(entry) {
  return {
    name: entry.name,
    foodID: entry.foodID,
    source: entry.source ?? undefined,
    secondarySource: entry.secondary ?? undefined,
    brandOwner: entry.brand ?? undefined,
    baseAmount: entry.baseAmount ?? 100,
    baseUnit: entry.baseUnit ?? 'gram',
    nutrients: entry.per100 ?? {},
  };
}

/**
 * Look a curated entry up by foodID, or by case-insensitive exact name.
 * Name matching is exact on purpose — a fuzzy match here would pick a
 * near-neighbour silently, which is precisely the failure the map exists to
 * prevent.
 */
export async function findInMap(ref) {
  const map = await loadIngredientMap();
  if (map[ref]) return blockFromMapEntry(map[ref]);
  const needle = String(ref).toLowerCase();
  for (const entry of Object.values(map)) {
    if (entry.name?.toLowerCase() === needle) return blockFromMapEntry(entry);
  }
  return null;
}

/**
 * Resolve one ingredient spec to a block.
 *
 * Accepts `{ fdcId }` for a pinned USDA record, `{ ref }` / `{ name }` to
 * consult the curated map, or `{ nutrients }` given verbatim for a one-off
 * estimated food that is neither a USDA generic nor a reusable pantry product
 * — a whole restaurant dish logged from a weighed portion
 * (`docs/MEAL_LOGGING.md`: "one dish = one entry, a single whole-dish per-100 g
 * estimate", never decomposed into ingredients, and never added to the curated
 * map — that map is for Holger's own reusable products, not a one-off plate).
 * `nutrients` are per `baseAmount` `baseUnit` (100 g by default), same shape as
 * every other block. Never searches FDC by name: picking a search hit without
 * a human judging the candidates is how the wrong food ends up in a recipe.
 * Use the `search` command, then pin the fdcId.
 */
export async function resolveIngredient(spec) {
  if (spec.fdcId != null) {
    const block = toFoodNomsBlock(await getFood(spec.fdcId));
    return {
      ...block,
      foodID: `foodnoms:usda:${spec.fdcId}`,
      source: 'usda',
      secondarySource: secondarySource(block.dataType),
    };
  }
  if (spec.nutrients) {
    return {
      name: spec.name ?? 'Ingredient',
      foodID: spec.foodID,
      brandOwner: spec.brand,
      baseAmount: spec.baseAmount ?? 100,
      baseUnit: spec.unit ?? spec.baseUnit ?? 'gram',
      nutrients: spec.nutrients,
    };
  }
  const ref = spec.ref ?? spec.name;
  if (!ref) throw new Error('ingredient needs one of: fdcId, ref, name, nutrients');
  const hit = await findInMap(ref);
  if (!hit) {
    throw new Error(
      `No curated entry for ${JSON.stringify(ref)} and no fdcId given. ` +
        `Run \`node tools/js/cli.js search ${JSON.stringify(ref)}\`, judge the ` +
        `candidates, then pin the fdcId. (Logging a one-off restaurant dish ` +
        `instead? Pass \`nutrients\` inline rather than adding it here.)`,
    );
  }
  return hit;
}
