/**
 * GT comprehension kit — tap URLs + scorecard for human gate (Phase D prep).
 */

import { buildLanScanUrl, rewriteScanUrlForLan } from "./city-game-lan-hub-core.mjs";
import {
  buildJamieWayfindingChecks,
  comprehensionPrimaryNodeId,
  resolveComprehensionProbeNodes,
} from "../../site/js/city-game-player-guide-core.mjs";
import { seasonSlugFromRulesPath } from "../../site/js/city-game-season-path-shared.mjs";

export const COMPREHENSION_RUNBOOK_REL = "docs/CITY_GAME_COMPREHENSION_RUNBOOK.md";
export const LOCAL_DEV_COMPREHENSION_REL = "site/dev/city-game-comprehension.html";
export const COMPREHENSION_INSTALL_QA_PENDING =
  "| GT comprehension (≥5 testers) | ☐ Pending | |";
export const COMPREHENSION_LAUNCH_CHECKLIST_P1_PENDING =
  "| P1 | [`CITY_GAME_COMPREHENSION_RUNBOOK.md`](CITY_GAME_COMPREHENSION_RUNBOOK.md) — ≥5 testers pass GT-1–GT-7 (GT-7 when marketing live board) | ☐ |";
export const COMPREHENSION_RUNBOOK_RESULT_PENDING =
  "| Result | `[ ] Pass · [ ] Fail — copy fix before launch` |";

/** @typedef {{ node_id: string; public_label?: string; qr_id?: string; local_scan_url?: string; scan_url?: string; blurb?: string }} KitNode */

const DEFAULT_NODES = [
  { node_id: "node_04", blurb: "GT-1 / GT-2 — collective unlock + seed clue" },
  { node_id: "node_07", blurb: "GT-4 — cabinet trust path (no account)" },
  { node_id: "node_02", blurb: "GT-3 — sanctuary / regroup" },
  { node_id: "node_14", blurb: "GT-5 — care stream vs game bulletins" },
];

/** Jamie-style wayfinding checks (Phase D human gate supplement). */
export const JAMIE_WAYFINDING_CHECKS = [
  {
    id: "GT-W1",
    prompt: "How would you start? (any sticker / place list — no required first stop)",
  },
  {
    id: "GT-W2",
    prompt: "Planning from home: maps app + place names — not numbered dots on the sketch",
  },
  {
    id: "GT-W3",
    prompt: "Quorum spot: find it via place list or Open in Maps — scan there for quorum mechanics",
  },
];

/**
 * Parse node scan URLs from worker/.local/city-game-qr-pack/SCAN_URLS.md
 * @param {string} markdown
 * @returns {Record<string, string>}
 */
