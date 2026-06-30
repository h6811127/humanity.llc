#!/usr/bin/env node
/**
 * Reset Czech Village cabinet to D0 dual-gate cold state on local D1.
 * Clears unlocked_by so unlock edge reads satisfied=false on cabinet scan.
 *
 *   npm run ws-object-graph:reset-cold-local
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
const CABINET_ID = SEASON_OBJECT_IDS.node_07;

function queryCabinetJson() {
  const out = execSync(
    `npx wrangler d1 execute humanity-resolver --local --config worker/wrangler.toml --json --command ${JSON.stringify(
      `SELECT child_object_document_json FROM child_objects WHERE object_id='${CABINET_ID}';`
    )}`,
    { cwd: root, encoding: "utf8" }
  );
  const parsed = JSON.parse(out);
  const row = parsed?.[0]?.results?.[0];
  if (!row?.child_object_document_json) {
    throw new Error(`${CABINET_ID} missing in local D1 — run npm run city-game:seed-local`);
  }
  return JSON.parse(String(row.child_object_document_json));
}

function writeCabinetJson(doc) {
  const lockedState = "Locked until River Lantern quorum";
  doc.public_state = lockedState;
  doc.game_meta = {
    ...(doc.game_meta && typeof doc.game_meta === "object" ? doc.game_meta : {}),
    unlocked_by: [],
    vouch_requires: Array.isArray(doc.game_meta?.vouch_requires)
      ? doc.game_meta.vouch_requires
      : ["node_10"],
  };
  if (Array.isArray(doc.object_streams)) {
    doc.object_streams = doc.object_streams.map((stream) => {
      if (stream?.id === "territory") {
        return { ...stream, value: "Locked · quorum needed" };
      }
      if (stream?.id === "relay") {
        return { ...stream, value: "Waiting · River Lantern" };
      }
      return stream;
    });
  }

  const json = JSON.stringify(doc).replace(/'/g, "''");
  const sql = `UPDATE child_objects SET
    public_state = '${lockedState.replace(/'/g, "''")}',
    child_object_document_json = '${json}',
    updated_at = '${new Date().toISOString()}'
  WHERE object_id = '${CABINET_ID}';`;

  const dir = mkdtempSync(join(tmpdir(), "hc-ws-og-reset-cold-"));
  const sqlPath = join(dir, "reset-cold.sql");
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

function main() {
  const doc = queryCabinetJson();
  writeCabinetJson(doc);
  console.log(`Reset ${CABINET_ID} to D0 cold state (unlocked_by cleared).`);
}

main();
