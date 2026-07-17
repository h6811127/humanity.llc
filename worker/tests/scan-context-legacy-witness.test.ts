import { describe, expect, it } from "vitest";

import { loadScanContext } from "../src/db/scan";
import type {
  CardRow,
  ChildObjectRow,
  QrCredentialRow,
  VerificationSummaryRow,
} from "../src/db/types";
import { buildScanViewModel } from "../src/resolver/scan-state";
import {
  CITY_GAME_SEASON_OPEN_NOW,
  CITY_GAME_SEASON_ROOT_PROFILE,
} from "./city-game-fixture-profile";

const PROFILE = CITY_GAME_SEASON_ROOT_PROFILE;
const QR = "qr_legacy_witness_scan";
const CABINET = "obj_cr_node_07_cabinet";
const LIBRARY = "obj_cr_node_10_library";
const NOW = "2026-06-01T12:00:00.000Z";

function cardRow(): CardRow {
  return {
    profile_id: PROFILE,
    public_key: "pk",
    handle: "cedar_rapids_wake",
    handle_normalized: "cedar_rapids_wake",
    manifesto_line: "Wake season",
    status: "active",
    card_document_json: "{}",
    created_at: NOW,
    updated_at: NOW,
  };
}

function qrRow(): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "child_object",
    print_artifact_id: null,
    object_id: CABINET,
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
    issued_at: NOW,
    expires_at: null,
    credential_document_json: "{}",
    created_at: NOW,
    updated_at: NOW,
  };
}

function verificationRow(): VerificationSummaryRow {
  return {
    profile_id: PROFILE,
    state: "registered",
    level: 1,
    label: "Registered",
    method: "registered",
    vouch_count: 0,
    latest_accepted_vouch_at: null,
    credential_ids_json: "[]",
    summary_document_json: null,
    updated_at: NOW,
  };
}

function gameNodeRow(input: {
  objectId: string;
  nodeRole: string;
  label: string;
  gameMeta: Record<string, unknown>;
}): ChildObjectRow {
  return {
    object_id: input.objectId,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: input.label,
    public_state: "Active game node",
    status: "active",
    child_object_document_json: JSON.stringify({
      object_id: input.objectId,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      season_id: "cr_season_01_wake",
      node_role: input.nodeRole,
      district: "downtown",
      game_meta: input.gameMeta,
    }),
    created_at: NOW,
    updated_at: NOW,
  };
}

function legacyWitnessDb() {
  const cabinet = gameNodeRow({
    objectId: CABINET,
    nodeRole: "lore_archive",
    label: "Czech Village cabinet",
    gameMeta: {
      unlocked_by: ["node_04"],
      vouch_requires: ["node_10"],
      fragment_id: "czech_1",
    },
  });
  const library = gameNodeRow({
    objectId: LIBRARY,
    nodeRole: "witness",
    label: "Library witness",
    gameMeta: {
      vouch_active_for: ["node_07"],
      scarcity_remaining: 24,
    },
  });
  const children = new Map([
    [cabinet.object_id, cabinet],
    [library.object_id, library],
  ]);

  function first(sql: string, args: unknown[]) {
    if (sql.includes("sqlite_master")) return { 1: 1 };
    if (sql.includes("FROM cards")) return cardRow();
    if (sql.includes("FROM qr_credentials")) return qrRow();
    if (sql.includes("FROM child_objects")) {
      return children.get(String(args[0])) ?? null;
    }
    if (sql.includes("FROM verification_summaries")) return verificationRow();
    return null;
  }

  return {
    prepare: (sql: string) => ({
      first: async () => first(sql, []),
      bind: (...args: unknown[]) => ({
        first: async () => first(sql, args),
        all: async () => ({ results: [] }),
      }),
    }),
  } as unknown as D1Database;
}

describe("scan context legacy witness hydration", () => {
  it("keeps a legacy vouch gate open when the witness already vouched", async () => {
    const ctx = await loadScanContext(legacyWitnessDb(), PROFILE, QR);

    expect(ctx.gameVouchWitnesses?.node_10?.vouch_active_for).toContain(
      "node_07"
    );

    const vm = buildScanViewModel(
      PROFILE,
      QR,
      ctx,
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    expect(vm.gameNode?.vouchGate?.met).toBe(true);
  });
});
