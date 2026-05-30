/**
 * iOS camera → Safari vs Home Screen PWA steward handoff (vouch / attest).
 * @see docs/PWA_STANDALONE_EXTERNAL_NAVIGATION.md
 * @see docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md § S5
 */

/** Scan URL query flag for steward camera → Safari landings (S5). */
export const STEWARD_SCAN_QUERY_PARAM = "hc_steward";

const STEWARD_SCAN_QUERY_TRUTHY = new Set(["1", "true", "yes"]);

/**
 * @param {URLSearchParams | { get: (name: string) => string | null } | null | undefined} searchParams
 */
export function isStewardScanQueryParam(searchParams) {
  if (!searchParams?.get) return false;
  const raw = String(searchParams.get(STEWARD_SCAN_QUERY_PARAM) ?? "")
    .trim()
    .toLowerCase();
  return STEWARD_SCAN_QUERY_TRUTHY.has(raw);
}

/**
 * @param {string | null | undefined} search
 */
export function readStewardScanQueryParamFromSearch(search) {
  try {
    return isStewardScanQueryParam(new URLSearchParams(String(search ?? "")));
  } catch {
    return false;
  }
}

/**
 * Append `hc_steward=1` when missing (idempotent). Returns input on parse failure.
 * @param {string} url
 */
export function appendStewardScanQueryParam(url) {
  const href = String(url ?? "").trim();
  if (!href) return href;
  try {
    const parsed = new URL(href);
    if (isStewardScanQueryParam(parsed.searchParams)) return parsed.href;
    parsed.searchParams.set(STEWARD_SCAN_QUERY_PARAM, "1");
    return parsed.href;
  } catch {
    return href;
  }
}

/**
 * @param {{
 *   isIosWebKit: boolean;
 *   standalone: boolean;
 *   walletCount?: number;
 *   stewardLanding?: boolean;
 * }} input
 */
export function shouldShowScanPwaCameraHandoff(input) {
  const walletCount = input.walletCount ?? 0;
  if (!input.isIosWebKit || input.standalone) return false;
  if (input.stewardLanding) return true;
  return walletCount < 1;
}

/**
 * Defer L3 actor band until steward handoff is shown (S5).
 *
 * @param {{
 *   stewardLanding: boolean;
 *   isIosWebKit: boolean;
 *   standalone: boolean;
 *   hasTabKeys: boolean;
 * }} input
 */
export function shouldDeferScanActorBandForStewardHandoff(input) {
  if (!input.stewardLanding || !input.isIosWebKit || input.standalone) return false;
  if (input.hasTabKeys) return false;
  return shouldShowScanPwaCameraHandoff({
    isIosWebKit: input.isIosWebKit,
    standalone: input.standalone,
    stewardLanding: true,
    walletCount: 0,
  });
}

/**
 * Mark page + scroll vouch handoff into view after Safari steward landing.
 * @param {{ document?: Document; window?: Window }} [scope]
 */
export function prioritizeStewardHandoffOnScan(scope = {}) {
  const doc = scope.document ?? globalThis.document;
  const win = scope.window ?? globalThis.window;
  if (!doc?.body) return;
  doc.body.dataset.stewardScanHandoff = "1";
  const scroll = () => {
    doc.querySelector(".scan-group-vouch")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  if (typeof win?.requestAnimationFrame === "function") {
    win.requestAnimationFrame(scroll);
  } else {
    scroll();
  }
}
