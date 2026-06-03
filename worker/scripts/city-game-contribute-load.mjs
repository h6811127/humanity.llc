#!/usr/bin/env node
/**
 * B5 — concurrent contribute load on node_04 (local worker).
 *
 * Prerequisites:
 *   npm run worker:migrate:local
 *   worker:dev with CITY_GAME_ENABLED=1 + CITY_GAME_LOCAL_PLAY_OPEN=1 in worker/.dev.vars
 *   worker/.local/city-game-seed.json
 *
 * Usage:
 *   API_ORIGIN=http://127.0.0.1:8787 npm run city-game:contribute-load-local
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTRIBUTE_LOAD_CONCURRENCY,
  assessQuorumLoadOutcome,
} from "./city-game-contribute-load-core.mjs";
import {
  ensureCityGameDevVars,
  upsertDevVarLine,
} from "./city-game-local-env-core.mjs";
import {
  gameContributeEndpoint,
  resolveSeedContributeNode,
  synthContributorIp,
} from "./city-game-smoke-contribute-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const devVarsPath = join(root, "worker/.dev.vars");
const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:8787").replace(/\/$/, "");

async function postContribute(profileId, objectId, qrId, siteCode, ipIndex) {
  const url = gameContributeEndpoint(apiOrigin, profileId, objectId);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": synthContributorIp(ipIndex),
      },
      body: JSON.stringify({ qr_id: qrId, site_code: siteCode }),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  } catch (err) {
    return {
      status: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function ensureLocalPlayOpenDevVars() {
  const before = existsSync(devVarsPath) ? readFileSync(devVarsPath, "utf8") : "";
  const { text: patched } = ensureCityGameDevVars(before, { host: "127.0.0.1" });
  const after = upsertDevVarLine(patched, "CITY_GAME_LOCAL_PLAY_OPEN", "1");
  if (after !== before) {
    writeFileSync(devVarsPath, after, "utf8");
    console.log("✓ Patched worker/.dev.vars — CITY_GAME_LOCAL_PLAY_OPEN=1");
    console.log("  Restart worker:dev if it was already running.\n");
    return true;
  }
  return false;
}

async function probeSeasonClosed(profileId, river) {
  const probe = await postContribute(profileId, river.objectId, river.qrId, river.siteCode, 99);
  if (probe.status !== 409) return null;
  const error = probe.body && typeof probe.body === "object" ? probe.body.error : null;
  return error === "SEASON_CLOSED" ? probe.body : null;
}

function resetQuorumFromZero() {
  console.log("=== Reset node_04 quorum to 0 ===\n");
  const r = spawnSync("npm", ["run", "city-game:reset-quorum-local", "--", "--from-zero"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, API_ORIGIN: apiOrigin },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

async function main() {
  if (!existsSync(seedPath)) {
    console.error("Missing seed file — run: npm run city-game:seed-local");
    process.exit(1);
  }

  const health = await fetch(`${apiOrigin}/.well-known/hc/v1/health`, {
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!health?.ok) {
    console.error("Worker not reachable at", apiOrigin);
    console.error("Start: npm run worker:dev");
    process.exit(1);
  }

  ensureLocalPlayOpenDevVars();

  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const profileId = season.season_root_profile_id;
  if (!profileId) {
    console.error("season_root_profile_id unset — run npm run city-game:season-root");
    process.exit(1);
  }

  const river = resolveSeedContributeNode(seed.nodes, season.contribute_codes ?? {}, "node_04");
  if (!river) {
    console.error("Seed missing node_04 contribute row");
    process.exit(1);
  }

  const seasonClosed = await probeSeasonClosed(profileId, river);
  if (seasonClosed) {
    console.error("Contributions blocked (SEASON_CLOSED):");
    console.error(" ", seasonClosed.message || seasonClosed.error);
    console.error("\nSet CITY_GAME_LOCAL_PLAY_OPEN=1 in worker/.dev.vars and restart worker:dev.");
    console.error("Or run: npm run city-game:local-env");
    process.exit(1);
  }

  resetQuorumFromZero();

  console.log(`=== B5 contribute load (${CONTRIBUTE_LOAD_CONCURRENCY} concurrent POSTs) ===`);
  console.log(`Target: node_04 · ${river.siteCode}`);

  const tasks = Array.from({ length: CONTRIBUTE_LOAD_CONCURRENCY }, (_, index) =>
    postContribute(profileId, river.objectId, river.qrId, river.siteCode, index + 1)
  );
  const raw = await Promise.all(tasks);

  const listRes = await fetch(
    `${apiOrigin}/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/objects`
  );
  const list = await listRes.json().catch(() => ({}));
  const riverRow = Array.isArray(list.objects)
    ? list.objects.find((row) => row.object_id === river.objectId)
    : null;
  const finalProgress = Number(riverRow?.game_meta?.collective_progress);
  const progressValues = raw
    .filter((row) => row.status === 200 && row.body && typeof row.body === "object")
    .map((row) => Number(/** @type {Record<string, unknown>} */ (row.body).collective_progress))
    .filter((value) => Number.isFinite(value));
  const responsePeak = progressValues.length ? Math.max(...progressValues) : -1;

  const target = 20;
  const { ok, issues, summary } = assessQuorumLoadOutcome({
    results: raw,
    finalProgress: Number.isFinite(finalProgress) ? finalProgress : -1,
    expectedTarget: target,
  });

  if (summary) {
    console.log(
      `Results: ${summary.okCount}/${summary.concurrency} HTTP 200` +
        (summary.rateLimitedCount ? ` · ${summary.rateLimitedCount} rate-limited` : "")
    );
  }

  if (Number.isFinite(finalProgress)) {
    console.log(`Final quorum progress (D1): ${finalProgress}/${target}`);
  }
  if (responsePeak >= 0 && responsePeak !== finalProgress) {
    console.log(`Peak progress in responses: ${responsePeak}/${target}`);
  }

  if (!ok) {
    console.error("\nLoad test failed:");
    for (const issue of issues) console.error(`  - ${issue}`);
    const sample = raw.find((row) => row.status !== 200);
    if (sample?.body) {
      console.error("  Sample error:", JSON.stringify(sample.body));
    }
    process.exit(1);
  }

  console.log("\n✅ B5 contribute load gate passed.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
