#!/usr/bin/env node
/**
 * WS-OBJECT-GRAPH-PROD-SMOKE-V1 — production object graph smoke.
 *
 *   npm run ws-object-graph:prod-smoke
 *   npm run ws-object-graph:prod-smoke -- --seed      # seed witness + unlock on remote D1
 *   npm run ws-object-graph:prod-smoke -- --screenshots
 *   npm run ws-object-graph:prod-smoke -- --d3-check
 *   npm run ws-object-graph:prod-smoke -- --drill   # revoke + re-issue both edges on prod D1
 *
 * @see docs/WS_OBJECT_GRAPH_PROD_SMOKE_V1.md
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CR_UNLOCK_EDGE_ID,
  CR_WITNESS_EDGE_ID,
  assertLegacyVouchFallback,
  evaluateCabinetGraphSmoke,
  evaluateDualGateSpineOpen,
  resolveProdCabinetSmokeUrls,
  statusHasActiveEdge,
} from "./ws-object-graph-prod-smoke-core.mjs";
import { runCabinetScanDarkThemeCheck } from "./ws-object-graph-scan-theme-check-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const urls = resolveProdCabinetSmokeUrls(process.env.API_ORIGIN || "https://humanity.llc");
const apiOrigin = urls.apiOrigin;
const profileId = urls.profileId;
const cabinetQr = urls.cabinetQr;
const captureScreenshots = process.argv.includes("--screenshots");
const runDarkCheck = process.argv.includes("--dark-check");
const runD3Check = process.argv.includes("--d3-check");
const runDrill = process.argv.includes("--drill");
const runSeed = process.argv.includes("--seed");

const cabinetScan = urls.cabinetScan;
const libraryScan = urls.libraryScan ?? `${apiOrigin}/c/${profileId}?q=qr_6zs7Jej5m4ZV4U7e`;
const cabinetStatus = urls.cabinetStatus;
const prodSeedPath = join(root, "worker/.local/city-game-production-seed.json");

/** @type {Array<{ step: string, ok: boolean, detail: string }>} */
const results = [];

