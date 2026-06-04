#!/usr/bin/env node
/**
 * WS-SCALE SC-2b — 40-node local scan smoke (after SC-2 mint).
 *
 *   npm run city-game:scale-sc2b
 *   npm run city-game:scale-sc2b -- --skip-smoke   # seed/map checks only
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { INSTALL_QA_REQUIRED_NODE_COUNT } from "./city-game-smoke-local-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const localSeedPath = join(root, "worker/.local/city-game-seed.json");
const skipSmoke = process.argv.includes("--skip-smoke");

function main() {
  if (!existsSync(localSeedPath)) {
    console.error("Missing local seed — npm run city-game:seed-wave-open");
    process.exit(1);
  }

  const seed = JSON.parse(readFileSync(localSeedPath, "utf8"));
  const urlCount = (seed.nodes ?? []).filter(
    (n) => n.scan_url || n.local_scan_url
  ).length;

  console.log("WS-SCALE SC-2b — local scan smoke (40 nodes)");
  console.log("  Seed URLs:", urlCount, `/${INSTALL_QA_REQUIRED_NODE_COUNT}`);

  if (urlCount < INSTALL_QA_REQUIRED_NODE_COUNT) {
    console.error("\n✗ SC-2b failed — incomplete seed.");
    process.exit(1);
  }

  if (skipSmoke) {
    console.log("\n☑ SC-2b seed count OK (--skip-smoke).");
    return;
  }

  const health = spawnSync(
    "curl",
    ["-sf", "http://127.0.0.1:8787/.well-known/hc/v1/health"],
    { encoding: "utf8" }
  );
  if (health.status !== 0) {
    console.error("\n✗ worker:dev not reachable — start npm run worker:dev");
    process.exit(1);
  }

  console.log("\nRunning npm run city-game:smoke-local -- --all …\n");
  const smoke = spawnSync("npm", ["run", "city-game:smoke-local", "--", "--all"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, API_ORIGIN: process.env.API_ORIGIN || "http://127.0.0.1:8787" },
  });

  if (smoke.status !== 0) {
    console.error("\n✗ SC-2b failed — smoke-local --all");
    process.exit(smoke.status ?? 1);
  }

  console.log("\n☑ SC-2b pass — all 40 local scans render game template.");
  console.log("  Next: npm run city-game:install-qa-walk · npm run city-game:scale-sc3");
  console.log("  Physical B7: npm run city-game:dev -- --lan · install-qa-walk -- --lan");
}

main();
