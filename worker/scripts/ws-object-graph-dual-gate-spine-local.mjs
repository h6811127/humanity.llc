#!/usr/bin/env node
/**
 * WS-OBJECT-GRAPH dual-gate spine — automated local D0–D3 (witness + quorum → cabinet open).
 *
 *   npm run worker:migrate:local
 *   npm run city-game:seed-local
 *   npm run worker:dev
 *   npm run ws-object-graph:dual-gate-spine-local -- --setup --seed
 *
 * @see docs/WS_OBJECT_GRAPH_DUAL_GATE_WALK_V1.md
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  gameContributeEndpoint,
  hasContributeBlockInScanHtml,
  parseContributeProgressFromScanHtml,
  readQuorumContributeResponse,
  readWitnessContributeResponse,
  remainingQuorumContributions,
  resolveSeedContributeNode,
  synthContributorIp,
} from "./city-game-smoke-contribute-core.mjs";
import { resolveSmokeScanUrl } from "./city-game-smoke-local-core.mjs";
import {
  assertWitnessEdgeSatisfied,
  evaluateCabinetGraphSmoke,
  evaluateDualGateSpineOpen,
  resolveLocalCabinetSmokeUrls,
} from "./ws-object-graph-prod-smoke-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:8787").replace(/\/$/, "");
const runSeed = process.argv.includes("--seed");
const runSetup = process.argv.includes("--setup");

/** @type {Array<{ step: string; ok: boolean; detail: string }>} */
const results = [];

