// foodnoms-file.js — build a .foodnoms file locally.
//
// Port of `buildFoodNomsRecipe` + `foodnomsBytes` from tools/foodnoms-cloud.wl.
// With FDC resolution and the nutrition arithmetic already local, this is the
// last piece that made the file depend on Wolfram Cloud being up. Wolfram Cloud
// now does one thing only: host a URL.
//
// THE CONTAINER IS NOT COMPRESSED. LZFSE compression is unavailable in Wolfram,
// but the LZFSE container permits an uncompressed block:
//
//     'bvx-' + uint32-LE raw length + raw UTF-8 JSON + 'bvx$'
//
// FoodNoms's own exports are compressed ('bvxn' LZVN / 'bvx2' LZFSE-v2), but all
// three decode through Apple's one LZFSE reader, and the uncompressed 'bvx-'
// variant is verified to import into FoodNoms (Holger, 2026-06-12). So a
// .foodnoms file is plain JSON in a 12-byte wrapper — by design, not a bug.

import { createHash } from 'node:crypto';

/** The 16 whole-recipe slots FoodNoms totals, plus derived salt. */
export const TOTALS_SLOTS = [
  'calories', 'protein', 'carbs', 'sugars', 'fat', 'fatSaturated',
  'fiber', 'sodium', 'iron', 'calcium', 'zinc', 'magnesium', 'potassium',
  'vitaminD', 'vitaminB12', 'folate',
];

/**
 * Stable `local:` UUID derived from a seed — same seed, same id across calls, so
 * a companion file emitted later still links to the recipe referencing it.
 * Mirrors mkLocalID: SHA-256 hex, upper-cased, first 32 chars, dashed 8-4-4-4-12.
 */
