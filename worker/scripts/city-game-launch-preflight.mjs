#!/usr/bin/env node
/**
 * Phase D launch preflight — one status report before human gates + launch day.
 *
 *   npm run city-game:launch-preflight
 *
 * Does not deploy or --apply launch surfaces.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessComprehensionEngineeringReady,
  comprehensionProductionPageRel,
  formatLaunchPreflightReport,
  LOCAL_DEV_COMPREHENSION_REL,
} from "./city-game-comprehension-kit-core.mjs";
import { assessInstallQaEngineeringReady, INSTALL_QA_REL } from "./city-game-install-qa-core.mjs";
import {
  assessLaunchChecklistReady,
  LAUNCH_CHECKLIST_REL,
} from "./city-game-launch-checklist-core.mjs";
import {
  assessProductionSmokePreflight,
  launchChecklistE5Signed,
} from "./city-game-smoke-production-core.mjs";
import { cityGameSeasonReadiness } from "./city-game-season-readiness.mjs";
import {
  assessLaunchSurfacesReady,
  auditAllLaunchSurfacesCopy,
  RESEARCH_LAUNCH_PAGE_RELS,
} from "./city-game-launch-surfaces-core.mjs";
import {
  SCAN_ANALYTICS_SOURCE_GUARD,
  auditGameScanAnalyticsGate,
} from "./city-game-scan-analytics-gate-core.mjs";
import { auditRulesPageVouchCopy } from "./city-game-vouch-copy-core.mjs";
import {
  assessMapBoardB13Ready,
  COMPREHENSION_RUNBOOK_REL,
  MAP_DASHBOARD_REL,
  surfacesMarketLiveCityBoard,
} from "./city-game-map-board-b13-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const prodSeedPath = join(root, "worker/.local/city-game-production-seed.json");
const rulesPath = join(root, "site/play/cedar-rapids/index.html");
const policyPath = join(root, "docs/REFERENCE_OPERATOR_DATA_POLICY.md");
const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:8787").replace(/\/$/, "");

function isSeasonLaunchFieldsSet(season) {
  return Boolean(
    season.season_root_profile_id?.trim() &&
      season.window?.starts_at?.trim() &&
      season.window?.ends_at?.trim()
  );
}

/** @param {boolean} requireLaunch C1 gate — season verify + wrangler CITY_GAME_ENABLED */
function runVerify(requireLaunch) {
  const args = ["run", "verify:city-game", "--", "--skip-tests"];
  if (requireLaunch) args.push("--require-launch");
  const r = spawnSync("npm", args, {
    cwd: root,
    stdio: "pipe",
    shell: process.platform === "win32",
    encoding: "utf8",
  });
  return r.status === 0;
}

