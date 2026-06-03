import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { scanStatusBodyFromViewModel } from "../src/resolver/scan-status";
import { buildScanViewModel } from "../src/resolver/scan-state";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import {
  SCAN_ANALYTICS_SOURCE_GUARD,
  auditGameScanAnalyticsGate,
} from "../scripts/city-game-scan-analytics-gate-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

import { CITY_GAME_SEASON_ROOT_PROFILE } from "./city-game-fixture-profile";

const PROFILE = CITY_GAME_SEASON_ROOT_PROFILE;
const QR = "qr_cr_node_04_river01";
const RIVER_OBJECT = "obj_cr_node_04_river";

function loadGuardSources() {
  const sourceByRel = Object.fromEntries(
    [
      ...SCAN_ANALYTICS_SOURCE_GUARD.map((row) => row.rel),
      "worker/src/resolver/game-contribute.ts",
    ].map((rel) => [rel, readFileSync(join(root, rel), "utf8")])
  );
  const policyMarkdown = readFileSync(
    join(root, "docs/REFERENCE_OPERATOR_DATA_POLICY.md"),
    "utf8"
  );
  return { sourceByRel, policyMarkdown };
}

describe("city-game-scan-analytics-gate (B14 / P5)", () => {
  it("policy and resolver sources keep passive game scans private", () => {
    const { ok, issues } = auditGameScanAnalyticsGate(loadGuardSources());
    expect(issues).toEqual([]);
    expect(ok).toBe(true);
  });

  it("game node scan status JSON keeps scan_analytics false", () => {
    const card: CardRow = {
      profile_id: PROFILE,
      public_key: "pk",
      handle: "season_root",
      handle_normalized: "season_root",
      manifesto_line: "Wake the city",
      status: "active",
      card_document_json: "{}",
      created_at: "2026-06-01T12:00:00.000Z",
      updated_at: "2026-06-01T12:00:00.000Z",
    };
    const qr: QrCredentialRow = {
      qr_id: QR,
      profile_id: PROFILE,
      epoch: 1,
      scope: "child_object",
      print_artifact_id: null,
      object_id: RIVER_OBJECT,
      resolver_hint: "https://humanity.llc",
      status: "active",
      payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
      issued_at: "2026-06-01T12:00:00.000Z",
      expires_at: null,
      credential_document_json: "{}",
      created_at: "2026-06-01T12:00:00.000Z",
      updated_at: "2026-06-01T12:00:00.000Z",
    };
    const verification: VerificationSummaryRow = {
      profile_id: PROFILE,
      state: "registered",
      level: 1,
      label: "Registered",
      method: "registered",
      vouch_count: 0,
      latest_accepted_vouch_at: null,
      credential_ids_json: "[]",
      summary_document_json: null,
      updated_at: "2026-06-01T12:00:00.000Z",
    };

    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card,
        qr,
        verification,
        childObject: {
          object_id: RIVER_OBJECT,
          parent_profile_id: PROFILE,
          object_type: "game_node",
          public_label: "Riverwalk River Lantern",
          public_state: "Seed clue live",
          status: "active",
          child_object_document_json: JSON.stringify({
            object_id: RIVER_OBJECT,
            parent_profile_id: PROFILE,
            object_type: "game_node",
            public_label: "Riverwalk River Lantern",
            public_state: "Seed clue live",
            status: "active",
            season_id: "cr_season_01_wake",
            node_role: "temp_drop",
            district: "river_spine",
            object_streams: [{ id: "care", class: "care", label: "Trail", value: "Open" }],
            game_meta: {
              visible_until: null,
              compromised: false,
              collective_progress: 4,
              collective_target: 20,
              unlocked_by: [],
              vouch_requires: [],
              vouch_active_for: [],
              scarcity_remaining: null,
              fragment_id: null,
            },
            created_at: "2026-06-01T12:00:00.000Z",
            updated_at: "2026-06-01T12:05:00.000Z",
          }),
          created_at: "2026-06-01T12:00:00.000Z",
          updated_at: "2026-06-01T12:05:00.000Z",
        },
        revocationDisplay: null,
      },
      "https://humanity.llc",
      new Date("2026-06-01T18:00:00.000Z"),
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.limits.scan_analytics).toBe(false);
    expect(vm.gameNode).toBeTruthy();
  });

  it("game scan view model does not expose scan counts", () => {
    const card: CardRow = {
      profile_id: PROFILE,
      public_key: "pk",
      handle: "season_root",
      handle_normalized: "season_root",
      manifesto_line: "Wake the city",
      status: "active",
      card_document_json: "{}",
      created_at: "2026-06-01T12:00:00.000Z",
      updated_at: "2026-06-01T12:00:00.000Z",
    };
    const qr: QrCredentialRow = {
      qr_id: QR,
      profile_id: PROFILE,
      epoch: 1,
      scope: "child_object",
      print_artifact_id: null,
      object_id: RIVER_OBJECT,
      resolver_hint: "https://humanity.llc",
      status: "active",
      payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
      issued_at: "2026-06-01T12:00:00.000Z",
      expires_at: null,
      credential_document_json: "{}",
      created_at: "2026-06-01T12:00:00.000Z",
      updated_at: "2026-06-01T12:00:00.000Z",
    };
    const verification: VerificationSummaryRow = {
      profile_id: PROFILE,
      state: "registered",
      level: 1,
      label: "Registered",
      method: "registered",
      vouch_count: 0,
      latest_accepted_vouch_at: null,
      credential_ids_json: "[]",
      summary_document_json: null,
      updated_at: "2026-06-01T12:00:00.000Z",
    };

    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card,
        qr,
        verification,
        childObject: {
          object_id: RIVER_OBJECT,
          parent_profile_id: PROFILE,
          object_type: "game_node",
          public_label: "Riverwalk River Lantern",
          public_state: "Seed clue live",
          status: "active",
          child_object_document_json: JSON.stringify({
            object_type: "game_node",
            season_id: "cr_season_01_wake",
            node_role: "temp_drop",
            district: "river_spine",
            object_streams: [],
            game_meta: {
              visible_until: null,
              compromised: false,
              collective_progress: 4,
              collective_target: 20,
              unlocked_by: [],
              vouch_requires: [],
              vouch_active_for: [],
              scarcity_remaining: null,
              fragment_id: null,
            },
          }),
          created_at: "2026-06-01T12:00:00.000Z",
          updated_at: "2026-06-01T12:05:00.000Z",
        },
        revocationDisplay: null,
      },
      "https://humanity.llc",
      new Date("2026-06-01T18:00:00.000Z"),
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    const serialized = JSON.stringify(vm);
    expect(serialized).not.toMatch(/scan count|leaderboard|heatmap|visited here/i);
  });
});
