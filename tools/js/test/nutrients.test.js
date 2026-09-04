// Tests for the FDC -> FoodNoms mapping, against real recorded USDA records.
// Offline by design: the fixtures are the point. A test suite that hit the live
// API would burn the same ~1000 req/day quota the cache exists to protect, and
// would go red whenever USDA did.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toFoodNomsBlock, energyKcal, totalSugars, secondarySource } from '../lib/nutrients.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (id) => JSON.parse(readFileSync(join(HERE, 'fixtures', `${id}.json`), 'utf8'));

const BUTTERNUT_SR = fixture(169295); // SR Legacy: plain Energy kcal row
const BUTTERNUT_FDN = fixture(2685570); // Foundation: Atwater rows ONLY
const EGG = fixture(171287); // the vitamin D IU trap

test('energy: prefers the plain Energy kcal row over the kJ row', () => {
  // The record carries Energy [kcal] = 45 and Energy [kJ] = 188. Matching on
  // name alone would be a coin flip between them.
  assert.equal(energyKcal(BUTTERNUT_SR.foodNutrients), 45);
});

test('energy: falls back to Atwater General when no plain Energy row exists', () => {
  // Foundation foods routinely omit a plain Energy row. This record has only
  // Atwater General (48.1323) and Atwater Specific (41.7165215) — a 15%
  // difference, so the preference order is not cosmetic.
  assert.equal(energyKcal(BUTTERNUT_FDN.foodNutrients), 48.1323);
});

test('vitamin D: takes micrograms, not the International Units row listed first', () => {
  // The regression this guards: the IU row (82) precedes the ug row (2) in the
  // record, so a prefix match returned 82 "ug" — 41x the true value.
  const block = toFoodNomsBlock(EGG);
  assert.equal(block.nutrients.vitaminD, 2);
});

test('vitamin D: converts IU to micrograms only when the ug row is absent', async () => {
  const { toFoodNomsBlock: map } = await import('../lib/nutrients.js');
  const iuOnly = {
    description: 'IU-only food',
    fdcId: 1,
    dataType: 'SR Legacy',
    foodNutrients: [
      { nutrient: { name: 'Vitamin D (D2 + D3), International Units', unitName: 'IU' }, amount: 80 },
    ],
  };
  assert.equal(map(iuOnly).nutrients.vitaminD, 2); // 80 IU / 40
});

test('sugars: matches "Total Sugars" as well as "Sugars, total including NLEA"', () => {
  assert.equal(totalSugars(EGG.foodNutrients), 0.37);
});

test('sugars: never counts an added-sugars row', () => {
  const rows = [
    { nutrient: { name: 'Sugars, added', unitName: 'G' }, amount: 9 },
    { nutrient: { name: 'Sugars, total including NLEA', unitName: 'G' }, amount: 4 },
  ];
  assert.equal(totalSugars(rows), 4);
});

test('vitamin C matches by prefix ("Vitamin C, total ascorbic acid")', () => {
  const block = toFoodNomsBlock(BUTTERNUT_SR);
  assert.equal(typeof block.nutrients.vitaminC, 'number');
});

test('absent nutrients are omitted, never zeroed', () => {
  const sparse = {
    description: 'Sparse',
    fdcId: 2,
    dataType: 'Foundation',
    foodNutrients: [{ nutrient: { name: 'Protein', unitName: 'G' }, amount: 3 }],
  };
  const { nutrients } = toFoodNomsBlock(sparse);
  assert.equal(nutrients.protein, 3);
  // A zero here would silently understate any recipe total this food joins.
  assert.ok(!('iron' in nutrients), 'iron must be absent, not 0');
  assert.ok(!('calories' in nutrients), 'calories must be absent, not 0');
});

test('block carries per-100 g base and USDA identity', () => {
  const block = toFoodNomsBlock(BUTTERNUT_SR);
  assert.equal(block.baseAmount, 100);
  assert.equal(block.baseUnit, 'gram');
  assert.equal(block.fdcId, 169295);
  assert.equal(block.name, 'Squash, winter, butternut, raw');
});

test('dataType maps to the .foodnoms secondarySource', () => {
  assert.equal(secondarySource('Foundation'), 'foundation_food');
  assert.equal(secondarySource('SR Legacy'), 'sr_legacy_food');
  assert.equal(secondarySource('Survey (FNDDS)'), 'survey_fndds_food');
  assert.equal(secondarySource('Branded'), undefined);
});
