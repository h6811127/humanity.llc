#!/usr/bin/env node
/**
 * Operator-only: satisfy unlock / quorum gates on production D1.
 *
 *   npm run ws-object-graph:satisfy-dual-gate-prod -- --unlock
 *   npm run ws-object-graph:satisfy-dual-gate-prod -- --quorum
 *
 * Prefer real D2 browser contribute when possible.
 * @see docs/WS_OBJECT_GRAPH_DUAL_GATE_WALK_V1.md
 */
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SEASON_OBJECT_IDS } from "./city-game-node-defaults.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const remote = !process.argv.includes("--local");

/**
 * @param {string} objectId
 */
function queryObjectJson(objectId) {
  const scope = remote ? "--remote" : "--local";
  const out = execSync(
    `npx wrangler d1 execute humanity-resolver ${scope} --config worker/wrangler.toml --json --command ${JSON.stringify(
      `SELECT child_object_document_json, public_state FROM child_objects WHERE object_id='${objectId}';`
    )}`,
    { cwd: root, encoding: "utf8" }
  );
  const parsed = JSON.parse(out);
  const row = parsed?.[0]?.results?.[0];
  if (!row?.child_object_document_json) {
    throw new Error(`${objectId} missing in ${remote ? "remote" : "local"} D1`);
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
  const scope = remote ? "--remote" : "--local";
  const json = JSON.stringify(doc).replace(/'/g, "''");
  const sql = `UPDATE child_objects SET
    public_state = '${publicState.replace(/'/g, "''")}',
    child_object_document_json = '${json}',
    updated_at = '${new Date().toISOString()}'
  WHERE object_id = '${objectId}';`;

  const dir = mkdtempSync(join(tmpdir(), "hc-ws-og-satisfy-prod-"));
  const sqlPath = join(dir, "satisfy.sql");
  writeFileSync(sqlPath, sql, "utf8");
  try {
    execSync(
      `npx wrangler d1 execute humanity-resolver ${scope} --config worker/wrangler.toml --file=${JSON.stringify(sqlPath)}`,
      { cwd: root, stdio: "pipe" }
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function mapStreams(doc, mapper) {
  if (!Array.isArray(doc.object_streams)) return doc.object_streams;
  return doc.object_streams.map((row) =>
    mapper(row && typeof row === "object" ? row : {})
  );
}

function satisfyQuorumComplete() {
  const { doc: riverDoc } = queryObjectJson(SEASON_OBJECT_IDS.node_04);
  const target = Number(riverDoc.game_meta?.collective_target ?? 20);
  riverDoc.game_meta = {
    ...(riverDoc.game_meta && typeof riverDoc.game_meta === "object" ? riverDoc.game_meta : {}),
    collective_progress: target,
    collective_target: target,
    unlocked_by: Array.isArray(riverDoc.game_meta?.unlocked_by)
      ? riverDoc.game_meta.unlocked_by
      : [],
  };
  riverDoc.object_streams = mapStreams(riverDoc, (row) => {
    if (row.id === "bulletin" || row.label === "Clue") {
      return { ...row, value: "Evolved clue · sharing beat hoarding" };
    }
    if (row.id === "territory" || row.label === "Object") {
      return { ...row, value: "Temp drop · quorum met" };
    }
    if (row.id === "collective" || row.label === "Collective") {
      return { ...row, value: `${target} / ${target}` };
    }
    return row;
  });
  const riverState = "Evolved together — Czech Village cabinet path shared outward";
  riverDoc.public_state = riverState;
  writeObjectJson(SEASON_OBJECT_IDS.node_04, riverState, riverDoc);
  console.log("✓", SEASON_OBJECT_IDS.node_04, `→ quorum ${target}/${target} on`, remote ? "prod D1" : "local D1");

  const { doc: cabinetDoc } = queryObjectJson(SEASON_OBJECT_IDS.node_07);
  const unlockedBy = cabinetDoc.game_meta?.unlocked_by?.includes("node_04")
    ? cabinetDoc.game_meta.unlocked_by
    : [...(cabinetDoc.game_meta?.unlocked_by ?? []), "node_04"];
  const cabinetState = "Unlocked together — ask the mural what remembers winter";
  cabinetDoc.public_state = cabinetState;
  cabinetDoc.game_meta = {
    ...(cabinetDoc.game_meta && typeof cabinetDoc.game_meta === "object" ? cabinetDoc.game_meta : {}),
    unlocked_by: unlockedBy,
    vouch_requires: Array.isArray(cabinetDoc.game_meta?.vouch_requires)
      ? cabinetDoc.game_meta.vouch_requires
      : ["node_10"],
  };
  cabinetDoc.object_streams = mapStreams(cabinetDoc, (row) => {
    if (row.id === "relay" || row.label === "Path") {
      return { ...row, value: "Open · unlocked by River Lantern" };
    }
    if (row.id === "territory" || row.label === "Gate") {
      return { ...row, value: "Visible · quorum met" };
    }
    if (row.id === "bulletin" || row.label === "Choice") {
      return { ...row, value: "Shared ending path · group unlock live" };
    }
    return row;
  });
  writeObjectJson(SEASON_OBJECT_IDS.node_07, cabinetState, cabinetDoc);
  console.log("✓", SEASON_OBJECT_IDS.node_07, "→ unlocked_by node_04 (quorum path)");
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
  console.log("✓", SEASON_OBJECT_IDS.node_07, "→ unlocked_by node_04 on", remote ? "prod D1" : "local D1");
}

function main() {
  const mode = process.argv.find((arg) => arg.startsWith("--"));
  if (mode === "--quorum") {
    satisfyQuorumComplete();
    return;
  }
  if (mode === "--unlock") {
    satisfyUnlockGate();
    return;
  }
  console.error("Usage: npm run ws-object-graph:satisfy-dual-gate-prod -- --unlock|--quorum");
  process.exit(1);
}

main();