async function workerUp() {
  try {
    const res = await fetch(`${apiOrigin}/.well-known/hc/v1/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function loadScanAnalyticsAudit() {
  const sourceByRel = Object.fromEntries(
    [
      ...SCAN_ANALYTICS_SOURCE_GUARD.map((row) => row.rel),
      "worker/src/resolver/game-contribute.ts",
    ].map((rel) => [rel, readFileSync(join(root, rel), "utf8")])
  );
  return auditGameScanAnalyticsGate({
    policyMarkdown: readFileSync(policyPath, "utf8"),
    sourceByRel,
  });
}

async function runContributeLoadGate() {
  if (!existsSync(seedPath)) return { ok: false, skipped: true, reason: "no seed" };
  try {
    const r = spawnSync("npm", ["run", "city-game:contribute-load-local"], {
      cwd: root,
      stdio: "pipe",
      shell: process.platform === "win32",
      encoding: "utf8",
      env: { ...process.env, API_ORIGIN: apiOrigin },
    });
    return { ok: r.status === 0, skipped: false, output: r.stdout || r.stderr };
  } catch {
    return { ok: false, skipped: false, reason: "load script failed" };
  }
}

async function main() {
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const launchReady = isSeasonLaunchFieldsSet(season);
  const readiness = cityGameSeasonReadiness(season, { requireLaunch: launchReady });
  const surfaces = assessLaunchSurfacesReady(season);
  const verifyOk = runVerify(launchReady);
  const seedOk = existsSync(seedPath);
  const workerOk = await workerUp();
  const rulesHtml = readFileSync(rulesPath, "utf8");
  const researchHtmlByRel = Object.fromEntries(
    RESEARCH_LAUNCH_PAGE_RELS.filter((rel) => existsSync(join(root, rel))).map((rel) => [
      rel,
      readFileSync(join(root, rel), "utf8"),
    ])
  );
  const b1 = auditRulesPageVouchCopy(rulesHtml);
  const b2 = auditAllLaunchSurfacesCopy({ rulesHtml, researchHtmlByRel });
  const b14 = loadScanAnalyticsAudit();
  const b5 =
    workerOk && seedOk ? await runContributeLoadGate() : { ok: false, skipped: true };

  const productionComprehensionRel = comprehensionProductionPageRel(season);
  const c2Engineering = assessComprehensionEngineeringReady({
    season,
    localSeed: seedOk,
    localDevPageHtml: existsSync(join(root, LOCAL_DEV_COMPREHENSION_REL))
      ? readFileSync(join(root, LOCAL_DEV_COMPREHENSION_REL), "utf8")
      : null,
    productionPageHtml: existsSync(join(root, productionComprehensionRel))
      ? readFileSync(join(root, productionComprehensionRel), "utf8")
      : null,
  });
  const runbookPath = join(root, "docs/CITY_GAME_COMPREHENSION_RUNBOOK.md");
  const runbookHtml = existsSync(runbookPath) ? readFileSync(runbookPath, "utf8") : "";
  const humanComprehensionPass =
    runbookHtml.includes("GT comprehension **passed**") ||
    runbookHtml.includes("| Result | ☑ Pass");

  const installQaPath = join(root, INSTALL_QA_REL);
  const installQaDoc = existsSync(installQaPath) ? readFileSync(installQaPath, "utf8") : "";
  const localSeed = seedOk ? JSON.parse(readFileSync(seedPath, "utf8")) : null;
  const productionSeed = existsSync(prodSeedPath)
    ? JSON.parse(readFileSync(prodSeedPath, "utf8"))
    : null;
  const c3Engineering = assessInstallQaEngineeringReady({
    installQaDoc,
    localSeed,
    productionSeed,
  });
  const humanInstallQaPass = installQaDoc.includes(
    "Physical install (≥3 phones × 15 nodes) | ☑"
  );

  const launchChecklistPath = join(root, LAUNCH_CHECKLIST_REL);
  const launchChecklistDoc = existsSync(launchChecklistPath)
    ? readFileSync(launchChecklistPath, "utf8")
    : "";

  const c4Engineering = assessProductionSmokePreflight({ productionSeed });
  const c4SignedOff = launchChecklistE5Signed(launchChecklistDoc);
  const marketsLiveCityBoard = surfacesMarketLiveCityBoard({
    rulesHtml,
    researchHtmlByRel,
  });
  const mapBoardB13 = assessMapBoardB13Ready({
    marketsLiveCityBoard,
    b14Ok: b14.ok,
    comprehensionRunbook: existsSync(join(root, COMPREHENSION_RUNBOOK_REL))
      ? readFileSync(join(root, COMPREHENSION_RUNBOOK_REL), "utf8")
      : "",
    mapDashboardDoc: existsSync(join(root, MAP_DASHBOARD_REL))
      ? readFileSync(join(root, MAP_DASHBOARD_REL), "utf8")
      : "",
    launchChecklistDoc,
  });

  const c5 = assessLaunchChecklistReady({
    launchChecklistDoc,
    scanAnalyticsGateOk: b14.ok,
    marketsLiveCityBoard,
    mapBoardB13Ready: mapBoardB13.ready,
  });

  const blockers = [];
  if (!season.season_root_profile_id) {
    blockers.push("season_root_profile_id unset — npm run city-game:season-root + prod mint");
  }
  if (!season.window?.starts_at || !season.window?.ends_at) {
    blockers.push("Season window dates unset in site/data/city-game-cr-season-01.json");
  }
  if (!humanComprehensionPass) {
    blockers.push(
      "C2 GT comprehension — ≥5 testers (npm run city-game:comprehension-preflight · city-game:dev -- --lan)"
    );
  }
  if (!humanInstallQaPass) {
    blockers.push(
      "C3 Physical install QA — ≥3 phones × 15 nodes (npm run city-game:install-qa-preflight)"
    );
  }
  if (!c4SignedOff) {
    blockers.push(
      "C4 Production scan smoke — npm run city-game:smoke-production-preflight -- --probe · npm run city-game:smoke-production"
    );
  }
  for (const blocker of c5.blockers) {
    blockers.push(`C5 ${blocker}`);
  }
  if (mapBoardB13.required && !mapBoardB13.ready) {
    blockers.push(
      "P6 / B13 live city board — npm run city-game:map-board-b13-preflight (GT-7 + privacy + B14)"
    );
  }

  const report = formatLaunchPreflightReport({
    engineering: { verify: verifyOk, requireLaunch: launchReady, c1: launchReady ? verifyOk : null },
    gates: {
      b1: b1.ok,
      b2: b2.ok,
      b5: b5.skipped ? null : b5.ok,
      b13: mapBoardB13.required ? mapBoardB13.ready : null,
      b14: b14.ok,
    },
    mapBoardB13,
    season: {
      ready: readiness.issues.length === 0,
      issues: readiness.issues,
      warnings: readiness.warnings,
    },
    surfaces: {
      ok: surfaces.issues.length === 0,
      issues: surfaces.issues,
    },
    local: { seed: seedOk, worker: workerOk },
    c2: {
      ready: c2Engineering.ready,
      localOk: c2Engineering.localOk,
      productionOk: c2Engineering.productionOk,
      humanSignedOff: humanComprehensionPass,
    },
    c3: {
      ready: c3Engineering.ready,
      localSeedReady: c3Engineering.localSeedReady,
      productionSeedReady: c3Engineering.productionSeedReady,
      humanSignedOff: humanInstallQaPass,
    },
    c4: {
      ready: c4Engineering.ready,
      nodeCount: c4Engineering.nodeCount,
      spotCount: c4Engineering.spotCount,
      signedOff: c4SignedOff,
    },
    c5: {
      readyForLaunchDay: c5.readyForLaunchDay,
      allRequiredSigned: c5.allRequiredSigned,
      c5Signed: c5.c5Signed,
      pending: c5.pending,
      requiredGates: c5.requiredGates,
      marketsLiveCityBoard,
      mapBoardB13Ready: mapBoardB13.ready,
    },
    blockers,
  });

  console.log(report);
  if (
    !verifyOk ||
    readiness.issues.length > 0 ||
    !b1.ok ||
    !b2.ok ||
    !b14.ok ||
    (mapBoardB13.required && !mapBoardB13.ready)
  ) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
