#!/usr/bin/env node
/**
 * Seed signed witness edge edge_cr_witness_10_07 into local D1.
 *
 * Prerequisites:
 *   npm run worker:migrate:local   (includes 0035_relationship_edges)
 *   npm run city-game:seed-local   (season root + issuer_public_key)
 *
 * Usage:
 *   npm run city-game:seed-relationship-edge
 *   D1_TARGET=remote npm run city-game:seed-relationship-edge   # production D1
 *   STEWARD_PROFILE_ID=... ISSUER_PRIVATE_KEY=... npm run city-game:seed-relationship-edge
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

const CR_WITNESS_EDGE_ID = "edge_cr_witness_10_07";

function crWitnessEdgeUnsigned(stewardProfileId) {
  return {
    version: "1.0",
    type: "relationship_edge",
    edge_id: CR_WITNESS_EDGE_ID,
    kind: "witnesses",
    network_id: "cr_season_01_wake",
    steward_profile_id: stewardProfileId,
    from: { ref: "object_id", id: "obj_cr_node_10_library" },
    to: { ref: "object_id", id: "obj_cr_node_07_cabinet" },
    label: "Library witness vouch opens cabinet path",
    witness: { from_node_id: "node_10", to_node_id: "node_07" },
    status: "active",
    created_at: "2026-06-22T00:00:00.000Z",
  };
}

function loadSeedContext() {
  return loadRelationshipEdgeSeedContext(seedPath, prodSeedPath);
}

async function main() {
  const { stewardProfileId, privateKey, publicKeyBase58 } = loadSeedContext();
  const unsigned = crWitnessEdgeUnsigned(stewardProfileId);
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
    '${CR_WITNESS_EDGE_ID}',
    '${signed.network_id}',
    'witnesses',
    '${signed.from.id}',
    '${signed.to.id}',
    '${signed.steward_profile_id}',
    'active',
    '${escaped}',
    '${now}',
    '${now}'
  );`;

  const sqlDir = mkdtempSync(join(tmpdir(), "hc-rel-edge-seed-"));
  const sqlPath = join(sqlDir, "seed-relationship-edge.sql");
  writeFileSync(sqlPath, sql, "utf8");

  execSync(
    `npx wrangler d1 execute humanity-resolver ${d1Target} --config worker/wrangler.toml --file=${JSON.stringify(sqlPath)}`,
    { cwd: root, stdio: "inherit" }
  );

  console.log(`Seeded ${CR_WITNESS_EDGE_ID} for steward ${stewardProfileId} (${d1Target.replace("--", "")}).`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
