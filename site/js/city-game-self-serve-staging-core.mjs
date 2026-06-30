/**
 * Phase E gate E3 — self-serve staging walkthrough (browser-only, no terminal mint).
 * Summer program default: Cedar Rapids 40-node template (cr_season_01_wake).
 * Example 15-node season remains for generic self-serve demos.
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § Phase E · gate E3
 */

import { assessOrganizerRulesPublish } from "./city-game-rules-publish-core.mjs";
import { assessLaunchSurfacesReady } from "./city-game-launch-surfaces-shared.mjs";
import { resolveSeasonTemplateRows, STARTER_S1_NODE_TEMPLATE } from "./city-game-season-template-core.mjs";
import {
  assessScanGraphPublishForStaging,
  assessUnlockGraphForStaging,
} from "./created-relationship-edge-publish-core.mjs";
import {
  isPilotTerminalMintSeason,
  seasonUsesSelfServeSetup,
} from "./city-game-terminal-mint-deprecation-core.mjs";
import { resolveSeasonPathFromCli } from "./city-game-season-path-core.mjs";
import { join } from "node:path";

export const SELF_SERVE_EXAMPLE_SEASON_ID = "example_city_season_01";
export const SELF_SERVE_EXAMPLE_SEASON_JSON = "city-game-example-season-01.json";
export const SELF_SERVE_SUMMER_SEASON_ID = "cr_season_01_wake";
export const SELF_SERVE_SUMMER_SEASON_JSON = "city-game-cr-season-01.json";

/** @deprecated Prefer resolveStagingNodeTarget(season) — example scaffold only. */
export const SELF_SERVE_STAGING_REQUIRED_NODE_COUNT = 15;

/** Back-compat aliases */
export const SELF_SERVE_STAGING_EXAMPLE_SEASON_ID = SELF_SERVE_EXAMPLE_SEASON_ID;
export const SELF_SERVE_STAGING_EXAMPLE_SEASON_JSON = SELF_SERVE_EXAMPLE_SEASON_JSON;
export const SELF_SERVE_STAGING_SUMMER_SEASON_ID = SELF_SERVE_SUMMER_SEASON_ID;
export const SELF_SERVE_STAGING_SUMMER_SEASON_JSON = SELF_SERVE_SUMMER_SEASON_JSON;

/**
 * Full-season node target from committed season JSON (40 for CR summer, 15 for example).
 * @param {Record<string, unknown>} season
 */
export function resolveStagingNodeTarget(season) {
  const templateRows = resolveSeasonTemplateRows(season);
  if (templateRows.length > 0) return templateRows.length;
  return STARTER_S1_NODE_TEMPLATE.length;
}

/**
 * Default E3 preflight to Cedar Rapids summer (40 nodes) unless --season / --slug / env override.
 * @param {string} root
 * @param {string[]} [argv]
 */
export function resolveSelfServeStagingSeasonPath(root, argv = process.argv) {
  const hasExplicit =
    argv.includes("--season") ||
    argv.includes("--slug") ||
    Boolean(process.env.CITY_GAME_SEASON_ID?.trim());
  if (hasExplicit) return resolveSeasonPathFromCli(root, argv);
  return join(root, "site/data", SELF_SERVE_SUMMER_SEASON_JSON);
}

/**
 * Merge committed season JSON with a browser-exported metadata draft file.
 * @param {Record<string, unknown>} season
 * @param {Record<string, unknown> | null | undefined} metadataDraft
 */
export function mergeSeasonWithMetadataDraft(season, metadataDraft) {
  if (!metadataDraft || typeof metadataDraft !== "object") return season;
  return { ...season, ...metadataDraft };
}

export { assessScanGraphPublishForStaging, assessUnlockGraphForStaging };

/**
 * Publish-draft slice from a full metadata export or browser draft object.
 * @param {Record<string, unknown> | null | undefined} metadataDraft
 */
