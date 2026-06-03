#!/usr/bin/env node
/**
 * Launch day orchestrator — surfaces, flag check, deploy commands (Phase D).
 *
 *   npm run city-game:launch-day -- --confirm-production
 *   npm run city-game:launch-day -- --confirm-production --apply-only
 *   npm run city-game:launch-day -- --confirm-production --deploy
 *
 * --apply-only   Patch HTML + wrangler flag only (no deploy)
 * --deploy       Also run pages:deploy + worker:deploy (needs CLOUDFLARE_API_TOKEN)
 *
 * @see docs/CITY_GAME_LAUNCH_CHECKLIST.md
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { cityGameSeasonReadiness } from "./city-game-season-readiness.mjs";
import { assessLaunchSurfacesReady } from "./city-game-launch-surfaces-core.mjs";
import {
  assessLaunchChecklistReady,
  LAUNCH_CHECKLIST_REL,
} from "./city-game-launch-checklist-core.mjs";

import { resolveSeasonPathFromCli } from "../../site/js/city-game-season-path-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = resolveSeasonPathFromCli(root);
const wranglerPath = join(root, "worker/wrangler.toml");
const prodSeedPath = join(root, "worker/.local/city-game-production-seed.json");
const localSeedPath = join(root, "worker/.local/city-game-seed.json");

const confirm = process.argv.includes("--confirm-production");
const applyOnly = process.argv.includes("--apply-only");
const deploy = process.argv.includes("--deploy");

function run(label, cmd, args, opts = {}) {
  console.log(`\n=== ${label} ===\n`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function enableCityGameFlag() {
  let toml = readFileSync(wranglerPath, "utf8");
  if (/CITY_GAME_ENABLED\s*=\s*"1"/.test(toml)) {
    console.log("✓ CITY_GAME_ENABLED already 1 in worker/wrangler.toml");
    return;
  }
  if (!/CITY_GAME_ENABLED\s*=\s*"0"/.test(toml)) {
    console.error("Could not find CITY_GAME_ENABLED = \"0\" in worker/wrangler.toml");
    process.exit(1);
  }
  toml = toml.replace(/CITY_GAME_ENABLED\s*=\s*"0"/, 'CITY_GAME_ENABLED = "1"');
  writeFileSync(wranglerPath, toml);
  console.log("✓ Set CITY_GAME_ENABLED = \"1\" in worker/wrangler.toml");
}

function setSeasonActive() {
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  if (season.status === "active") {
    console.log("✓ season status already active");
    return;
  }
  season.status = "active";
  writeFileSync(seasonPath, `${JSON.stringify(season, null, 2)}\n`);
  console.log("✓ Set season.status = active in season JSON");
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`Usage:
  npm run city-game:launch-day -- --confirm-production [--apply-only] [--deploy]

Requires production mint (city-game:seed-production) or season_root_profile_id set.`);
    process.exit(0);
  }

  if (!confirm) {
    console.error("Re-run with --confirm-production to patch launch surfaces and enable flag.");
    process.exit(1);
  }

  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const readiness = cityGameSeasonReadiness(season, { requireLaunch: true });
  const surfaces = assessLaunchSurfacesReady(season);

  console.log("Cedar Rapids city game — launch day\n");
  console.log("Season:", season.season_id);
  console.log("Root:", season.season_root_profile_id || "(missing)");

  if (readiness.issues.length) {
    console.error("\nSeason not launch-ready:");
    for (const issue of readiness.issues) console.error(`  - ${issue}`);
    process.exit(1);
  }
  if (surfaces.issues.length) {
    console.error("\nLaunch surface blockers:");
    for (const issue of surfaces.issues) console.error(`  - ${issue}`);
    process.exit(1);
  }

  const launchChecklistPath = join(root, LAUNCH_CHECKLIST_REL);
  const launchChecklistDoc = existsSync(launchChecklistPath)
    ? readFileSync(launchChecklistPath, "utf8")
    : "";
  const c5 = assessLaunchChecklistReady({ launchChecklistDoc, scanAnalyticsGateOk: true });
  if (!c5.readyForLaunchDay) {
    console.error("\nLaunch checklist not signed (C5):");
    for (const blocker of c5.blockers) console.error(`  - ${blocker}`);
    console.error("\nRun: npm run city-game:launch-checklist-preflight");
    process.exit(1);
  }

  const seedPath = existsSync(prodSeedPath) ? prodSeedPath : localSeedPath;
  if (!existsSync(seedPath)) {
    console.warn("\n⚠ No seed file found — ensure operator keys are in custody (O1).");
  } else {
    console.log("\nSeed file:", seedPath.replace(root + "/", ""));
    console.log("  → Back up owner + game-operator keys offline before deploy.");
  }

  run("Launch surfaces (--apply)", "npm", ["run", "city-game:launch-surfaces", "--", "--apply"]);
  enableCityGameFlag();
  setSeasonActive();

  run("Build static site", "npm", ["run", "build"]);

  run("Verify launch surfaces applied", "npm", [
    "run",
    "city-game:launch-surfaces",
    "--",
    "--check",
    "--expect-applied",
  ]);

  if (deploy) {
    run("Pages deploy", "npm", ["run", "pages:deploy"], {
      env: { ...process.env },
    });
    run("Worker deploy", "npm", ["run", "worker:deploy"], {
      env: { ...process.env },
    });
    run("Post-deploy verify", "npm", ["run", "verify:city-game", "--", "--require-launch"]);
    console.log("\n✅ Deploy complete. Spot-scan node_01, node_04, node_13 on production WebKit.");
  } else {
    console.log("\n✅ Launch patches applied locally (--apply-only).");
    console.log("\nDeploy when ready (same release train — R-12):");
    console.log("  npm run pages:deploy");
    console.log("  npm run worker:deploy");
    console.log("  npm run verify:city-game -- --require-launch");
    console.log("\nOr re-run: npm run city-game:launch-day -- --confirm-production --deploy");
  }
}

main();
