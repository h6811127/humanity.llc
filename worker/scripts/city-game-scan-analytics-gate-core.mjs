/**
 * B14 / P5 — passive game scans stay private; contribute buckets only by choice.
 * @see docs/REFERENCE_OPERATOR_DATA_POLICY.md § Cedar Rapids collective mechanics
 */

export const POLICY_PASSIVE_SCAN_MARKERS = [
  "opening a game QR (`GET /c/…`) is **not** logged or counted",
  "No hidden scan analytics",
];

/** Resolver paths that must not introduce scan logging tables. */
export const SCAN_ANALYTICS_SOURCE_GUARD = [
  {
    rel: "worker/src/resolver/scan.ts",
    forbidden: [/scan_events/i, /scan_analytics:\s*true/i, /INSERT INTO scan/i],
  },
  {
    rel: "worker/src/resolver/season-snapshot.ts",
    forbidden: [/INSERT INTO/i, /scan_events/i, /scan_count/i],
  },
  {
    rel: "worker/src/db/scan.ts",
    forbidden: [/INSERT INTO scan/i, /scan_events/i],
  },
];

/** Allowed write surface for voluntary contribute (policy exception). */
export const CONTRIBUTE_ALLOWED_WRITE_MARKERS = ["incrementGameContributeBucket"];

/**
 * @param {string} policyMarkdown
 */
export function auditGameScanAnalyticsPolicy(policyMarkdown) {
  const issues = [];
  for (const marker of POLICY_PASSIVE_SCAN_MARKERS) {
    if (!policyMarkdown.includes(marker)) {
      issues.push(`Policy missing marker: ${marker}`);
    }
  }
  return { ok: issues.length === 0, issues };
}

/**
 * @param {Record<string, string>} sourceByRel
 */
export function auditGameScanAnalyticsSource(sourceByRel) {
  const issues = [];

  for (const { rel, forbidden } of SCAN_ANALYTICS_SOURCE_GUARD) {
    const source = sourceByRel[rel];
    if (!source) {
      issues.push(`Missing source for audit: ${rel}`);
      continue;
    }
    for (const pattern of forbidden) {
      if (pattern.test(source)) {
        issues.push(`${rel}: forbidden scan analytics pattern ${pattern}`);
      }
    }
  }

  const contributeSource = sourceByRel["worker/src/resolver/game-contribute.ts"];
  if (!contributeSource) {
    issues.push("Missing game-contribute.ts for contribute write audit");
  } else {
    for (const marker of CONTRIBUTE_ALLOWED_WRITE_MARKERS) {
      if (!contributeSource.includes(marker)) {
        issues.push(`game-contribute.ts missing allowed write marker: ${marker}`);
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * @param {{ policyMarkdown: string; sourceByRel: Record<string, string> }} input
 */
export function auditGameScanAnalyticsGate(input) {
  const policy = auditGameScanAnalyticsPolicy(input.policyMarkdown);
  const source = auditGameScanAnalyticsSource(input.sourceByRel);
  const issues = [...policy.issues, ...source.issues];
  return { ok: issues.length === 0, issues };
}