function record(step, ok, detail) {
  results.push({ step, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${step} — ${detail}`);
}

function recordAssert(step, result) {
  record(step, result.ok, result.ok ? "pass" : result.message);
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

function loadProdSeedEnv() {
  if (!existsSync(prodSeedPath)) {
    return null;
  }
  const prod = JSON.parse(readFileSync(prodSeedPath, "utf8"));
  if (!prod.profile_id || !prod.game_operator_private_key_b58) {
    return null;
  }
  return {
    STEWARD_PROFILE_ID: prod.profile_id,
    ISSUER_PRIVATE_KEY: prod.game_operator_private_key_b58,
  };
}

function seedBothEdgesRemote() {
  const seedEnv = loadProdSeedEnv();
  if (!seedEnv) {
    record("seed both edges", false, "missing city-game-production-seed.json");
    return;
  }
  try {
    execSync("npm run city-game:seed-relationship-edges:remote", {
      cwd: root,
      stdio: "pipe",
      env: { ...process.env, ...seedEnv },
    });
    record(
      "seed both edges",
      true,
      `${CR_WITNESS_EDGE_ID} + ${CR_UNLOCK_EDGE_ID}`
    );
  } catch (err) {
    record("seed both edges", false, err instanceof Error ? err.message : String(err));
  }
}

function checkMigrationTable() {
  try {
    const out = execSync(
      `npx wrangler d1 execute humanity-resolver --remote --config worker/wrangler.toml --command "SELECT name FROM sqlite_master WHERE type='table' AND name='relationship_edges';"`,
      { cwd: root, encoding: "utf8" }
    );
    record(
      "migration 0035",
      out.includes("relationship_edges"),
      out.includes("relationship_edges") ? "relationship_edges table present" : "table missing"
    );
  } catch (err) {
    record("migration 0035", false, err instanceof Error ? err.message : String(err));
  }
}

async function checkD3Open() {
  const status = await fetchJson(cabinetStatus);
  const html = await fetchHtml(cabinetScan);
  if (!status.ok || !html.ok) {
    record("D3 cabinet fetch", false, `status=${status.status} html=${html.status}`);
    return;
  }
  for (const row of evaluateDualGateSpineOpen(status.body, html.html)) {
    record(row.step, row.ok, row.detail);
  }
}

async function checkCabinetGraph() {
  const status = await fetchJson(cabinetStatus);
  if (!status.ok) {
    record("cabinet status HTTP", false, `HTTP ${status.status}`);
    return;
  }

  const html = await fetchHtml(cabinetScan);
  if (!html.ok) {
    record("cabinet scan HTTP", false, `HTTP ${html.status}`);
    return;
  }

  for (const row of evaluateCabinetGraphSmoke(status.body, html.html)) {
    record(row.step, row.ok, row.detail);
  }
}

function revokeEdge(edgeId) {
  execSync(
    `npx wrangler d1 execute humanity-resolver --remote --config worker/wrangler.toml --command "UPDATE relationship_edges SET status='revoked', updated_at=datetime('now') WHERE edge_id='${edgeId}';"`,
    { cwd: root, stdio: "pipe" }
  );
}

async function checkLegacyFallback() {
  revokeEdge(CR_WITNESS_EDGE_ID);
  revokeEdge(CR_UNLOCK_EDGE_ID);
  const status = await fetchJson(cabinetStatus);
  const html = await fetchHtml(cabinetScan);
  recordAssert("revoke fallback", assertLegacyVouchFallback(status.body, html.html));
}

function reissueBothEdges() {
  const seedEnv = loadProdSeedEnv();
  if (!seedEnv) {
    record("re-issue both edges", false, "missing city-game-production-seed.json");
    return;
  }
  try {
    execSync("npm run city-game:seed-relationship-edges:remote", {
      cwd: root,
      stdio: "pipe",
      env: { ...process.env, ...seedEnv },
    });
    record("re-issue both edges", true, `${CR_WITNESS_EDGE_ID} + ${CR_UNLOCK_EDGE_ID}`);
  } catch (err) {
    record(
      "re-issue both edges",
      false,
      err instanceof Error ? err.message : String(err)
    );
  }
}

async function verifyReissued() {
  const status = await fetchJson(cabinetStatus);
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

async function maybeScreenshots() {
  if (!captureScreenshots) return;
  const { chromium } = await import("playwright");
  const outDir = join(root, "site/dev/ws-object-graph-v1/screenshots/prod");
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, dark] of [
    ["cabinet-dual-gate-mobile-light", false],
    ["cabinet-dual-gate-mobile-dark", true],
    ["cabinet-pending-mobile-light", false],
    ["cabinet-pending-mobile-dark", true],
  ]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    if (dark) {
      await page.addInitScript(() => {
        try {
          localStorage.setItem("hc_theme", "dark");
        } catch {
          /* ignore */
        }
      });
    }
    await page.goto(cabinetScan, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(
      () =>
        document.querySelector("#scan-object-graph-heading") ||
        document.querySelector(".scan-live-check--ready"),
      { timeout: 45000 }
    );
    await page.locator("summary.scan-game-state-summary").click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
    const graph = page.locator("#scan-object-graph-heading").locator(
      'xpath=ancestor::section[contains(@class,"scan-object-graph")]'
    );
    if (await graph.count()) {
      const path = join(outDir, `${name}.png`);
      await graph.screenshot({ path });
      record("screenshot", true, path.replace(root + "/", ""));
    }
    await page.close();
  }
  await browser.close();
}

async function main() {
  console.log("WS-OBJECT-GRAPH-PROD-SMOKE-V1\n");
  console.log("API:", apiOrigin);
  console.log("Cabinet:", cabinetScan);
  console.log("Library:", libraryScan, "\n");

  if (runSeed) {
    seedBothEdgesRemote();
  } else {
    console.log("(pass --seed to write witness + unlock edges on remote D1)\n");
  }

  checkMigrationTable();
  if (runD3Check) {
    await checkD3Open();
  } else {
    await checkCabinetGraph();
  }
  if (runDrill) {
    await checkLegacyFallback();
    reissueBothEdges();
    await verifyReissued();
  } else {
    console.log("(skip revoke/re-issue — pass --drill to mutate prod D1)\n");
  }
  await maybeScreenshots();
  if (runDarkCheck) {
    await runCabinetScanDarkThemeCheck({
      cabinetScan,
      outDir: join(root, "site/dev/ws-object-graph-v1/screenshots/prod"),
      repoRoot: root,
      captureScreenshot: true,
      record,
    });
  } else if (!captureScreenshots) {
    console.log("(pass --dark-check for Playwright dark-mode graph check)\n");
  }

  const failed = results.filter((row) => !row.ok);
  const reportPath = join(root, "site/dev/ws-object-graph-v1/prod-smoke-report.json");
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        apiOrigin,
        cabinetScan,
        libraryScan,
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
      "Hint: npm run ws-object-graph:prod-smoke -- --seed  (requires city-game-production-seed.json + wrangler remote)"
    );
    process.exit(1);
  }
  console.log(
    "\n✅ Production smoke passed — GO (witness/quorum live paths: manual browser contribute)"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
