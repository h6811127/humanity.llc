/**
 * Agent D — public network player flow field walk kit (human sign-off).
 * @see site/js/public-network-player-flow-contract.mjs
 */
import {
  PUBLIC_NETWORK_OPEN_BOARD_CTA,
  PUBLIC_NETWORK_RULES_PROVE_CTA,
  PUBLIC_NETWORKS_CATALOG_PATH,
  publicNetworkRulesProveHref,
} from "./public-networks-portal-core.mjs";
import { DISCOVERY_MAP_BROWSE_NEAR_ME_CTA } from "./discovery-map-crosslink-core.mjs";
import {
  discoveryRegionBrowsePath,
  resolveDiscoveryRegionSlugFromSeasonRow,
} from "./discovery-region-path-core.mjs";
import {
  seasonBoardPath,
  seasonSlugFromRulesPath,
} from "./city-game-season-path-shared.mjs";

export const LOCAL_DEV_PLAYER_FLOW_FIELD_WALK_REL =
  "site/dev/public-network-player-flow-field-walk.html";

export const PLAYER_FLOW_FIELD_WALK_COMPREHENSION_BASENAME = "player-flow-field-walk.html";

/** Minimum un coached strangers for shell path sign-off (pairs with LO-4). */
export const PLAYER_FLOW_FIELD_MIN_STRANGERS = 3;

