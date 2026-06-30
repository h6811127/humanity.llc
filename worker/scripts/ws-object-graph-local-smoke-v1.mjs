#!/usr/bin/env node
/**
 * WS-OBJECT-GRAPH-LOCAL-SMOKE-V1 — dual-gate cabinet against worker:dev.
 *
 *   npm run worker:migrate:local
 *   npm run city-game:seed-local
 *   npm run worker:dev   # separate terminal
 *   npm run ws-object-graph:local-smoke
 *   npm run ws-object-graph:local-smoke -- --setup --seed
 *   npm run ws-object-graph:local-smoke -- --setup --seed --drill
 *   npm run ws-object-graph:local-smoke -- --setup --seed --dark-check
 *
 * @see docs/WS_OBJECT_GRAPH_DUAL_GATE_WALK_V1.md
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CR_UNLOCK_EDGE_ID,
  CR_WITNESS_EDGE_ID,
  assertLegacyVouchFallback,
  evaluateCabinetGraphSmoke,
  evaluateCabinetGraphSmokeLocal,
  resolveLocalCabinetSmokeUrls,
  statusHasActiveEdge,
} from "./ws-object-graph-prod-smoke-core.mjs";
import { runCabinetScanDarkThemeCheck } from "./ws-object-graph-scan-theme-check-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const runSeed = process.argv.includes("--seed");
const runSetup = process.argv.includes("--setup");
const runDrill = process.argv.includes("--drill");
const runDarkCheck = process.argv.includes("--dark-check");
const runStrictPending = process.argv.includes("--strict-pending");
const skipReset = process.argv.includes("--no-reset");
const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:8787").replace(/\/$/, "");

/** @type {Array<{ step: string, ok: boolean, detail: string }>} */
const results = [];

