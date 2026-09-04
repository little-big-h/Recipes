// foodnoms-url.js — build a BuildFoodNomsRecipe URL that needs no server-side FDC.
//
// This is the bridge to the "Wolfram Cloud for hosting only" architecture. The
// endpoint has always had two input paths (see tools/foodnoms-cloud.wl):
//
//   fdcIds + grams   -> the endpoint calls api.nal.usda.gov itself, per
//                       ingredient, while the caller waits. Every FDC rate-limit
//                       or hiccup becomes a 503 (or the opaque encode-failure
//                       400) from an endpoint that is otherwise just formatting
//                       bytes, and the failure probability compounds as
//                       (1-p)^n over n ingredients.
//   custom*          -> nutrients supplied verbatim in the query string.
//                       `passthroughFoodEntry` does ZERO network I/O.
//
// We resolve and compute locally, then emit the custom* form. The endpoint keeps
// doing the one job it is genuinely good at and that a local script cannot do —
// serving a stable URL that mints the .foodnoms file on click — and stops doing
// the job that made it fail.
//
// KNOWN PROVENANCE GAP: the endpoint exposes no `customSources` parameter, so a
// passthrough entry cannot carry `source: "usda"` / `secondarySource` the way
// `usdaFoodEntry` sets them. We pin `customFoodIds` to `foodnoms:usda:<fdcId>`
// so the record still points at the right USDA food, but closing the gap fully
// needs one endpoint change (add customSources/customSecondarySources). See
// tools/js/README.md.

export const ENDPOINT = 'https://www.wolframcloud.com/obj/pirk0/BuildFoodNomsRecipe';

/** Compact fixed-point: no exponent notation, no trailing-zero noise in the URL. */
function num(v) {
  return String(Number(v.toFixed(6)));
}

/**
 * Free-text columns are `;`-delimited (`DelimitedSequence["String", ";"]`), so a
 * `;` in a value silently splits the column and trips the endpoint's
 * equal-length guard — which reports a length mismatch, not the culprit. Fail
 * here instead, naming the value.
 *
 * Commas are deliberately allowed: only `customNutrientNames`/`Values` split on
 * `,` (they are nested sequences), and those are generated from a fixed key set.
 * USDA descriptions are comma-dense — "Squash, winter, butternut, raw" — so
 * banning commas here would reject almost every real ingredient.
 */
function assertSafe(value, field) {
  if (typeof value === 'string' && value.includes(';')) {
    throw new Error(
      `${field} must not contain ';' — it is the endpoint's column separator. ` +
        `Offending value: ${JSON.stringify(value)}`,
    );
  }
  return value ?? '';
}

/**
 * Build the URL from a computeRecipe() result.
 *
 * @param {object} result           from computeRecipe()
 * @param {object} [opts]
 * @param {number} [opts.collectionType] 3 = recipe (default), 2 = meal log
 * @param {number} [opts.uncertainty]    collection-wide default tier
 * @param {string} [opts.emit]           'recipe' | 'food' | 'fooddef' | 'version'
 * @param {boolean} [opts.includeUrls]   attach FDC provenance URLs (default false)
 */
export function buildFoodNomsUrl(result, opts = {}) {
  const {
    collectionType = 3,
    uncertainty,
    emit,
    totalServingSize,
    // Off by default. It costs ~60 chars per ingredient against a query string
    // that is already the binding constraint, FoodNoms drops urlString on a
    // standalone food import anyway, and machine-readable provenance is already
    // carried by customFoodIds (`foodnoms:usda:<fdcId>`). The Wolfram
    // `usdaFoodEntry` did not set urlString either, so off is also the closer
    // match to existing behaviour.
    includeUrls = false,
  } = opts;

  const names = [];
  const foodIds = [];
  const quantities = [];
  const units = [];
  const nutrientNames = [];
  const nutrientValues = [];
  const uncertainties = [];
  const brands = [];
  const urls = [];

  let anyUncertainty = false;
  let anyBrand = false;
  let anyUrl = false;

  for (const ing of result.ingredients) {
    const { block } = ing;
    const keys = Object.keys(block.nutrients).filter(
      (k) => typeof block.nutrients[k] === 'number',
    );

    names.push(assertSafe(block.name, 'ingredient name'));
    foodIds.push(assertSafe(block.foodID ?? '', 'foodID'));
    quantities.push(num(ing.quantity));
    units.push(assertSafe(ing.unit, 'unit'));
    // Per 100 baseUnit, exactly as passthroughFoodEntry expects — the endpoint
    // applies `quantity` itself, so we must NOT send pre-scaled values here.
    nutrientNames.push(keys.join(','));
    nutrientValues.push(keys.map((k) => num(block.nutrients[k])).join(','));

    if (ing.uncertainty != null) anyUncertainty = true;
    uncertainties.push(ing.uncertainty != null ? String(Math.round(ing.uncertainty)) : '');

    if (block.brandOwner) anyBrand = true;
    brands.push(assertSafe(block.brandOwner, 'brandOwner'));

    const url =
      includeUrls && block.fdcId
        ? `https://fdc.nal.usda.gov/food-details/${block.fdcId}/nutrients`
        : '';
    if (url) anyUrl = true;
    urls.push(url);
  }

  const params = new URLSearchParams();
  params.set('name', result.name);
  if (result.servings != null) params.set('servings', String(result.servings));
  params.set('collectionType', String(collectionType));
  if (emit) params.set('emit', emit);
  if (uncertainty != null) params.set('uncertainty', String(uncertainty));
  if (totalServingSize != null) params.set('totalServingSize', String(totalServingSize));

  params.set('customNames', names.join(';'));
  params.set('customFoodIds', foodIds.join(';'));
  params.set('customQuantities', quantities.join(';'));
  params.set('customUnits', units.join(';'));
  params.set('customNutrientNames', nutrientNames.join(';'));
  params.set('customNutrientValues', nutrientValues.join(';'));
  // Optional columns are omitted entirely when unused: the endpoint accepts an
  // empty column or one aligned with custom*, and an all-blank column is noise
  // in an already long URL.
  if (anyUncertainty) params.set('customUncertainties', uncertainties.join(';'));
  if (anyBrand) params.set('customBrands', brands.join(';'));
  if (anyUrl) params.set('customUrls', urls.join(';'));

  return `${ENDPOINT}?${params.toString()}`;
}