export function parseQrPackScanUrls(markdown) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of String(markdown).split("\n")) {
    const match = line.match(/^\|\s*(node_\d+)\s*\|[^|]*\|\s*(https:\/\/[^\s|]+)/);
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

/**
 * @param {Record<string, string>} scanUrlByNode
 * @param {Record<string, unknown>} season
 * @param {KitNode[]} [kitNodes]
 */
export function resolveProductionKitScanUrls(scanUrlByNode, season, kitNodes) {
  const labelById = new Map(
    (Array.isArray(season.nodes) ? season.nodes : []).map((row) => [row.node_id, row.label])
  );
  const probes = kitNodes ?? resolveComprehensionProbeNodes(season);
  return probes.map((spec) => ({
    node_id: spec.node_id,
    blurb: spec.blurb ?? "",
    href: scanUrlByNode[spec.node_id] ?? null,
    label: spec.label ?? labelById.get(spec.node_id) ?? spec.node_id,
  }));
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} [origin]
 */
export function productionRulesUrl(season, origin = "https://humanity.llc") {
  const path = String(season.rules_path ?? "/play/cedar-rapids/").trim() || "/play/cedar-rapids/";
  return `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * @param {Array<{ node_id?: string; public_label?: string; qr_id?: string; local_scan_url?: string; scan_url?: string }>} nodes
 * @param {string} profileId
 * @param {string} host
 * @param {KitNode[]} kitNodes
 */
export function resolveKitScanUrls(nodes, profileId, host, kitNodes = DEFAULT_NODES) {
  const byId = new Map(nodes.filter((n) => n.node_id && n.qr_id).map((n) => [n.node_id, n]));
  return kitNodes.map((spec) => {
    const row = byId.get(spec.node_id);
    if (!row?.qr_id) {
      return { ...spec, href: null, label: spec.node_id };
    }
    const href =
      rewriteScanUrlForLan(row.local_scan_url ?? "", host) ||
      rewriteScanUrlForLan(row.scan_url ?? "", host) ||
      buildLanScanUrl(profileId, row.qr_id, host);
    return {
      ...spec,
      href,
      label: row.public_label ?? spec.node_id,
    };
  });
}

/**
 * @param {{
 *   host: string;
 *   hubUrl?: string | null;
 *   rulesUrl?: string | null;
 *   boardUrl?: string | null;
 *   kitNodes: Array<KitNode & { href: string | null; label: string }>;
 *   production?: boolean;
 *   season?: Record<string, unknown>;
 * }} opts
 */
export function buildComprehensionKitHtml(opts) {
  const host = opts.host;
  const production = opts.production === true;
  const season = opts.season ?? {};
  const cityLabel = String(season.city ?? "City game").trim() || "City game";
  const rulesUrl =
    opts.rulesUrl?.trim() ||
    (production
      ? productionRulesUrl(season)
      : `http://${host.includes(":") ? host.split(":")[0] : host}:8788/play/cedar-rapids/`);
  const boardUrl =
    opts.boardUrl?.trim() ||
    `${rulesUrl.replace(/\/?$/, "/")}#city-state`;
  const primaryNodeId = comprehensionPrimaryNodeId(season);
  const primaryNode =
    opts.kitNodes.find((n) => n.node_id === primaryNodeId) ??
    opts.kitNodes[0] ??
    null;
  const primaryLabel = primaryNode?.label ?? primaryNodeId;
  const primaryHref = primaryNode?.href ?? `[${primaryNodeId} URL]`;
  const links = opts.kitNodes
    .map((node) => {
      if (!node.href) {
        return `<li class="missing">${escapeHtml(node.node_id)} — not in seed</li>`;
      }
      return `<li>
  <a class="scan-link" href="${escapeHtml(node.href)}">
    <span class="node-id">${escapeHtml(node.node_id)}</span>
    <span class="label">${escapeHtml(node.label)}</span>
  </a>
  <p class="blurb">${escapeHtml(node.blurb ?? "")}</p>
</li>`;
    })
    .join("\n");

  const hubLine = opts.hubUrl
    ? `<p class="lead">Full season hub: <a href="${escapeHtml(opts.hubUrl)}">${escapeHtml(opts.hubUrl)}</a></p>`
    : "";
  const rulesLine = `<p class="lead"><strong>Start here:</strong> <a href="${escapeHtml(rulesUrl)}">${escapeHtml(rulesUrl)}</a> — read How to start + place list before scanning.</p>`;
  const boardLine = `<p class="lead">GT-7 city board: <a href="${escapeHtml(boardUrl)}">${escapeHtml(boardUrl)}</a></p>`;
  const wayfindingItems = buildJamieWayfindingChecks(season).map(
    (row) => `<li>${escapeHtml(row.id)}: ${escapeHtml(row.prompt)}</li>`
  ).join("\n      ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="robots" content="noindex,nofollow" />
  <title>GT comprehension · ${escapeHtml(cityLabel)}</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 0; padding: 16px; max-width: 42rem; line-height: 1.45; }
    h1 { font-size: 1.2rem; margin: 0 0 8px; }
    .lead { margin: 0 0 16px; color: #666; font-size: 0.95rem; }
    .scorecard { margin: 0 0 20px; padding: 12px; border-radius: 10px; background: rgba(60,60,67,.08); font-size: 0.85rem; }
    .scorecard ol { margin: 8px 0 0; padding-left: 1.2rem; }
    .message { margin: 0 0 20px; padding: 12px; border-radius: 10px; border: 1px solid rgba(60,60,67,.15); font-size: 0.85rem; white-space: pre-wrap; }
    h2 { font-size: 1rem; margin: 0 0 10px; }
    .links { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
    .scan-link {
      display: block; padding: 14px 16px; border-radius: 12px;
      background: #db1b43; color: #fff; text-decoration: none;
    }
    .node-id { display: block; font-size: 0.75rem; opacity: 0.85; font-weight: 600; }
    .label { display: block; font-size: 1rem; font-weight: 600; margin-top: 2px; }
    .blurb { margin: 6px 0 0; font-size: 0.85rem; color: #666; }
    .missing { padding: 10px; background: rgba(255,59,48,.1); border-radius: 8px; }
  </style>
</head>
<body>
  <h1>GT comprehension (Phase D human gate)</h1>
  <p class="lead">Give testers the <strong>rules page first</strong>, then <strong>${escapeHtml(primaryLabel)}</strong> (${escapeHtml(primaryNodeId)}) for scan copy. Need ≥5 un coached passes — see <code>CITY_GAME_COMPREHENSION_RUNBOOK.md</code>.</p>
  ${rulesLine}
  ${hubLine}
  ${boardLine}
  <div class="scorecard">
    <strong>Wayfinding (Jamie checks)</strong>
    <ol>
      ${wayfindingItems}
    </ol>
  </div>
  <div class="scorecard">
    <strong>Scorecard (per tester)</strong>
    <ol>
      <li>GT-1: “We unlocked it together,” not “I won”</li>
      <li>GT-2: Sharing the clue helps the group</li>
      <li>GT-3: Sanctuary = regroup, no capture</li>
      <li>GT-4: Cabinet path without account signup</li>
      <li>GT-5: Care pause beats game bulletins for safety</li>
      <li>GT-6: No rank, streak, or scan count visible</li>
      <li>GT-7: City board shows shared world chips — not “my visits” or GPS</li>
    </ol>
  </div>
  <div class="message">Quick playtest (~10 min)

1) Open the rules page (do not coach):
${rulesUrl}

Browse like a friend texted you the link. Then scan ${escapeHtml(primaryLabel)}:
${escapeHtml(String(primaryHref))}

Then tell me:
W1) How would you decide where to go first?
W2) Would you use the dot diagram, the place list, or your maps app from home?
W3) Can you find ${escapeHtml(primaryLabel)} before you scan?
1) Did YOU win, or did the CITY unlock something together?
2) Would HIDING the clue help you or hurt everyone else?
3) Any place that feels like a safe regroup with no capture?
4) Do you need an ACCOUNT to go deeper, or trust from another place?
5) If it says MAINTENANCE PAUSE, would you trust game bulletins for safety?
6) Do you see a RANK, STREAK, or SCAN COUNT anywhere?
7) On the city board (${boardUrl}) — does it show what the CITY knows, or what YOU did?</div>
  <h2>Prototype nodes for spot checks</h2>
  <ul class="links">${links}</ul>
