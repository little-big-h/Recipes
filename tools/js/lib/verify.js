// verify.js — cross-check the locally built .foodnoms against the Wolfram endpoint.
//
// Two independent implementations of the same format now exist: this repo's JS
// (lib/foodnoms-file.js) and the deployed Wolfram APIFunction. That is only
// worth having if they are actually checked against each other — otherwise the
// second one is just an untested fork. So whenever the endpoint is reachable, we
// build both and diff them.
//
// The comparison is SEMANTIC, not byte-for-byte. Both sides serialise the same
// JSON, but key order follows each implementation's own association order, and
// floats print differently (Wolfram's N[...,6] vs JS's shortest round-trip). A
// byte diff would fire constantly on differences that cannot affect FoodNoms,
// which reads the parsed JSON.

import { foodnomsTotals } from './foodnoms-file.js';

/** Floats from two languages agree to within a relative epsilon, not exactly. */
const REL_EPS = 1e-6;

function numbersDiffer(a, b) {
  if (a === b) return false;
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) / scale > REL_EPS;
}

/**
 * Recursively diff two decoded structures, returning human-readable paths.
 * Arrays compare positionally; objects by key union, so a field present on only
 * one side is reported rather than silently ignored.
 */
export function diffJson(local, remote, path = '', out = []) {
  if (typeof local === 'number' && typeof remote === 'number') {
    if (numbersDiffer(local, remote)) out.push(`${path}: local ${local} vs endpoint ${remote}`);
    return out;
  }
  if (Array.isArray(local) || Array.isArray(remote)) {
    if (!Array.isArray(local) || !Array.isArray(remote)) {
      out.push(`${path}: type mismatch (array vs non-array)`);
      return out;
    }
    if (local.length !== remote.length) {
      out.push(`${path}: length ${local.length} vs ${remote.length}`);
    }
    for (let i = 0; i < Math.max(local.length, remote.length); i++) {
      diffJson(local[i], remote[i], `${path}[${i}]`, out);
    }
    return out;
  }
  if (local && remote && typeof local === 'object' && typeof remote === 'object') {
    for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const p = path ? `${path}.${k}` : k;
      if (!(k in local)) out.push(`${p}: missing locally (endpoint has ${JSON.stringify(remote[k])})`);
      else if (!(k in remote)) out.push(`${p}: missing at endpoint (local has ${JSON.stringify(local[k])})`);
      else diffJson(local[k], remote[k], p, out);
    }
    return out;
  }
  if (local !== remote) {
    out.push(`${path}: local ${JSON.stringify(local)} vs endpoint ${JSON.stringify(remote)}`);
  }
  return out;
}

/**
 * Ask the endpoint for its JSON view of the same recipe.
 * Returns `{ reachable: false, reason }` rather than throwing when Wolfram Cloud
 * is down — an outage must not fail a build that no longer depends on it.
 */
/**
 * Classify a non-2xx status.
 *
 * The distinction that matters, and the reason this function exists: an
 * **outage** means Wolfram is down and the cross-check simply did not happen,
 * while a **rejection** means the endpoint was reached, understood the request
 * and refused it. A rejection is information about our URL, not about Wolfram's
 * availability, and reporting one as "endpoint unreachable" sends the reader
 * looking for a network problem that is not there. That mislabelling cost three
 * manual checks on 2026-11-03/04 before it was fixed.
 */
function classifyStatus(status) {
  if (status === 400) return 'rejected';
  if (status === 414) return 'url-too-long';
  if (status >= 500) return 'outage';
  return 'unknown';
}

/**
 * The endpoint reports `APIFunction` parameter failures in its own JSON body:
 * a top-level `Failure` string naming the bad fields, and a `Fields` map whose
 * entries carry their own `Failure`. Both are worth surfacing — the field names
 * are what identify *which* constraint was hit.
 */
function extractFailure(body) {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  const message = typeof parsed?.Failure === 'string' ? parsed.Failure : null;
  const fields = Object.entries(parsed?.Fields ?? {})
    .filter(([, v]) => v && typeof v.Failure === 'string')
    .map(([k, v]) => `${k}: ${v.Failure}`);
  return message || fields.length ? { message, fields } : null;
}

export async function fetchEndpointJson(url, { timeoutMs = 60_000 } = {}) {
  let res;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    return { reachable: false, kind: 'outage', reason: `request failed: ${err.message}` };
  }
  const body = await res.text();
  if (!res.ok) {
    // Wolfram Cloud serves an HTML maintenance page, not JSON, during upgrades.
    const upgrading = /Scheduled Upgrade/i.test(body);
    const kind = upgrading ? 'outage' : classifyStatus(res.status);
    const failure = extractFailure(body);
    const parts = [`HTTP ${res.status}`];
    if (upgrading) parts.push('Wolfram Cloud scheduled upgrade');
    else if (kind === 'url-too-long') parts.push(`URL too long — ${url.length} chars`);
    if (failure?.message) parts.push(failure.message);
    return {
      reachable: false,
      kind,
      status: res.status,
      reason: parts.join(' — '),
      failure: failure?.message ?? null,
      fieldFailures: failure?.fields ?? [],
    };
  }
  try {
    return { reachable: true, data: JSON.parse(body) };
  } catch {
    return {
      reachable: false,
      kind: 'unknown',
      reason: 'endpoint returned non-JSON',
      status: res.status,
    };
  }
}

/**
 * Compare a locally built file against the endpoint's rendering of the same URL.
 *
 * @param {{json: object, name: string}} local  from buildFoodNomsJson()
 * @param {string} url                          from buildFoodNomsUrl()
 * @returns {Promise<{reachable: boolean, equivalent?: boolean, differences?: string[],
 *                    totalsDifferences?: string[], reason?: string}>}
 */
export async function verifyAgainstEndpoint(local, url) {
  const res = await fetchEndpointJson(url);
  if (!res.reachable) return res;

  const differences = diffJson(local.json, res.data.recipe ?? {}, 'recipe');
  // Totals are compared separately: they are what a Nutrition block quotes, so a
  // totals match matters even if a cosmetic field differs.
  const totalsDifferences = diffJson(
    foodnomsTotals(local.json),
    res.data.totals ?? {},
    'totals',
  );

  return {
    reachable: true,
    equivalent: differences.length === 0 && totalsDifferences.length === 0,
    differences,
    totalsDifferences,
    endpointFilename: res.data.filename,
    endpointWarnings: res.data.warnings ?? [],
  };
}
