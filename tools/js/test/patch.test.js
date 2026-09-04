// Tests for the 3-tier weightless patch (FOODNOMS_FORMAT.md §11).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFoodNomsJson, patchTrio, mkLocalID, defaultPatchNote, endpointOrder, isPatched,
  foodnomsTotals,
} from '../lib/foodnoms-file.js';
import { buildFoodNomsUrl } from '../lib/foodnoms-url.js';
import { scaleNutrients } from '../lib/recipe.js';

const shiitake = {
  name: 'Mushrooms, shiitake, raw',
  fdcId: 169242,
  baseAmount: 100,
  baseUnit: 'gram',
  source: 'usda',
  secondarySource: 'sr_legacy_food',
  nutrients: { calories: 34, protein: 2.24, vitaminD: 0.4 },
};

const patchedIng = (patch, extra = {}) => ({
  block: shiitake,
  quantity: 200,
  unit: 'gram',
  patch,
  ...extra,
});

const recipe = (ingredients) => ({
  name: 'Patched Test',
  servings: 2,
  ingredientCount: ingredients.length,
  ingredients,
});

// --- the trio itself ---------------------------------------------------------

test('the consuming entry carries (per100 + delta)/100 as PER-GRAM nutrients', () => {
  const trio = patchTrio(shiitake, { vitaminD: 17.6 }, 200, 'note', null, null, 0);
  assert.equal(trio.entry.baseAmount, 1, 'patched entries are per-gram');
  assert.equal(trio.entry.baseUnit, 'gram');
  assert.equal(trio.entry.quantity, 200);
  // (0.4 + 17.6) / 100
  assert.ok(Math.abs(trio.entry.nutrients.vitaminD - 0.18) < 1e-12);
  // untouched nutrients still divide by 100
  assert.ok(Math.abs(trio.entry.nutrients.calories - 0.34) < 1e-12);
});

test('the patch food holds the delta alone, as one reusable serving', () => {
  const { patchFood } = patchTrio(shiitake, { vitaminD: 17.6 }, 200, 'n', null, null, 0);
  assert.equal(patchFood.contentType, 3);
  const [f] = patchFood.foods;
  assert.equal(f.name, 'Mushrooms, shiitake, raw Patch');
  assert.equal(f.baseAmount, 1);
  assert.equal(f.baseUnit, 'serving');
  assert.deepEqual(f.nutrients, { vitaminD: 17.6 }, 'the delta, not the sum');
  assert.equal(f.brandOwner, 'Created by Claude');
});

test('the patched food shows the arithmetic: untouched USDA food + the patch', () => {
  const { patchedFood } = patchTrio(shiitake, { vitaminD: 17.6 }, 200, 'the note', null, null, 0);
  assert.equal(patchedFood.contentType, 2);
  const [collection] = patchedFood.foodCollections;
  assert.equal(collection.totalServingSize, 100);
  assert.equal(collection.notes, 'the note');
  assert.match(collection.urlString, /fdc\.nal\.usda\.gov\/food-details\/169242/);

  const [usda, patch] = patchedFood.foodEntries;
  // The USDA half must stay EXACTLY as USDA published it — that is the whole
  // point of not editing the numbers in place.
  assert.deepEqual(usda.nutrients, shiitake.nutrients);
  assert.equal(usda.foodID, 'foodnoms:usda:169242');
  assert.equal(usda.source, 'usda');
  assert.equal(usda.secondarySource, 'sr_legacy_food');
  assert.equal(usda.quantity, 100);
  assert.deepEqual(patch.nutrients, { vitaminD: 17.6 });
  assert.equal(patch.quantity, 1);
});

test('a delta key absent from the USDA record is reported as created', () => {
  const trio = patchTrio(shiitake, { iodine: 5 }, 100, 'n', null, null, 0);
  assert.deepEqual(trio.missing, ['iodine']);
  const none = patchTrio(shiitake, { vitaminD: 1 }, 100, 'n', null, null, 0);
  assert.deepEqual(none.missing, []);
});

