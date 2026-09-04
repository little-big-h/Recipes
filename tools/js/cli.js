#!/usr/bin/env node
// cli.js — local replacement for the Wolfram FDC + nutrition workflow.
//
//   node tools/js/cli.js search "butternut squash raw"
//   node tools/js/cli.js food 169295
//   node tools/js/cli.js compute recipe.json
//   node tools/js/cli.js url recipe.json
//   node tools/js/cli.js cache-clear
//
// Recipe input is JSON (see tools/js/README.md for the shape).

import { readFile, writeFile } from 'node:fs/promises';
import { searchFoods, getFood, clearCache, FdcUnavailableError } from './lib/fdc.js';
import { toFoodNomsBlock } from './lib/nutrients.js';
import { computeRecipe, incompleteNutrients } from './lib/recipe.js';
import { buildFoodNomsUrl } from './lib/foodnoms-url.js';
import { buildFoodNomsJson, foodnomsBytes, cleanFilename } from './lib/foodnoms-file.js';
import { verifyAgainstEndpoint } from './lib/verify.js';

const USAGE = `Usage:
  cli.js search <query> [n]     rank FDC candidates (judge them, then pin the fdcId)
  cli.js food <fdcId>           per-100 g FoodNoms block for one USDA record
  cli.js compute <recipe.json>  whole-recipe totals
  cli.js build <recipe.json> [-o out.foodnoms]
                                write the .foodnoms file locally, then cross-check
                                it against the Wolfram endpoint when reachable
                                (--no-verify skips the check)
  cli.js url <recipe.json>      BuildFoodNomsRecipe link (nutrients inline, no server FDC)
  cli.js cache-clear            drop cached USDA records
`;

const readSpec = async (path) => JSON.parse(await readFile(path, 'utf8'));

/** Grams for macros, milligrams/micrograms elsewhere — matching FDC's own units. */
const UNITS = {
  calories: 'kcal',
  protein: 'g', fat: 'g', carbs: 'g', sugars: 'g', fiber: 'g', water: 'g',
  fatSaturated: 'g', fatTrans: 'g', fatMonounsaturated: 'g', fatPolyunsaturated: 'g',
  cholesterol: 'mg', sodium: 'mg', potassium: 'mg', calcium: 'mg', iron: 'mg',
  magnesium: 'mg', zinc: 'mg', phosphorus: 'mg', copper: 'mg', manganese: 'mg',
  caffeine: 'mg', vitaminC: 'mg', vitaminE: 'mg', niacin: 'mg', thiamin: 'mg',
  riboflavin: 'mg', vitaminB6: 'mg', pantothenicAcid: 'mg',
  selenium: 'ug', folate: 'ug', vitaminA: 'ug', vitaminD: 'ug', vitaminB12: 'ug',
  vitaminK: 'ug', iodine: 'ug', biotin: 'ug',
};

const round = (v) => (Math.abs(v) >= 100 ? Math.round(v) : Number(v.toPrecision(3)));

function printTotals(result) {
  console.log(`\n${result.name} — whole recipe`);
  console.log(`${result.ingredientCount} ingredients, ${round(result.totalGrams)} g total`);
  if (result.servings) console.log(`${result.servings} servings`);
  console.log('');
  for (const [k, v] of Object.entries(result.totals)) {
    const perServing = result.perServing ? `   (${round(result.perServing[k])} /serving)` : '';
    console.log(`  ${k.padEnd(22)} ${String(round(v)).padStart(9)} ${(UNITS[k] ?? '').padEnd(4)}${perServing}`);
  }

  const gaps = incompleteNutrients(result);
  if (gaps.length) {
    console.log('\n  Partial coverage — these totals are floors, not totals:');
    for (const g of gaps) console.log(`    ${g.nutrient}: from ${g.from} of ${g.of} ingredients`);
  }
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case 'search': {
      if (!args[0]) throw new Error('search needs a query');
      const hits = await searchFoods(args[0], args[1] ? Number(args[1]) : 5);
      if (!hits.length) return console.log('no hits');
      for (const h of hits) console.log(`${String(h.fdcId).padStart(8)}  ${h.dataType.padEnd(16)} ${h.description}`);
      break;
    }
    case 'food': {
      if (!args[0]) throw new Error('food needs an fdcId');
      console.log(JSON.stringify(toFoodNomsBlock(await getFood(Number(args[0]))), null, 2));
      break;
    }
    case 'compute': {
      if (!args[0]) throw new Error('compute needs a recipe JSON path');
      printTotals(await computeRecipe(await readSpec(args[0])));
      break;
    }
    case 'build': {
      if (!args[0]) throw new Error('build needs a recipe JSON path');
      const spec = await readSpec(args[0]);
      const opts = spec.foodnoms ?? {};
      const result = await computeRecipe(spec);
      const file = buildFoodNomsJson(result, opts);
      const outIdx = args.indexOf('-o');
      const out = outIdx > -1 ? args[outIdx + 1] : file.name;
      await writeFile(out, foodnomsBytes(file.json));
      console.log(`wrote ${out} (${foodnomsBytes(file.json).length} bytes)`);
      // A patch's companion files are separate .foodnoms files; their ids are
      // deterministic, so writing them beside the recipe keeps the trio linked.
      for (const c of file.companions ?? []) {
        const path = `${cleanFilename(c.name)}.foodnoms`;
        await writeFile(path, foodnomsBytes(c.json));
        console.log(`  + companion (${c.kind}): ${path}`);
      }
      for (const w of file.warnings) console.log(`  ⚠ ${w}`);

      if (args.includes('--no-verify')) break;
      // The endpoint is a second implementation of this format. Whenever it is
      // up, diff it — an unchecked second implementation is just an untested
      // fork. When it is down, say so and carry on: the file no longer depends
      // on it.
      const check = await verifyAgainstEndpoint(file, buildFoodNomsUrl(result, opts));
      if (!check.reachable) {
        console.log(`\n  endpoint unreachable (${check.reason}) — file written, NOT cross-checked`);
        break;
      }
      if (check.equivalent) {
        console.log('\n  ✓ equivalent to the Wolfram endpoint (recipe JSON + totals)');
        break;
      }
      console.log('\n  ✗ DIFFERS from the Wolfram endpoint:');
      for (const d of [...check.differences, ...check.totalsDifferences]) console.log(`    ${d}`);
      process.exitCode = 1;
      break;
    }
    case 'url': {
      if (!args[0]) throw new Error('url needs a recipe JSON path');
      const spec = await readSpec(args[0]);
      const url = buildFoodNomsUrl(await computeRecipe(spec), spec.foodnoms ?? {});
      console.log(url);
      // Length is worth watching: moving nutrients into the query string is what
      // takes the FDC call off the endpoint, and it is not free.
      console.error(`\n[${url.length} chars]`);
      break;
    }
    case 'cache-clear':
      console.log(`dropped ${await clearCache()} cached records`);
      break;
    default:
      console.log(USAGE);
      process.exitCode = cmd ? 1 : 0;
  }
}

main().catch((err) => {
  // A named FDC failure is an upstream condition with a documented remedy, not a
  // crash — print it plainly, without a stack the user cannot act on.
  console.error(err instanceof FdcUnavailableError ? `\n${err.message}` : err);
  process.exitCode = 1;
});