</body>
</html>`;
}

/** @param {Record<string, unknown>} season */
export function comprehensionProductionPageRel(season) {
  const slug = seasonSlugFromRulesPath(String(season.rules_path ?? "")) ?? "cedar-rapids";
  return `site/play/${slug}/comprehension/index.html`;
}

/**
 * @param {Array<{ node_id?: string; scan_url?: string }>} nodes
 */
function scanUrlMapFromSeedNodes(nodes) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const row of nodes ?? []) {
    if (row.node_id && row.scan_url) out[row.node_id] = row.scan_url;
  }
  return out;
}

/**
 * Pick production scan URLs for comprehension kit generation.
 * Prefers production seed when profile matches season JSON; falls back to local seed when aligned.
 * @param {Record<string, unknown>} season
 * @param {{
 *   productionSeed?: { profile_id?: string; nodes?: Array<{ node_id?: string; scan_url?: string }> } | null;
 *   localSeed?: { profile_id?: string; nodes?: Array<{ node_id?: string; scan_url?: string }> } | null;
 *   qrPackByNode?: Record<string, string> | null;
 * }}
 */
export function resolveProductionScanUrlByNode(season, sources) {
  const seasonRoot = String(season.season_root_profile_id ?? "").trim();
  const fromProd = scanUrlMapFromSeedNodes(sources.productionSeed?.nodes ?? []);
  const fromLocal = scanUrlMapFromSeedNodes(sources.localSeed?.nodes ?? []);
  const qrPack = sources.qrPackByNode ?? {};
  const prodProfile = String(sources.productionSeed?.profile_id ?? "").trim();
  const localProfile = String(sources.localSeed?.profile_id ?? "").trim();

  if (seasonRoot && prodProfile === seasonRoot && Object.keys(fromProd).length) {
    return {
      scanUrlByNode: fromProd,
      source: "production-seed",
      seasonRoot,
      prodProfile,
      localProfile,
    };
  }
  if (seasonRoot && localProfile === seasonRoot && Object.keys(fromLocal).length) {
    return {
      scanUrlByNode: fromLocal,
      source: "local-seed",
      seasonRoot,
      prodProfile,
      localProfile,
    };
  }
  if (Object.keys(fromProd).length) {
    return {
      scanUrlByNode: fromProd,
      source: "production-seed-unaligned",
      seasonRoot,
      prodProfile,
      localProfile,
    };
  }
  if (Object.keys(fromLocal).length) {
    return {
      scanUrlByNode: fromLocal,
      source: "local-seed-fallback",
      seasonRoot,
      prodProfile,
      localProfile,
    };
  }
  if (Object.keys(qrPack).length) {
    return {
      scanUrlByNode: qrPack,
      source: "qr-pack",
      seasonRoot,
      prodProfile,
      localProfile,
    };
  }
  return {
    scanUrlByNode: {},
    source: "none",
    seasonRoot,
    prodProfile,
    localProfile,
  };
}

/**
 * Profile id for scan URLs on a production comprehension kit (from production seed).
 * @param {{ profile_id?: string } | null | undefined} productionSeed
 */
export function productionScanProfileId(productionSeed) {
  return String(productionSeed?.profile_id ?? "").trim() || null;
}

/**
 * @param {{
 *   dateIso?: string;
 *   rulesUrl: string;
 *   kitUrl: string;
 *   primaryScanUrl: string;
 *   boardUrl: string;
 * }} input
 */
export function buildComprehensionRunbookProductionUrlsBlock(input) {
  const dateIso = input.dateIso ?? new Date().toISOString().slice(0, 10);
  return `**Production URLs (${dateIso}):**

