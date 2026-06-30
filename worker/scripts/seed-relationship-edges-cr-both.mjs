#!/usr/bin/env node
/**
 * Seed witness + unlock RelationshipEdges for Cedar Rapids cabinet dual-gate.
 *
 *   npm run city-game:seed-relationship-edges
 *   npm run city-game:seed-relationship-edges:remote
 *
 * @see docs/WS_OBJECT_GRAPH_V1.md
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CR_UNLOCK_EDGE_ID,
  CR_WITNESS_EDGE_ID,
} from "./ws-object-graph-prod-smoke-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const remote = process.env.D1_TARGET === "remote";

function main() {
  const scripts = remote
    ? [
        "city-game:seed-relationship-edge:remote",
        "city-game:seed-relationship-edge-unlock:remote",
      ]
    : ["city-game:seed-relationship-edge", "city-game:seed-relationship-edge-unlock"];

  for (const script of scripts) {
    execSync(`npm run ${script}`, {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
  }

  console.log(
    `\n✅ Seeded ${CR_WITNESS_EDGE_ID} + ${CR_UNLOCK_EDGE_ID} on ${remote ? "remote" : "local"} D1`
  );
}

main();
