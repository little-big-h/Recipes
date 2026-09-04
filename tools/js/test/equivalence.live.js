// equivalence.live.js — differential test: JS vs the deployed Wolfram endpoint.
//
// The two implementations of the .foodnoms format must agree. Everything else in
// test/ runs offline against fixtures; this file is the only one that needs the
// endpoint, so it is deliberately NOT matched by `npm test`'s glob:
//
//     npm run test:live
//
// Every case builds the file locally, asks the endpoint to build the same recipe,
// and diffs the decoded JSON and the totals. When the endpoint is unreachable the
// whole suite SKIPS rather than fails — an outage is not a defect in our code,
// and a red suite that means "Wolfram is down" trains people to ignore red.
//
// Cost note: cases carrying a patch travel the endpoint's `fdcIds` path, so the
// endpoint performs its own USDA lookups for those. The free key allows ~1000
// requests/day per IP. Keep patched cases few.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { computeRecipe } from '../lib/recipe.js';
import { buildFoodNomsJson, foodnomsTotals } from '../lib/foodnoms-file.js';
import { buildFoodNomsUrl, ENDPOINT } from '../lib/foodnoms-url.js';
import { fetchEndpointJson, diffJson } from '../lib/verify.js';

/** Endpoint version this client targets. Raise once v8 is deployed. */
const CLIENT_VERSION = 7;

let live = false;
let liveVersion = null;
let skipReason = 'not probed';

before(async () => {
  const res = await fetchEndpointJson(`${ENDPOINT}?emit=version`);
  if (!res.reachable) {
    skipReason = res.reason;
    console.log(`\n  ⏭  endpoint unreachable (${res.reason}) — skipping every case\n`);
    return;
  }
  live = true;
  liveVersion = res.data?.endpointVersion ?? null;
  console.log(`\n  endpoint live, $fnVersion = ${liveVersion} (client targets ${CLIENT_VERSION})\n`);
});

/** Polite spacing so a 14-case run doesn't look like a burst to Wolfram Cloud. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * One differential case. Builds both sides, diffs, and asserts equivalence.
 * Returns the endpoint payload so a case can make extra assertions on it.
 */
async function differential(spec, opts = {}) {
  const result = await computeRecipe(spec);
  const local = buildFoodNomsJson(result, opts);
  const url = buildFoodNomsUrl(result, opts);

  await sleep(400);
  const res = await fetchEndpointJson(url);
  assert.ok(res.reachable, `endpoint went away mid-run: ${res.reason}`);

  const recipeDiff = diffJson(local.json, res.data.recipe ?? {}, 'recipe');
  const totalsDiff = diffJson(foodnomsTotals(local.json), res.data.totals ?? {}, 'totals');
  const all = [...recipeDiff, ...totalsDiff];

  assert.deepEqual(
    all,
    [],
    `JS and Wolfram disagree (${all.length} difference(s)):\n  ${all.join('\n  ')}\n  URL: ${url}`,
  );
  return { local, endpoint: res.data, url };
}

const t = (name, fn) => test(name, { skip: () => (live ? false : skipReason) }, fn);

// --- shape coverage ---------------------------------------------------------

t('single USDA ingredient', async () => {
  await differential({
    name: 'One Ingredient',
    servings: 1,
    ingredients: [{ fdcId: 169295, grams: 500 }],
  });
});

t('multi-ingredient all-USDA recipe', async () => {
  await differential({
    name: 'Butternut & Red Lentil Soup [04-09-26] ✴️',
    servings: 4,
    ingredients: [
      { fdcId: 169295, grams: 900 },
      { fdcId: 172420, grams: 200 },
      { fdcId: 2709795, grams: 220 },
      { fdcId: 2709660, grams: 150 },
      { fdcId: 2709786, grams: 20 },
      { fdcId: 169231, grams: 15 },
      { fdcId: 2705413, grams: 300 },
      { fdcId: 2709614, grams: 80 },
    ],
  });
});

t('curated-map ingredient (no fdcId)', async () => {
  await differential({
    name: 'Map Only',
    servings: 1,
    ingredients: [{ ref: 'Oil (Avocado)', grams: 30 }],
  });
});

t('mixed USDA + curated map', async () => {
  await differential({
    name: 'Mixed Sources',
    servings: 2,
    ingredients: [
      { fdcId: 169295, grams: 400 },
      { ref: 'Oil (Avocado)', grams: 20 },
    ],
  });
});

t('milliliter units survive the round trip', async () => {
  await differential({
    name: 'Liquid Units',
    servings: 1,
    ingredients: [{ ref: 'Oil (Avocado)', grams: 40, unit: 'milliliter' }],
  });
});

// --- collection kinds -------------------------------------------------------

