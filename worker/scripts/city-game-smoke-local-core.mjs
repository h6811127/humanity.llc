/**
 * Pure helpers for local city-game scan smoke checks.
 * Keep strings aligned with worker/src/city-game/scan-view.ts.
 */

export const GAME_NODE_SCAN_FOOT =
  "This scan shows public object state — not who scanned, player scores, or location history.";

export const GAME_NODE_SCAN_PRIVACY_NOTE =
  "Opening this QR is not logged. If you choose to contribute, a public count on this object updates — not your identity.";

export const GAME_NODE_FORBIDDEN_COPY = [
  "leaderboard",
  "xp",
  "experience points",
  "scan count",
  "streak",
  "heat map",
  "heatmap",
];

/**
 * @param {string} html
 */
export function extractScanMain(html) {
  const match = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return match?.[1] ?? html;
}

/**
 * @param {string} main
 * @param {string} className
 */
export function hasRenderedClass(main, className) {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`class="[^"]*\\b${escaped}\\b`, "i").test(main);
}

/**
 * @param {string} main
 * @param {string} term
 */
export function forbiddenCopyInMain(main, term) {
  const lower = main.toLowerCase();
  if (term.includes(" ")) {
    return lower.includes(term);
  }
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(main);
}

/**
 * @param {string} html
 * @param {{ nodeId: string; label?: string; requireCoopHint?: boolean; requireContributeBlock?: boolean; expectDormant?: boolean }} opts
 * @returns {{ ok: true } | { ok: false; reason: string }}
 */
export function assessGameScanHtml(html, opts) {
  if (!html || typeof html !== "string") {
    return { ok: false, reason: `${opts.nodeId}: empty HTML response` };
  }

  const main = extractScanMain(html);

  if (!main.includes(GAME_NODE_SCAN_FOOT)) {
    return {
      ok: false,
      reason: `${opts.nodeId}: missing game scan foot copy. Is CITY_GAME_ENABLED=1 in worker/.dev.vars?`,
    };
  }

  const hasDormant = hasRenderedClass(main, "scan-game-dormant-note");
  if (opts.expectDormant) {
    if (!hasDormant) {
      return { ok: false, reason: `${opts.nodeId}: expected dormant note` };
    }
  } else if (hasDormant) {
    return { ok: false, reason: `${opts.nodeId}: unexpected dormant note` };
  }

  for (const term of GAME_NODE_FORBIDDEN_COPY) {
    if (forbiddenCopyInMain(main, term)) {
      return { ok: false, reason: `${opts.nodeId}: forbidden copy "${term}" found` };
    }
  }

  if (opts.label && !main.includes(opts.label)) {
    return { ok: false, reason: `${opts.nodeId}: expected label "${opts.label}" not in HTML` };
  }

  if (opts.requireCoopHint && !hasRenderedClass(main, "scan-game-coop-hint")) {
    return { ok: false, reason: `${opts.nodeId}: expected scan-game-coop-hint` };
  }

  if (opts.requireContributeBlock) {
    const hasContribute =
      hasRenderedClass(main, "scan-game-contribute") || /id="scan-game-contribute"/.test(main);
    if (!hasContribute) {
      return { ok: false, reason: `${opts.nodeId}: expected scan-game-contribute block` };
    }
  }

  return { ok: true };
}

/**
 * @param {string} apiOrigin
 * @param {string | null | undefined} localScanUrl
 * @param {string | undefined} scanUrl
 */
export function resolveSmokeScanUrl(apiOrigin, localScanUrl, scanUrl) {
  if (localScanUrl) return localScanUrl;
  if (scanUrl && apiOrigin) {
    try {
      const u = new URL(scanUrl);
      const local = new URL(apiOrigin);
      u.protocol = local.protocol;
      u.host = local.host;
      return u.toString();
    } catch {
      return scanUrl;
    }
  }
  return scanUrl ?? null;
}
