import { describe, expect, it } from "vitest";

import { renderScanPage } from "../src/resolver/scan-html";
import { composeScanTrustContext } from "../src/resolver/scan-trust-compose";
import { buildScanViewModel } from "../src/resolver/scan-state";
import { defaultSeason } from "../src/city-game/season-loader";
import { SCAN_LIMITS_DISCLOSURE_TITLE } from "../../site/js/device-ownership-copy-core.mjs";
import type { CardRow, ChildObjectRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";

import { CITY_GAME_SEASON_ROOT_PROFILE } from "./city-game-fixture-profile";

const PROFILE = CITY_GAME_SEASON_ROOT_PROFILE;
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const OBJECT_ID = "obj_cr_node_04_river";
const SEASON_OPEN_NOW = new Date("2026-06-07T00:00:00-05:00");

function childDocument(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    object_id: OBJECT_ID,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: "Riverwalk River Lantern",
    public_state: "Collective unlock in progress",
    status: "active",
    season_id: "cr_season_01_wake",
    node_role: "temp_drop",
    district: "river_spine",
    object_streams: [
      { id: "territory", class: "place", label: "Lantern", value: "Waking" },
      { id: "relay", class: "route", label: "Quorum", value: "Open" },
      { id: "bulletin", class: "narrative", label: "Bulletin", value: "Share outward" },
      { id: "care", class: "care", label: "Site", value: "Clear" },
    ],
    game_meta: {
      visible_until: null,
      compromised: false,
      collective_progress: 8,
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
  });
}

function cardRow(): CardRow {
  return {
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
}

function childRow(overrides: Partial<ChildObjectRow> = {}): ChildObjectRow {
  return {
    object_id: OBJECT_ID,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: "Riverwalk River Lantern",
    public_state: "Collective unlock in progress",
    status: "active",
    child_object_document_json: childDocument(),
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:05:00.000Z",
    ...overrides,
  };
}

function qrRow(): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "child_object",
    print_artifact_id: null,
    object_id: OBJECT_ID,
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
    issued_at: "2026-06-01T12:00:00.000Z",
    expires_at: null,
    credential_document_json: "{}",
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:00:00.000Z",
  };
}

function summary(): VerificationSummaryRow {
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
    updated_at: "2026-06-01T12:00:00.000Z",
  };
}

describe("scan trust network (WS-REALITY)", () => {
  it("composes charter fragment and signer rows for game node", () => {
    const season = defaultSeason();
    const trust = composeScanTrustContext({
      gameNode: {
        enabled: true,
        mode: "game",
        seasonId: "cr_season_01_wake",
        nodeId: "node_04",
        nodeRole: "temp_drop",
        district: "river_spine",
        gameMeta: {
          visible_until: null,
          compromised: false,
          collective_progress: 8,
          collective_target: 20,
          unlocked_by: [],
          vouch_requires: [],
          vouch_active_for: [],
          scarcity_remaining: null,
          fragment_id: null,
        },
        coopHint: null,
        showsPledge: false,
        pledgeFaction: null,
        roleEyebrow: "River spine · Temp drop",
        showsContribute: true,
        contributeMode: "collective",
        contributeSiteCodePlaceholder: "RIVER-04",
        vouchGate: null,
        seasonWindowPhase: "open",
      },
      childObjectType: "game_node",
      objectStreams: [
        { id: "bulletin", class: "narrative", label: "Bulletin", value: "Share outward" },
        { id: "care", class: "care", label: "Site", value: "Clear" },
      ],
      season,
      streamPolicyPhase: "game_scheduled",
    });

    expect(trust).not.toBeNull();
    expect(trust!.charterFragment.operatorLine).toContain("reference operator");
    expect(trust!.charterFragment.pointerLesson).toContain("Collective unlock");
    expect(trust!.signedBy.some((row) => row.stream === "Game")).toBe(true);
    expect(trust!.signedBy.some((row) => row.stream === "Care")).toBe(true);
    expect(trust!.proves.some((line) => line.includes("Collective progress"))).toBe(true);
    expect(trust!.doesNotProve.some((line) => line.includes("people trail"))).toBe(true);
  });

  it("uses care-pause trust proof instead of game bulletin claims", () => {
    const season = defaultSeason();
    const trust = composeScanTrustContext({
      gameNode: {
        enabled: true,
        mode: "game",
        seasonId: "cr_season_01_wake",
        nodeId: "node_14",
        nodeRole: "care_loop",
        district: "downtown",
        gameMeta: {
          visible_until: null,
          compromised: false,
          collective_progress: null,
          collective_target: null,
          unlocked_by: [],
          vouch_requires: [],
          vouch_active_for: [],
          scarcity_remaining: null,
          fragment_id: null,
        },
        coopHint: null,
        showsPledge: false,
        pledgeFaction: null,
        roleEyebrow: "Downtown · Care loop",
        showsContribute: false,
        contributeMode: null,
        contributeSiteCodePlaceholder: null,
        vouchGate: null,
        seasonWindowPhase: "open",
      },
      childObjectType: "game_node",
      objectStreams: [
        { id: "bulletin", class: "narrative", label: "Bulletin", value: "Game copy muted" },
        { id: "care", class: "care", label: "Maintenance", value: "Closed for repair" },
      ],
      season,
      streamPolicyPhase: "care_pause",
    });

    expect(trust).not.toBeNull();
    expect(trust!.proves.some((line) => line.includes("Care stream wins"))).toBe(true);
    expect(trust!.proves.some((line) => line.includes("Signed game bulletins"))).toBe(false);
    expect(trust!.signedBy.some((row) => row.stream === "Game")).toBe(true);
    expect(trust!.signedBy.some((row) => row.stream === "Care")).toBe(true);
  });

  it("renders four trust modules on game node scan HTML", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(),
        verification: summary(),
        childObject: childRow(),
        revocationDisplay: null,
      },
      "https://humanity.llc",
      SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vm.scanTrust).not.toBeNull();

    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("scan-trust-network");
    expect(html).toContain('class="scan-proves"');
    expect(html).toContain('class="scan-does-not-prove"');
    expect(html).toContain(SCAN_LIMITS_DISCLOSURE_TITLE);
    expect(html).toContain('class="scan-signed-by"');
    expect(html).toContain("Who may sign what you see");
    expect(html).toContain('class="scan-charter-fragment"');
    expect(html).toContain("Network rule at this pointer");
    expect(html).toContain("reference operator");
    expect(html).toContain("Collective unlock");
    expect(html).toContain("Full network charter");
    expect(html).toContain("/play/cedar-rapids/");
    expect(html).toContain("shared board truth");
    expect(html).toContain("not a people trail");

    const networkIdx = html.indexOf("scan-trust-network");
    const detailsIdx = html.indexOf('<details class="scan-game-trust-details"');
    expect(networkIdx).toBeGreaterThan(-1);
    expect(detailsIdx).toBeGreaterThan(networkIdx);
  });
});
