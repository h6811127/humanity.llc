/**
 * WS-OBJECT-GRAPH dual-gate field walk — manual witness + quorum path on cabinet.
 * @see docs/WS_OBJECT_GRAPH_DUAL_GATE_WALK_V1.md
 */

import { seasonSlugFromRulesPath } from "../../site/js/city-game-season-path-shared.mjs";

export const LOCAL_DUAL_GATE_WALK_REL = "site/dev/ws-object-graph-v1/dual-gate-walk.html";

/** Cedar Rapids cabinet dual-gate is the v1 reference season. */
export function seasonHasDualGateScanGraph(season) {
  return String(season?.season_id ?? "").trim() === "cr_season_01_wake";
}

/** @param {Record<string, unknown>} season */
export function comprehensionDualGateWalkPageRel(season) {
  const slug = seasonSlugFromRulesPath(String(season.rules_path ?? "")) ?? "cedar-rapids";
  return `site/play/${slug}/comprehension/dual-gate-walk.html`;
}

/** @param {Record<string, unknown>} season @param {string} [origin] */
export function comprehensionDualGateWalkProductionUrl(season, origin = "https://humanity.llc") {
  const rel = comprehensionDualGateWalkPageRel(season).replace(/^site\//, "");
  return `${origin.replace(/\/$/, "")}/${rel}`;
}

export const DUAL_GATE_WALK_STEPS = [
  {
    id: "D0",
    title: "Cabinet baseline",
    prompt:
      "Scan cabinet. Expand Live object details. Graph shows witness + unlock rows — both Missing. Legacy vouch chips hidden.",
    expect: "Dual-gate graph · both edges pending",
  },
  {
    id: "D1",
    title: "Library witness",
    prompt:
      "Scan library witness seal. Complete scarcity contribute (site code if printed). Return to cabinet status JSON — witness edge satisfied.",
    expect: "Witness edge Live · unlock still Missing",
  },
  {
    id: "D2",
    title: "River quorum",
    prompt:
      "Scan River Lantern. Complete quorum contribute. Return to cabinet — unlock edge satisfied.",
    expect: "Unlock edge Live · witness already Live",
  },
  {
    id: "D3",
    title: "Cabinet open",
    prompt:
      "Re-scan cabinet. Graph rows show Live (or hero opens). No legacy chips. Both edges in relationships[] satisfied.",
    expect: "Dual-gate satisfied · cabinet path open",
  },
];

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {{
 *   cabinetScan: string;
 *   libraryScan?: string | null;
 *   riverScan?: string | null;
 *   siteCodes?: { witness?: string | null; quorum?: string | null };
 *   labels?: { cabinet?: string; library?: string; river?: string };
 *   production?: boolean;
 * }} input
 */
export function buildDualGateWalkKitHtml(input) {
  const production = Boolean(input.production);
  const witnessCode = input.siteCodes?.witness
    ? `<p class="walk-site-code">Witness site code: <strong>${escapeHtml(input.siteCodes.witness)}</strong></p>`
    : "";
  const quorumCode = input.siteCodes?.quorum
    ? `<p class="walk-site-code">Quorum site code: <strong>${escapeHtml(input.siteCodes.quorum)}</strong></p>`
    : "";

  const scanLinks = [
    `<li><a href="${escapeHtml(input.cabinetScan)}">${escapeHtml(input.labels?.cabinet || "Cabinet")}</a></li>`,
    input.libraryScan
      ? `<li><a href="${escapeHtml(input.libraryScan)}">${escapeHtml(input.labels?.library || "Library witness")}</a></li>`
      : "",
    input.riverScan
      ? `<li><a href="${escapeHtml(input.riverScan)}">${escapeHtml(input.labels?.river || "River Lantern")}</a></li>`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const steps = DUAL_GATE_WALK_STEPS.map(
    (step) => `<section class="walk-step" id="${escapeHtml(step.id)}">
  <h2>${escapeHtml(step.id)} · ${escapeHtml(step.title)}</h2>
  <p>${escapeHtml(step.prompt)}</p>
  <p class="walk-expect"><strong>Expect:</strong> ${escapeHtml(step.expect)}</p>
</section>`
  ).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WS-OBJECT-GRAPH · dual-gate field walk</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1 { font-size: 1.35rem; }
    .walk-meta { color: #444; font-size: 0.95rem; }
    .walk-step { border-top: 1px solid #ddd; padding-top: 1rem; margin-top: 1rem; }
    .walk-expect { font-size: 0.95rem; }
    .walk-site-code { font-size: 0.95rem; }
    ul { padding-left: 1.2rem; }
    a { word-break: break-all; }
  </style>
</head>
<body>
  <h1>Dual-gate cabinet field walk</h1>
  <p class="walk-meta">${production ? "Production" : "Local worker"} · witness <code>edge_cr_witness_10_07</code> + unlock <code>edge_cr_unlock_04_07</code></p>
  ${witnessCode}
  ${quorumCode}
  <h2>Scan URLs</h2>
  <ul>${scanLinks}</ul>
  ${steps}
  <p class="walk-meta">Automated belts: <code>npm run ws-object-graph:local-smoke -- --setup --seed --drill</code> · <code>npm run ws-object-graph:dual-gate-spine-local -- --setup --seed</code> (D0–D3) · <code>npm run ws-object-graph:prod-smoke -- --dark-check</code></p>
</body>
</html>
`;
}

/**
 * @param {string} html
 * @param {string} relPath
 */
export function validateDualGateWalkKitHtml(html, relPath) {
  /** @type {string[]} */
  const issues = [];
  if (!html.includes("Dual-gate cabinet field walk")) {
    issues.push(`${relPath}: missing title`);
  }
  for (const step of DUAL_GATE_WALK_STEPS) {
    if (!html.includes(`id="${step.id}"`)) {
      issues.push(`${relPath}: missing step ${step.id}`);
    }
  }
  if (!html.includes("edge_cr_witness_10_07") || !html.includes("edge_cr_unlock_04_07")) {
    issues.push(`${relPath}: missing edge ids`);
  }
  return { ok: issues.length === 0, issues };
}

/**
 * @param {{ walkUrl: string; cabinetScan: string; production: boolean }} input
 */
export function formatDualGateWalkKitReport(input) {
  const mode = input.production ? "production" : "local dev";
  return [
    "WS-OBJECT-GRAPH dual-gate field walk kit",
    `Mode: ${mode}`,
    `Open: ${input.walkUrl}`,
    `Cabinet: ${input.cabinetScan}`,
  ].join("\n");
}
