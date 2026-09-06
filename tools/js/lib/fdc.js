// fdc.js — USDA FoodData Central client.
//
// Port of the fetch/cache/retry half of tools/fdc-lookup.wl. Runs locally under
// Node (>=20, for global fetch), so the FDC call no longer happens inside a
// Wolfram Cloud APIFunction. That matters: every per-ingredient FDC failure used
// to surface as a 503 — or, worse, the opaque
// `400 {"Success":false,"Failure":"Failed to encode HTTPResponse"}` documented at
// length in fdc-lookup.wl — from an endpoint that was otherwise just formatting
// bytes. Failures now happen here, named, with the offending ingredient in the
// message.
//
// The disk cache is the other reason this is local. The free key is rate-limited
// to ~1000 requests/day per IP and every ingredient of every recipe costs one
// call, so an in-memory memo (all Wolfram could offer across separate HTTP
// requests) threw the whole cache away between invocations. On disk, a record
// fetched once is free forever.

import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Cache lives beside the tool, one JSON file per fdcId. Git-ignored. */
export const CACHE_DIR = process.env.FDC_CACHE_DIR ?? join(HERE, '..', '.cache', 'fdc');

/**
 * The project's free FDC key, same one committed in tools/fdc-lookup.wl.
 * Override with FDC_API_KEY to spend a different key's daily quota.
 */
const DEFAULT_KEY = 'CQawDjU3RVijSYCgvhRxH1ReIT12ZS02LkbXX3f1';
export const apiKey = () => process.env.FDC_API_KEY || DEFAULT_KEY;

const MAX_TRIES = 3;
const BASE_BACKOFF_MS = 500;
const TIMEOUT_MS = 30_000;

/**
 * A named, actionable failure — the JS equivalent of Wolfram's
 * `Failure["fdcUnavailable", ...]`. Thrown rather than returned so it cannot
 * ride silently into a response the way the unevaluated Wolfram accessors did.
 */
export class FdcUnavailableError extends Error {
  constructor(what, cause) {
    // The cause decides the advice. Asserting "quota exhausted" for every
    // failure sent a reader hunting a rate limit that was not the problem while
    // the real answer — a 404 on this one record — sat in the discarded status.
    const detail = cause?.status === 404
      ? `That fdcId returned 404 under \`format=full\`. Some records (seen on ` +
        `Foundation entries) are only served as \`format=abridged\`, so this is ` +
        `about the record, not the key or the quota — a burst of other lookups ` +
        `will succeed. Pick a different fdcId with \`cli.js search\`.`
      : cause?.status === 429
        ? `The key is rate-limited (HTTP 429): ~1000 requests/day per IP, one ` +
          `per ingredient. Wait for the daily reset or set FDC_API_KEY to ` +
          `another key. Do NOT retry in a loop.`
        : `Last error: ${cause?.message ?? 'unknown'}. Do NOT retry in a loop.`;
    super(`USDA FoodData Central lookup failed for ${what}. ${detail}`);
    this.name = 'FdcUnavailableError';
    this.what = what;
    if (cause !== undefined) this.cause = cause;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * One FDC GET, retried with exponential backoff.
 *
 * Two non-obvious failure shapes, both inherited from the Wolfram version's
 * hard-won comments: an error body still parses as valid JSON but carries an
 * `error` key, and a rate-limit answers 429 with a perfectly well-formed
 * payload. Neither is data. Returns null when every try failed.
 */
async function fetchJson(url) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    if (attempt > 0) await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        lastErr.status = res.status;
        // A 4xx that is not 429 is the server's settled answer — the record is
        // absent, or the request is malformed. Retrying cannot change it, and
        // two more round trips only delay a failure that is already final.
        if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
        continue;
      }
      const data = await res.json();
      if (data && typeof data === 'object' && !Array.isArray(data) && 'error' in data) {
        lastErr = new Error(`FDC error body: ${JSON.stringify(data.error)}`);
        continue;
      }
      return data;
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr) fetchJson.lastError = lastErr;
  return null;
}

/**
 * Search FDC by name. Returns ranked candidates to judge — deliberately does not
 * auto-pick, because picking the top hit blind is how "Squash, winter, butternut,
 * raw" becomes a butternut squash *soup* record.
 *
 * @returns {Promise<Array<{fdcId:number, description:string, dataType:string}>>}
 */
export async function searchFoods(query, n = 5) {
  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey())}` +
    `&query=${encodeURIComponent(query)}&pageSize=${encodeURIComponent(String(n))}`;
  const data = await fetchJson(url);
  if (!data) throw new FdcUnavailableError(`search ${JSON.stringify(query)}`, fetchJson.lastError);
  return (data.foods ?? []).map((f) => ({
    fdcId: f.fdcId,
    description: f.description,
    dataType: f.dataType,
  }));
}

const cachePath = (fdcId) => join(CACHE_DIR, `${fdcId}.json`);

/**
 * Fetch one full-format FDC record, cached on disk.
 *
 * `format=full` is not optional: the abridged format rounds values and omits
 * whole nutrients (sugars on FNDDS foods, for one), so abridged numbers do not
 * reconcile against what FoodNoms stores.
 *
 * Only successes are cached, so a transient failure is retried next run rather
 * than poisoning the cache.
 */
export async function getFood(fdcId, { refresh = false } = {}) {
  if (!refresh) {
    try {
      return JSON.parse(await readFile(cachePath(fdcId), 'utf8'));
    } catch {
      // cache miss — fall through and fetch
    }
  }
  const url =
    `https://api.nal.usda.gov/fdc/v1/food/${encodeURIComponent(String(fdcId))}` +
    `?api_key=${encodeURIComponent(apiKey())}&format=full`;
  const data = await fetchJson(url);
  if (!data || !Array.isArray(data.foodNutrients)) {
    throw new FdcUnavailableError(`fdcId ${fdcId}`, fetchJson.lastError);
  }
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cachePath(fdcId), JSON.stringify(data), 'utf8');
  return data;
}

/** Drop cached records — e.g. to pick up a corrected USDA row. */
export async function clearCache() {
  let names;
  try {
    names = await readdir(CACHE_DIR);
  } catch {
    return 0;
  }
  const stale = names.filter((n) => n.endsWith('.json'));
  await Promise.all(stale.map((n) => unlink(join(CACHE_DIR, n))));
  return stale.length;
}
