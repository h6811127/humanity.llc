#!/usr/bin/env node
/**
 * OG-2 launch belt — read-only prod checks after deploy.
 *
 *   npm run ws-object-graph:launch-go
 *   npm run ws-object-graph:launch-go -- --post-walk   # after D1–D3 sign-off (cabinet open)
 *
 * @see docs/WS_OBJECT_GRAPH_LAUNCH_V1.md
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const postWalk = process.argv.includes("--post-walk");

/** @type {Array<[string, string]>} */
const steps = postWalk
  ? [
      ["verify:ws-object-graph-launch", "npm run verify:ws-object-graph-launch"],
      ["prod-walk-preflight post-walk", "npm run ws-object-graph:prod-walk-preflight -- --post-walk"],
      ["prod-smoke D3", "npm run ws-object-graph:prod-smoke -- --d3-check"],
    ]
  : [
      ["verify:ws-object-graph-launch", "npm run verify:ws-object-graph-launch"],
      ["prod-smoke D0", "npm run ws-object-graph:prod-smoke"],
      ["prod-walk-preflight", "npm run ws-object-graph:prod-walk-preflight"],
    ];

console.log("WS-OBJECT-GRAPH-LAUNCH-GO\n");
if (postWalk) {
  console.log("Mode: post-walk (D3 cabinet open)\n");
}

for (const [label, cmd] of steps) {
  console.log(`=== ${label} ===\n`);
  execSync(cmd, { cwd: root, stdio: "inherit" });
  console.log("");
}

console.log("✅ OG-2 launch belt passed — GO");
