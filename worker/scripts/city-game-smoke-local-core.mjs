/**
 * Pure helpers for local city-game scan smoke checks.
 * Keep strings aligned with worker/src/city-game/scan-view.ts.
 */

export const GAME_NODE_SCAN_FOOT =
  "This scan shows public object state — not who scanned, player scores, or location history.";

export const GAME_NODE_SCAN_PRIVACY_NOTE =
  "Opening this QR is not logged. If you choose to contribute, a public count on this object updates — not your identity.";

/** Launch checklist E5 / install QA minimum HTTP spot-check nodes. */
export const INSTALL_QA_SPOT_NODE_IDS = ["node_01", "node_04", "node_07"];

/** E2 one-phone scenario baseline nodes — @see docs/CITY_GAME_INSTALL_QA.md § Scenario spot-checks */
export const INSTALL_QA_SCENARIO_NODE_IDS = [
  "node_01",
  "node_02",
  "node_04",
  "node_05",
  "node_07",
  "node_09",
  "node_11",
  "node_12",
  "node_14",
];

/** @type {Record<string, { requireCoopHint?: boolean; requireOnboarding?: boolean; requireContributeBlock?: boolean; expectDormant?: boolean }>} */
export const INSTALL_QA_SPOT_EXPECTATIONS = {
  node_01: { requireOnboarding: true },
  node_04: { requireOnboarding: true, requireContributeBlock: true },
  node_07: { requireOnboarding: true },
};

/** @type {Record<string, { requireCoopHint?: boolean; requireOnboarding?: boolean; requireContributeBlock?: boolean; expectDormant?: boolean }>} */
export const INSTALL_QA_SCENARIO_EXPECTATIONS = {
  ...INSTALL_QA_SPOT_EXPECTATIONS,
  node_02: { requireOnboarding: true },
  node_12: { requireOnboarding: true },
};

/** Manual follow-ups after HTTP baseline (operator flips / contribute on phone). */
export const INSTALL_QA_SCENARIO_MANUAL_CHECKS = [
  "node_04 · site code CR-LANTERN-7K → quorum unlocks node_07 (npm run city-game:smoke-contribute-local)",
  "node_04 · after visible_until → dormant note (time-gated — optional)",
  "node_05 · compromise flip then revoke via /game-operator/",
  "node_07 · after River quorum → unlocked together copy",
  "node_09, node_11, node_01 · fragment site codes → finale on node_13",
  "node_14 · care pause flip → game bulletins muted",
];

export const INSTALL_QA_REQUIRED_NODE_COUNT = 15;

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
 * @param {{ nodeId: string; label?: string; requireCoopHint?: boolean; requireOnboarding?: boolean; requireContributeBlock?: boolean; expectDormant?: boolean }} opts
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

  if (opts.requireOnboarding) {
    const hasOnboarding = hasRenderedClass(main, "scan-game-onboarding");
    const hasContributeAttr = /data-game-contribute="1"/.test(main);
    if (!hasOnboarding && !hasContributeAttr) {
      return {
        ok: false,
        reason: `${opts.nodeId}: expected scan-game-onboarding or data-game-contribute`,
      };
    }
  }

  if (opts.requireContributeBlock) {
    const hasContribute =
      hasRenderedClass(main, "scan-game-contribute") || /id="scan-game-contribute"/.test(main);
    if (!hasContribute) {
      const hasCollectiveProgress =
        hasRenderedClass(main, "scan-game-coop-hint") ||
        hasRenderedClass(main, "scan-game-onboarding") ||
        /data-game-contribute="1"/.test(main) ||
        /shared count for the whole city/i.test(main) ||
        /when enough people contribute/i.test(main);
      if (!hasCollectiveProgress) {
        return {
          ok: false,
          reason: `${opts.nodeId}: expected scan-game-contribute block or collective progress copy`,
        };
      }
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
