import { describe, expect, it } from "vitest";

import type { CardRow, ChildObjectRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { buildScanCapabilities } from "../src/live-object/scan-capabilities";
import { scanStatusBodyFromViewModel } from "../src/resolver/scan-status";
import { buildScanViewModel } from "../src/resolver/scan-state";
import { CITY_GAME_SEASON_ROOT_PROFILE } from "./city-game-fixture-profile";

const PROFILE = CITY_GAME_SEASON_ROOT_PROFILE;
const QR = "qr_cr_node_04_river01";
const RIVER_OBJECT = "obj_cr_node_04_river";

function gameChild(overrides: Record<string, unknown> = {}): ChildObjectRow {
  return {
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
      ...overrides,
    }),
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:05:00.000Z",
  };
}

function gameScanVm(
  now: Date,
  env: { CITY_GAME_ENABLED?: string; CITY_GAME_LOCAL_PLAY_OPEN?: string } = {
    CITY_GAME_ENABLED: "1",
  },
  childOverrides: Record<string, unknown> = {}
) {
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

  return buildScanViewModel(
    PROFILE,
    QR,
    {
      card,
      qr,
      verification,
      childObject: gameChild(childOverrides),
      revocationDisplay: null,
    },
    "https://humanity.llc",
    now,
    { env }
  );
}

describe("buildScanCapabilities (Order 2 — Cedar Rapids verbs)", () => {
  it("advertises open contribute during season play window", () => {
    const vm = gameScanVm(new Date("2026-06-07T18:00:00.000Z"));
    const caps = buildScanCapabilities(vm, new Date("2026-06-07T18:00:00.000Z"));

    expect(caps.find((c) => c.verb === "read")).toMatchObject({ available: true });
    expect(caps.find((c) => c.verb === "contribute")).toMatchObject({
      available: true,
      kind: "game_quorum",
    });
    expect(caps.find((c) => c.verb === "archive")).toMatchObject({
      available: false,
      state: "live",
    });
    expect(caps.some((c) => c.verb === "request")).toBe(false);
  });

  it("blocks contribute before season window with season_not_open", () => {
    const vm = gameScanVm(new Date("2026-06-05T12:00:00.000Z"));
    const caps = buildScanCapabilities(vm, new Date("2026-06-05T12:00:00.000Z"));

    expect(caps.find((c) => c.verb === "contribute")).toMatchObject({
      available: false,
      reason: "season_not_open",
    });
    expect(caps.find((c) => c.verb === "archive")).toMatchObject({
      available: true,
      state: "season_not_open",
    });
  });

  it("marks archive sleep after season ends", () => {
    const vm = gameScanVm(new Date("2026-06-20T12:00:00.000Z"));
    const caps = buildScanCapabilities(vm, new Date("2026-06-20T12:00:00.000Z"));

    expect(caps.find((c) => c.verb === "contribute")).toMatchObject({
      available: false,
      reason: "season_ended",
    });
    expect(caps.find((c) => c.verb === "archive")).toMatchObject({
      available: true,
      state: "season_ended",
    });
  });

  it("surfaces care_pause on archive and contribute capabilities", () => {
    const vm = gameScanVm(new Date("2026-06-07T18:00:00.000Z"), { CITY_GAME_ENABLED: "1" }, {
      object_streams: [{ id: "care", class: "care", label: "Trail", value: "Closed for maintenance" }],
    });
    const caps = buildScanCapabilities(vm, new Date("2026-06-07T18:00:00.000Z"));

    expect(caps.find((c) => c.verb === "contribute")).toMatchObject({
      available: false,
      reason: "care_maintenance",
    });
    expect(caps.find((c) => c.verb === "archive")).toMatchObject({
      available: true,
      state: "care_pause",
    });
  });

  it("includes capabilities on scan status JSON for game nodes", () => {
    const vm = gameScanVm(new Date("2026-06-07T18:00:00.000Z"));
    const body = scanStatusBodyFromViewModel(vm);

    expect(body.scan.capabilities).toBeDefined();
    expect(body.scan.capabilities?.length).toBeGreaterThanOrEqual(3);
    expect(body.scan.limits.scan_analytics).toBe(false);
  });
});

describe("buildScanCapabilities (non-game scans)", () => {
  it("includes read and live proof for active card scans", () => {
    const vm = buildScanViewModel(
      "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      "qr_7Xk9mP2nQ4rT6vW8",
      {
        card: {
          profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
          public_key: "pk",
          handle: "river_example",
          handle_normalized: "river_example",
          manifesto_line: "Open studio",
          status: "active",
          card_document_json: "{}",
          created_at: "2026-05-16T17:00:00Z",
          updated_at: "2026-05-16T17:00:00Z",
        },
        qr: {
          qr_id: "qr_7Xk9mP2nQ4rT6vW8",
          profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
          epoch: 1,
          scope: "card",
          print_artifact_id: null,
          resolver_hint: "https://humanity.llc",
          status: "active",
          payload: "https://humanity.llc/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_7Xk9mP2nQ4rT6vW8",
          issued_at: "2026-05-16T17:00:00Z",
          expires_at: null,
          credential_document_json: "{}",
          created_at: "2026-05-16T17:00:00Z",
          updated_at: "2026-05-16T17:00:00Z",
        },
        verification: null,
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );

    const caps = buildScanCapabilities(vm);
    expect(caps.find((c) => c.verb === "read")).toMatchObject({ available: true });
    expect(caps.find((c) => c.verb === "request")).toMatchObject({
      kind: "live_proof",
      available: false,
      reason: "not_offered",
    });
    expect(caps.some((c) => c.verb === "contribute")).toBe(false);
  });
});
