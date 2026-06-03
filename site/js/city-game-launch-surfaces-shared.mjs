/**
 * Phase D launch surface patches (rules + research pages).
 * @see docs/CITY_GAME_LAUNCH_CHECKLIST.md P3 · P4
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § Public surfaces
 */

import {
  buildSeasonBannerBlock,
  formatSeasonWindowLabel,
} from "./city-game-season-banner-core.mjs";
import { seasonLaunchContext } from "./city-game-season-path-shared.mjs";

export { formatSeasonWindowLabel };

/** Pilot season rules page (Cedar Rapids S1). */
export const RULES_PAGE_REL = "site/play/cedar-rapids/index.html";

/** Research pages that swap in-development hints → live rules link at launch. */
export const RESEARCH_LAUNCH_PAGE_RELS = [
  "site/what-can-a-qr-do/combining-ideas/cedar-rapids-city-game/index.html",
  "site/what-can-a-qr-do/physical-world-multiplayer/index.html",
  "site/what-can-a-qr-do/living-street-infrastructure/index.html",
  "site/what-can-a-qr-do.html",
];

const PILOT_SEASON_JSON_URL = "/data/city-game-cr-season-01.json";
const SEASON_BANNER_SCRIPT =
  '<script type="module" src="/js/city-game-season-banner.mjs?v=1"></script>';

const NOINDEX_META_RE =
  /\s*<meta\s+name="robots"\s+content="noindex,\s*nofollow"\s*\/?>\s*/i;

const RULES_DRAFT_HINT_RE =
  /<div class="research-dev-hint" role="note">[\s\S]*?<\/div>/;

const RESEARCH_DEV_HINT_RE =
  /<div class="research-dev-hint" role="note">[\s\S]*?<\/div>/;

const RESEARCH_LIVE_BANNER_RE =
  /<div class="research-live-banner[^"]*" role="note"[^>]*>[\s\S]*?<\/div>/;

const HUB_DEV_LEAD_RE =
  /<p class="landing-vision-lead landing-vision-lead--dev"[^>]*>[\s\S]*?<\/p>/;

/**
 * @param {string} html
 */
export function applySeasonBannerScript(html) {
  if (html.includes("city-game-season-banner.mjs") || html.includes("city-game-play-page.mjs")) {
    return html;
  }
  return html.replace("</body>", `    ${SEASON_BANNER_SCRIPT}\n  </body>`);
}

/**
 * @param {Record<string, unknown>} season
 * @returns {{ ready: boolean; issues: string[] }}
 */
export function assessLaunchSurfacesReady(season) {
  const issues = [];
  if (!season?.season_root_profile_id) {
    issues.push("season_root_profile_id must be set before launch surfaces go live.");
  }
  if (!season?.window?.starts_at || !season?.window?.ends_at) {
    issues.push("window.starts_at and window.ends_at must be set before launch.");
  }
  if (!formatSeasonWindowLabel(season)) {
    issues.push("Could not format season window label.");
  }
  return { ready: issues.length === 0, issues };
}

/**
 * @param {string} html
 * @param {Record<string, unknown>} season
 * @param {{ seasonJsonUrl?: string; rulesPageRel?: string }} [launchCtx]
 */
export function applyRulesPageLaunchPatches(html, season, launchCtx = {}) {
  if (!formatSeasonWindowLabel(season)) {
    throw new Error("Season window dates required for rules page launch patch.");
  }

  const seasonJsonUrl = launchCtx.seasonJsonUrl ?? PILOT_SEASON_JSON_URL;
  const city = String(season.city ?? "the city").trim() || "the city";

  let out = html.replace(NOINDEX_META_RE, "\n");
  const liveHint = buildSeasonBannerBlock(season, seasonJsonUrl, "rules");

  if (RULES_DRAFT_HINT_RE.test(out)) {
    out = out.replace(RULES_DRAFT_HINT_RE, liveHint);
  } else if (RESEARCH_LIVE_BANNER_RE.test(out)) {
    out = out.replace(RESEARCH_LIVE_BANNER_RE, liveHint);
  } else {
    throw new Error("Rules page missing research-dev-hint or research-live-banner block.");
  }
  out = out.replace(
    "<strong>Draft rules page.</strong>",
    "<strong>Official rules.</strong>"
  );
  out = out.replace(
    /content="Rules draft for [^"]*"/,
    `content="Rules for ${city} — public object state, cooperation-first play, and what scans prove without tracking players."`
  );
  out = out.replace(
    /content="Rules for Cedar Rapids Season 1[^"]*"/,
    `content="Rules for ${city} — public object state, cooperation-first play, and what scans prove without tracking players."`
  );
  return applySeasonBannerScript(out);
}

/**
 * @param {Record<string, unknown>} season
 * @param {{ seasonJsonUrl?: string }} [launchCtx]
 */
function buildHubSeasonLiveLead(season, launchCtx = {}) {
  const seasonJsonUrl = launchCtx.seasonJsonUrl ?? PILOT_SEASON_JSON_URL;
  return buildSeasonBannerBlock(season, seasonJsonUrl, "hub");
}

/**
 * @param {string} html
 * @param {Record<string, unknown>} season
 * @param {string} [rel]
 * @param {{ seasonJsonUrl?: string; rulesPath?: string }} [launchCtx]
 */