test('companion ids are deterministic, and overridable', () => {
  const a = patchTrio(shiitake, { vitaminD: 1 }, 100, 'n', null, null, 0);
  const b = patchTrio(shiitake, { vitaminD: 9 }, 500, 'other', null, null, 3);
  // Same food, same ids — so a companion emitted in a later call still links up.
  assert.equal(a.patchFood.foods[0].foodID, b.patchFood.foods[0].foodID);
  assert.equal(a.patchFood.foods[0].foodID, mkLocalID('Mushrooms, shiitake, raw#patch'));
  assert.equal(a.entry.foodID, mkLocalID('Mushrooms, shiitake, raw#patched'));

  const pinned = patchTrio(shiitake, { vitaminD: 1 }, 100, 'n', 'local:AAA', 'local:BBB', 0);
  assert.equal(pinned.patchFood.foods[0].foodID, 'local:AAA');
  assert.equal(pinned.entry.foodID, 'local:BBB');
});

test('the patched name is prefixed with the bandage emoji', () => {
  const { patchedName } = patchTrio(shiitake, { vitaminD: 1 }, 100, 'n', null, null, 0);
  assert.equal(patchedName, '\u{1FA79} Mushrooms, shiitake, raw #Patched');
});

test('the default note names the record and every adjustment', () => {
  assert.equal(
    defaultPatchNote(169242, { vitaminD: 17.6, iron: 2 }),
    'USDA record 169242 patched: vitaminD +17.6, iron +2.',
  );
});

// --- integration into a recipe ----------------------------------------------

