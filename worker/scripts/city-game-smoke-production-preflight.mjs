#!/usr/bin/env node
/**
 * C4 engineering preflight — production scan URLs ready to probe.
 *
 *   npm run city-game:smoke-production-preflight
 *   npm run city-game:smoke-production-preflight -- --probe
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assessGameScanHtml } from "./city-game-smoke-local-core.mjs";
import {
  assessProductionSmokePreflight,
  DEFAULT_PRODUCTION_API,
  formatProductionSmokePreflightReport,
  spotExpectationsForProductionProbe,
  selectProductionSmokeNodes,
  resolveProductionSmokeSeed,
} from "./city-game-smoke-production-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const prodSeedPath = join(root, "worker/.local/city-game-production-seed.json");
const seasonJsonPath = join(root, "site/data/city-game-cr-season-01.json");
const probe = process.argv.includes("--probe");
const apiOrigin = (process.env.API_ORIGIN || DEFAULT_PRODUCTION_API).replace(/\/$/, "");

async function probeSpotNodes(seed, season) {
  const targets = selectProductionSmokeNodes({ productionSeed: seed, checkAll: false });
  if (!targets.length) return false;

  const expectations = spotExpectationsForProductionProbe(season);

  for (const node of targets) {
    const url = String(node.scan_url ?? "");
    const res = await fetch(url, { headers: { Accept: "text/html" } }).catch(() => null);
    if (!res?.ok) return false;
    const html = await res.text();
    const expect = expectations[node.node_id] ?? {};
    const result = assessGameScanHtml(html, {
      nodeId: node.node_id,
      requireOnboarding: expect.requireOnboarding ?? false,
      requireContributeBlock: expect.requireContributeBlock ?? false,
      expectDormant: expect.expectDormant ?? false,
    });
    if (!result.ok) return false;
  }
  return true;
}

async function main() {
  const productionSeed = existsSync(prodSeedPath)
    ? JSON.parse(readFileSync(prodSeedPath, "utf8"))
    : null;
  const season = existsSync(seasonJsonPath)
    ? JSON.parse(readFileSync(seasonJsonPath, "utf8"))
    : null;
  const smokeSeed = resolveProductionSmokeSeed(productionSeed, season);

  const c4 = assessProductionSmokePreflight({ productionSeed, season });
  let probeOk = null;

  if (probe && c4.ready && smokeSeed) {
    const health = await fetch(`${apiOrigin}/.well-known/hc/v1/health`).catch(() => null);
    if (!health?.ok) {
      probeOk = false;
    } else {
      probeOk = await probeSpotNodes(smokeSeed, season);
    }
  }

  console.log(formatProductionSmokePreflightReport({ ...c4, probeOk }));

  if (!c4.ready) {
    process.exit(1);
  }
  if (probe && probeOk === false) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
