/**
 * Phase E gate E3 — self-serve staging walkthrough (browser-only, no terminal mint).
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § Phase E · gate E3
 */

import { assessOrganizerRulesPublish } from "./city-game-rules-publish-core.mjs";
import { resolveSeasonTemplateRows, STARTER_S1_NODE_TEMPLATE } from "./city-game-season-template-core.mjs";
import {
  isPilotTerminalMintSeason,
  seasonUsesSelfServeSetup,
} from "./city-game-terminal-mint-deprecation-core.mjs";

export const SELF_SERVE_STAGING_REQUIRED_NODE_COUNT = 15;
export const SELF_SERVE_STAGING_EXAMPLE_SEASON_ID = "example_city_season_01";

/**
 * @returns {string[]}
 */
export function selfServeStagingWalkthroughSteps() {
  return [
    "/create/ — season root card + game-operator public key (Organizer / issuer) · owner + recovery keys saved",
    "/created/ Live · Manage — choose example (or your) season · confirm terminal mint notice",
    "Bulk import starter registry — register all 15 nodes (no city-game:mint-node)",
    "Issue scan QRs from hub rows or register form — download PNGs for install QA",
    "Rules page & launch panel — set window + status · preview draft · download launch HTML · npm run build",
    "Deploy Pages preview/staging — spot-scan node_01, node_04, node_07 on staging WebKit",
    "Sign E3 when complete: npm run city-game:self-serve-staging-preflight -- --expect-complete",
  ];
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
 *   jsonBasename?: string;
 *   profileId?: string | null;
 * }} input
 */
export function assessSelfServeStagingReady(input) {
  const blockers = [];
  const warnings = [];
  const season = input.season ?? {};

  if (!seasonUsesSelfServeSetup(season)) {
    if (isPilotTerminalMintSeason(season)) {
      blockers.push(
        "Season is Cedar Rapids pilot — E3 targets self-serve seasons (example_city_season_01 or auto_rules_page)."
      );
    } else {
      blockers.push("Season missing auto_rules_page — browser self-serve setup not enabled.");
    }
  }

  const templateRows = resolveSeasonTemplateRows(season);
  const expectedNodes =
    templateRows.length >= SELF_SERVE_STAGING_REQUIRED_NODE_COUNT
      ? templateRows.length
      : STARTER_S1_NODE_TEMPLATE.length;

  if (expectedNodes < SELF_SERVE_STAGING_REQUIRED_NODE_COUNT) {
    warnings.push(
      `Template has ${expectedNodes} nodes — E3 walkthrough expects ${SELF_SERVE_STAGING_REQUIRED_NODE_COUNT}.`
    );
  }

  const networkCount = input.networkGameNodeCount ?? 0;
  const nodesReady = networkCount >= SELF_SERVE_STAGING_REQUIRED_NODE_COUNT;
  if (!nodesReady && input.profileId) {
    blockers.push(
      `Resolver shows ${networkCount}/${SELF_SERVE_STAGING_REQUIRED_NODE_COUNT} active game_node objects with QRs on ${input.profileId}.`
    );
  } else if (!nodesReady && !input.profileId) {
    warnings.push(
      `Pass --profile-id to verify ${SELF_SERVE_STAGING_REQUIRED_NODE_COUNT} registered nodes on the network.`
    );
  }

  if (input.rulesPublishReady === false) {
    warnings.push("Rules publish panel not launch-ready — finish window/status/districts draft on /created/.");
  }

  if (!season.season_root_profile_id && input.profileId) {
    warnings.push(
      "Commit season_root_profile_id in season JSON after staging root is minted (npm run city-game:sync-season-root pattern)."
    );
  }

  const engineeringReady = blockers.length === 0;
  const humanWalkthroughComplete =
    engineeringReady && nodesReady && input.rulesPublishReady === true;

  return {
    engineeringReady,
    humanWalkthroughComplete,
    expectedNodes,
    networkGameNodeCount: networkCount,
    blockers,
    warnings,
    steps: selfServeStagingWalkthroughSteps(),
  };
}

/**
 * @param {ReturnType<typeof assessSelfServeStagingReady>} result
 */
export function formatSelfServeStagingReport(result) {
  const lines = [
    "City game · self-serve staging (Phase E gate E3)",
    "",
    `Nodes on network: ${result.networkGameNodeCount}/${SELF_SERVE_STAGING_REQUIRED_NODE_COUNT}`,
    `Engineering ready: ${result.engineeringReady ? "yes" : "no"}`,
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
