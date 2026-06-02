#!/usr/bin/env node
/**
 * Local Phase C proof gate — unit tests + live scan/contribute smoke.
 *
 * Prerequisites:
 *   npm run worker:migrate:local
 *   CITY_GAME_ENABLED=1 in worker/.dev.vars
 *   npm run worker:dev
 *   npm run city-game:seed-local -- --write-season
 *
 * Usage:
 *   API_ORIGIN=http://127.0.0.1:8787 npm run city-game:proof-local
 *   npm run city-game:proof-local -- --skip-verify --quorum-only
 *
 * @see docs/CITY_GAME_LOCAL_DEV.md
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:8787").replace(/\/$/, "");
const skipVerify = process.argv.includes("--skip-verify");
const quorumOnly = process.argv.includes("--quorum-only");

function run(label, cmd, args, env = process.env) {
  console.log(`\n=== ${label} ===\n`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...env, API_ORIGIN: apiOrigin },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  console.log("Cedar Rapids city game — local proof gate");
  console.log("API:", apiOrigin);
  console.log("Mode:", quorumOnly ? "quorum only" : "full spine");

  if (!skipVerify) {
    run("E1 · verify:city-game", "npm", ["run", "verify:city-game"]);
  }

  const health = await fetch(`${apiOrigin}/.well-known/hc/v1/health`).catch(() => null);
  if (!health?.ok) {
    console.error("\nResolver not reachable at", apiOrigin);
    console.error("Start: npm run worker:dev");
    process.exit(1);
  }
  const healthBody = await health.json().catch(() => ({}));
  if (healthBody.database === "schema_missing") {
    console.error("\nD1 schema missing. Run: npm run worker:migrate:local");
    process.exit(1);
  }

  if (!existsSync(seedPath)) {
    console.error("\nMissing seed file:", seedPath);
    console.error("Run: API_ORIGIN=%s npm run city-game:seed-local -- --write-season", apiOrigin);
    process.exit(1);
  }

  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  if (!seed.profile_id || !Array.isArray(seed.nodes) || seed.nodes.length < 15) {
    console.error("\nSeed file incomplete — re-run city-game:seed-local -- --write-season");
    process.exit(1);
  }

  console.log("\n=== E3 · seed file ===\n");
  console.log("Profile:", seed.profile_id);
  console.log("Nodes:", seed.nodes.length);
  if (seed.contribute_site_codes?.length) {
    console.log("Site codes:", seed.contribute_site_codes.length);
  }

  run("E5 · scan smoke", "npm", ["run", "city-game:smoke-local"]);

  const contributeArgs = ["run", "city-game:smoke-contribute-local"];
  if (!quorumOnly) {
    contributeArgs.push("--", "--spine");
  }
  run("E5 · autonomous contribute smoke", "npm", contributeArgs);

  console.log("\n✅ Local proof gate passed (E1 + E3 + E5).");
  console.log("\nNext (human gates):");
  console.log("  - docs/CITY_GAME_INSTALL_QA.md — physical install");
  console.log("  - docs/CITY_GAME_COMPREHENSION_RUNBOOK.md — GT-1–GT-6");
  console.log("  - docs/CITY_GAME_LAUNCH_CHECKLIST.md — before prod launch");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
