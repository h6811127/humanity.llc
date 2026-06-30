#!/usr/bin/env node
/**
 * Record OG-2 dual-gate human walk sign-off (D1–D3 on production).
 *
 *   npm run ws-object-graph:prod-walk-preflight   # engineering gate first
 *   # … manual D1 library → D2 river → D3 cabinet …
 *   npm run ws-object-graph:dual-gate-walk-sign-off -- --pass --operator "Name"
 *   npm run ws-object-graph:dual-gate-walk-sign-off -- --pass --apply
 *
 * @see docs/WS_OBJECT_GRAPH_DUAL_GATE_WALK_V1.md
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyDualGateWalkSignOffPass,
  dualGateWalkSignOffSummaryLines,
  parseDualGateWalkSignOffArgs,
  resolveDualGateWalkSignOffResult,
} from "./ws-object-graph-dual-gate-walk-sign-off-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const launchPath = join(root, "docs/WS_OBJECT_GRAPH_LAUNCH_V1.md");

function main() {
  const parsed = parseDualGateWalkSignOffArgs(process.argv.slice(2));
  const result = resolveDualGateWalkSignOffResult(parsed);

  console.log(
    dualGateWalkSignOffSummaryLines({
      dateIso: parsed.dateIso,
      operator: parsed.operator,
      result,
    }).join("\n")
  );

  if (result === "fail") {
    console.log("No docs updated on --fail. Fix scan path and re-run preflight.");
    process.exit(1);
  }

  if (!parsed.apply) {
    console.log("Dry run — pass --apply to update docs/WS_OBJECT_GRAPH_LAUNCH_V1.md");
    return;
  }

  const launchDoc = readFileSync(launchPath, "utf8");
  writeFileSync(
    launchPath,
    applyDualGateWalkSignOffPass(launchDoc, {
      dateIso: parsed.dateIso,
      operator: parsed.operator,
      note: parsed.note,
    }),
    "utf8"
  );
  console.log(`Updated ${launchPath.replace(`${root}/`, "")}`);
}

main();