function record(step, ok, detail) {
  results.push({ step, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${step} — ${detail}`);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { Accept: "text/html" } });
  return { ok: res.ok, status: res.status, html: await res.text() };
}

async function checkWorkerHealth() {
  try {
    const res = await fetch(`${apiOrigin}/.well-known/hc/v1/health`, {
      headers: { Accept: "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    const dbOk = body?.database !== "schema_missing";
    record(
      "worker health",
      res.ok && dbOk,
      res.ok
        ? dbOk
          ? "worker reachable"
          : "schema_missing — run npm run worker:migrate:local"
        : `HTTP ${res.status}`
    );
    return res.ok && dbOk;
  } catch (err) {
    record(
      "worker health",
      false,
      err instanceof Error ? err.message : "worker not reachable — start npm run worker:dev"
    );
    return false;
  }
}

function runLocalMigrate() {
  try {
    execSync("npm run worker:migrate:local", { cwd: root, stdio: "pipe" });
    record("migrate local", true, "relationship_edges migrations applied");
  } catch (err) {
    record("migrate local", false, err instanceof Error ? err.message : String(err));
  }
}

function runQuorumReset() {
  try {
    execSync("npm run city-game:reset-quorum-local", {
      cwd: root,
      stdio: "pipe",
      env: { ...process.env, API_ORIGIN: apiOrigin },
    });
    record("quorum reset", true, "cabinet + river pre-quorum state");
  } catch (err) {
    record(
      "quorum reset",
      true,
      `skipped (${err instanceof Error ? err.message : String(err)}) — using relaxed unlock check`
    );
  }
}

function seedBothEdgesLocal() {
  if (!existsSync(seedPath)) {
    record("seed both edges", false, "missing city-game-seed.json — run npm run city-game:seed-local");
    return;
  }
  try {
    execSync("npm run city-game:seed-relationship-edges", {
      cwd: root,
      stdio: "pipe",
      env: process.env,
    });
    record(
      "seed both edges",
      true,
      `${CR_WITNESS_EDGE_ID} + ${CR_UNLOCK_EDGE_ID}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const hint = message.includes("SQLITE_BUSY") || message.includes("database is locked")
      ? "stop worker:dev, then npm run city-game:seed-relationship-edges"
      : message;
    record("seed both edges", false, hint);
  }
}

function resetDualGateColdLocal() {
  try {
    execSync("npm run ws-object-graph:reset-dual-gate-local", {
      cwd: root,
      stdio: "pipe",
    });
    record("reset D0 cold", true, "node_04 / node_07 / node_10 dual-gate cold state");
  } catch (err) {
    record(
      "reset D0 cold",
      false,
      err instanceof Error ? err.message : String(err)
    );
  }
}

function recordAssert(step, result) {
  record(step, result.ok, result.ok ? "pass" : result.message);
}

function revokeEdgeLocal(edgeId) {
  execSync(
    `npx wrangler d1 execute humanity-resolver --local --config worker/wrangler.toml --command ${JSON.stringify(
      `UPDATE relationship_edges SET status='revoked', updated_at=datetime('now') WHERE edge_id='${edgeId}';`
    )}`,
    { cwd: root, stdio: "pipe" }
  );
}

async function checkLegacyFallback(urls) {
  revokeEdgeLocal(CR_WITNESS_EDGE_ID);
  revokeEdgeLocal(CR_UNLOCK_EDGE_ID);
  const status = await fetchJson(urls.cabinetStatus);
  const html = await fetchHtml(urls.cabinetScan);
  recordAssert("revoke fallback", assertLegacyVouchFallback(status.body, html.html));
}

async function verifyReissued(urls) {
  const status = await fetchJson(urls.cabinetStatus);
  const witness = statusHasActiveEdge(status.body, CR_WITNESS_EDGE_ID);
  const unlock = statusHasActiveEdge(status.body, CR_UNLOCK_EDGE_ID);
  record(
    "re-issue verified",
    witness && unlock,
    witness && unlock
      ? "both edges in relationships[]"
      : `witness=${witness} unlock=${unlock}`
  );
}

async function checkCabinetGraph(urls) {
  const status = await fetchJson(urls.cabinetStatus);
  if (!status.ok) {
    record("cabinet status HTTP", false, `HTTP ${status.status}`);
    return;
  }

  const html = await fetchHtml(urls.cabinetScan);
  if (!html.ok) {
    record("cabinet scan HTTP", false, `HTTP ${html.status}`);
    return;
  }

  for (const row of (runStrictPending
    ? evaluateCabinetGraphSmoke
    : evaluateCabinetGraphSmokeLocal)(status.body, html.html)) {
    record(row.step, row.ok, row.detail);
  }
}

async function main() {
  console.log("WS-OBJECT-GRAPH-LOCAL-SMOKE-V1\n");
  console.log("API:", apiOrigin);

  if (!existsSync(seedPath)) {
    console.error(`Missing ${seedPath.replace(root + "/", "")}`);
    console.error("Run: npm run city-game:seed-local");
    process.exit(1);
  }

  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const urls = resolveLocalCabinetSmokeUrls(seed, apiOrigin);
  console.log("Cabinet:", urls.cabinetScan);
  if (urls.libraryScan) console.log("Library:", urls.libraryScan);
  if (urls.riverScan) console.log("River:", urls.riverScan);
  console.log("");

  if (runSetup) {
    runLocalMigrate();
  } else {
    console.log("(pass --setup to migrate + reset quorum before checks)\n");
  }

  if (runSeed) {
    seedBothEdgesLocal();
  } else {
    console.log("(pass --seed to write witness + unlock edges on local D1)\n");
  }

  const healthy = await checkWorkerHealth();
  if (healthy && !skipReset) {
    resetDualGateColdLocal();
    await new Promise((resolve) => setTimeout(resolve, 500));
  } else if (healthy && runSetup) {
    runQuorumReset();
  }
  if (healthy) {
    await checkCabinetGraph(urls);
    if (runDrill) {
      await checkLegacyFallback(urls);
      seedBothEdgesLocal();
      await verifyReissued(urls);
    } else {
      console.log("(pass --drill to revoke + re-issue both edges on local D1)\n");
    }
    if (runDarkCheck) {
      await runCabinetScanDarkThemeCheck({
        cabinetScan: urls.cabinetScan,
        outDir: join(root, "site/dev/ws-object-graph-v1/screenshots/local"),
        repoRoot: root,
        captureScreenshot: true,
        record,
      });
    } else {
      console.log("(pass --dark-check for Playwright dark-mode graph check)\n");
    }
  }

  const failed = results.filter((row) => !row.ok);
  const reportPath = join(root, "site/dev/ws-object-graph-v1/local-smoke-report.json");
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        apiOrigin,
        urls,
        edges: [CR_WITNESS_EDGE_ID, CR_UNLOCK_EDGE_ID],
        results,
        go: failed.length === 0,
      },
      null,
      2
    )
  );
  console.log("\nReport:", reportPath.replace(root + "/", ""));

  if (failed.length) {
    console.error(`\n${failed.length} check(s) failed — NO-GO`);
    console.error(
      "Hint: npm run worker:dev && npm run ws-object-graph:local-smoke -- --setup --seed"
    );
    process.exit(1);
  }
  console.log("\n✅ Local dual-gate smoke passed — GO");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
