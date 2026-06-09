#!/usr/bin/env node
/**
 * Fail when season_root_profile_id is set but production card JSON is NOT_FOUND.
 *
 *   npm run city-game:verify-production-root
 *   API_ORIGIN=https://humanity.llc npm run city-game:verify-production-root
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_PRODUCTION_API,
  formatProductionRootVerifyReport,
  verifyProductionRoot,
} from "./city-game-verify-production-root-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const apiOrigin = (process.env.API_ORIGIN || DEFAULT_PRODUCTION_API).replace(/\/$/, "");

async function main() {
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const result = await verifyProductionRoot(season, apiOrigin);
  console.log(formatProductionRootVerifyReport(result));
  if (!result.ok && !result.skipped) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
