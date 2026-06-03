import { describe, expect, it } from "vitest";

import type { CardRow, ChildObjectRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import { buildScanCapabilities, findScanCapability, readTrustGroups, shouldShowLiveControlTrustGroup } from "../src/live-object/scan-capabilities";
import { scanLayoutForMinimalFailureTrust, scanLayoutForRevocationDisplay } from "../src/resolver/revocation-display";
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
    expect(vm.capabilities.length).toBeGreaterThanOrEqual(3);
    const body = scanStatusBodyFromViewModel(vm);

    expect(body.scan.capabilities).toEqual(vm.capabilities);
    expect(body.scan.limits.scan_analytics).toBe(false);
  });

  it("advertises offer verb on lost-item relay child scans", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: {
          profile_id: PROFILE,
          public_key: "pk",
          handle: "season_root",
          handle_normalized: "season_root",
          manifesto_line: "[relay] Keys\nLost",
          status: "active",
          card_document_json: "{}",
          created_at: "2026-06-01T12:00:00.000Z",
          updated_at: "2026-06-01T12:00:00.000Z",
        },
        qr: {
          qr_id: QR,
          profile_id: PROFILE,
          epoch: 1,
          scope: "child_object",
          print_artifact_id: null,
          object_id: "obj_lost_keys",
          resolver_hint: "https://humanity.llc",
          status: "active",
          payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
          issued_at: "2026-06-01T12:00:00.000Z",
          expires_at: null,
          credential_document_json: "{}",
          created_at: "2026-06-01T12:00:00.000Z",
          updated_at: "2026-06-01T12:00:00.000Z",
        },
        verification: null,
        childObject: {
          object_id: "obj_lost_keys",
          parent_profile_id: PROFILE,
          object_type: "lost_item_relay",
          public_label: "Keys",
          public_state: "Lost — contact owner through relay",
          status: "active",
          child_object_document_json: "{}",
          created_at: "2026-06-01T12:00:00.000Z",
          updated_at: "2026-06-01T12:00:00.000Z",
        },
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );

    expect(findScanCapability(vm.capabilities, "read")).toMatchObject({
      available: true,
      kind: "lost_item_relay",
    });
    expect(findScanCapability(vm.capabilities, "offer")).toMatchObject({
      available: true,
      kind: "finder_relay",
    });
    expect(findScanCapability(vm.capabilities, "request")).toBeUndefined();
  });

  it("omits request verb on status plate child scans", () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: {
          profile_id: PROFILE,
          public_key: "pk",
          handle: "season_root",
          handle_normalized: "season_root",
          manifesto_line: "Studio door\nOpen",
          status: "active",
          card_document_json: "{}",
          created_at: "2026-06-01T12:00:00.000Z",
          updated_at: "2026-06-01T12:00:00.000Z",
        },
        qr: {
          qr_id: QR,
          profile_id: PROFILE,
          epoch: 1,
          scope: "child_object",
          print_artifact_id: null,
          object_id: "obj_status_plate_1",
          resolver_hint: "https://humanity.llc",
          status: "active",
          payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
          issued_at: "2026-06-01T12:00:00.000Z",
          expires_at: null,
          credential_document_json: "{}",
          created_at: "2026-06-01T12:00:00.000Z",
          updated_at: "2026-06-01T12:00:00.000Z",
        },
        verification: null,
        childObject: {
          object_id: "obj_status_plate_1",
          parent_profile_id: PROFILE,
          object_type: "status_plate",
          public_label: "Studio door",
          public_state: "Open",
          status: "active",
          child_object_document_json: "{}",
          created_at: "2026-06-01T12:00:00.000Z",
          updated_at: "2026-06-01T12:00:00.000Z",
        },
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );

    expect(findScanCapability(vm.capabilities, "request")).toBeUndefined();
    expect(shouldShowLiveControlTrustGroup(vm.capabilities)).toBe(false);
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
    expect(shouldShowLiveControlTrustGroup(caps)).toBe(true);
    expect(readTrustGroups(caps)).toEqual(["card", "human", "qr"]);
    expect(caps.some((c) => c.verb === "contribute")).toBe(false);
  });

  it("omits human trust group on minimal failure layout", () => {
    const layout = scanLayoutForMinimalFailureTrust();
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
          status: "revoked",
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
          status: "revoked",
          payload: "https://humanity.llc/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_7Xk9mP2nQ4rT6vW8",
          issued_at: "2026-05-16T17:00:00Z",
          expires_at: null,
          credential_document_json: "{}",
          created_at: "2026-05-16T17:00:00Z",
          updated_at: "2026-05-16T17:00:00Z",
        },
        verification: null,
        revocationDisplay: {
          display_mode: "minimal",
          public_reason: "owner_revoked",
        },
      },
      "https://humanity.llc"
    );

    expect(layout.showHumanTrustBlock).toBe(false);
    expect(readTrustGroups(vm.capabilities)).toEqual(["card", "qr"]);
  });

  it("advertises card-only trust groups on tombstone revocation layout", () => {
    const layout = scanLayoutForRevocationDisplay({ display_mode: "tombstone", public_reason: "event_ended" });
    expect(layout.showArtifactBlock).toBe(false);
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
          status: "revoked",
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
          status: "revoked",
          payload: "https://humanity.llc/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_7Xk9mP2nQ4rT6vW8",
          issued_at: "2026-05-16T17:00:00Z",
          expires_at: null,
          credential_document_json: "{}",
          created_at: "2026-05-16T17:00:00Z",
          updated_at: "2026-05-16T17:00:00Z",
        },
        verification: null,
        revocationDisplay: {
          display_mode: "tombstone",
          public_reason: "event_ended",
        },
      },
      "https://humanity.llc"
    );

    expect(readTrustGroups(vm.capabilities)).toEqual(["card"]);
  });

  it("advertises archive state for Phase A child objects outside time_policy hours", () => {
    const vm = buildScanViewModel(
      "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      "qr_child_status_plate01",
      {
        card: {
          profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
          public_key: "pk",
          handle: "river_example",
          handle_normalized: "river_example",
          manifesto_line: "Studio door\nClosed",
          status: "active",
          card_document_json: "{}",
          created_at: "2026-05-16T17:00:00Z",
          updated_at: "2026-05-16T17:00:00Z",
        },
        qr: {
          qr_id: "qr_child_status_plate01",
          profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
          epoch: 1,
          scope: "child_object",
          print_artifact_id: null,
          object_id: "obj_status_plate_live1",
          resolver_hint: "https://humanity.llc",
          status: "active",
          payload:
            "https://humanity.llc/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_child_status_plate01",
          issued_at: "2026-05-16T17:00:00Z",
          expires_at: null,
          credential_document_json: "{}",
          created_at: "2026-05-16T17:00:00Z",
          updated_at: "2026-05-16T17:00:00Z",
        },
        verification: null,
        revocationDisplay: null,
        childObject: {
          object_id: "obj_status_plate_live1",
          parent_profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
          object_type: "status_plate",
          public_label: "Studio door",
          public_state: "Closed",
          status: "active",
          child_object_document_json: JSON.stringify({
            time_policy: {
              valid_until: "2026-01-01T00:00:00.000Z",
            },
          }),
          created_at: "2026-05-16T17:00:00Z",
          updated_at: "2026-05-16T17:00:00Z",
        },
      },
      "https://humanity.llc",
      new Date("2026-06-15T12:00:00.000Z")
    );

    const archive = buildScanCapabilities(vm).find((c) => c.verb === "archive");
    expect(archive).toMatchObject({ available: true, state: "after" });
  });
});