export function publishDraftFromMetadata(metadataDraft) {
  if (!metadataDraft || typeof metadataDraft !== "object") return null;
  /** @type {Record<string, unknown>} */
  const draft = {};
  if (metadataDraft.window && typeof metadataDraft.window === "object") {
    draft.window = metadataDraft.window;
  }
  if (typeof metadataDraft.status === "string") draft.status = metadataDraft.status;
  if (Array.isArray(metadataDraft.districts)) draft.districts = metadataDraft.districts;
  if ("unlock_edges" in metadataDraft) draft.unlock_edges = metadataDraft.unlock_edges;
  if (typeof metadataDraft.season_root_profile_id === "string") {
    draft.season_root_profile_id = metadataDraft.season_root_profile_id;
  }
  return Object.keys(draft).length ? draft : null;
}

/**
 * @param {Record<string, unknown>} season
 * @param {boolean} [browserStagingWalkthrough]
 * @returns {string[]}
 */
export function selfServeStagingWalkthroughSteps(season = {}, browserStagingWalkthrough = false) {
  const nodeCount = resolveStagingNodeTarget(season);
  const seasonId = String(season?.season_id ?? "").trim();
  const signOffSeason =
    seasonId === SELF_SERVE_EXAMPLE_SEASON_ID ? SELF_SERVE_EXAMPLE_SEASON_ID : SELF_SERVE_SUMMER_SEASON_ID;
  const pilotBrowser = browserStagingWalkthrough && isPilotTerminalMintSeason(season);

  /** @type {string[]} */
  const steps = [
    "/create/. Season root card + game-operator public key (Organizer / issuer) · owner + recovery keys saved",
    `/created/ Live · Manage. Choose ${signOffSeason === SELF_SERVE_EXAMPLE_SEASON_ID ? "example (or your)" : "Cedar Rapids summer"} season · confirm terminal mint notice`,
    `Bulk import starter registry. Register all ${nodeCount} nodes (no city-game:mint-node)`,
    "Issue scan QRs from hub rows or register form. Export print / install pack (CSV, checklist, QR PNGs)",
    "Route unlock edges on Live · validate graph · Publish scan graph edges · download metadata JSON draft",
  ];

  if (pilotBrowser) {
    steps.push(
      "Launch window: pass --metadata-draft with window after browser registration · prod ops may still use npm run city-game:launch-surfaces"
    );
  } else {
    steps.push(
      "Rules page & launch panel. Set window + status · preview draft · download launch HTML · npm run build"
    );
  }

  steps.push(
    "Deploy Pages preview/staging. Spot-scan node_01, node_04, node_07 on staging WebKit",
    `Sign E3 when complete: npm run city-game:self-serve-staging-preflight -- --season ${signOffSeason} --profile-id <prof> --metadata-draft ./city-game-*-metadata-draft.json --expect-complete`
  );

  return steps;
}

/**
 * @param {Array<{ object_type?: string; status?: string; qr_id?: string | null }>} objects
 */
export function countActiveGameNodes(objects) {
  if (!Array.isArray(objects)) return 0;
  return objects.filter(
    (row) =>
      row?.object_type === "game_node" &&
      row?.status !== "revoked" &&
      typeof row?.qr_id === "string" &&
      row.qr_id.trim().length > 0
  ).length;
}

/**
 * @param {{
 *   season: Record<string, unknown>;
 *   networkGameNodeCount?: number;
 *   rulesPublishReady?: boolean;
 *   unlockGraphReady?: boolean;
 *   scanGraphPublishReady?: boolean;
 *   jsonBasename?: string;
 *   profileId?: string | null;
 *   metadataDraftProvided?: boolean;
 *   browserStagingWalkthrough?: boolean;
 * }} input
 */
