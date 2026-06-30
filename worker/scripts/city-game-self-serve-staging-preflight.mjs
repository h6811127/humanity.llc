#!/usr/bin/env node
/**
 * Phase E gate E3 — self-serve staging preflight (browser-only season setup).
 *
 *   npm run city-game:self-serve-staging-preflight
 *   npm run city-game:self-serve-staging-preflight -- --season cr_season_01_wake
 *   npm run city-game:self-serve-staging-preflight -- --season example_city_season_01
 *   npm run city-game:self-serve-staging-preflight -- --profile-id profExample01
 *   npm run city-game:self-serve-staging-preflight -- --profile-id <id> --metadata-draft ./city-game-*-metadata-draft.json --expect-complete
 *
 * Default season: Cedar Rapids summer (40 nodes). Pass --no-browser-staging to require self-serve seasons only.
 *
 * @see docs/CITY_GAME_LOCAL_DEV.md § E3 self-serve staging
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { jsonBasenameFromPublicUrl } from "../../site/js/city-game-rules-publish-core.mjs";
import {
  assessSelfServeStagingReady,
  countActiveGameNodes,
  formatSelfServeStagingReport,
  mergeSeasonWithMetadataDraft,
  publishDraftFromMetadata,
  resolveSelfServeStagingSeasonPath,
  stagingRulesPublishReady,
  stagingUnlockGraphReady,
  stagingScanGraphPublishReady,
} from "../../site/js/city-game-self-serve-staging-core.mjs";
import {
  assessTerminalMintCliAccess,
  isPilotTerminalMintSeason,
  seasonUsesSelfServeSetup,
} from "../../site/js/city-game-terminal-mint-deprecation-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = resolveSelfServeStagingSeasonPath(root, process.argv);
const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1].trim() : "";
}

const profileId = readArg("--profile-id");
const metadataDraftPath = readArg("--metadata-draft");
const expectComplete = process.argv.includes("--expect-complete");
const browserStagingExplicitOff = process.argv.includes("--no-browser-staging");
const browserStagingExplicitOn = process.argv.includes("--browser-staging");

const seasonCommitted = JSON.parse(readFileSync(seasonPath, "utf8"));

/** @type {Record<string, unknown> | null} */
let metadataDraft = null;
if (metadataDraftPath) {
  const abs = metadataDraftPath.startsWith("/")
    ? metadataDraftPath
    : join(process.cwd(), metadataDraftPath);
  try {
    metadataDraft = JSON.parse(readFileSync(abs, "utf8"));
    console.log(`Metadata draft: ${abs.replace(root + "/", "")}\n`);
  } catch (err) {
    console.error(
      `✗ Could not read --metadata-draft: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }
}

const season = mergeSeasonWithMetadataDraft(seasonCommitted, metadataDraft);
const publishDraft = publishDraftFromMetadata(metadataDraft);

const browserStagingWalkthrough = browserStagingExplicitOff
  ? false
  : browserStagingExplicitOn || isPilotTerminalMintSeason(seasonCommitted);

const mintAccess = assessTerminalMintCliAccess({
  season: seasonCommitted,
  scriptName: "city-game:mint-node",
  force: false,
  ci: false,
});

console.log(`Season: ${season.season_id} (${seasonPath.replace(root + "/", "")})\n`);

if (mintAccess.allowed && seasonUsesSelfServeSetup(seasonCommitted)) {
  console.error("✗ Terminal mint is not blocked for this self-serve season — fix deprecation guard.");
  process.exit(1);
}

if (!mintAccess.allowed && seasonUsesSelfServeSetup(seasonCommitted)) {
  console.log("✓ Terminal mint blocked for self-serve season (organizers use /created/).\n");
}

if (browserStagingWalkthrough && isPilotTerminalMintSeason(seasonCommitted)) {
  console.log("✓ Browser staging walkthrough mode (Cedar Rapids summer · full template in /created/).\n");
}

/** @type {number | undefined} */
let networkGameNodeCount;
/** @type {Array<{ edge_id?: string; status?: string }> | undefined} */
let liveRelationshipEdges;
if (profileId) {
  try {
    const res = await fetch(`${apiOrigin}/.well-known/hc/v1/cards/${profileId}/objects`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`⚠ Could not load objects for ${profileId}: HTTP ${res.status}`);
    } else {
      const body = await res.json();
      networkGameNodeCount = countActiveGameNodes(body?.objects);
    }
  } catch (err) {
    console.warn(
      `⚠ Network check skipped: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  try {
    const edgeRes = await fetch(
      `${apiOrigin}/.well-known/hc/v1/cards/${profileId}/relationship-edges`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) }
    );
    if (!edgeRes.ok) {
      console.warn(`⚠ Could not load relationship edges for ${profileId}: HTTP ${edgeRes.status}`);
    } else {
      const edgeBody = await edgeRes.json();
      liveRelationshipEdges = Array.isArray(edgeBody.relationship_edges)
        ? edgeBody.relationship_edges
        : [];
    }
  } catch (err) {
    console.warn(
      `⚠ Relationship-edge check skipped: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

const indexPath = join(root, "site/data/city-game-seasons-index.json");
const index = JSON.parse(readFileSync(indexPath, "utf8"));
const indexRow = (index.seasons ?? []).find((row) => row.season_id === season.season_id);
const jsonBasename = jsonBasenameFromPublicUrl(
  typeof indexRow?.json_url === "string" ? indexRow.json_url : ""
);

const assessProfileId =
  profileId ||
  (!browserStagingWalkthrough && String(season.season_root_profile_id ?? "").trim()) ||
  null;

const rulesReady = stagingRulesPublishReady(
  season,
  jsonBasename,
  assessProfileId,
  publishDraft,
  browserStagingWalkthrough
);

const unlockReady = stagingUnlockGraphReady(season, publishDraft, browserStagingWalkthrough);

const scanGraphReady = stagingScanGraphPublishReady(
  season,
  publishDraft,
  liveRelationshipEdges,
  assessProfileId,
  browserStagingWalkthrough
);

const result = assessSelfServeStagingReady({
  season: seasonCommitted,
  networkGameNodeCount,
  rulesPublishReady: rulesReady ?? undefined,
  unlockGraphReady: unlockReady ?? undefined,
  scanGraphPublishReady: scanGraphReady ?? undefined,
  jsonBasename,
  profileId: assessProfileId,
  metadataDraftProvided: Boolean(metadataDraft),
  browserStagingWalkthrough,
});

console.log(formatSelfServeStagingReport(result));

if (expectComplete) {
  if (!result.humanWalkthroughComplete) {
    process.exit(1);
  }
  console.log("\n✅ E3 self-serve staging walkthrough complete.");
  process.exit(0);
}

if (!result.engineeringReady) {
  process.exit(1);
}

console.log(
  "\nNext: complete the browser walkthrough above, then re-run with --profile-id, optional --metadata-draft, and --expect-complete."
);
