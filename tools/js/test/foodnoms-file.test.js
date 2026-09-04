// Tests for local .foodnoms generation and the endpoint cross-check.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFoodNomsJson, foodnomsBytes, foodnomsDecode, foodnomsTotals,
  cleanFilename, mkLocalID, foodIDfor,
} from '../lib/foodnoms-file.js';
import { diffJson } from '../lib/verify.js';

const ing = (name, nutrients, quantity, extra = {}) => ({
  block: { name, baseAmount: 100, baseUnit: 'gram', nutrients, ...extra },
  quantity,
  unit: 'gram',
});

const soup = {
  name: 'Test Soup [04-09-26] ✴️',
  servings: 4,
  ingredientCount: 2,
  ingredients: [
    ing('Squash', { calories: 45, protein: 1, sodium: 4 }, 900, {
      fdcId: 169295, foodID: 'foodnoms:usda:169295', source: 'usda', secondarySource: 'sr_legacy_food',
    }),
    ing('Oil', { calories: 884, fat: 100 }, 20),
  ],
};

// --- container ---------------------------------------------------------------

test('bytes are an uncompressed bvx- block with a correct little-endian length', () => {
  const { json } = buildFoodNomsJson(soup);
  const bytes = foodnomsBytes(json);
  assert.equal(bytes.subarray(0, 4).toString('ascii'), 'bvx-');
  assert.equal(bytes.subarray(-4).toString('ascii'), 'bvx$');
  const declared = bytes.readUInt32LE(4);
  assert.equal(declared, bytes.length - 12, 'length field must match the JSON payload');
  assert.equal(declared, Buffer.byteLength(JSON.stringify(json), 'utf8'));
});

test('decode is the exact inverse of encode', () => {
  const { json } = buildFoodNomsJson(soup);
  assert.deepEqual(foodnomsDecode(foodnomsBytes(json)), json);
});

test('decode refuses a compressed block rather than returning junk', () => {
  const compressed = Buffer.concat([Buffer.from('bvx2'), Buffer.alloc(20)]);
  // FoodNoms writes 'bvxn'/'bvx2'; we only ever write 'bvx-'. Failing loudly
  // beats parsing LZFSE payload bytes as UTF-8 JSON.
  assert.throws(() => foodnomsDecode(compressed), /not an uncompressed/);
});

// --- recipe shape ------------------------------------------------------------

test('a recipe carries the yield fields; a meal does not', () => {
  const recipe = buildFoodNomsJson(soup).json.foodCollections[0];
  assert.equal(recipe.collectionType, 3);
  assert.equal(recipe.totalServingSize, 920);
  assert.equal(recipe.servingSizeUnit, 'gram');
  assert.equal(recipe.servings, 4);

  const meal = buildFoodNomsJson(soup, { collectionType: 2 }).json.foodCollections[0];
  assert.equal(meal.collectionType, 2);
  assert.ok(!('totalServingSize' in meal), 'a meal has no yield');
  assert.ok(!('servings' in meal));
});

test('entries carry per-100 g nutrients plus the quantity, never pre-scaled', () => {
  const [first] = buildFoodNomsJson(soup).json.foodEntries;
  assert.equal(first.baseAmount, 100);
  assert.equal(first.quantity, 900);
  assert.equal(first.nutrients.calories, 45, 'per 100 g, not 405');
  assert.deepEqual(first.measure, { unit: 'gram', value: 1, traits: 0 });
  assert.equal(first.collectionSortIndex, 0);
});

test('USDA provenance survives into the file', () => {
  const [first] = buildFoodNomsJson(soup).json.foodEntries;
  assert.equal(first.source, 'usda');
  assert.equal(first.secondarySource, 'sr_legacy_food');
  assert.equal(first.foodID, 'foodnoms:usda:169295');
});

test('the in-file collection name keeps the date stamp and emoji', () => {
  // Only the FILENAME is cleaned — CLAUDE.md requires the stamp in the name.
  const built = buildFoodNomsJson(soup);
  assert.equal(built.json.foodCollections[0].name, 'Test Soup [04-09-26] ✴️');
  assert.equal(built.name, 'Test Soup.foodnoms');
});

test('uncertainty: per-entry wins, collection default applies otherwise, 0 omits', () => {
  const spec = {
    ...soup,
    ingredients: [
      { ...soup.ingredients[0], uncertainty: 30 },
      soup.ingredients[1],
    ],
  };
  const entries = buildFoodNomsJson(spec, { uncertainty: 10 }).json.foodEntries;
  assert.equal(entries[0].uncertainty, 30);
  assert.equal(entries[1].uncertainty, 10);
  const zero = buildFoodNomsJson(soup).json.foodEntries;
  assert.ok(!('uncertainty' in zero[0]), 'tier 0 omits the field');
});

