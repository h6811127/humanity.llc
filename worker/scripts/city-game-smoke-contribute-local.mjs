#!/usr/bin/env node
/**
 * Autonomous contribute spine smoke — quorum → cabinet (+ optional fragment → finale).
 *
 * Prerequisites:
 *   npm run worker:migrate:local  (includes game_contribute_buckets)
 *   worker:dev with CITY_GAME_ENABLED=1 in worker/.dev.vars
 *   worker/.local/city-game-seed.json from npm run city-game:seed-local
 *
 * Usage:
 *   API_ORIGIN=http://127.0.0.1:8787 npm run city-game:smoke-contribute-local
 *   npm run city-game:smoke-contribute-local -- --spine   # quorum + 3 fragments + finale
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveSmokeScanUrl } from "./city-game-smoke-local-core.mjs";
import {
  assessCabinetUnlockedScanHtml,
  assessFinaleOpenScanHtml,
  gameContributeEndpoint,
  hasContributeBlockInScanHtml,
  parseContributeProgressFromScanHtml,
  readFragmentContributeResponse,
  readQuorumContributeResponse,
  remainingQuorumContributions,
  resolveSeedContributeNode,
  resolveSeedScanNode,
  synthContributorIp,
} from "./city-game-smoke-contribute-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:8787").replace(/\/$/, "");
const runSpine = process.argv.includes("--spine");

const FRAGMENT_NODES = ["node_09", "node_11", "node_01"];

async function fetchScanHtml(url) {
  const res = await fetch(url, { headers: { Accept: "text/html" } }).catch(() => null);
  if (!res?.ok) {
    throw new Error(`scan fetch failed (${res?.status ?? "network"}) ${url}`);
  }
  return res.text();
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
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function fillRiverQuorum(seed, seasonCodes) {
  const river = resolveSeedContributeNode(seed.nodes, seasonCodes, "node_04");
  const cabinet = resolveSeedScanNode(seed.nodes, "node_07");
  if (!river || !cabinet) {
    throw new Error("seed missing node_04 contribute row or node_07 scan row");
  }

  const riverScanUrl = resolveSmokeScanUrl(apiOrigin, river.localScanUrl, river.scanUrl);
  if (!riverScanUrl) {
    throw new Error("node_04 has no scan URL in seed file");
  }

  console.log("=== River Lantern quorum (node_04 → node_07) ===");
  const riverHtml = await fetchScanHtml(riverScanUrl);
  if (!hasContributeBlockInScanHtml(riverHtml)) {
    throw new Error("node_04 scan missing contribute block — is CITY_GAME_ENABLED=1?");
  }

  const parsed = parseContributeProgressFromScanHtml(riverHtml);
  let remaining = parsed ? remainingQuorumContributions(parsed.progress, parsed.target) : null;
  if (remaining === 0) {
    console.log("  · quorum already complete on scan (%s/%s)", parsed?.progress, parsed?.target);
  } else {
    if (remaining == null) {
      remaining = 16;
      console.warn("  ⚠ could not parse progress from scan HTML — attempting up to", remaining, "contributes");
    } else {
      console.log("  · filling quorum:", remaining, "contribute(s) needed");
    }

    let ipIndex = 0;
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
        throw new Error(
          `node_04 contribute failed (${status}): ${result.reason}${result.message ? ` — ${result.message}` : ""}`
        );
      }
      if (result.quorumComplete) {
        console.log("  ✓ quorum complete at", result.collectiveProgress, "/", result.collectiveTarget);
        break;
      }
    }
  }

  const cabinetScanUrl = resolveSmokeScanUrl(apiOrigin, cabinet.localScanUrl, cabinet.scanUrl);
  if (!cabinetScanUrl) {
    throw new Error("node_07 has no scan URL in seed file");
  }
  const cabinetHtml = await fetchScanHtml(cabinetScanUrl);
  const cabinetCheck = assessCabinetUnlockedScanHtml(cabinetHtml);
  if (!cabinetCheck.ok) {
    throw new Error(cabinetCheck.reason);
  }
  console.log("  ✓ node_07 cabinet unlocked without /game-operator/");
}

async function fillFragmentLattice(seed, seasonCodes) {
  console.log("\n=== Fragment lattice (node_09 + node_11 + node_01 → node_13) ===");
  let ipIndex = 100;
  for (const nodeId of FRAGMENT_NODES) {
    const node = resolveSeedContributeNode(seed.nodes, seasonCodes, nodeId);
    if (!node) {
      throw new Error(`seed missing ${nodeId} contribute row`);
    }
    const { status, body } = await postContribute(
      seed.profile_id,
      node.objectId,
      node.qrId,
      node.siteCode,
      ipIndex++
    );
    const result = readFragmentContributeResponse(body);
    if (!result.ok) {
      throw new Error(
        `${nodeId} fragment contribute failed (${status}): ${result.reason}${result.message ? ` — ${result.message}` : ""}`
      );
    }
    console.log(
      "  ✓ %s · fragments %s/%s%s",
      nodeId,
      result.fragmentsRegistered,
      result.fragmentsRequired,
      result.finaleOpen ? " · finale open" : ""
    );
  }

  const finale = seed.nodes.find((node) => node.node_id === "node_13");
  if (!finale) {
    throw new Error("seed missing node_13");
  }
  const finaleScanUrl = resolveSmokeScanUrl(apiOrigin, finale.local_scan_url, finale.scan_url);
  if (!finaleScanUrl) {
    throw new Error("node_13 has no scan URL in seed file");
  }
  const finaleHtml = await fetchScanHtml(finaleScanUrl);
  const finaleCheck = assessFinaleOpenScanHtml(finaleHtml);
  if (!finaleCheck.ok) {
    throw new Error(finaleCheck.reason);
  }
  console.log("  ✓ node_13 finale open without operator flip");
}

async function main() {
  console.log("Cedar Rapids city game — autonomous contribute smoke\n");

  const health = await fetch(`${apiOrigin}/.well-known/hc/v1/health`).catch(() => null);
  if (!health?.ok) {
    console.error("Resolver not reachable at", apiOrigin);
    console.error("Start: npm run worker:dev");
    process.exit(1);
  }

  if (!existsSync(seedPath)) {
    console.error("Missing seed file:", seedPath);
    console.error("Run: API_ORIGIN=%s npm run city-game:seed-local -- --write-season", apiOrigin);
    process.exit(1);
  }

  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const seasonCodes = season.contribute_codes ?? {};

  if (!seed.profile_id || !Array.isArray(seed.nodes)) {
    console.error("Invalid seed file shape — re-run city-game:seed-local");
    process.exit(1);
  }

  console.log("Profile:", seed.profile_id);
  console.log("Mode:", runSpine ? "full spine" : "quorum only", "\n");

  if (runSpine) {
    console.log("=== Reset dev spine (clean replay) ===\n");
    const reset = spawnSync("npm", ["run", "city-game:reset-spine-local"], {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, API_ORIGIN: apiOrigin },
    });
    if (reset.status !== 0) {
      process.exit(reset.status ?? 1);
    }
    console.log("");
  }

  try {
    await fillRiverQuorum(seed, seasonCodes);
    if (runSpine) {
      await fillFragmentLattice(seed, seasonCodes);
    }
  } catch (err) {
    console.error("\n✗", err instanceof Error ? err.message : err);
    console.error("\nReset dev spine: npm run city-game:reset-spine-local");
    process.exit(1);
  }

  console.log("\n✅ Autonomous contribute smoke passed.");
  if (!runSpine) {
    console.log("\nOptional full spine:");
    console.log("  API_ORIGIN=%s npm run city-game:smoke-contribute-local -- --spine", apiOrigin);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
