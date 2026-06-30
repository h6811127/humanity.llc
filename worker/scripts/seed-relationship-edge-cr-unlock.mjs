#!/usr/bin/env node
/**
 * Seed signed unlock edge edge_cr_unlock_04_07 into local or remote D1.
 *
 * Prerequisites:
 *   npm run worker:migrate:local   (includes 0035_relationship_edges)
 *   npm run city-game:seed-local   (season root + issuer_public_key)
 *
 * Usage:
 *   npm run city-game:seed-relationship-edge-unlock
 *   D1_TARGET=remote npm run city-game:seed-relationship-edge-unlock:remote
 *   STEWARD_PROFILE_ID=... ISSUER_PRIVATE_KEY=... npm run city-game:seed-relationship-edge-unlock
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import {
  signDocument,
  withProtocolFields,
} from "./seed-showcase-core.mjs";
import { loadRelationshipEdgeSeedContext } from "./relationship-edge-seed-context.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const prodSeedPath = join(root, "worker/.local/city-game-production-seed.json");

const CR_UNLOCK_EDGE_ID = "edge_cr_unlock_04_07";

function crUnlockEdgeUnsigned(stewardProfileId) {
  return {
    version: "1.0",
    type: "relationship_edge",
    edge_id: CR_UNLOCK_EDGE_ID,
    kind: "unlocks",
    network_id: "cr_season_01_wake",
    steward_profile_id: stewardProfileId,
    from: { ref: "object_id", id: "obj_cr_node_04_river" },
    to: { ref: "object_id", id: "obj_cr_node_07_cabinet" },
    label: "River Lantern unlocks Czech Village cabinet",
    unlock: { from_node_id: "node_04", to_node_id: "node_07" },
    status: "active",
    created_at: "2026-06-23T00:00:00.000Z",
  };
}

function loadSeedContext() {
  return loadRelationshipEdgeSeedContext(seedPath, prodSeedPath);
}

async function main() {
  const { stewardProfileId, privateKey, publicKeyBase58 } = loadSeedContext();
  const unsigned = crUnlockEdgeUnsigned(stewardProfileId);
  const signed = await signDocument(
    withProtocolFields(unsigned, "relationship_edge"),
    privateKey,
    publicKeyBase58
  );
  const json = JSON.stringify(signed);
  const escaped = json.replace(/'/g, "''");
  const now = signed.created_at;

  const d1Target =
    process.env.D1_TARGET === "remote" ? "--remote" : "--local";

  const sql = `INSERT OR REPLACE INTO relationship_edges (
    edge_id, network_id, kind, from_object_id, to_object_id,
    steward_profile_id, status, edge_document_json, created_at, updated_at
  ) VALUES (
    '${CR_UNLOCK_EDGE_ID}',
    '${signed.network_id}',
    'unlocks',
    '${signed.from.id}',
    '${signed.to.id}',
    '${signed.steward_profile_id}',
    'active',
    '${escaped}',
    '${now}',
    '${now}'
  );`;

  const sqlDir = mkdtempSync(join(tmpdir(), "hc-rel-edge-unlock-seed-"));
  const sqlPath = join(sqlDir, "seed-relationship-edge-unlock.sql");
  writeFileSync(sqlPath, sql, "utf8");

  execSync(
    `npx wrangler d1 execute humanity-resolver ${d1Target} --config worker/wrangler.toml --file=${JSON.stringify(sqlPath)}`,
    { cwd: root, stdio: "inherit" }
  );

  console.log(
    `Seeded ${CR_UNLOCK_EDGE_ID} for steward ${stewardProfileId} (${d1Target.replace("--", "")}).`
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
