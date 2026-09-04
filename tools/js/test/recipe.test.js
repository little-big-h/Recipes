// Tests for scaling, summing and URL construction.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scaleNutrients, sumNutrients, computeRecipe, incompleteNutrients } from '../lib/recipe.js';
import { buildFoodNomsUrl } from '../lib/foodnoms-url.js';

const block = (name, nutrients, extra = {}) => ({
  name,
  baseAmount: 100,
  baseUnit: 'gram',
  nutrients,
  ...extra,
});

test('scaling is per 100 g of the base amount', () => {
  const b = block('Oil', { calories: 884, fat: 100 });
  assert.deepEqual(scaleNutrients(b, 250), { calories: 2210, fat: 250 });
  assert.deepEqual(scaleNutrients(b, 0), { calories: 0, fat: 0 });
});

test('scaling respects a non-100 baseAmount', () => {
  const b = block('Odd', { protein: 10 }, { baseAmount: 50 });
  assert.deepEqual(scaleNutrients(b, 100), { protein: 20 });
});

test('summing reports per-nutrient coverage, not just totals', () => {
  const { totals, coverage } = sumNutrients([
    { calories: 100, iron: 2 },
    { calories: 50 },
  ]);
  assert.equal(totals.calories, 150);
  assert.equal(totals.iron, 2);
  // The distinction that matters: 150 kcal is a real total, 2 mg iron is a floor.
  assert.equal(coverage.calories, 2);
  assert.equal(coverage.iron, 1);
});

test('computeRecipe totals the whole recipe, and only then derives per-serving', async () => {
  const result = await computeRecipe({
    name: 'Two-ingredient test',
    servings: 4,
    ingredients: [
      { ref: 'Oil (Avocado)', grams: 50 },
      { ref: 'Oil (Avocado)', grams: 50 },
    ],
  });
  // Whole recipe is primary (CLAUDE.md): 100 g of an 884 kcal/100 g oil.
  assert.equal(Math.round(result.totals.calories), 884);
  assert.equal(Math.round(result.perServing.calories), 221);
  assert.equal(result.totalGrams, 100);
  assert.equal(result.ingredientCount, 2);
});

test('per-serving is omitted when servings is not given', async () => {
  const result = await computeRecipe({
    name: 'No servings',
    ingredients: [{ ref: 'Oil (Avocado)', grams: 10 }],
  });
  assert.equal(result.perServing, undefined);
});

test('incompleteNutrients names the totals that are really floors', async () => {
  const result = {
    ingredientCount: 3,
    coverage: { calories: 3, iodine: 1 },
  };
  assert.deepEqual(incompleteNutrients(result), [{ nutrient: 'iodine', from: 1, of: 3 }]);
});

test('an unresolvable ingredient fails loudly with the next step', async () => {
  await assert.rejects(
    computeRecipe({ name: 'x', ingredients: [{ ref: 'no such food anywhere', grams: 10 }] }),
    /No curated entry.*search/s,
  );
});

test('a non-numeric quantity is rejected rather than producing NaN totals', async () => {
  await assert.rejects(
    computeRecipe({ name: 'x', ingredients: [{ ref: 'Oil (Avocado)', grams: 'a lot' }] }),
    /needs a numeric/,
  );
});

// --- URL construction -------------------------------------------------------

const result = {
  name: 'Test Recipe',
  servings: 2,
  ingredientCount: 1,
  ingredients: [
    {
      block: block('Squash', { calories: 45, protein: 1 }, { fdcId: 169295, foodID: 'foodnoms:usda:169295' }),
      quantity: 300,
      unit: 'gram',
    },
  ],
};

test('URL sends per-100 g nutrients, NOT pre-scaled ones', () => {
  const params = new URLSearchParams(new URL(buildFoodNomsUrl(result)).search);
  // The endpoint applies `quantity` itself. Sending 135 here (45 x 3) would
  // triple the recipe silently.
  assert.equal(params.get('customNutrientValues'), '45,1');
  assert.equal(params.get('customQuantities'), '300');
  assert.equal(params.get('customNutrientNames'), 'calories,protein');
});

test('URL uses the custom* path, so the endpoint makes no FDC call', () => {
  const params = new URLSearchParams(new URL(buildFoodNomsUrl(result)).search);
  assert.equal(params.get('fdcIds'), null);
  assert.equal(params.get('customNames'), 'Squash');
  // Provenance still points at the right USDA record.
  assert.equal(params.get('customFoodIds'), 'foodnoms:usda:169295');
});

test('FDC provenance URLs are opt-in, to keep the query string short', () => {
  assert.equal(new URLSearchParams(new URL(buildFoodNomsUrl(result)).search).get('customUrls'), null);
  const withUrls = new URLSearchParams(new URL(buildFoodNomsUrl(result, { includeUrls: true })).search);
  assert.match(withUrls.get('customUrls'), /fdc\.nal\.usda\.gov\/food-details\/169295/);
});

test('URL omits optional columns that would be entirely blank', () => {
  const params = new URLSearchParams(new URL(buildFoodNomsUrl(result)).search);
  assert.equal(params.get('customUncertainties'), null);
  assert.equal(params.get('customBrands'), null);
});

test('a semicolon in free text is rejected at build time', () => {
  const bad = {
    ...result,
    ingredients: [{ ...result.ingredients[0], block: block('Squash; roasted', { calories: 45 }) }],
  };
  // Left to the endpoint this splits a column and trips its equal-length guard,
  // reporting a length mismatch rather than the offending name.
  assert.throws(() => buildFoodNomsUrl(bad), /column separator.*Squash; roasted/s);
});