t('meal (collectionType 2) has no yield fields', async () => {
  const { local } = await differential(
    {
      name: 'Lunch [04-09-26] ✴️',
      ingredients: [
        { fdcId: 169295, grams: 250, uncertainty: 0 },
        { fdcId: 2709795, grams: 80, uncertainty: 30 },
      ],
    },
    { collectionType: 2 },
  );
  const [c] = local.json.foodCollections;
  assert.equal(c.collectionType, 2);
  assert.ok(!('totalServingSize' in c), 'a meal carries no yield');
});

t('mixed per-entry uncertainty tiers', async () => {
  const { local } = await differential({
    name: 'Mixed Tiers',
    ingredients: [
      { fdcId: 169295, grams: 200, uncertainty: 0 },
      { fdcId: 2709795, grams: 100, uncertainty: 10 },
      { fdcId: 2709660, grams: 50, uncertainty: 30 },
    ],
  }, { collectionType: 2 });
  assert.deepEqual(
    local.json.foodEntries.map((e) => e.uncertainty),
    [undefined, 10, 30],
    'tier 0 omits the field; 10 and 30 are carried',
  );
});

t('explicit totalServingSize overrides the ingredient sum', async () => {
  const { local } = await differential(
    { name: 'Reduced', servings: 2, ingredients: [{ fdcId: 169295, grams: 1000 }] },
    { totalServingSize: 700 },
  );
  assert.equal(local.json.foodCollections[0].totalServingSize, 700);
});

// --- emit modes -------------------------------------------------------------

t('emit=food — standalone food, entry form', async () => {
  const { local } = await differential(
    { name: 'Standalone', ingredients: [{ fdcId: 169295, grams: 100 }] },
    { emit: 'food' },
  );
  assert.equal(local.json.contentType, 1);
});

t('emit=fooddef — library definition', async () => {
  const { local } = await differential(
    { name: 'Definition', ingredients: [{ fdcId: 169295, grams: 100 }] },
    { emit: 'fooddef' },
  );
  assert.equal(local.json.contentType, 3);
});

// --- patches (these cost server-side USDA calls) ----------------------------

t('patched ingredient — the 3-tier weightless patch', async () => {
  const { local } = await differential({
    name: 'Patched Broth',
    servings: 2,
    ingredients: [{
      fdcId: 169242,
      grams: 30,
      patch: { vitaminD: 17.6 },
      patchNote: 'Sun-dried gills-up: ergosterol converts to D2.',
    }],
  });
  assert.equal(local.companions.length, 2);
  assert.equal(local.json.foodEntries[0].baseAmount, 1, 'patched entries are per-gram');
});

t('patched + unpatched mix keeps both sides in the same order', async () => {
  // The endpoint builds the fdcIds column before custom*; if our regrouping
  // disagreed, every collectionSortIndex would be off by one and this diff fires.
  await differential({
    name: 'Patched Mix',
    servings: 2,
    ingredients: [
      { ref: 'Oil (Avocado)', grams: 10 },
      { fdcId: 169242, grams: 30, patch: { vitaminD: 17.6 } },
    ],
  });
});

// --- naming and encoding ----------------------------------------------------

t('unicode name: stamp and emoji kept in-file, stripped from the filename', async () => {
  const { local, endpoint } = await differential({
    name: 'Crème & Squash Soup [04-09-26] ✴️',
    servings: 2,
    ingredients: [{ fdcId: 169295, grams: 300 }],
  });
  assert.equal(local.json.foodCollections[0].name, 'Crème & Squash Soup [04-09-26] ✴️');
  assert.equal(local.name, 'Crème and Squash Soup.foodnoms');
  // cleanFilename is implemented twice; this is the only check that they agree.
  assert.equal(local.name, endpoint.filename, 'filename sanitisation must match');
});

// --- scale ------------------------------------------------------------------

t('large recipe stays under the query-length limit and still matches', async () => {
  const ids = [169295, 172420, 2709795, 2709660, 2709786, 169231, 2705413, 2709614,
    171287, 169242, 170000, 168436];
  const { url } = await differential({
    name: 'Twelve Ingredients',
    servings: 6,
    ingredients: ids.map((fdcId, i) => ({ fdcId, grams: 50 + i * 25 })),
  });
  console.log(`      URL length: ${url.length} chars`);
  assert.ok(url.length < 8192, `URL is ${url.length} chars — past the usual 8 KB limit`);
});

// --- version awareness ------------------------------------------------------

t('deployed endpoint version matches what the client targets', () => {
  assert.equal(
    liveVersion,
    CLIENT_VERSION,
    `endpoint is v${liveVersion}, client targets v${CLIENT_VERSION}. ` +
      `If v8 is now deployed, raise CLIENT_VERSION here and endpointVersion in ` +
      `lib/foodnoms-url.js, then re-run.`,
  );
});
