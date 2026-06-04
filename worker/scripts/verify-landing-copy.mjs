#!/usr/bin/env node
/**
 * Landing copy regression gate — Vitest contract + optional production HTML fetch.
 *
 * Usage:
 *   npm run verify:landing
 *   npm run verify:landing:production
 *   SITE_ORIGIN=https://humanity.llc npm run verify:landing:production
 *
 * @see site/js/landing-copy-contract.mjs · docs/DEVICE_HUB_AND_LOCAL_SEARCH.md
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  LANDING_FORBIDDEN_SNIPPETS,
  LANDING_REQUIRED_SNIPPETS,
} from "../../site/js/landing-copy-contract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const production = process.argv.includes("--production");
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

console.log("Landing copy verify");
console.log("Contract: site/js/landing-copy-contract.mjs\n");

runNpm([
  "run",
  "worker:test",
  "--",
  "worker/tests/landing-copy-contract.test.ts",
  "worker/tests/landing-messaging.test.ts",
]);

runNpm([
  "run",
  "worker:test",
  "--",
  "worker/tests/device-emphasis-card-html.test.ts",
  "-t",
  "landing",
]);

if (!production) {
  console.log("\n✓ Landing copy gate passed (local sources)");
  process.exit(0);
}

console.log(`\n▶ Production HTML check: ${siteOrigin}/`);
const res = await fetch(`${siteOrigin}/`, {
  headers: { Accept: "text/html" },
  redirect: "follow",
});
if (!res.ok) {
  console.error(`✗ GET / failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}
const html = await res.text();

let failed = false;
for (const snippet of LANDING_REQUIRED_SNIPPETS) {
  if (!html.includes(snippet)) {
    console.error(`✗ production missing required: ${snippet.slice(0, 60)}…`);
    failed = true;
  }
}
for (const snippet of LANDING_FORBIDDEN_SNIPPETS) {
  if (html.includes(snippet)) {
    console.error(`✗ production contains forbidden: ${snippet.slice(0, 60)}…`);
    failed = true;
  }
}

if (failed) {
  console.error(
    "\nProduction landing does not match contract. Pages deploy may be stale or CDN cached — redeploy and hard-refresh."
  );
  process.exit(1);
}

console.log("✓ Production landing HTML matches contract");