function record(step, ok, detail) {
  results.push({ step, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${step} — ${detail}`);
}

async function fetchJson(url, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function fetchHtml(url, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: "text/html" } });
      return { ok: res.ok, status: res.status, html: await res.text() };
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function postContribute(profileId, objectId, qrId, siteCode, ipIndex) {
  const url = gameContributeEndpoint(apiOrigin, profileId, objectId);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": synthContributorIp(ipIndex),
    },
    body: JSON.stringify({ qr_id: qrId, site_code: siteCode }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

function runLocalMigrate() {
  try {
    execSync("npm run worker:migrate:local", { cwd: root, stdio: "pipe" });
    record("migrate local", true, "relationship_edges migrations applied");
  } catch (err) {
    record("migrate local", false, err instanceof Error ? err.message : String(err));
  }
}

function seedBothEdgesLocal() {
  if (!existsSync(seedPath)) {
    record("seed both edges", false, "missing city-game-seed.json");
    return;
  }
  try {
    execSync("npm run city-game:seed-relationship-edges", { cwd: root, stdio: "pipe" });
    record("seed both edges", true, "witness + unlock edges on local D1");
  } catch (err) {
    record("seed both edges", false, err instanceof Error ? err.message : String(err));
  }
}

function resetDualGateSpine() {
  try {
    execSync("npm run ws-object-graph:reset-dual-gate-local", {
      cwd: root,
      stdio: "pipe",
    });
    record("reset dual-gate spine", true, "node_04 / node_07 / node_10 D0 cold state");
    return true;
  } catch (err) {
    record(
      "reset dual-gate spine",
      false,
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
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
          : "schema_missing — npm run worker:migrate:local"
        : `HTTP ${res.status}`
    );
    return res.ok && dbOk;
  } catch (err) {
    record(
      "worker health",
      false,
      err instanceof Error ? err.message : "worker not reachable — npm run worker:dev"
    );
    return false;
  }
}

async function checkD0(urls) {
  const status = await fetchJson(urls.cabinetStatus);
  const html = await fetchHtml(urls.cabinetScan);
  if (!status.ok || !html.ok) {
    record("D0 cabinet fetch", false, `status=${status.status} html=${html.status}`);
    return false;
  }
  for (const row of evaluateCabinetGraphSmoke(status.body, html.html)) {
    record(row.step, row.ok, row.detail);
  }
  return results.every((row) => row.ok);
}

async function fillLibraryWitness(seed, seasonCodes) {
  const library = resolveSeedContributeNode(seed.nodes, seasonCodes, "node_10");
  if (!library) {
    record("D1 library witness", false, "seed missing node_10 contribute row");
    return false;
  }
  const { status, body } = await postContribute(
    seed.profile_id,
    library.objectId,
    library.qrId,
    library.siteCode,
    0
  );
  const result = readWitnessContributeResponse(body);
  if (!result.ok) {
    record(
      "D1 library witness",
      false,
      `node_10 contribute failed (${status}): ${result.reason}${result.message ? ` — ${result.message}` : ""}`
    );
    return false;
  }
  if (!result.vouchTargets.includes("node_07")) {
    record("D1 library witness", false, "vouch_targets missing node_07");
    return false;
  }
  record(
    "D1 library witness",
    true,
    `pass issued · scarcity ${result.scarcityRemaining} remaining`
  );
  return true;
}

async function checkD1Witness(urls) {
  const status = await fetchJson(urls.cabinetStatus);
  if (!status.ok) {
    record("D1 cabinet status", false, `HTTP ${status.status}`);
    return false;
  }
  const witness = assertWitnessEdgeSatisfied(status.body);
  record("D1 witness edge satisfied", witness.ok, witness.ok ? "pass" : witness.message);
  return witness.ok;
}

async function fillRiverQuorum(seed, seasonCodes) {
  const river = resolveSeedContributeNode(seed.nodes, seasonCodes, "node_04");
  if (!river) {
    record("D2 river quorum", false, "seed missing node_04 contribute row");
    return false;
  }
  const riverScanUrl = resolveSmokeScanUrl(apiOrigin, river.localScanUrl, river.scanUrl);
  if (!riverScanUrl) {
    record("D2 river quorum", false, "node_04 has no scan URL in seed");
    return false;
  }
  const riverHtml = await fetchHtml(riverScanUrl);
  if (!riverHtml.ok || !hasContributeBlockInScanHtml(riverHtml.html)) {
    record("D2 river quorum", false, "node_04 scan missing contribute block");
    return false;
  }
  const parsed = parseContributeProgressFromScanHtml(riverHtml.html);
  let remaining = parsed ? remainingQuorumContributions(parsed.progress, parsed.target) : null;
  if (remaining === 0) {
    record("D2 river quorum", true, "quorum already complete on scan");
    return true;
  }
  if (remaining == null) {
    remaining = 16;
  }
  let ipIndex = 1;
  for (let i = 0; i < remaining; i++) {
    const { status, body } = await postContribute(
      seed.profile_id,
      river.objectId,
      river.qrId,
      river.siteCode,
      ipIndex++
    );
    const result = readQuorumContributeResponse(body);
    if (!result.ok) {
      record(
        "D2 river quorum",
        false,
        `node_04 contribute failed (${status}): ${result.reason}${result.message ? ` — ${result.message}` : ""}`
      );
      return false;
    }
    if (result.quorumComplete) {
      record(
        "D2 river quorum",
        true,
        `quorum complete at ${result.collectiveProgress}/${result.collectiveTarget}`
      );
      return true;
    }
  }
  record("D2 river quorum", false, "quorum not complete after contributions");
  return false;
}

async function checkD3(urls) {
  const status = await fetchJson(urls.cabinetStatus);
  const html = await fetchHtml(urls.cabinetScan);
  if (!status.ok || !html.ok) {
    record("D3 cabinet fetch", false, `status=${status.status} html=${html.status}`);
    return false;
  }
  for (const row of evaluateDualGateSpineOpen(status.body, html.html)) {
    record(row.step, row.ok, row.detail);
  }
  return true;
}

async function main() {
  console.log("WS-OBJECT-GRAPH-DUAL-GATE-SPINE-LOCAL\n");
  console.log("API:", apiOrigin);

  if (!existsSync(seedPath)) {
    console.error("Missing city-game-seed.json — run npm run city-game:seed-local");
    process.exit(1);
  }

  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const seasonCodes = season.contribute_codes ?? {};
  const urls = resolveLocalCabinetSmokeUrls(seed, apiOrigin);
  console.log("Cabinet:", urls.cabinetScan);
  console.log("");

  if (runSetup) {
    runLocalMigrate();
  }
  if (runSeed) {
    seedBothEdgesLocal();
  }

  let healthy = await checkWorkerHealth();
  if (!healthy) {
    process.exit(1);
  }

  if (!resetDualGateSpine()) {
    process.exit(1);
  }

  await new Promise((resolve) => setTimeout(resolve, 750));
  healthy = await checkWorkerHealth();
  if (!healthy) {
    console.error("\nWorker dropped after D1 reset — restart npm run worker:dev and re-run.");
    process.exit(1);
  }

  if (!(await checkD0(urls))) {
    failAndExit(urls, results);
  }

  const seasonRoot = String(season.season_root_profile_id ?? "").trim();
  const seedProfile = String(seed.profile_id ?? "").trim();
  const useWranglerSatisfy = seasonRoot && seedProfile && seasonRoot !== seedProfile;

  if (useWranglerSatisfy) {
    record(
      "season profile align",
      true,
      `using wrangler satisfy (season root ${seasonRoot} ≠ local seed ${seedProfile})`
    );
    try {
      execSync("npm run ws-object-graph:satisfy-dual-gate-local -- --witness", {
        cwd: root,
        stdio: "pipe",
      });
    } catch (err) {
      record("D1 witness satisfy", false, err instanceof Error ? err.message : String(err));
      failAndExit(urls, results);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (!(await checkD1Witness(urls))) {
      failAndExit(urls, results);
    }
    try {
      execSync("npm run ws-object-graph:satisfy-dual-gate-local -- --unlock", {
        cwd: root,
        stdio: "pipe",
      });
    } catch (err) {
      record("D2 unlock satisfy", false, err instanceof Error ? err.message : String(err));
      failAndExit(urls, results);
    }
  } else {
    if (!(await fillLibraryWitness(seed, seasonCodes))) {
      failAndExit(urls, results);
    }
    if (!(await checkD1Witness(urls))) {
      failAndExit(urls, results);
    }
    if (!(await fillRiverQuorum(seed, seasonCodes))) {
      failAndExit(urls, results);
    }
  }

  await checkD3(urls);

  const failed = results.filter((row) => !row.ok);
  writeReport(urls, results, failed.length === 0);
  if (failed.length) {
    console.error(`\n${failed.length} check(s) failed — NO-GO`);
    process.exit(1);
  }
  console.log("\n✅ Local dual-gate spine passed — D0–D3 GO");
}

/**
 * @param {ReturnType<typeof resolveLocalCabinetSmokeUrls>} urls
 * @param {Array<{ step: string; ok: boolean; detail: string }>} rows
 */
function failAndExit(urls, rows) {
  writeReport(urls, rows, false);
  console.error("\nDual-gate spine failed — NO-GO");
  console.error(
    "Hint: npm run worker:dev && npm run ws-object-graph:dual-gate-spine-local -- --setup --seed"
  );
  process.exit(1);
}

/**
 * @param {ReturnType<typeof resolveLocalCabinetSmokeUrls>} urls
 * @param {Array<{ step: string; ok: boolean; detail: string }>} rows
 * @param {boolean} go
 */
function writeReport(urls, rows, go) {
  const reportPath = join(root, "site/dev/ws-object-graph-v1/dual-gate-spine-local-report.json");
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        apiOrigin,
        urls,
        results: rows,
        go,
      },
      null,
      2
    )
  );
  console.log("\nReport:", reportPath.replace(`${root}/`, ""));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