export function assessSelfServeStagingReady(input) {
  const blockers = [];
  const warnings = [];
  const season = input.season ?? {};
  const browserStagingWalkthrough =
    input.browserStagingWalkthrough === true ||
    (input.browserStagingWalkthrough !== false && isPilotTerminalMintSeason(season));

  const expectedNodes = resolveStagingNodeTarget(season);

  if (!seasonUsesSelfServeSetup(season)) {
    if (isPilotTerminalMintSeason(season)) {
      if (!browserStagingWalkthrough) {
        blockers.push(
          "Season is Cedar Rapids pilot · pass --browser-staging (default for CR) to run E3 browser walkthrough."
        );
      } else {
        warnings.push(
          "Cedar Rapids pilot · browser staging validates full template registration; terminal mint remains for prod ops."
        );
      }
    } else {
      blockers.push("Season missing auto_rules_page. Browser self-serve setup not enabled.");
    }
  }

  const networkCount = input.networkGameNodeCount ?? 0;
  const nodesReady = networkCount >= expectedNodes;
  if (!nodesReady && input.profileId) {
    blockers.push(
      `Resolver shows ${networkCount}/${expectedNodes} active game_node objects with QRs on ${input.profileId}.`
    );
  } else if (!nodesReady && !input.profileId) {
    warnings.push(
      `Pass --profile-id to verify ${expectedNodes} registered nodes on the network.`
    );
  }

  if (input.rulesPublishReady === false) {
    warnings.push(
      browserStagingWalkthrough && isPilotTerminalMintSeason(season)
        ? "Launch window not ready. Pass --metadata-draft with window.starts_at / window.ends_at or commit window on season JSON."
        : "Rules publish not launch-ready. Finish window/status/districts on /created/ or pass --metadata-draft from browser export."
    );
  }

  if (input.unlockGraphReady === false) {
    warnings.push(
      "Unlock graph not valid. Fix route unlock edges on /created/ or include unlock_edges in --metadata-draft."
    );
  }

  if (input.scanGraphPublishReady === false) {
    blockers.push(
      "Scan graph edges not published on Live. On /created/ → Route unlock edges → Publish scan graph edges (owner key unlocked)."
    );
  } else if (input.scanGraphPublishReady === null && input.profileId) {
    warnings.push(
      "Could not verify scan graph edges on Live — check worker is reachable and relationship_edges migration is applied."
    );
  }

  if (input.profileId && !input.metadataDraftProvided) {
    const window =
      season.window && typeof season.window === "object"
        ? /** @type {{ starts_at?: string }} */ (season.window)
        : null;
    if (!window?.starts_at && !(browserStagingWalkthrough && isPilotTerminalMintSeason(season))) {
      warnings.push(
        "Season JSON has no window.starts_at — pass --metadata-draft after downloading season metadata from /created/."
      );
    }
  }

  if (!season.season_root_profile_id && input.profileId && !browserStagingWalkthrough) {
    warnings.push(
      "Commit season_root_profile_id in season JSON after staging root is minted (npm run city-game:sync-season-root pattern)."
    );
  }

  const engineeringReady = blockers.length === 0;
  const humanWalkthroughComplete =
    engineeringReady &&
    nodesReady &&
    input.rulesPublishReady === true &&
    input.unlockGraphReady !== false &&
    input.scanGraphPublishReady !== false;

  return {
    engineeringReady,
    humanWalkthroughComplete,
    expectedNodes,
    networkGameNodeCount: networkCount,
    rulesPublishReady: input.rulesPublishReady,
    unlockGraphReady: input.unlockGraphReady,
    scanGraphPublishReady: input.scanGraphPublishReady,
    browserStagingWalkthrough,
    blockers,
    warnings,
    steps: selfServeStagingWalkthroughSteps(season, browserStagingWalkthrough),
  };
}

/**
 * @param {ReturnType<typeof assessSelfServeStagingReady>} result
 */