test('commas in an ingredient name are allowed', () => {
  // Regression: an over-broad guard banned commas too, which rejects almost
  // every real USDA description. Only customNutrientNames/Values split on ','.
  const usdaName = 'Squash, winter, butternut, raw';
  const withComma = {
    ...result,
    ingredients: [{ ...result.ingredients[0], block: block(usdaName, { calories: 45 }) }],
  };
  const params = new URLSearchParams(new URL(buildFoodNomsUrl(withComma)).search);
  assert.equal(params.get('customNames'), usdaName);
});

test('collectionType defaults to recipe and is overridable for a meal log', () => {
  const asRecipe = new URLSearchParams(new URL(buildFoodNomsUrl(result)).search);
  assert.equal(asRecipe.get('collectionType'), '3');
  const asMeal = new URLSearchParams(new URL(buildFoodNomsUrl(result, { collectionType: 2 })).search);
  assert.equal(asMeal.get('collectionType'), '2');
});

// --- endpoint v8 opt-ins ----------------------------------------------------

const usda = (name, fdcId, nutrients) =>
  block(name, nutrients, {
    fdcId,
    foodID: `foodnoms:usda:${fdcId}`,
    source: 'usda',
    secondarySource: 'sr_legacy_food',
  });

const twoSets = {
  name: 'Interning test',
  ingredientCount: 3,
  ingredients: [
    { block: usda('A', 1, { calories: 10, protein: 1 }), quantity: 100, unit: 'gram' },
    { block: usda('B', 2, { calories: 20, protein: 2 }), quantity: 100, unit: 'gram' },
    { block: usda('C', 3, { calories: 30, iron: 5 }), quantity: 100, unit: 'gram' },
  ],
};

test('v7 default emits neither v8 parameter, so live URLs keep working', () => {
  const params = new URLSearchParams(new URL(buildFoodNomsUrl(twoSets)).search);
  assert.equal(params.get('nutrientNameSets'), null);
  assert.equal(params.get('customNutrientSetIds'), null);
  assert.equal(params.get('customSources'), null);
  assert.equal(params.get('customNutrientNames'), 'calories,protein;calories,protein;calories,iron');
});

test('v8 interns distinct nutrient-key sets and indexes them 1-based', () => {
  const params = new URLSearchParams(new URL(buildFoodNomsUrl(twoSets, { endpointVersion: 8 })).search);
  // Two distinct sets across three foods; the repeated one is sent once.
  assert.equal(params.get('nutrientNameSets'), 'calories,protein;calories,iron');
  assert.equal(params.get('customNutrientSetIds'), '1;1;2');
  // The inline form must NOT also be sent — the endpoint rejects both together.
  assert.equal(params.get('customNutrientNames'), null);
  // Values stay per food.
  assert.equal(params.get('customNutrientValues'), '10,1;20,2;30,5');
});

test('v8 carries USDA provenance the custom* path could not express', () => {
  const params = new URLSearchParams(new URL(buildFoodNomsUrl(twoSets, { endpointVersion: 8 })).search);
  assert.equal(params.get('customSources'), 'usda;usda;usda');
  assert.equal(params.get('customSecondarySources'), 'sr_legacy_food;sr_legacy_food;sr_legacy_food');
});

test('v8 omits the provenance columns when no ingredient has any', () => {
  const params = new URLSearchParams(new URL(buildFoodNomsUrl(result, { endpointVersion: 8 })).search);
  assert.equal(params.get('customSources'), null);
});

test('v8 interning shrinks the nutrient-name column whenever sets repeat', () => {
  const nameCol = (u, ...keys) => {
    const p = new URLSearchParams(new URL(u).search);
    return keys.reduce((n, k) => n + encodeURIComponent(p.get(k) ?? '').length, 0);
  };
  const v7 = nameCol(buildFoodNomsUrl(twoSets), 'customNutrientNames');
  const v8 = nameCol(
    buildFoodNomsUrl(twoSets, { endpointVersion: 8 }),
    'nutrientNameSets',
    'customNutrientSetIds',
  );
  assert.ok(v8 < v7, `name column: expected v8 (${v8}) < v7 (${v7})`);
});

test('v8 shortens a realistic recipe overall, provenance columns included', () => {
  // The toy cases above do NOT shrink overall: with two nutrients per food,
  // interning saves a few chars while customSources/customSecondarySources add
  // ~190. The saving only outruns that at a realistic key count — which is the
  // case that matters, since URL length only binds on big recipes.
  const KEYS = Object.fromEntries(
    Array.from({ length: 35 }, (_, i) => [`nutrientNumber${i}`, i + 0.5]),
  );
  const big = {
    name: 'Realistic',
    ingredientCount: 9,
    ingredients: Array.from({ length: 9 }, (_, i) => ({
      block: usda(`Ingredient ${i}`, 1000 + i, KEYS),
      quantity: 100,
      unit: 'gram',
    })),
  };
  const v7 = buildFoodNomsUrl(big).length;
  const v8 = buildFoodNomsUrl(big, { endpointVersion: 8 }).length;
  assert.ok(v8 < v7 * 0.75, `expected v8 (${v8}) well under v7 (${v7})`);
});

test('per-entry uncertainties are emitted when any ingredient carries one', () => {
  const withUnc = {
    ...result,
    ingredients: [{ ...result.ingredients[0], uncertainty: 10 }],
  };
  const params = new URLSearchParams(new URL(buildFoodNomsUrl(withUnc)).search);
  assert.equal(params.get('customUncertainties'), '10');
});
