/**
 * B1 — human vs game vouch copy audit (rules + scan templates).
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § B1 · R-01
 */

export const RULES_PAGE_REL = "site/play/cedar-rapids/index.html";

/** Copy that conflates Steward human vouch with game witness mechanics. */
export const RULES_PAGE_HUMAN_VOUCH_CONFUSION = [
  {
    re: /steward vouch.*(?:cabinet|game node|node_07|witness seal)/i,
    label: "Steward vouch tied to game cabinet path",
  },
  {
    re: /human verification.*(?:cabinet|witness seal|game node)/i,
    label: "Human verification tied to game node unlock",
  },
  {
    re: /issue vouch.*(?:cabinet|unlock the|game node)/i,
    label: "Issue-vouch CTA tied to game unlock",
  },
];

/** Required markers that game trust comes from place-linked objects. */
export const RULES_PAGE_GAME_VOUCH_MARKERS = [
  { re: /witness seal/i, label: "witness seal" },
  { re: /place-linked objects/i, label: "place-linked objects" },
];

/**
 * @param {string} html
 * @param {{ rel?: string }} [opts]
 */
export function auditRulesPageVouchCopy(html, opts = {}) {
  const rel = opts.rel ?? RULES_PAGE_REL;
  const issues = [];

  for (const { re, label } of RULES_PAGE_HUMAN_VOUCH_CONFUSION) {
    if (re.test(html)) {
      issues.push(`${rel}: conflates human vouch with game path (${label})`);
    }
  }
  for (const { re, label } of RULES_PAGE_GAME_VOUCH_MARKERS) {
    if (!re.test(html)) {
      issues.push(`${rel}: missing game-vouch marker (${label})`);
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Game scan main must distinguish witness/game vouch from human issuance UI.
 * @param {string} scanMainHtml
 */
export function auditGameNodeScanVouchCopy(scanMainHtml) {
  const issues = [];
  const main = scanMainHtml;

  if (/class="scan-game-chips"/.test(main) || /class="scan-game-vouch-note"/.test(main)) {
    if (/Issue vouch/.test(main) && /scan-game-chips|scan-game-vouch-note/.test(main)) {
      const gameBlock = main.match(
        /class="scan-game-chips"[\s\S]*?(?=class="scan-trust-tools"|$)/i
      )?.[0];
      if (gameBlock && /Issue vouch/.test(gameBlock)) {
        issues.push("Game chips block mentions human Issue vouch CTA");
      }
    }
    if (!/Witness vouch|Vouch pending|Trust path still waiting|Not yet open|cooperation with nearby places/i.test(main)) {
      issues.push("Game vouch scan missing witness/trust-path copy");
    }
  }

  return { ok: issues.length === 0, issues };
}