export const PLAYER_FLOW_FIELD_SCENARIOS = [
  {
    id: "PD-1",
    title: "Discover network",
    prompt: "From homepage or /play/season/, find Wake the city and open the board — no coaching.",
  },
  {
    id: "PD-2",
    title: "What a scan proves",
    prompt: "From a catalog card or homepage, reach the rules charter #rules-prove-title section without search.",
  },
  {
    id: "PD-3",
    title: "Board shell intro",
    prompt: "Dismiss the first-visit banner, tap the start callout, and open the selection panel.",
  },
  {
    id: "PD-4",
    title: "First stop (world state)",
    prompt: "Name the suggested first place from the panel — collective state, not personal progress or GPS rank.",
  },
  {
    id: "PD-5",
    title: "Scan handoff",
    prompt: "Find a scan link on a place row, or on a game scan see Open board + What a scan proves CTAs.",
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
 * @param {Record<string, unknown>} season
 * @param {string} [origin]
 */
export function productionPlayerFlowFieldWalkUrl(season, origin = "https://humanity.llc") {
  const slug = seasonSlugFromRulesPath(String(season.rules_path ?? "")) ?? "cedar-rapids";
  return `${origin.replace(/\/$/, "")}/play/${slug}/comprehension/${PLAYER_FLOW_FIELD_WALK_COMPREHENSION_BASENAME}`;
}

/**
 * Same-site relative paths for field-walk kit CTAs (contract + Playwright).
 * @param {Record<string, unknown>} season
 */
export function playerFlowRelativeUrlsForSeason(season) {
  const rulesPath = String(season.rules_path ?? "/play/cedar-rapids/").trim() || "/play/cedar-rapids/";
  const boardPath = seasonBoardPath(rulesPath) ?? `${rulesPath.replace(/\/?$/, "/")}map/`;
  const regionLabel =
    season.public_listing && typeof season.public_listing === "object"
      ? String(/** @type {{ region?: string }} */ (season.public_listing).region ?? "").trim()
      : String(season.city ?? "").trim();
  const discoverPath = discoveryRegionBrowsePath(regionLabel);
  const teachingPath = `${rulesPath.replace(/\/?$/, "/")}teaching/`;
  const fieldWalk = `${rulesPath.replace(/\/?$/, "/")}comprehension/${PLAYER_FLOW_FIELD_WALK_COMPREHENSION_BASENAME}`;
  return {
    home: "/",
    catalog: PUBLIC_NETWORKS_CATALOG_PATH,
    rulesProve: publicNetworkRulesProveHref(rulesPath),
    board: boardPath.startsWith("/") ? boardPath : `/${boardPath}`,
    discover: discoverPath,
    teaching: teachingPath.startsWith("/") ? teachingPath : `/${teachingPath}`,
    fieldWalk,
  };
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} [origin]
 */
export function playerFlowUrlsForSeason(season, origin = "https://humanity.llc") {
  const base = origin.replace(/\/$/, "");
  const rulesPath = String(season.rules_path ?? "/play/cedar-rapids/").trim() || "/play/cedar-rapids/";
  const boardPath = seasonBoardPath(rulesPath) ?? `${rulesPath.replace(/\/?$/, "/")}map/`;
  const regionSlug = resolveDiscoveryRegionSlugFromSeasonRow(null, season);
  const regionLabel =
    season.public_listing && typeof season.public_listing === "object"
      ? String(/** @type {{ region?: string }} */ (season.public_listing).region ?? "").trim()
      : String(season.city ?? "").trim();
  const discoverPath = discoveryRegionBrowsePath(regionLabel);
  const teachingPath = `${rulesPath.replace(/\/?$/, "/")}teaching/`;
  const fieldWalk = productionPlayerFlowFieldWalkUrl(season, base);
  return {
    home: `${base}/`,
    catalog: `${base}${PUBLIC_NETWORKS_CATALOG_PATH}`,
    rulesProve: `${base}${publicNetworkRulesProveHref(rulesPath)}`,
    board: `${base}${boardPath.startsWith("/") ? boardPath : `/${boardPath}`}`,
    discover: discoverPath ? `${base}${discoverPath}` : null,
    teaching: `${base}${teachingPath.startsWith("/") ? teachingPath : `/${teachingPath}`}`,
    fieldWalk,
  };
}

/**
 * @param {{
 *   urls: ReturnType<typeof playerFlowUrlsForSeason>;
 *   production?: boolean;
 *   minStrangers?: number;
 * }} opts
 */
export function buildPlayerFlowFieldWalkKitHtml(opts) {
  const production = opts.production === true;
  const minStrangers = opts.minStrangers ?? PLAYER_FLOW_FIELD_MIN_STRANGERS;
  const urls = opts.urls;

  const scenarioRows = PLAYER_FLOW_FIELD_SCENARIOS.map(
    (row) => `<li>
  <strong>${escapeHtml(row.id)} · ${escapeHtml(row.title)}</strong>
  <p>${escapeHtml(row.prompt)}</p>
  <label class="check"><input type="checkbox" disabled /> Pass</label>
</li>`
  ).join("\n");

  const discoverCta = urls.discover
    ? `<a class="cta cta-secondary" href="${escapeHtml(urls.discover)}">${escapeHtml(DISCOVERY_MAP_BROWSE_NEAR_ME_CTA)}</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Player flow field walk · Cedar Rapids</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 0; padding: 16px; max-width: 44rem; line-height: 1.45; }
    h1 { font-size: 1.2rem; margin: 0 0 8px; }
    h2 { font-size: 1rem; margin: 24px 0 10px; }
    .lead { margin: 0 0 12px; color: #666; font-size: 0.95rem; }
    .cta {
      display: block; padding: 14px 16px; border-radius: 12px; margin: 0 0 10px;
      background: #db1b43; color: #fff; text-decoration: none; font-weight: 600; text-align: center;
    }
    .cta-secondary { background: rgba(60,60,67,.12); color: inherit; font-weight: 500; }
    .scenarios { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
    .scenarios li {
      padding: 12px; border-radius: 10px; border: 1px solid rgba(60,60,67,.15); font-size: 0.9rem;
    }
    .scenarios p { margin: 6px 0 8px; color: #666; }
    .check { font-size: 0.85rem; color: #666; }
    .paths { font-size: 0.85rem; margin: 0; padding-left: 1.2rem; }
    .paths li { margin: 4px 0; }
  </style>
</head>
<body>
  <h1>Agent D · Player flow field walk</h1>
  <p class="lead">
    Run with <strong>${minStrangers}+ un coached strangers</strong> on their own phones.
    Mode: ${production ? "production" : "local dev"}.
    Path: discover → ${escapeHtml(PUBLIC_NETWORK_RULES_PROVE_CTA)} → ${escapeHtml(PUBLIC_NETWORK_OPEN_BOARD_CTA)} → scan.
  </p>
  <p class="lead">LO-4 integrated walk (game + status plate scans): <a href="${escapeHtml(urls.teaching)}">${escapeHtml(urls.teaching)}</a></p>

  <a class="cta" href="${escapeHtml(urls.home)}">1 · Home discovery dashboard</a>
  <a class="cta cta-secondary" href="${escapeHtml(urls.catalog)}">2 · Public networks catalog</a>
  <a class="cta cta-secondary" href="${escapeHtml(urls.rulesProve)}">3 · ${escapeHtml(PUBLIC_NETWORK_RULES_PROVE_CTA)}</a>
  <a class="cta cta-secondary" href="${escapeHtml(urls.board)}">4 · ${escapeHtml(PUBLIC_NETWORK_OPEN_BOARD_CTA)}</a>
  ${discoverCta}

  <h2>Send strangers (copy-paste)</h2>
  <ol class="paths">
    <li><a href="${escapeHtml(urls.home)}">Home</a> or <a href="${escapeHtml(urls.catalog)}">catalog</a> → ${escapeHtml(PUBLIC_NETWORK_OPEN_BOARD_CTA)}</li>
    <li>Optional: <a href="${escapeHtml(urls.rulesProve)}">${escapeHtml(PUBLIC_NETWORK_RULES_PROVE_CTA)}</a></li>
    <li>Board → dismiss intro → start callout → selection panel → scan link</li>
  </ol>

  <h2>Scorecard (each stranger)</h2>
  <ul class="scenarios">
${scenarioRows}
  </ul>

  <h2>Human gate</h2>
  <p class="lead">Sign after ${minStrangers}+ strangers pass PD-1–PD-5 on the path above. Engineering belt: <code>npm run verify:public-network-player-flow</code>.</p>
</body>
</html>`;
}

/**
 * @param {string} html
 */
export function validatePlayerFlowFieldWalkKitHtml(html) {
  const issues = [];
  if (!html.includes("PD-1")) issues.push("missing PD-1 scenario");
  if (!html.includes(PUBLIC_NETWORK_RULES_PROVE_CTA)) issues.push("missing prove CTA label");
  if (!html.includes(PUBLIC_NETWORK_OPEN_BOARD_CTA)) issues.push("missing open board CTA");
  if (!html.includes('href="/play/season/"')) issues.push('missing href="/play/season/"');
  if (!html.includes("/play/cedar-rapids/map/")) issues.push("missing board URL");
  return { ok: issues.length === 0, issues };
}

/**
 * @param {{ ready: boolean; issues: string[]; kitRel: string; minStrangers: number }} report
 */
export function formatPlayerFlowFieldKitReport(report) {
  const lines = [
    "Agent D · public network player flow field walk",
    "",
    `  ${report.ready ? "☑" : "☐"} Kit HTML (${report.kitRel})`,
    `  ☐ Human — ≥${report.minStrangers} un coached strangers (PD-1–PD-5)`,
    "",
    "Regenerate: npm run player-flow:field-kit",
    "Engineering belt: npm run verify:public-network-player-flow",
    "Preflight: npm run player-flow:preflight",
    "Sign-off: npm run player-flow:sign-off -- --pass --apply --strangers 3 --pass-count 3",
  ];
  if (report.issues.length) {
    lines.push("", "Issues:");
    for (const issue of report.issues) lines.push(`  · ${issue}`);
  }
  return lines.join("\n");
}
