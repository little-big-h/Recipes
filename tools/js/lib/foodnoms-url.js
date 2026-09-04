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
// Endpoint v8 (drafted in tools/foodnoms-cloud.wl, NOT yet deployed) adds two
// things this client can use, both gated behind `endpointVersion` so nothing is
// emitted that the live endpoint would reject:
//
//   customSources / customSecondarySources — carry `source: "usda"` on a
//     passthrough entry. Until v8 is live, provenance rests on customFoodIds
//     alone (`foodnoms:usda:<fdcId>`), which identifies the record but does not
//     mark it USDA-sourced.
//   nutrientNameSets / customNutrientSetIds — send each distinct nutrient-key
//     list once and index into it, instead of repeating ~35 keys per ingredient.
//
// Probe the live endpoint with `?emit=version` before raising the default.

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
 * @param {number} [opts.endpointVersion] live endpoint's $fnVersion (default 7).
 *   Raise to 8 once tools/foodnoms-cloud.wl is redeployed — verify first with
 *   `curl '<endpoint>?emit=version' -H 'Accept: application/json'`.
 */
export function buildFoodNomsUrl(result, opts = {}) {
  const {
    collectionType = 3,
    uncertainty,
    emit,
    totalServingSize,
    endpointVersion = 7,
    // Off by default. It costs ~60 chars per ingredient against a query string
    // that is already the binding constraint, FoodNoms drops urlString on a
    // standalone food import anyway, and machine-readable provenance is already
    // carried by customFoodIds (`foodnoms:usda:<fdcId>`). The Wolfram
    // `usdaFoodEntry` did not set urlString either, so off is also the closer
    // match to existing behaviour.
    includeUrls = false,
  } = opts;

  // A patch is only expressible on the endpoint's fdcIds path — patchFor[] keys
  // the patch columns off an fdcId, and the custom* path has no equivalent. So a
  // patched ingredient goes through fdcIds/grams and the endpoint resolves that
  // one from USDA itself; everything else still travels inline. The cost is real
  // (that ingredient reintroduces a server-side FDC call), but a custom* URL
  // would silently hand back an UNPATCHED file, which is worse.
  const patchedIngs = result.ingredients.filter(
    (i) => i.patch && Object.keys(i.patch).length > 0,
  );
  let patchColumns = null;
  if (patchedIngs.length) {
    patchColumns = {
      fdcIds: [], grams: [], patchFdcIds: [], patchNutrientNames: [], patchDeltas: [],
    };
    for (const ing of patchedIngs) {
      if (ing.block.fdcId == null) {
        throw new Error(`${ing.block.name}: a patch needs a USDA-resolved ingredient (pin an fdcId)`);
      }
      patchColumns.fdcIds.push(ing.block.fdcId);
      patchColumns.grams.push(num(ing.quantity));
      for (const [k, v] of Object.entries(ing.patch)) {
        patchColumns.patchFdcIds.push(ing.block.fdcId);
        patchColumns.patchNutrientNames.push(k);
        patchColumns.patchDeltas.push(num(v));
      }
    }
  }

  const names = [];
  const foodIds = [];
  const quantities = [];
  const units = [];
  const nutrientNames = [];
  const nutrientValues = [];
  const uncertainties = [];
  const brands = [];
  const urls = [];
  const sources = [];
  const secondarySources = [];

  let anyUncertainty = false;
  let anyBrand = false;
  let anyUrl = false;
  let anySource = false;

  // Patched ingredients already travel in the fdcIds column above; including
  // them here too would duplicate the entry.
  for (const ing of result.ingredients.filter((i) => !patchedIngs.includes(i))) {
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

    if (block.source || block.secondarySource) anySource = true;
    sources.push(assertSafe(block.source, 'source'));
    secondarySources.push(assertSafe(block.secondarySource, 'secondarySource'));

    const url =
      includeUrls && block.fdcId
        ? `https://fdc.nal.usda.gov/food-details/${block.fdcId}/nutrients`
        : '';
    if (url) anyUrl = true;
    urls.push(url);
  }

  const params = new URLSearchParams();
  if (patchColumns) {
    params.set('fdcIds', patchColumns.fdcIds.join(','));
    params.set('grams', patchColumns.grams.join(','));
    params.set('patchFdcIds', patchColumns.patchFdcIds.join(','));
    params.set('patchNutrientNames', patchColumns.patchNutrientNames.join(','));
    params.set('patchDeltas', patchColumns.patchDeltas.join(','));
  }
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

  if (endpointVersion >= 8) {
    // Intern the repeated key lists. Real recipes reuse a handful of distinct
    // sets across many ingredients (9 foods, 3 sets in the worked example), so
    // this is where the query-length headroom comes from.
    const setIndex = new Map();
    const ids = nutrientNames.map((keys) => {
      if (!setIndex.has(keys)) setIndex.set(keys, setIndex.size + 1); // 1-based
      return setIndex.get(keys);
    });
    params.set('nutrientNameSets', [...setIndex.keys()].join(';'));
    params.set('customNutrientSetIds', ids.join(';'));
  } else {
    params.set('customNutrientNames', nutrientNames.join(';'));
  }
  params.set('customNutrientValues', nutrientValues.join(';'));
  // Optional columns are omitted entirely when unused: the endpoint accepts an
  // empty column or one aligned with custom*, and an all-blank column is noise
  // in an already long URL.
  if (anyUncertainty) params.set('customUncertainties', uncertainties.join(';'));
  if (anyBrand) params.set('customBrands', brands.join(';'));
  if (anyUrl) params.set('customUrls', urls.join(';'));
  // v7 would reject these as unknown parameters, so they are gated too.
  if (anySource && endpointVersion >= 8) {
    params.set('customSources', sources.join(';'));
    params.set('customSecondarySources', secondarySources.join(';'));
  }

  return `${ENDPOINT}?${params.toString()}`;
}
