// recipe.js — scale per-100 g blocks by quantity and sum a whole recipe.
//
// Recipe nutrition totals are for the WHOLE recipe, never per serving and never
// per 100 g (CLAUDE.md). Per-serving numbers are derived at the very end, and
// only when `servings` is given, so the whole-recipe figure stays the primary.

import { resolveIngredient } from './ingredients.js';

/**
 * Scale a block's per-100 g nutrients to `quantity` of its base unit.
 * A nutrient absent from the block stays absent: "not measured" must not become
 * a zero, or a recipe total silently understates.
 */
export function scaleNutrients(block, quantity, patch) {
  const base = block.baseAmount ?? 100;
  const factor = quantity / base;
  const out = {};
  for (const [k, v] of Object.entries(block.nutrients ?? {})) {
    if (typeof v === 'number') out[k] = v * factor;
  }
  // A patch adjusts the per-baseAmount composition, so it scales with the
  // ingredient like every other nutrient. Leaving it out here would make the
  // recipe totals disagree with the file the patched entry actually produces.
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (typeof v === 'number') out[k] = (out[k] ?? 0) + v * factor;
  }
  return out;
}

/**
 * Sum scaled nutrient sets.
 *
 * A key present in only some ingredients is summed over just those — and the
 * count is reported per key, because "iodine: 12 ug" derived from 2 of 14
 * ingredients is not a recipe total, it is a floor. `coverage` is what lets a
 * caller tell those apart; without it the two are indistinguishable numbers.
 */
export function sumNutrients(scaledList) {
  const totals = {};
  const coverage = {};
  for (const scaled of scaledList) {
    for (const [k, v] of Object.entries(scaled)) {
      totals[k] = (totals[k] ?? 0) + v;
      coverage[k] = (coverage[k] ?? 0) + 1;
    }
  }
  return { totals, coverage };
}

/**
 * Compute a whole recipe.
 *
 * @param {object} spec
 * @param {string} spec.name
 * @param {number} [spec.servings]
 * @param {Array<{fdcId?:number, ref?:string, name?:string, grams:number,
 *                unit?:string, uncertainty?:number, note?:string,
 *                nutrients?:object}>} spec.ingredients ` nutrients` (per 100 g,
 *   or per `baseAmount`/`baseUnit` if given) is a one-off literal block for a
 *   food that is neither a USDA generic nor in the curated map — see
 *   `resolveIngredient`.
 */
export async function computeRecipe(spec) {
  const ingredients = [];
  for (const ing of spec.ingredients) {
    const block = await resolveIngredient(ing);
    const quantity = ing.grams;
    if (typeof quantity !== 'number' || !(quantity >= 0)) {
      throw new Error(`ingredient ${JSON.stringify(ing.ref ?? ing.name ?? ing.fdcId)} needs a numeric \`grams\``);
    }
    ingredients.push({
      block,
      quantity,
      unit: ing.unit ?? block.baseUnit ?? 'gram',
      uncertainty: ing.uncertainty,
      note: ing.note,
      // The 3-tier weightless patch (FOODNOMS_FORMAT.md §11) — see patchTrio.
      patch: ing.patch,
      patchNote: ing.patchNote,
      patchFoodID: ing.patchFoodID,
      patchedFoodID: ing.patchedFoodID,
      scaled: scaleNutrients(block, quantity, ing.patch),
    });
  }

  const { totals, coverage } = sumNutrients(ingredients.map((i) => i.scaled));
  const totalGrams = ingredients.reduce((a, i) => a + i.quantity, 0);

  return {
    name: spec.name,
    servings: spec.servings,
    ingredientCount: ingredients.length,
    totalGrams,
    ingredients,
    totals,
    coverage,
    // Reported only when servings is given, and always alongside the total.
    perServing:
      spec.servings > 0
        ? Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v / spec.servings]))
        : undefined,
  };
}

/** Nutrients whose totals are only meaningful if every ingredient supplied one. */
export function incompleteNutrients(result) {
  return Object.entries(result.coverage)
    .filter(([, n]) => n < result.ingredientCount)
    .map(([k, n]) => ({ nutrient: k, from: n, of: result.ingredientCount }));
}
