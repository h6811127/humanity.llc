#!/usr/bin/env node
/**
 * Phase E gate E3 — self-serve staging preflight (browser-only season setup).
 *
 *   npm run city-game:self-serve-staging-preflight
 *   npm run city-game:self-serve-staging-preflight -- --profile-id profExample01
 *   npm run city-game:self-serve-staging-preflight -- --expect-complete
 *
 * @see docs/CITY_GAME_LOCAL_DEV.md § E3 self-serve staging
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { jsonBasenameFromPublicUrl } from "../../site/js/city-game-rules-publish-core.mjs";
import { loadSeasonJsonFile, resolveSeasonPathFromCli } from "../../site/js/city-game-season-path-core.mjs";
import {
  assessSelfServeStagingReady,
  countActiveGameNodes,
  formatSelfServeStagingReport,
  rulesPublishReadyForSeason,
} from "../../site/js/city-game-self-serve-staging-core.mjs";
import {
  assessTerminalMintCliAccess,
  seasonUsesSelfServeSetup,
} from "../../site/js/city-game-terminal-mint-deprecation-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = resolveSeasonPathFromCli(root, process.argv);
const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1].trim() : "";
}

const profileId = readArg("--profile-id");
const expectComplete = process.argv.includes("--expect-complete");

const season = JSON.parse(readFileSync(seasonPath, "utf8"));
const mintAccess = assessTerminalMintCliAccess({
  season,
  scriptName: "city-game:mint-node",
  force: false,
  ci: false,
});

console.log(`Season: ${season.season_id} (${seasonPath.replace(root + "/", "")})\n`);

if (mintAccess.allowed && seasonUsesSelfServeSetup(season)) {
  console.error("✗ Terminal mint is not blocked for this self-serve season — fix deprecation guard.");
  process.exit(1);
}

if (!mintAccess.allowed) {
  console.log("✓ Terminal mint blocked for self-serve season (organizers use /created/).\n");
}

/** @type {number | undefined} */
let networkGameNodeCount;
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
}

const indexPath = join(root, "site/data/city-game-seasons-index.json");
const index = JSON.parse(readFileSync(indexPath, "utf8"));
const indexRow = (index.seasons ?? []).find((row) => row.season_id === season.season_id);
const jsonBasename = jsonBasenameFromPublicUrl(
  typeof indexRow?.json_url === "string" ? indexRow.json_url : ""
);
const rulesReady =
  profileId && jsonBasename
    ? rulesPublishReadyForSeason(season, jsonBasename, profileId)
    : undefined;

const result = assessSelfServeStagingReady({
  season,
  networkGameNodeCount,
  rulesPublishReady: rulesReady,
  jsonBasename,
  profileId: profileId || null,
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

console.log("\nNext: complete the browser walkthrough above, then re-run with --profile-id and --expect-complete.");