export function mkLocalID(seed) {
  const h = createHash('sha256').update(seed, 'utf8').digest('hex').toUpperCase().slice(0, 32);
  return `local:${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/**
 * foodID for a food: the caller's id if given, else a stable hash of
 * name | brand | per-100 g calories. Lower-cased and trimmed so trivial
 * casing/spacing differences don't fork the id.
 */
export function foodIDfor(given, name, brand, nutrients) {
  if (typeof given === 'string' && given.trim() !== '') return given;
  const seed = [
    String(name ?? '').trim().toLowerCase(),
    String(brand ?? '').trim().toLowerCase(),
    nutrients?.calories ?? '',
  ].join('|');
  return mkLocalID(seed);
}

// Emoji / symbol ranges stripped from filenames, matching cleanFilename's
// character classes. The in-file collection name keeps the full
// "...[DD-MM-YY] ✴️" stamp — only the FILENAME is cleaned.
const EMOJI = /[☀-➿⬀-⯿︀-️]|[\u{1F000}-\u{1FAFF}]/gu;

/** Strip the [DD-MM-YY] stamp and emoji, spell '&' as 'and', collapse spaces. */
export function cleanFilename(s) {
  return String(s)
    .replace(/\s*\[\d{2}-\d{2}-\d{2}\]/g, '')
    .replace(EMOJI, '')
    .replace(/#/g, '')
    .replace(/&/g, 'and')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Drop keys whose value is undefined — the JS equivalent of DeleteMissing. */
const compact = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/** The default serving for a standalone food: a bare 100-baseUnit metric weight. */
const serving100 = (unit) => ({ unit, value: 100, traits: 1 });

/**
 * One recipe-ingredient food entry.
 *
 * `nutrients` are ALWAYS per 100 baseUnit and `quantity` is the amount — the
 * consumer scales. Sending pre-scaled nutrients here would multiply the recipe.
 */
function foodEntry(ing, sortIndex) {
  const { block } = ing;
  const unit = ing.unit ?? block.baseUnit ?? 'gram';
  const nutrients = block.nutrients ?? {};
  return compact({
    name: block.name ?? 'Ingredient',
    foodID: foodIDfor(block.foodID, block.name, block.brandOwner, nutrients),
    source: block.source,
    secondarySource: block.secondarySource,
    version: 1,
    baseAmount: block.baseAmount ?? 100,
    baseUnit: unit,
    traits: 0,
    uncertainty: ing.uncertainty > 0 ? Math.round(ing.uncertainty) : undefined,
    quantity: ing.quantity,
    measure: { unit, value: 1, traits: 0 },
    nutrients,
    brandOwner: block.brandOwner,
    barcode: block.barcode,
    urlString: ing.urlString,
    notes: ing.note,
    collectionSortIndex: sortIndex,
  });
}

/**
 * Assemble the .foodnoms JSON for a computeRecipe() result.
 *
 * @param {object} result  from computeRecipe()
 * @param {object} [opts]
 * @param {number} [opts.collectionType] 3 = recipe (default, carries the yield
 *   fields), 2 = meal (a list of foods eaten, no yield)
 * @param {number} [opts.uncertainty]    collection-wide default tier
 * @param {string} [opts.emit]           'recipe' | 'food' | 'fooddef'
 * @param {number} [opts.totalServingSize]
 */
export function buildFoodNomsJson(result, opts = {}) {
  const {
    collectionType = 3,
    uncertainty: defaultUnc = 0,
    emit = 'recipe',
    totalServingSize,
  } = opts;

  const warnings = [];
  const entries = result.ingredients.map((ing, i) =>
    foodEntry(
      { ...ing, uncertainty: ing.uncertainty ?? Math.round(defaultUnc) },
      i,
    ),
  );

  if (emit === 'food' || emit === 'fooddef') {
    if (entries.length > 1) {
      warnings.push(
        `emit=${emit} emits only the first food; ${entries.length - 1} other(s) ignored`,
      );
    }
    if (entries.length === 0) warnings.push(`emit=${emit}: no resolved food to emit`);
    const fe = entries[0];
    const unit = fe?.baseUnit ?? 'gram';

    if (emit === 'food') {
      // contentType 1: a standalone food in ENTRY form — no collection.
      // baseAmount 100 with a pinned 100-unit serving, so FoodNoms' forced
      // "amounts represent = serving size" reads as per-100.
      const { collectionSortIndex, ...rest } = fe ?? {};
      const one = fe
        ? { ...rest, baseAmount: 100, quantity: 1, measure: serving100(unit), measures: [serving100(unit)] }
        : undefined;
      const json = { version: 2, contentType: 1, foodEntries: one ? [one] : [] };
      return { name: `${cleanFilename(one?.name ?? 'Food')}.foodnoms`, json, warnings };
    }

    // contentType 3: a reusable "save to your Foods library" definition. Drops
    // the entry-only quantity/measure/uncertainty.
    const fdef = fe
      ? compact({
          name: fe.name,
          foodID: fe.foodID,
          brandOwner: fe.brandOwner,
          baseUnit: fe.baseUnit,
          nutrients: fe.nutrients,
          baseAmount: 100,
          measures: [serving100(unit)],
          version: 1,
          traits: 0,
          isHidden: false,
        })
      : undefined;
    const json = { version: 2, contentType: 3, foods: fdef ? [fdef] : [] };
    return { name: `${cleanFilename(fe?.name ?? 'Food')}.foodnoms`, json, warnings };
  }

  const totalSize =
    totalServingSize ?? entries.reduce((a, e) => a + (e.quantity ?? 0), 0);

  const collection =
    collectionType === 2
      ? { name: result.name, collectionType: 2, version: 1, traits: 0 }
      : {
          name: result.name,
          collectionType: 3,
          version: 1,
          traits: 0,
          totalServingSize: totalSize,
          servingSizeUnit: 'gram',
          servings: result.servings ?? 1,
        };
  if (warnings.length) collection.notes = `⚠ ${warnings.join(' | ')}`;

  return {
    name: `${cleanFilename(result.name)}.foodnoms`,
    json: { version: 2, contentType: 2, foodCollections: [collection], foodEntries: entries },
    warnings,
  };
}

/** JSON -> .foodnoms bytes: 'bvx-' + uint32-LE length + raw JSON + 'bvx$'. */
export function foodnomsBytes(json) {
  const body = Buffer.from(JSON.stringify(json), 'utf8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(body.length, 0);
  return Buffer.concat([Buffer.from('bvx-', 'ascii'), len, body, Buffer.from('bvx$', 'ascii')]);
}

/** Inverse: drop the 8 leading and 4 trailing bytes and parse. */
export function foodnomsDecode(bytes) {
  const buf = Buffer.from(bytes);
  const magic = buf.subarray(0, 4).toString('ascii');
  if (magic !== 'bvx-') {
    throw new Error(
      `not an uncompressed .foodnoms block (magic ${JSON.stringify(magic)}). ` +
        `'bvxn'/'bvx2' are LZFSE-compressed — FoodNoms writes those, we do not.`,
    );
  }
  return JSON.parse(buf.subarray(8, buf.length - 4).toString('utf8'));
}

/** Decoded-or-bytes .foodnoms -> the 16 whole-recipe slot totals + salt. */
export function foodnomsTotals(input) {
  const r = Buffer.isBuffer(input) || input instanceof Uint8Array ? foodnomsDecode(input) : input;
  const entries = r.foodEntries ?? [];
  const totals = {};
  for (const slot of TOTALS_SLOTS) {
    totals[slot] = entries.reduce(
      (a, e) => a + ((e.nutrients?.[slot] ?? 0) * e.quantity) / e.baseAmount,
      0,
    );
  }
  totals.salt = (totals.sodium * 2.5) / 1000;
  return totals;
}