// --- emit modes --------------------------------------------------------------

test('emit=food pins a 100-unit serving and drops the collection', () => {
  const { json, warnings } = buildFoodNomsJson(soup, { emit: 'food' });
  assert.equal(json.contentType, 1);
  assert.ok(!('foodCollections' in json));
  const [f] = json.foodEntries;
  assert.equal(f.baseAmount, 100);
  assert.equal(f.quantity, 1);
  assert.deepEqual(f.measure, { unit: 'gram', value: 100, traits: 1 });
  assert.ok(!('collectionSortIndex' in f));
  assert.match(warnings[0], /only the first food/);
});

test('emit=fooddef is a library definition without entry-only fields', () => {
  const { json } = buildFoodNomsJson(soup, { emit: 'fooddef' });
  assert.equal(json.contentType, 3);
  const [f] = json.foods;
  assert.equal(f.isHidden, false);
  assert.equal(f.baseAmount, 100);
  assert.deepEqual(f.measures, [{ unit: 'gram', value: 100, traits: 1 }]);
  assert.ok(!('quantity' in f) && !('measure' in f), 'entry-only fields dropped');
});

// --- ids and filenames -------------------------------------------------------

test('mkLocalID is a stable dashed 8-4-4-4-12 local: id', () => {
  const id = mkLocalID('seed');
  assert.match(id, /^local:[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/);
  assert.equal(id, mkLocalID('seed'), 'same seed must give the same id');
  assert.notEqual(id, mkLocalID('other'));
});

test('foodIDfor honours a given id and otherwise hashes name|brand|kcal', () => {
  assert.equal(foodIDfor('foodnoms:usda:1', 'x', null, {}), 'foodnoms:usda:1');
  const a = foodIDfor('', 'Oat Milk', 'Brand', { calories: 45 });
  // Casing and padding must not fork the id.
  assert.equal(a, foodIDfor('  ', '  oat milk  ', 'brand', { calories: 45 }));
  assert.notEqual(a, foodIDfor('', 'Oat Milk', 'Brand', { calories: 46 }));
});

test('cleanFilename strips the date stamp and emoji and spells & as and', () => {
  assert.equal(cleanFilename('Creamy Soup & Toast [10-06-26] ✴️'), 'Creamy Soup and Toast');
  assert.equal(cleanFilename('Plain'), 'Plain');
});

// --- totals ------------------------------------------------------------------

test('totals scale by quantity/baseAmount and derive salt from sodium', () => {
  const t = foodnomsTotals(buildFoodNomsJson(soup).json);
  assert.equal(Math.round(t.calories), Math.round((45 * 900) / 100 + (884 * 20) / 100));
  assert.equal(t.protein, 9);
  assert.equal(t.sodium, 36);
  assert.ok(Math.abs(t.salt - (36 * 2.5) / 1000) < 1e-12);
});

test('totals read identically from raw bytes and from decoded JSON', () => {
  const { json } = buildFoodNomsJson(soup);
  assert.deepEqual(foodnomsTotals(foodnomsBytes(json)), foodnomsTotals(json));
});

// --- the endpoint diff -------------------------------------------------------

test('diffJson tolerates float noise between the two implementations', () => {
  // Wolfram prints N[...,6]; JS prints shortest round-trip. A diff that fired on
  // this would fire on every single comparison and teach us to ignore it.
  assert.deepEqual(diffJson({ kcal: 1591.23456 }, { kcal: 1591.23457 }), []);
});

test('diffJson reports real differences, including one-sided keys', () => {
  assert.deepEqual(diffJson({ a: 1 }, { a: 2 }), ['a: local 1 vs endpoint 2']);
  assert.match(diffJson({ a: 1 }, { a: 1, b: 2 })[0], /b: missing locally/);
  assert.match(diffJson({ a: 1, b: 2 }, { a: 1 })[0], /b: missing at endpoint/);
  assert.match(diffJson([1, 2], [1])[0], /length 2 vs 1/);
});

test('a genuine per-100-vs-scaled bug would be caught by the diff', () => {
  const good = buildFoodNomsJson(soup).json;
  const bad = structuredClone(good);
  bad.foodEntries[0].nutrients.calories = 405; // pre-scaled by mistake
  assert.match(
    diffJson(good, bad).join('\n'),
    /foodEntries\[0\]\.nutrients\.calories: local 45 vs endpoint 405/,
  );
});