test('a patched recipe emits both companions and lists them in the notes', () => {
  const built = buildFoodNomsJson(recipe([patchedIng({ vitaminD: 17.6 })]));
  assert.equal(built.companions.length, 2);
  assert.deepEqual(built.companions.map((c) => c.kind), ['patchFood', 'patchedFood']);
  const { notes } = built.json.foodCollections[0];
  assert.match(notes, /Companion \.foodnoms files \(re-request with emit=<name>/);
  assert.match(notes, /Mushrooms, shiitake, raw Patch/);
});

test('emit=<companion name> renders that companion instead of the recipe', () => {
  const spec = recipe([patchedIng({ vitaminD: 17.6 })]);
  const name = buildFoodNomsJson(spec).companions[0].name;
  const built = buildFoodNomsJson(spec, { emit: name });
  assert.equal(built.json.contentType, 3);
  assert.equal(built.json.foods[0].name, name);
});

test('an unknown emit target falls back to the recipe and lists what exists', () => {
  const built = buildFoodNomsJson(recipe([patchedIng({ vitaminD: 1 })]), { emit: 'nope' });
  assert.equal(built.json.contentType, 2, 'fell back to the recipe');
  assert.match(built.warnings.join(' '), /emit target "nope" not found.*Available/s);
});

test('a patch on a non-USDA ingredient is refused, not silently dropped', () => {
  const local = { name: 'Home blend', baseAmount: 100, baseUnit: 'gram', nutrients: { calories: 10 } };
  assert.throws(
    () => buildFoodNomsJson(recipe([{ block: local, quantity: 100, patch: { iron: 1 } }])),
    /a patch needs a USDA-resolved ingredient/,
  );
});

test('per-entry uncertainty still applies to a patched entry', () => {
  const built = buildFoodNomsJson(recipe([patchedIng({ vitaminD: 1 }, { uncertainty: 30 })]));
  assert.equal(built.json.foodEntries[0].uncertainty, 30);
});

// --- ordering ----------------------------------------------------------------

test('patched ingredients are grouped first, matching the endpoint join order', () => {
  const plain = { block: { name: 'Salt', baseAmount: 100, baseUnit: 'gram', nutrients: { sodium: 38758 } }, quantity: 5 };
  const built = buildFoodNomsJson(recipe([plain, patchedIng({ vitaminD: 1 })]));
  // The endpoint builds the fdcIds column before the custom* one, so both sides
  // must agree or every collectionSortIndex is off by one.
  assert.match(built.json.foodEntries[0].name, /#Patched/);
  assert.equal(built.json.foodEntries[1].name, 'Salt');
  assert.equal(built.json.foodEntries[0].collectionSortIndex, 0);
  assert.match(built.warnings.join(' '), /order regrouped/);
});

test('an unpatched recipe keeps the order as written', () => {
  const a = { block: { name: 'A', baseAmount: 100, baseUnit: 'gram', nutrients: {} }, quantity: 1 };
  const b = { block: { name: 'B', fdcId: 1, baseAmount: 100, baseUnit: 'gram', nutrients: {} }, quantity: 1 };
  const built = buildFoodNomsJson(recipe([a, b]));
  assert.deepEqual(built.json.foodEntries.map((e) => e.name), ['A', 'B']);
  assert.equal(built.warnings.length, 0, 'no regrouping without a patch');
});

test('endpointOrder splits by patch, not by fdcId', () => {
  const usdaPlain = { block: { fdcId: 7 } };
  const patchedOne = { block: { fdcId: 8 }, patch: { iron: 1 } };
  assert.deepEqual(endpointOrder([usdaPlain, patchedOne]), [patchedOne, usdaPlain]);
  assert.equal(isPatched(usdaPlain), false);
  assert.equal(isPatched({ block: {}, patch: {} }), false, 'an empty patch is no patch');
});

// --- totals and the URL ------------------------------------------------------

test('recipe totals include the patch delta', () => {
  // Without this the Nutrition table would disagree with the file it ships next to.
  const scaled = scaleNutrients(shiitake, 200, { vitaminD: 17.6 });
  assert.ok(Math.abs(scaled.vitaminD - 36) < 1e-12, '(0.4 + 17.6) * 2');
  assert.ok(Math.abs(scaled.calories - 68) < 1e-12, 'untouched nutrients unaffected');
});

test('file totals agree with the scaled ingredient totals for a patched recipe', () => {
  const ing = patchedIng({ vitaminD: 17.6 });
  const built = buildFoodNomsJson(recipe([ing]));
  const t = foodnomsTotals(built.json);
  assert.ok(Math.abs(t.vitaminD - 36) < 1e-9);
  assert.ok(Math.abs(t.calories - 68) < 1e-9);
});

test('a patched ingredient rides the fdcIds column, unpatched ones stay inline', () => {
  const plain = {
    block: { name: 'Oil', fdcId: 99, baseAmount: 100, baseUnit: 'gram', nutrients: { fat: 100 } },
    quantity: 10,
    unit: 'gram',
  };
  const url = buildFoodNomsUrl(recipe([patchedIng({ vitaminD: 17.6 }), plain]));
  const p = new URLSearchParams(new URL(url).search);
  // The patch is only expressible on the fdcIds path — patchFor[] keys off it.
  assert.equal(p.get('fdcIds'), '169242');
  assert.equal(p.get('grams'), '200');
  assert.equal(p.get('patchFdcIds'), '169242');
  assert.equal(p.get('patchNutrientNames'), 'vitaminD');
  assert.equal(p.get('patchDeltas'), '17.6');
  // The unpatched one keeps its FDC lookup off the endpoint.
  assert.equal(p.get('customNames'), 'Oil');
  // And is not duplicated into both columns.
  assert.equal(p.get('customNames').split(';').length, 1);
});

test('an unpatched recipe sends no patch columns at all', () => {
  const plain = { block: { name: 'Oil', baseAmount: 100, baseUnit: 'gram', nutrients: { fat: 100 } }, quantity: 10 };
  const p = new URLSearchParams(new URL(buildFoodNomsUrl(recipe([plain]))).search);
  assert.equal(p.get('fdcIds'), null);
  assert.equal(p.get('patchFdcIds'), null);
});
