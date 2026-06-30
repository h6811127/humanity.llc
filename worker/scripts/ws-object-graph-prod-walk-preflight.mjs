#!/usr/bin/env node
/**
 * WS-OBJECT-GRAPH prod dual-gate walk preflight — D0 scan readiness + Pages deploy gate.
 *
 *   npm run ws-object-graph:prod-walk-preflight
 *   npm run ws-object-graph:prod-walk-preflight -- --post-walk
 *
 * @see docs/WS_OBJECT_GRAPH_DUAL_GATE_WALK_V1.md
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  comprehensionDualGateWalkPageRel,
  LOCAL_DUAL_GATE_WALK_REL,
} from "./ws-object-graph-dual-gate-walk-core.mjs";
import { evaluateProdDualGateWalkPreflight } from "./ws-object-graph-prod-walk-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
const postWalk = process.argv.includes("--post-walk");

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  return {
    ok: res.ok,
    status: res.status,
    body: await res.json().catch(() => ({})),
  };
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { Accept: "text/html" } });
  return { ok: res.ok, status: res.status, html: await res.text() };
}

async function main() {
  console.log("WS-OBJECT-GRAPH-PROD-WALK-PREFLIGHT\n");
  console.log("API:", apiOrigin);
  if (postWalk) {
    console.log("Mode: post-walk (D3 cabinet open)\n");
  }

  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const localWalkRel = comprehensionDualGateWalkPageRel(season);
  const localWalkPath = join(root, localWalkRel);

  if (!existsSync(localWalkPath)) {
    console.error(`Missing ${localWalkRel} — npm run city-game:comprehension-kit -- --production`);
    process.exit(1);
  }

  const localWalkHtml = readFileSync(localWalkPath, "utf8");
  const preview = evaluateProdDualGateWalkPreflight({
    season,
    localWalkHtml,
    localWalkRel,
    fetchResults: {
      cabinetStatus: { ok: false, body: {} },
      cabinetHtml: { ok: false, html: "" },
      libraryHtml: { ok: false, status: 0, html: "" },
      riverHtml: { ok: false, status: 0, html: "" },
      comprehension: { status: 0, html: "" },
      walk: { status: 0, html: "" },
    },
  });
  const urls = preview.urls;

  console.log("Cabinet:", urls.cabinetScan);
  console.log("Walk:", urls.walkUrl);
  console.log("");

  const cabinetStatus = await fetchJson(urls.cabinetStatus);
  const cabinetHtml = await fetchHtml(urls.cabinetScan);
  const libraryHtml = urls.libraryScan
    ? await fetchHtml(urls.libraryScan)
    : { ok: false, status: 0, html: "" };
  const riverHtml = urls.riverScan
    ? await fetchHtml(urls.riverScan)
    : { ok: false, status: 0, html: "" };
  const comprehension = await fetchHtml(urls.comprehensionUrl);
  const walk = await fetchHtml(urls.walkUrl);

  const result = evaluateProdDualGateWalkPreflight({
    season,
    localWalkHtml,
    localWalkRel,
    postWalk,
    fetchResults: {
      cabinetStatus,
      cabinetHtml,
      libraryHtml,
      riverHtml,
      comprehension,
      walk,
    },
  });

  for (const row of result.cabinetGraphRows) {
    const label = postWalk ? row.step : `D0 ${row.step}`;
    console.log(`${row.ok ? "✓" : "✗"} ${label} — ${row.detail}`);
  }
  console.log(
    `${result.scansReady ? "✓" : "✗"} prod scan paths — ${
      result.scansReady
        ? postWalk
          ? "cabinet open · library + river load"
          : "library + river contribute ready"
        : "see issues"
    }`
  );
  console.log(
    `${result.pagesLive ? "✓" : "✗"} Pages deploy — ${result.pagesLive ? "comprehension + walk live" : "not live on prod"}`
  );
  console.log(
    `${result.localWalkOk ? "✓" : "✗"} on-disk walk kit — ${localWalkRel}`
  );

  for (const warning of result.warnings) {
    console.log(`⚠ ${warning}`);
  }
  for (const issue of result.issues) {
    console.log(`✗ ${issue}`);
  }

  const reportPath = join(root, "site/dev/ws-object-graph-v1/prod-walk-preflight-report.json");
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        apiOrigin,
        urls: result.urls,
        postWalk: result.postWalk,
        readyForHumanWalk: result.readyForHumanWalk,
        readyPostWalk: result.readyPostWalk,
        scansReady: result.scansReady,
        pagesLive: result.pagesLive,
        issues: result.issues,
        warnings: result.warnings,
      },
      null,
      2
    )
  );
  console.log("\nReport:", reportPath.replace(`${root}/`, ""));

  const go = postWalk ? result.readyPostWalk : result.readyForHumanWalk;
  if (!go) {
    console.error("\nProd dual-gate walk preflight — NO-GO");
    if (!result.pagesLive) {
      console.error(
        "Deploy: npm run city-game:comprehension-kit -- --production && npm run pages:deploy"
      );
    }
    process.exit(1);
  }
  console.log(
    postWalk
      ? "\n✅ Prod dual-gate walk preflight — GO (post-walk D3 verified)"
      : "\n✅ Prod dual-gate walk preflight — GO (human D1–D3)"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
