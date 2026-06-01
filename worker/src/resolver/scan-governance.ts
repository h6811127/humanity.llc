/** Published process links for suspension / governance copy (Flow 2 F2-3). */
export interface GovernanceProcessUrls {
  data_policy_url: string;
  architecture_url: string;
  appeal_url: string;
}

/**
 * @param {string} origin Site origin (e.g. https://humanity.llc)
 */
export function governanceProcessUrls(origin: string): GovernanceProcessUrls {
  const base = String(origin).replace(/\/$/, "");
  return {
    data_policy_url: `${base}/data-policy.html`,
    architecture_url: `${base}/architecture.html`,
    appeal_url: `${base}/appeal/`,
  };
}

/**
 * @param {string | null | undefined} scanUrl
 * @param {string} [fallback]
 */
export function originFromScanUrl(
  scanUrl: string | null | undefined,
  fallback = "https://humanity.llc"
): string {
  if (!scanUrl) return fallback;
  try {
    return new URL(scanUrl).origin;
  } catch {
    return fallback;
  }
}
