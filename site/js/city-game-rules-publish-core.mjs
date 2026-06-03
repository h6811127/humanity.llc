/**
 * Phase E — organizer rules page draft + publish (browser-safe).
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § Phase E step 4
 */

import {
  buildPlayPageHtml,
  seasonWantsAutoRulesPage,
  verifyPlayPageHtml,
} from "./city-game-play-page-scaffold-core.mjs";
import {
  applyRulesPageLaunchPatches,
  assessLaunchSurfacesReady,
  auditLaunchSurfacesCopy,
  rulesPageIsLaunchReady,
} from "./city-game-launch-surfaces-shared.mjs";
import { seasonLaunchContext } from "./city-game-season-path-shared.mjs";

export const SEASON_PUBLISH_DRAFT_STORAGE_KEY = "hc_city_game_season_publish_v1";

/**
 * @param {string} jsonUrl
 */
export function jsonBasenameFromPublicUrl(jsonUrl) {
  const parts = String(jsonUrl ?? "").split("/");
  const base = parts[parts.length - 1] ?? "";
  return base.endsWith(".json") ? base : "";
}

/**
 * @param {string | null | undefined} iso
 */
export function isoToDatetimeLocalValue(iso) {
  if (!iso || typeof iso !== "string") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * @param {string | null | undefined} value
 */
export function datetimeLocalValueToIso(value) {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * @param {Storage} storage
 */
export function readSeasonPublishDraftMap(storage) {
  try {
    const raw = storage.getItem(SEASON_PUBLISH_DRAFT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * @param {Storage} storage
 * @param {string} profileId
 * @param {string} seasonId
 */
export function readSeasonPublishDraft(storage, profileId, seasonId) {
  const map = readSeasonPublishDraftMap(storage);
  const profile = map[profileId];
  if (!profile || typeof profile !== "object") return null;
  const draft = profile[seasonId];
  return draft && typeof draft === "object" ? draft : null;
}

/**
 * @param {Storage} storage
 * @param {string} profileId
 * @param {string} seasonId
 * @param {Record<string, unknown>} draft
 */
export function writeSeasonPublishDraft(storage, profileId, seasonId, draft) {
  const map = readSeasonPublishDraftMap(storage);
  if (!map[profileId] || typeof map[profileId] !== "object") {
    map[profileId] = {};
  }
  map[profileId][seasonId] = draft;
  storage.setItem(SEASON_PUBLISH_DRAFT_STORAGE_KEY, JSON.stringify(map));
}

/**
 * @param {Record<string, unknown>} season
 */
export function seasonSupportsBrowserRulesPublish(season) {
  return seasonWantsAutoRulesPage(season) === true;
}

/**
 * @param {string} value
 */
export function normalizeDistrictSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function parseDistrictsDraftText(text) {
  const slugs = String(text ?? "")
    .split(/[\n,]+/)
    .map((line) => normalizeDistrictSlug(line))
    .filter(Boolean);
  return [...new Set(slugs)];
}

/**
 * @param {unknown} districts
 */
export function formatDistrictsDraftText(districts) {
  if (!Array.isArray(districts)) return "";
  return districts
    .filter((d) => typeof d === "string" && d.trim())
    .map((d) => normalizeDistrictSlug(d))
    .filter(Boolean)
    .join("\n");
}

/**
 * @param {Record<string, unknown>} season
 * @param {Record<string, unknown> | null | undefined} draft
 * @param {string} profileId
 */
export function mergeOrganizerPublishSeason(season, draft, profileId) {
  const merged = { ...season };
  if (profileId) {
    merged.season_root_profile_id = profileId;
  }
  if (draft?.window && typeof draft.window === "object") {
    merged.window = {
      ...(season.window && typeof season.window === "object" ? season.window : {}),
      .../** @type {Record<string, unknown>} */ (draft.window),
    };
  }
  if (typeof draft?.status === "string" && draft.status.trim()) {
    merged.status = draft.status.trim();
  }
  if (Array.isArray(draft?.districts)) {
    merged.districts = draft.districts
      .map((d) => (typeof d === "string" ? normalizeDistrictSlug(d) : ""))
      .filter(Boolean);
  }
  return merged;
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} jsonBasename
 * @param {string} profileId
 * @param {Record<string, unknown> | null | undefined} [draft]
 */
export function assessOrganizerRulesPublish(season, jsonBasename, profileId, draft = null) {
  const issues = [];
  const merged = mergeOrganizerPublishSeason(season, draft, profileId);
  const launchCtx = seasonLaunchContext(merged, jsonBasename);

  if (!seasonSupportsBrowserRulesPublish(season)) {
    issues.push(
      "Browser publish applies to self-serve seasons with auto_rules_page. Pilot seasons use city-game:launch-surfaces."
    );
  }

  const launch = assessLaunchSurfacesReady(merged);
  issues.push(...launch.issues);

  /** @type {string | null} */
  let draftHtml = null;
  /** @type {string | null} */
  let publishedHtml = null;

  if (seasonSupportsBrowserRulesPublish(season)) {
    try {
      draftHtml = buildPlayPageHtml(merged, jsonBasename);
      const verify = verifyPlayPageHtml(draftHtml, merged);
      if (!verify.ok) {
        issues.push(...verify.issues.map((issue) => `Draft HTML: ${issue}`));
      }
    } catch (err) {
      issues.push(
        `Could not build draft rules page: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (draftHtml && launch.ready) {
      try {
        publishedHtml = applyRulesPageLaunchPatches(draftHtml, merged, {
          seasonJsonUrl: launchCtx.seasonJsonUrl,
          rulesPageRel: launchCtx.rulesPageRel,
        });
        const audit = auditLaunchSurfacesCopy(publishedHtml, { rel: launchCtx.rulesPageRel });
        if (!audit.ok) {
          issues.push(...audit.issues);
        }
      } catch (err) {
        issues.push(
          `Launch patch: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  return {
    ready: issues.length === 0,
    issues,
    merged,
    launchCtx,
    draftHtml,
    publishedHtml,
    draftHasNoindex: draftHtml ? /<meta\s+name="robots"\s+content="noindex/i.test(draftHtml) : null,
    publishedIsLaunchReady: publishedHtml ? rulesPageIsLaunchReady(publishedHtml) : false,
  };
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} jsonBasename
 * @param {string} profileId
 * @param {Record<string, unknown> | null | undefined} [draft]
 */
export function buildSelfServePublishedRulesHtml(season, jsonBasename, profileId, draft = null) {
  const merged = mergeOrganizerPublishSeason(season, draft, profileId);
  const launchCtx = seasonLaunchContext(merged, jsonBasename);
  const draftHtml = buildPlayPageHtml(merged, jsonBasename);
  return applyRulesPageLaunchPatches(draftHtml, merged, {
    seasonJsonUrl: launchCtx.seasonJsonUrl,
    rulesPageRel: launchCtx.rulesPageRel,
  });
}

/**
 * @param {{ rulesPageRel?: string; rulesPath?: string; slug?: string }} launchCtx
 */
export function deployChecklistText(launchCtx) {
  const rel = launchCtx?.rulesPageRel ?? "site/play/{slug}/index.html";
  const url = launchCtx?.rulesPath ?? "/play/{slug}/";
  return [
    `1. Save the downloaded HTML as ${rel} in your repo.`,
    "2. Run npm run build to validate the static site.",
    "3. Deploy Pages (commit + push, or your usual deploy).",
    `4. Open ${url} and confirm the live season banner (no noindex, no template hint).`,
  ].join("\n");
}

/**
 * @param {{ slug?: string }} launchCtx
 */
export function suggestedRulesDownloadFilename(launchCtx) {
  const slug = String(launchCtx?.slug ?? "season").trim() || "season";
  return `${slug}-index.html`;
}
