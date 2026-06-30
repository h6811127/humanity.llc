#!/usr/bin/env node
/**
 * Reset node_04 / node_07 / node_10 to D0 dual-gate cold state on local D1 (wrangler).
 * Avoids game-update API when season_root_profile_id points at production.
 *
 *   npm run ws-object-graph:reset-dual-gate-local
 *
 * @see docs/WS_OBJECT_GRAPH_DUAL_GATE_WALK_V1.md (D0)
 */
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SEASON_OBJECT_IDS } from "./city-game-node-defaults.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {string} objectId
 */
function queryObjectJson(objectId) {
  const out = execSync(
    `npx wrangler d1 execute humanity-resolver --local --config worker/wrangler.toml --json --command ${JSON.stringify(
      `SELECT child_object_document_json, public_state FROM child_objects WHERE object_id='${objectId}';`
    )}`,
    { cwd: root, encoding: "utf8" }
  );
  const parsed = JSON.parse(out);
  const row = parsed?.[0]?.results?.[0];
  if (!row?.child_object_document_json) {
    throw new Error(`${objectId} missing in local D1 — run npm run city-game:seed-local`);
  }
  return {
    doc: JSON.parse(String(row.child_object_document_json)),
    publicState: String(row.public_state ?? ""),
  };
}

/**
 * @param {string} objectId
 * @param {string} publicState
 * @param {Record<string, unknown>} doc
 */
function writeObjectJson(objectId, publicState, doc) {
  const json = JSON.stringify(doc).replace(/'/g, "''");
  const sql = `UPDATE child_objects SET
    public_state = '${publicState.replace(/'/g, "''")}',
    child_object_document_json = '${json}',
    updated_at = '${new Date().toISOString()}'
  WHERE object_id = '${objectId}';`;

  const dir = mkdtempSync(join(tmpdir(), "hc-ws-og-reset-dual-gate-"));
  const sqlPath = join(dir, "reset-dual-gate.sql");
  writeFileSync(sqlPath, sql, "utf8");
  try {
    execSync(
      `npx wrangler d1 execute humanity-resolver --local --config worker/wrangler.toml --file=${JSON.stringify(sqlPath)}`,
      { cwd: root, stdio: "pipe" }
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function resetCabinet() {
  const { doc } = queryObjectJson(SEASON_OBJECT_IDS.node_07);
  const publicState = "Locked until River Lantern quorum";
  doc.public_state = publicState;
  doc.game_meta = {
    ...(doc.game_meta && typeof doc.game_meta === "object" ? doc.game_meta : {}),
    unlocked_by: [],
    vouch_requires: Array.isArray(doc.game_meta?.vouch_requires)
      ? doc.game_meta.vouch_requires
      : ["node_10"],
  };
  writeObjectJson(SEASON_OBJECT_IDS.node_07, publicState, doc);
  console.log("✓", SEASON_OBJECT_IDS.node_07, "→", publicState);
}

function resetRiver() {
  const { doc } = queryObjectJson(SEASON_OBJECT_IDS.node_04);
  const publicState = "Seed clue live — share outward to evolve";
  doc.public_state = publicState;
  doc.game_meta = {
    ...(doc.game_meta && typeof doc.game_meta === "object" ? doc.game_meta : {}),
    collective_progress: 4,
    collective_target: 20,
    unlocked_by: [],
  };
  writeObjectJson(SEASON_OBJECT_IDS.node_04, publicState, doc);
  console.log("✓", SEASON_OBJECT_IDS.node_04, "→ quorum pre-fill (4/20)");
}

function resetLibraryWitness() {
  const { doc } = queryObjectJson(SEASON_OBJECT_IDS.node_10);
  const publicState = "Witness seal dormant — passes not yet issued";
  doc.public_state = publicState;
  doc.game_meta = {
    ...(doc.game_meta && typeof doc.game_meta === "object" ? doc.game_meta : {}),
    scarcity_remaining: 25,
    vouch_active_for: [],
  };
  writeObjectJson(SEASON_OBJECT_IDS.node_10, publicState, doc);
  console.log("✓", SEASON_OBJECT_IDS.node_10, "→ witness scarcity reset");
}

function satisfyWitnessGate() {
  const { doc } = queryObjectJson(SEASON_OBJECT_IDS.node_10);
  const publicState = "Witness seal open — sunset pass issued";
  doc.public_state = publicState;
  doc.game_meta = {
    ...(doc.game_meta && typeof doc.game_meta === "object" ? doc.game_meta : {}),
    vouch_active_for: ["node_07"],
  };
  writeObjectJson(SEASON_OBJECT_IDS.node_10, publicState, doc);
  console.log("✓", SEASON_OBJECT_IDS.node_10, "→ vouch_active_for node_07");
}

function satisfyUnlockGate() {
  const { doc } = queryObjectJson(SEASON_OBJECT_IDS.node_07);
  const publicState = "Unlocked together — ask the mural what remembers winter";
  doc.public_state = publicState;
  doc.game_meta = {
    ...(doc.game_meta && typeof doc.game_meta === "object" ? doc.game_meta : {}),
    unlocked_by: ["node_04"],
    vouch_requires: Array.isArray(doc.game_meta?.vouch_requires)
      ? doc.game_meta.vouch_requires
      : ["node_10"],
  };
  writeObjectJson(SEASON_OBJECT_IDS.node_07, publicState, doc);
  console.log("✓", SEASON_OBJECT_IDS.node_07, "→ unlocked_by node_04");
}

function main() {
  const mode = process.argv.find((arg) => arg.startsWith("--"));
  if (mode === "--witness") {
    satisfyWitnessGate();
    return;
  }
  if (mode === "--unlock") {
    satisfyUnlockGate();
    return;
  }
  if (mode === "--satisfy") {
    satisfyWitnessGate();
    satisfyUnlockGate();
    return;
  }

  console.log("Resetting dual-gate spine nodes (local D1)…\n");
  resetRiver();
  resetCabinet();
  resetLibraryWitness();
  console.log("\nDual-gate D0 reset complete.");
}

main();