export function applyResearchPageLaunchPatches(html, season, rel = "", launchCtx = {}) {
  if (!formatSeasonWindowLabel(season)) {
    throw new Error("Season window dates required for research launch patch.");
  }

  const seasonJsonUrl = launchCtx.seasonJsonUrl ?? PILOT_SEASON_JSON_URL;
  const liveBlock = buildSeasonBannerBlock(season, seasonJsonUrl, "research");

  let out = html;
  if (RESEARCH_DEV_HINT_RE.test(out)) {
    out = out.replace(RESEARCH_DEV_HINT_RE, liveBlock);
  } else if (RESEARCH_LIVE_BANNER_RE.test(out)) {
    out = out.replace(RESEARCH_LIVE_BANNER_RE, liveBlock);
  } else {
    throw new Error("Research page missing research-dev-hint or research-live-banner block.");
  }

  if (rel === "site/what-can-a-qr-do.html" && HUB_DEV_LEAD_RE.test(out)) {
    out = out.replace(HUB_DEV_LEAD_RE, buildHubSeasonLiveLead(season, launchCtx));
  }

  return applySeasonBannerScript(out);
}

/**
 * @param {string} html
 */
export function rulesPageIsLaunchReady(html) {
  return !NOINDEX_META_RE.test(html) && !html.includes("Draft rules page");
}

/**
 * @param {string} html
 * @param {string} [rel]
 * @param {string} [rulesPath]
 */
export function researchPageIsLaunchReady(html, rel = "", rulesPath = "/play/cedar-rapids/") {
  const rulesHref = String(rulesPath).trim().replace(/\/?$/, "/");
  const hasLiveBanner =
    html.includes("data-city-game-season-banner") &&
    (html.includes(`href="${rulesHref}"`) || html.includes(`href="${rulesHref}#`));
  if (rel === "site/what-can-a-qr-do.html") {
    return (
      hasLiveBanner &&
      html.includes("landing-vision-lead--dev") &&
      html.includes("data-city-game-season-banner") &&
      html.includes("city-game-season-banner.mjs")
    );
  }
  return (
    hasLiveBanner &&
    html.includes("city-game-season-banner.mjs") &&
    !html.includes("<strong>In development.</strong>") &&
    !html.includes("<strong>In development:</strong>")
  );
}

/**
 * Unshipped mechanics that must not appear on launch surfaces without a design-reference disclaimer.
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § B2 · R-05
 */
export const LAUNCH_SURFACES_OVERPROMISE_PATTERNS = [
  {
    re: /one-time signed token/i,
    label: "one-time signed tokens (S3 spike — not shipped for Season 1)",
  },
  {
    re: /player-signed/i,
    label: "player-signed actions (operator-only until RFC ships)",
  },
  {
    re: /faction capture|relay pvp|prisoner'?s dilemma branch/i,
    label: "player-initiated faction/spy/dilemma mechanics (not shipped)",
  },
];

const DESIGN_REFERENCE_MARKERS = [
  "design reference",
  "demo layouts on this page remain design reference",
];

/**
 * @param {string} html
 * @param {{ rel?: string }} [opts]
 * @returns {{ ok: boolean; issues: string[] }}
 */
export function auditLaunchSurfacesCopy(html, opts = {}) {
  const rel = opts.rel ?? RULES_PAGE_REL;
  const issues = [];
  const isResearch = rel.startsWith("site/what-can-a-qr-do");
  const hasDesignReference = DESIGN_REFERENCE_MARKERS.some((marker) =>
    html.toLowerCase().includes(marker.toLowerCase())
  );

  for (const { re, label } of LAUNCH_SURFACES_OVERPROMISE_PATTERNS) {
    if (!re.test(html)) continue;
    if (isResearch && hasDesignReference) continue;
    issues.push(`${rel}: mentions ${label}`);
  }

  return { ok: issues.length === 0, issues };
}

/**
 * @param {{ rulesHtml: string; researchHtmlByRel?: Record<string, string> }} surfaces
 */
export function auditAllLaunchSurfacesCopy(surfaces) {
  const issues = [];
  const rulesAudit = auditLaunchSurfacesCopy(surfaces.rulesHtml, {
    rel: RULES_PAGE_REL,
  });
  issues.push(...rulesAudit.issues);

  for (const rel of RESEARCH_LAUNCH_PAGE_RELS) {
    const html = surfaces.researchHtmlByRel?.[rel];
    if (!html) continue;
    if (!researchPageIsLaunchReady(html, rel)) continue;
    const audit = auditLaunchSurfacesCopy(html, { rel });
    issues.push(...audit.issues);
  }

  return { ok: issues.length === 0, issues };
}

/**
 * @param {Record<string, unknown>} season
 * @param {{ rulesHtml: string; researchHtmlByRel: Record<string, string>; launchCtx?: { rulesPath?: string } }} surfaces
 */
export function assessLaunchSurfacesApplied(season, surfaces) {
  const { ready, issues } = assessLaunchSurfacesReady(season);
  if (!ready) return { applied: false, issues };

  const rulesPath = surfaces.launchCtx?.rulesPath ?? "/play/cedar-rapids/";
  const checkIssues = [];
  if (!rulesPageIsLaunchReady(surfaces.rulesHtml)) {
    checkIssues.push("Rules page still has pre-launch draft markers.");
  }
  for (const rel of RESEARCH_LAUNCH_PAGE_RELS) {
    const html = surfaces.researchHtmlByRel[rel];
    if (!html) {
      checkIssues.push(`Missing research page content for ${rel}.`);
      continue;
    }
    if (!researchPageIsLaunchReady(html, rel, rulesPath)) {
      checkIssues.push(`${rel} still has in-development launch copy.`);
    }
  }
  return { applied: checkIssues.length === 0, issues: checkIssues };
}