| Step | URL |
|------|-----|
| Rules | ${input.rulesUrl} |
| Operator kit (you) | ${input.kitUrl} |
| Primary scan (node_04) | ${input.primaryScanUrl} |
| City board (GT-7) | ${input.boardUrl} |`;
}

/**
 * @param {string} content
 * @param {string} block
 */
export function applyComprehensionRunbookProductionUrls(content, block) {
  const re = /\*\*Production URLs \([^)]+\):\*\*[\s\S]*?(?=\n\*\*Optional spot checks\*\*)/;
  if (!re.test(content)) {
    throw new Error("runbook_production_urls_marker_missing");
  }
  return content.replace(re, block);
}

/**
 * @param {string} content
 * @param {string} primaryScanUrl
 */
export function applyComprehensionRunbookPrimaryScanUrl(content, primaryScanUrl) {
  return content.replace(
    /> \*\*Step 3:\*\* Scan this sticker URL:\s*\n> https:\/\/humanity\.llc\/c\/[^\s]+/,
    `> **Step 3:** Scan this sticker URL:  \n> ${primaryScanUrl}`
  );
}

/**
 * Validate a generated comprehension kit page (local dev or production).
 * @param {string} html
 * @param {{
 *   season?: Record<string, unknown>;
 *   rel?: string;
 *   expectedScanProfileId?: string | null; // production seed profile; defaults to season_root_profile_id
 * }} [opts]
 */
export function auditComprehensionKitHtml(html, opts = {}) {
  const issues = [];
  const rel = opts.rel ?? "comprehension kit";
  const season = opts.season ?? {};
  const primaryNodeId = comprehensionPrimaryNodeId(season);

  if (!/noindex\s*,\s*nofollow/i.test(html)) {
    issues.push(`${rel}: missing noindex,nofollow`);
  }
  if (!html.includes("GT-1:")) {
    issues.push(`${rel}: missing GT-1 scorecard row`);
  }
  if (!html.includes("GT-7:")) {
    issues.push(`${rel}: missing GT-7 scorecard row`);
  }
  if (/class="missing"/.test(html)) {
    issues.push(`${rel}: probe node missing scan URL`);
  }
  if (!html.includes(`>${primaryNodeId}<`) && !html.includes(`(${primaryNodeId})`)) {
    issues.push(`${rel}: missing primary node ${primaryNodeId}`);
  }

  const seasonRoot = String(season.season_root_profile_id ?? "").trim();
  const expectedScan =
    String(opts.expectedScanProfileId ?? "").trim() || seasonRoot || "";
  if (expectedScan && html.includes("humanity.llc/c/")) {
    const profileMatches = [...html.matchAll(/humanity\.llc\/c\/([A-Za-z0-9]+)/g)].map((m) => m[1]);
    const foreign = [...new Set(profileMatches)].filter((id) => id !== expectedScan);
    if (foreign.length) {
      issues.push(
        `${rel}: scan URLs use ${foreign.join(", ")} — expected ${expectedScan} (regenerate kit)`
      );
    }
  }

  /** @type {string | null} */
  let custodyDrift = null;
  if (
    seasonRoot &&
    expectedScan &&
    seasonRoot !== expectedScan &&
    html.includes("humanity.llc/c/")
  ) {
    custodyDrift = `season JSON root ${seasonRoot} ≠ deployed scan profile ${expectedScan} — align before launch or re-mint`;
  }

  return { ok: issues.length === 0, issues, custodyDrift };
}

/**
 * C2 engineering readiness — kit page + seed URLs (human ≥5 testers still required).
 * @param {{
 *   season: Record<string, unknown>;
 *   localSeed?: boolean;
 *   localDevPageHtml?: string | null;
 *   productionPageHtml?: string | null;
 *   productionScanProfileId?: string | null;
 * }} input
 */
export function assessComprehensionEngineeringReady(input) {
  const issues = [];
  const warnings = [];
  const season = input.season;
  const prodScanProfile = input.productionScanProfileId ?? null;

  let localOk = false;
  if (input.localSeed) {
    if (!input.localDevPageHtml) {
      issues.push("Local seed present but site/dev/city-game-comprehension.html missing — npm run city-game:comprehension-kit");
    } else {
      const audit = auditComprehensionKitHtml(input.localDevPageHtml, {
        season,
        rel: LOCAL_DEV_COMPREHENSION_REL,
      });
      if (audit.ok) {
        localOk = true;
      } else {
        issues.push(...audit.issues);
      }
    }
  } else {
    warnings.push("No local seed — run npm run city-game:dev -- --bootstrap for rainy-weekend LAN testing");
  }

  let productionOk = false;
  if (input.productionPageHtml) {
    const seasonRoot = String(season.season_root_profile_id ?? "").trim();
    const audit = auditComprehensionKitHtml(input.productionPageHtml, {
      season,
      rel: comprehensionProductionPageRel(season),
      expectedScanProfileId: seasonRoot || prodScanProfile,
    });
    if (audit.ok) {
      productionOk = true;
    } else {
      warnings.push(...audit.issues);
    }
    if (
      prodScanProfile &&
      seasonRoot &&
      prodScanProfile !== seasonRoot &&
      input.productionPageHtml.includes("humanity.llc/c/")
    ) {
      warnings.push(
        `Production seed profile ${prodScanProfile} ≠ season JSON root ${seasonRoot} — npm run city-game:seed-production or regenerate kit from local seed`
      );
    } else if (audit.custodyDrift) {
      warnings.push(audit.custodyDrift);
    }
  } else {
    warnings.push("Production kit page missing — npm run city-game:comprehension-kit -- --production (after seed-production)");
  }

  const ready = localOk || productionOk;
  return { ready, localOk, productionOk, issues, warnings };
}

/**
 * @param {{
 *   ready: boolean;
 *   localOk: boolean;
 *   productionOk: boolean;
 *   issues: string[];
 *   warnings: string[];
 *   humanSignedOff?: boolean;
 * }} c2
 * @returns {string[]}
 */
export function formatComprehensionPreflightReport(c2) {
  const lines = ["Cedar Rapids · GT comprehension preflight (C2)", ""];
  lines.push(
    `C2 engineering: ${c2.ready ? "☑" : "☐"} comprehension kit page + probe scan URLs`
  );
  lines.push(`  Local dev kit: ${c2.localOk ? "☑" : "☐"} (${LOCAL_DEV_COMPREHENSION_REL})`);
  lines.push(
    `  Production kit: ${c2.productionOk ? "☑" : "☐"} (${comprehensionProductionPageRel({ rules_path: "/play/cedar-rapids/" })})`
  );
  if (c2.warnings.length) {
    lines.push("");
    lines.push("Warnings:");
    for (const w of c2.warnings) lines.push(`  ⚠ ${w}`);
  }
  if (c2.issues.length) {
    lines.push("");
    lines.push("Blockers:");
    for (const i of c2.issues) lines.push(`  ✗ ${i}`);
  }
  lines.push("");
  lines.push(
    `C2 human gate: ${c2.humanSignedOff ? "☑" : "☐"} ≥5 un coached testers (GT-1–GT-7)`
  );
  lines.push("");
  lines.push("Run without stickers (rain OK):");
  lines.push("  npm run city-game:dev -- --lan");
  lines.push("  Open comprehension link printed by dev script on each tester phone");
  lines.push("");
  lines.push("After ≥5 pass:");
  lines.push("  npm run city-game:comprehension-sign-off -- --pass --apply --testers 5 --pass-count 5");
  lines.push("");
  lines.push("See docs/CITY_GAME_COMPREHENSION_RUNBOOK.md");
  return lines.join("\n");
}

/** @param {string} value */
function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {{
 *   engineering: { verify: boolean; proofLocal?: boolean; testCount?: number; requireLaunch?: boolean; c1?: boolean | null };
 *   season: { issues: string[]; warnings: string[]; ready: boolean };
 *   surfaces: { ok: boolean; issues: string[] };
 *   gates?: { b1?: boolean; b2?: boolean; b5?: boolean | null; b13?: boolean | null; b14?: boolean };
 *   mapBoardB13?: { required: boolean; ready: boolean; gt7?: { met: boolean; passCount: number; required: number } };
 *   local?: { seed: boolean; worker?: boolean };
 *   c2?: { ready: boolean; localOk: boolean; productionOk: boolean; humanSignedOff?: boolean };
 *   c3?: { ready: boolean; localSeedReady: boolean; productionSeedReady: boolean; humanSignedOff?: boolean };
 *   c4?: { ready: boolean; nodeCount: number; spotCount: number; signedOff?: boolean };
 *   c5?: { readyForLaunchDay: boolean; allRequiredSigned: boolean; c5Signed: boolean; pending: string[] };
 *   blockers: string[];
 * }} report
 */
export function formatLaunchPreflightReport(report) {
  const lines = ["Cedar Rapids · Phase D launch preflight", ""];
  lines.push(`Engineering tests: ${report.engineering.verify ? "☑ verify:city-game" : "☐ verify:city-game"}`);
  if (report.engineering.testCount != null) {
    lines.push(`  (${report.engineering.testCount}+ tests)`);
  }
  if (report.engineering.requireLaunch) {
    lines.push(
      `C1 launch gate: ${report.engineering.c1 ? "☑" : "☐"} npm run verify:city-game -- --require-launch`
    );
  } else {
    lines.push("C1 launch gate: — (set season_root_profile_id + window dates in season JSON)");
  }
  if (report.local) {
    lines.push(`Local seed: ${report.local.seed ? "☑" : "☐"} · Worker reachable: ${report.local.worker ? "☑" : "☐"}`);
  }
  if (report.c2) {
    lines.push(
      `C2 comprehension (engineering): ${report.c2.ready ? "☑" : "☐"} kit page + probe URLs · human ${report.c2.humanSignedOff ? "☑" : "☐"} ≥5 testers`
    );
    lines.push(`  Local dev kit: ${report.c2.localOk ? "☑" : "☐"} · Production kit: ${report.c2.productionOk ? "☑" : "☐"}`);
  }
  if (report.c3) {
    lines.push(
      `C3 install QA (engineering): ${report.c3.ready ? "☑" : "☐"} seed + doc markers · human ${report.c3.humanSignedOff ? "☑" : "☐"} ≥3 phones × 15 nodes`
    );
    lines.push(
      `  Local seed: ${report.c3.localSeedReady ? "☑" : "☐"} · Production seed: ${report.c3.productionSeedReady ? "☑" : "☐"}`
    );
  }
  if (report.c4) {
    lines.push(
      `C4 prod scan smoke: ${report.c4.signedOff ? "☑" : "☐"} E5 checklist · engineering ${report.c4.ready ? "☑" : "☐"} seed · spot URLs ${report.c4.spotCount}/3`
    );
    if (!report.c4.signedOff) {
      lines.push(`  npm run city-game:smoke-production-preflight -- --probe · npm run city-game:smoke-production`);
    }
  }
  if (report.c5) {
    lines.push(
      `C5 launch checklist: ${report.c5.readyForLaunchDay ? "☑" : "☐"} signed · gates ${report.c5.allRequiredSigned ? "☑" : "☐"} P1–P5 + O1–O4`
    );
    if (report.c5.pending.length) {
      lines.push(`  Pending: ${report.c5.pending.join(", ")}`);
    }
    lines.push("  npm run city-game:launch-checklist-preflight");
  }
  if (report.gates) {
    lines.push("Engineering gates (automated):");
    lines.push(`  B1 vouch copy: ${report.gates.b1 ? "☑" : "☐"}`);
    lines.push(`  B2 surfaces honesty: ${report.gates.b2 ? "☑" : "☐"}`);
    lines.push(
      `  B5 contribute load: ${
        report.gates.b5 == null ? "— (start worker + seed)" : report.gates.b5 ? "☑" : "☐"
      }`
    );
    lines.push(`  B14 scan analytics off: ${report.gates.b14 ? "☑" : "☐"}`);
    if (report.gates.b13 != null) {
      lines.push(`  B13 live city board: ${report.gates.b13 ? "☑" : "☐"} (GT-7 + privacy when marketed)`);
    }
  }
  if (report.mapBoardB13?.required) {
    lines.push(
      `Map board B13: ${report.mapBoardB13.ready ? "☑" : "☐"} GT-7 ${report.mapBoardB13.gt7?.passCount ?? 0}/${report.mapBoardB13.gt7?.required ?? 5}`
    );
    if (!report.mapBoardB13.ready) {
      lines.push("  npm run city-game:map-board-b13-preflight");
    }
  }
  lines.push(`Season config: ${report.season.ready ? "☑ structure" : "☐ issues"}`);
  for (const w of report.season.warnings) lines.push(`  ⚠ ${w}`);
  for (const i of report.season.issues) lines.push(`  ✗ ${i}`);
  if (report.surfaces.ok) {
    lines.push("Launch surfaces: ☑ ready for --apply");
  } else {
    lines.push("Launch surfaces: ☐ launch-day fields unset (expected pre-launch)");
    for (const i of report.surfaces.issues) lines.push(`  · ${i}`);
  }
  lines.push("");
  if (report.blockers.length) {
    lines.push("Blocked until launch day:");
    for (const b of report.blockers) lines.push(`  • ${b}`);
  } else {
    lines.push("No automated blockers — human gates still required (P1, P2, O1–O4).");
  }
  lines.push("");
  lines.push("Human gates next:");
  lines.push("  npm run city-game:comprehension-preflight  → C2 GT (city-game:dev -- --lan, no stickers)");
  lines.push("  npm run city-game:install-qa-preflight   → C3 before physical stickers");
  lines.push("  docs/CITY_GAME_COMPREHENSION_RUNBOOK.md · docs/CITY_GAME_INSTALL_QA.md");
  lines.push("");
  if (report.c4 && !report.c4.signedOff) {
    lines.push("After worker deploy (C4):");
    lines.push("  npm run city-game:smoke-production-preflight -- --probe");
    lines.push("  npm run city-game:smoke-production");
    lines.push("");
  }
  lines.push("Launch checklist (C5 — after P1–P2 + ops gates):");
  lines.push("  npm run city-game:operator-ops-preflight");
  lines.push("  npm run city-game:launch-checklist-preflight");
  lines.push("  npm run city-game:launch-checklist-sign-off -- --pass --apply --commander \"Name\"");
  lines.push("");
  lines.push("Launch day (after C5 signed):");
  lines.push("  npm run city-game:launch-day -- --confirm-production");
  return lines.join("\n");
}
