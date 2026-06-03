/**
 * B5 — concurrent contribute load assessment (node_04 quorum).
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § B5
 */

/** Default concurrent POST count for launch load gate. */
export const CONTRIBUTE_LOAD_CONCURRENCY = 20;

/**
 * @typedef {{ status: number; body?: unknown; error?: string }} ContributeLoadResult
 */

/**
 * @param {ContributeLoadResult[]} results
 * @param {{ concurrency?: number }} [opts]
 */
export function assessContributeLoadResults(results, opts = {}) {
  const concurrency = opts.concurrency ?? CONTRIBUTE_LOAD_CONCURRENCY;
  const issues = [];

  if (!Array.isArray(results) || results.length !== concurrency) {
    issues.push(`Expected ${concurrency} responses, got ${results?.length ?? 0}.`);
    return { ok: false, issues, summary: null };
  }

  let okCount = 0;
  let serverErrorCount = 0;
  let rateLimitedCount = 0;

  for (let i = 0; i < results.length; i += 1) {
    const row = results[i];
    if (!row || typeof row.status !== "number") {
      issues.push(`Response ${i + 1}: missing status.`);
      continue;
    }
    if (row.status >= 500) {
      serverErrorCount += 1;
      issues.push(`Response ${i + 1}: server error ${row.status}.`);
    } else if (row.status === 429) {
      rateLimitedCount += 1;
    } else if (row.status === 200) {
      okCount += 1;
    } else {
      issues.push(`Response ${i + 1}: unexpected status ${row.status}.`);
    }
  }

  if (serverErrorCount > 0) {
    issues.push(`${serverErrorCount} server error(s) under concurrent load.`);
  }
  if (okCount < concurrency) {
    issues.push(`Only ${okCount}/${concurrency} requests returned HTTP 200.`);
  }

  return {
    ok: issues.length === 0,
    issues,
    summary: { okCount, serverErrorCount, rateLimitedCount, concurrency },
  };
}

/**
 * @param {{ finalProgress: number; expectedTarget: number; results: ContributeLoadResult[]; concurrency?: number }} input
 */
export function assessQuorumLoadOutcome(input) {
  const base = assessContributeLoadResults(input.results, {
    concurrency: input.concurrency,
  });
  if (!base.ok) return base;

  const issues = [...base.issues];
  if (input.finalProgress !== input.expectedTarget) {
    issues.push(
      `Final quorum progress ${input.finalProgress} != expected ${input.expectedTarget}.`
    );
  }

  return {
    ok: issues.length === 0,
    issues,
    summary: base.summary,
  };
}
