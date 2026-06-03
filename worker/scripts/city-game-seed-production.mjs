#!/usr/bin/env node
/**
 * Mint Cedar Rapids Season 1 on production resolver (humanity.llc D1).
 *
 * Creates season root + 15 game_node objects + child QRs. Writes keys to
 * worker/.local/city-game-production-seed.json (gitignored). Updates season JSON
 * when --write-season (default).
 *
 * Prerequisites:
 *   - site/data/city-game-cr-season-01.json window dates set
 *   - season_root_profile_id must be null (or pass --force to mint another season)
 *   - CLOUDFLARE production D1 has child_object QR schema
 *
 * Usage:
 *   npm run city-game:seed-production -- --confirm-production
 *   npm run city-game:seed-production -- --confirm-production --dry-run
 *
 * After mint:
 *   1. Store owner + game-operator keys from worker/.local/city-game-production-seed.json offline
 *   2. npm run city-game:launch-day -- --confirm-production   (surfaces + flag + deploy prompts)
 *
 * @see docs/CITY_GAME_LAUNCH_CHECKLIST.md · docs/CITY_GAME_OPERATOR_CUSTODY.md
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveSeasonPathFromCli } from "../../site/js/city-game-season-path-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = resolveSeasonPathFromCli(root);
const prodApi = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");

const confirm = process.argv.includes("--confirm-production");
const dryRun = process.argv.includes("--dry-run");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

async function healthOk() {
  try {
    const res = await fetch(`${prodApi}/.well-known/hc/v1/health`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const body = await res.json().catch(() => ({}));
    if (body.database === "schema_missing") {
      return { ok: false, reason: "database schema_missing — run worker:migrate:remote" };
    }
    return { ok: true, body };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`Usage:
  npm run city-game:seed-production -- --confirm-production
  npm run city-game:seed-production -- --confirm-production --dry-run

Creates live season root + 15 game_node QRs on ${prodApi}.
Does NOT set CITY_GAME_ENABLED=1 — run city-game:launch-day after mint.`);
    process.exit(0);
  }

  if (!confirm) {
    fail(
      "Production mint creates live cards on humanity.llc.\n" +
        "Re-run with: npm run city-game:seed-production -- --confirm-production"
    );
  }

  if (!existsSync(seasonPath)) {
    fail(`Missing season config: ${seasonPath}`);
  }

  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  if (!season.window?.starts_at || !season.window?.ends_at) {
    fail(
      "Set window.starts_at and window.ends_at in site/data/city-game-cr-season-01.json first."
    );
  }
  if (season.season_root_profile_id && !process.argv.includes("--force")) {
    fail(
      `season_root_profile_id already set (${season.season_root_profile_id}).\n` +
        "Use --force only if you intend to mint a replacement season (update JSON after)."
    );
  }

  console.log("Cedar Rapids city game — production mint\n");
  console.log("API:", prodApi);
  console.log("Season:", season.season_id, "·", season.window.starts_at, "→", season.window.ends_at);

  const health = await healthOk();
  if (!health.ok) {
    fail(`Production resolver unreachable: ${health.reason}`);
  }
  console.log("Health: ok · database:", health.body?.database ?? "ok");

  if (dryRun) {
    console.log("\nDry run — would invoke city-game:seed-local against production.");
    console.log("Keys would be written to worker/.local/city-game-production-seed.json");
    process.exit(0);
  }

  console.log("\nMinting season root + 15 nodes (this writes to production D1)…\n");

  const seedScript = join(root, "worker/scripts/city-game-seed-local.mjs");
  const args = [
    seedScript,
    "--write-season",
    "--skip-flag-check",
    "--production-out",
  ];
  if (process.argv.includes("--force")) args.push("--force");

  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      API_ORIGIN: prodApi,
      SCAN_ORIGIN: process.env.SCAN_ORIGIN || prodApi,
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  console.log("\n✅ Production mint complete.");
  console.log("\nNext:");
  console.log("  1. Back up keys from worker/.local/city-game-production-seed.json offline");
  console.log("  2. npm run city-game:launch-day -- --confirm-production");
  console.log("  3. Spot-scan node_01, node_04, node_13 on production WebKit");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
