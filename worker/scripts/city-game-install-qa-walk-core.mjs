/**
 * C3 physical install QA — LAN walk kit (3 phones × 15 nodes).
 * @see docs/CITY_GAME_INSTALL_QA.md
 */

import { resolveKitScanUrls } from "./city-game-comprehension-kit-core.mjs";
import { INSTALL_QA_REQUIRED_NODE_COUNT } from "./city-game-smoke-local-core.mjs";

export const LOCAL_DEV_INSTALL_QA_WALK_REL = "site/dev/city-game-install-qa-walk.html";
export const INSTALL_QA_REL = "docs/CITY_GAME_INSTALL_QA.md";

export const INSTALL_QA_PER_NODE_CHECKS = [
  "QR resolves — HTTP 200, not 404",
  "Same on phone B (different OS if possible)",
  "Same on phone C",
  "Public object state — not app download wall",
  "No leaderboard / streak / XP / scan-count copy",
  "Care stream visible (node_14 boundary copy)",
  "Sticker placement matches registry label",
];

/**
 * @param {Array<{ node_id: string; label?: string; href?: string | null }>} nodes
 * @param {{ host?: string }} [opts]
 */
export function buildInstallQaWalkKitHtml(nodes, opts = {}) {
  const host = opts.host ?? "127.0.0.1";
  const rows = nodes
    .map((node) => {
      const href = node.href ?? "";
      const link = href
        ? `<a class="scan-link" href="${href}">${node.label ?? node.node_id}</a>`
        : `<span class="missing">${node.node_id} — re-seed</span>`;
      const checks = INSTALL_QA_PER_NODE_CHECKS.map(
        (text, index) =>
          `<li><label><input type="checkbox" disabled /> ${index + 1}. ${text}</label></li>`
      ).join("");
      return `<section class="node">
  <h2>${node.node_id} · ${node.label ?? node.node_id}</h2>
  ${link}
  <ul class="checks">${checks}</ul>
</section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Cedar Rapids · install QA walk (C3)</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 1rem auto; padding: 0 1rem; line-height: 1.45; }
    h1 { font-size: 1.25rem; }
    .intro { background: #f4f4f5; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; }
    .node { border-top: 1px solid #ddd; padding: 1rem 0; }
    .scan-link { display: inline-block; margin: 0.5rem 0; font-weight: 600; }
    .checks { padding-left: 1.1rem; }
    .missing { color: #b45309; }
    .footer { margin-top: 2rem; font-size: 0.9rem; color: #555; }
  </style>
</head>
<body>
  <h1>Physical install QA · ${INSTALL_QA_REQUIRED_NODE_COUNT} nodes × 3 phones</h1>
  <div class="intro">
    <p><strong>C3 human gate.</strong> Use phones A, B, C on the same Wi‑Fi as this laptop (${host}). Tap each link; check all seven items per node.</p>
    <p>After stickers are placed, mark the install map installed, then:</p>
    <p><code>npm run city-game:install-qa-sign-off -- --pass --apply --phones 3 --nodes 15</code></p>
  </div>
  ${rows}
  <p class="footer">Internal · ${INSTALL_QA_REL} · not for players</p>
</body>
</html>`;
}

/**
 * @param {Array<{ node_id?: string; public_label?: string; local_scan_url?: string; scan_url?: string }>} seedNodes
 * @param {string} profileId
 * @param {string} host
 */
export function resolveInstallQaWalkNodes(seedNodes, profileId, host) {
  const kitNodes = resolveKitScanUrls(seedNodes, profileId, host);
  return kitNodes.map((node) => ({
    node_id: node.node_id,
    label: node.label,
    href: node.href,
  }));
}

/**
 * @param {{
 *   nodeCount: number;
 *   walkUrl: string;
 *   host: string;
 * }} report
 */
export function formatInstallQaWalkKitReport(report) {
  return [
    "Cedar Rapids · install QA walk kit (C3)",
    "",
    `Nodes: ${report.nodeCount}/${INSTALL_QA_REQUIRED_NODE_COUNT}`,
    `Open: ${report.walkUrl}`,
    "",
    "Requires npm run city-game:dev -- --lan on home Wi‑Fi or hotspot.",
    "After pass:",
    "  npm run city-game:install-map-sign-off -- --mark-installed --apply",
    "  npm run city-game:install-qa-sign-off -- --pass --apply --phones 3 --nodes 15",
  ].join("\n");
}
