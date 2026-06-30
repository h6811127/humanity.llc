#!/usr/bin/env node
/**
 * Post-deploy player flow shell verify — fetches production HTML for Agent D surfaces.
 *
 * Usage:
 *   npm run verify:public-network-player-flow:production
 *   SITE_ORIGIN=https://humanity.llc npm run verify:public-network-player-flow:production
 *
 * @see site/js/public-network-player-flow-contract.mjs
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PLAYER_FLOW_FORBIDDEN_SNIPPETS,
  PLAYER_FLOW_PAGE_CHECKS,
} from "../../site/js/public-network-player-flow-contract.mjs";
import { fetchCiProductionUrl } from "./ci-production-fetch.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const siteOrigin = (process.env.SITE_ORIGIN || "https://humanity.llc").replace(/\/$/, "");

/** @param {string[]} args */
function runNpm(args) {
  const result = spawnSync("npm", args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Public network player flow — production verify");
console.log(`Origin: ${siteOrigin}`);
console.log("Contract: site/js/public-network-player-flow-contract.mjs\n");

runNpm([
  "run",
  "worker:test",
  "--",
  "worker/tests/public-network-player-flow-contract.test.ts",
]);

/** @type {string[]} */
const failures = [];

for (const page of PLAYER_FLOW_PAGE_CHECKS) {
  console.log(`\n▶ GET ${page.path} (${page.label})`);
  const { res, text, url } = await fetchCiProductionUrl(page.path, {
    accept: "text/html",
  });

  if (!res.ok) {
    failures.push(`${page.path}: HTTP ${res.status} ${res.statusText} (${url})`);
    continue;
  }
  if (url !== `${siteOrigin}${page.path}`) {
    console.log(`  fetched: ${url}`);
  }

  for (const snippet of page.required) {
    if (!text.includes(snippet)) {
      failures.push(`${page.path}: missing required: ${snippet.slice(0, 72)}…`);
    }
  }

  for (const snippet of page.forbidden ?? []) {
    if (text.includes(snippet)) {
      failures.push(`${page.path}: contains forbidden: ${snippet.slice(0, 72)}…`);
    }
  }

  if (page.path === "/play/season/") {
    for (const snippet of PLAYER_FLOW_FORBIDDEN_SNIPPETS) {
      if (text.includes(snippet)) {
        failures.push(`${page.path}: contains global forbidden: ${snippet.slice(0, 72)}…`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("\n✗ Production player flow verify failed:\n");
  for (const line of failures) {
    console.error(`  • ${line}`);
  }
  console.error(
    "\nPages deploy may be stale or CDN cached — redeploy and hard-refresh, or check HC_CI_VERIFY_SECRET WAF bypass."
  );
  process.exit(1);
}

console.log("\n✓ Production player flow HTML matches contract");