export function formatSelfServeStagingReport(result) {
  const target = result.expectedNodes ?? SELF_SERVE_STAGING_REQUIRED_NODE_COUNT;
  const lines = [
    "City game · self-serve staging (Phase E gate E3)",
    "",
    `Nodes on network: ${result.networkGameNodeCount}/${target}`,
    `Engineering ready: ${result.engineeringReady ? "yes" : "no"}`,
    `Rules publish ready: ${result.rulesPublishReady === true ? "yes" : result.rulesPublishReady === false ? "no" : "n/a"}`,
    `Unlock graph ready: ${result.unlockGraphReady === true ? "yes" : result.unlockGraphReady === false ? "no" : "n/a"}`,
    `Scan graph on Live: ${result.scanGraphPublishReady === true ? "yes" : result.scanGraphPublishReady === false ? "no" : "n/a"}`,
    `Browser staging (pilot): ${result.browserStagingWalkthrough ? "yes" : "no"}`,
    `E3 walkthrough complete: ${result.humanWalkthroughComplete ? "yes" : "no"}`,
    "",
    "Browser walkthrough (no terminal mint):",
  ];
  for (const [index, step] of result.steps.entries()) {
    lines.push(`  ${index + 1}. ${step}`);
  }
  if (result.blockers.length) {
    lines.push("", "Blockers:");
    for (const item of result.blockers) lines.push(`  ✗ ${item}`);
  }
  if (result.warnings.length) {
    lines.push("", "Warnings:");
    for (const item of result.warnings) lines.push(`  ⚠ ${item}`);
  }
  return lines.join("\n");
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} jsonBasename
 * @param {string} profileId
 * @param {Record<string, unknown> | null | undefined} draft
 */
export function rulesPublishReadyForSeason(season, jsonBasename, profileId, draft = null) {
  if (!seasonUsesSelfServeSetup(season)) return null;
  return assessOrganizerRulesPublish(season, jsonBasename, profileId, draft).ready;
}

/**
 * Pilot / summer browser staging — launch window on merged season JSON.
 * @param {Record<string, unknown>} season
 * @param {Record<string, unknown> | null | undefined} metadataDraft
 */
export function rulesPublishReadyForPilotStaging(season, metadataDraft = null) {
  const merged = metadataDraft ? mergeSeasonWithMetadataDraft(season, metadataDraft) : season;
  return assessLaunchSurfacesReady(merged).ready;
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} jsonBasename
 * @param {string | null | undefined} profileId
 * @param {Record<string, unknown> | null | undefined} draft
 * @param {boolean} [browserStagingWalkthrough]
 */
export function stagingRulesPublishReady(
  season,
  jsonBasename,
  profileId,
  draft = null,
  browserStagingWalkthrough = false
) {
  if (seasonUsesSelfServeSetup(season)) {
    if (!jsonBasename || !profileId) return null;
    return rulesPublishReadyForSeason(season, jsonBasename, profileId, draft);
  }
  if (browserStagingWalkthrough && isPilotTerminalMintSeason(season)) {
    return rulesPublishReadyForPilotStaging(season, draft);
  }
  return null;
}

/**
 * @param {Record<string, unknown>} season
 * @param {Record<string, unknown> | null | undefined} publishDraft
 */
export function unlockGraphReadyForSeason(season, publishDraft = null) {
  if (!seasonUsesSelfServeSetup(season)) return null;
  return assessUnlockGraphForStaging(season, publishDraft).ready;
}

/**
 * @param {Record<string, unknown>} season
 * @param {Record<string, unknown> | null | undefined} publishDraft
 * @param {boolean} [browserStagingWalkthrough]
 */
export function stagingUnlockGraphReady(season, publishDraft = null, browserStagingWalkthrough = false) {
  if (seasonUsesSelfServeSetup(season)) {
    return unlockGraphReadyForSeason(season, publishDraft);
  }
  if (browserStagingWalkthrough && isPilotTerminalMintSeason(season)) {
    return assessUnlockGraphForStaging(season, publishDraft).ready;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} season
 * @param {Record<string, unknown> | null | undefined} publishDraft
 * @param {Array<{ edge_id?: string; status?: string }> | null | undefined} liveEdges
 * @param {string | null | undefined} profileId
 * @param {boolean} [browserStagingWalkthrough]
 */
export function stagingScanGraphPublishReady(
  season,
  publishDraft = null,
  liveEdges = null,
  profileId = null,
  browserStagingWalkthrough = false
) {
  if (!seasonUsesSelfServeSetup(season) && !(browserStagingWalkthrough && isPilotTerminalMintSeason(season))) {
    return null;
  }
  const mergedDraft =
    publishDraft && profileId && !publishDraft.season_root_profile_id
      ? { ...publishDraft, season_root_profile_id: profileId }
      : publishDraft;
  const result = assessScanGraphPublishForStaging(season, mergedDraft, liveEdges, profileId);
  return result.ready;
}
