import { describe, expect, it } from "vitest";

import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";
import {
  GAME_NODE_FORBIDDEN_COPY,
  GAME_NODE_SCAN_FOOT,
  GAME_NODE_SCAN_PRIVACY_NOTE,
  gameNodeCoopHint,
  isCareStreamPaused,
  resolveGameNodeScanContext,
} from "../src/city-game/scan-view";
import type { CardRow, ChildObjectRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const OBJECT_ID = "obj_cr_node_01_newbo";

function childDocument(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    object_id: OBJECT_ID,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: "NewBo relay arch",
    public_state: "Red team holds the relay",
    status: "active",
    season_id: "cr_season_01_wake",
    node_role: "relay_gate",
    district: "newbo",
    object_streams: [
      { id: "territory", class: "place", label: "Controller", value: "Red team" },
      { id: "relay", class: "route", label: "Relay status", value: "Open · 18 min" },
      { id: "bulletin", class: "narrative", label: "Bulletin", value: "Shift west" },
      { id: "care", class: "care", label: "Site", value: "Clear" },
    ],
    game_meta: {
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
    public_label: "NewBo relay arch",
    public_state: "Red team holds the relay",
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

describe("city game scan view", () => {
  it("renders Cedar Rapids-style hero when CITY_GAME_ENABLED", async () => {
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
      new Date("2026-06-01T18:00:00.000Z"),
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vm.gameNode?.mode).toBe("game");
    expect(vm.gameNode?.roleEyebrow).toContain("NewBo");

    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("NewBo relay arch");
    expect(html).toContain("Controller");
    expect(html).toContain("Red team");
    expect(html).toContain(GAME_NODE_SCAN_FOOT);
    expect(html).toContain(GAME_NODE_SCAN_PRIVACY_NOTE);
    expect(html).toContain("scan-game-privacy-note");
    expect(html).toContain("scan-game-coop-hint");
  });

  it("falls back to status plate layout when city game flag is off", () => {
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
      new Date("2026-06-01T18:00:00.000Z"),
      { env: { CITY_GAME_ENABLED: "0" } }
    );

    expect(vm.gameNode?.mode).toBe("fallback");
  });

  it("mutes game hero for care pause on maintenance stream", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(),
        verification: summary(),
        childObject: childRow({
          child_object_document_json: childDocument({
            object_streams: [
              { id: "territory", class: "place", label: "Controller", value: "Red team" },
              { id: "relay", class: "route", label: "Relay status", value: "Open" },
              { id: "bulletin", class: "narrative", label: "Bulletin", value: "Shift west" },
              { id: "care", class: "care", label: "Site", value: "Maintenance pause" },
            ],
          }),
        }),
        revocationDisplay: null,
      },
      "https://humanity.llc",
      new Date("2026-06-01T18:00:00.000Z"),
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vm.gameNode?.mode).toBe("care_pause");
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("scan-game-care-note");
  });

  it("never renders forbidden scoreboard copy in scan hero", async () => {
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
      new Date("2026-06-01T18:00:00.000Z"),
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html;
    const hero = main.toLowerCase();
    for (const forbidden of GAME_NODE_FORBIDDEN_COPY) {
      if (forbidden.includes(" ")) {
        expect(hero).not.toContain(forbidden);
        continue;
      }
      expect(hero).not.toMatch(new RegExp(`\\b${forbidden}\\b`));
    }
  });

  it("renders site-code contribute block on temp_drop quorum nodes", async () => {
    const riverObject = "obj_cr_node_04_river";
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: { ...qrRow(), object_id: riverObject },
        verification: summary(),
        childObject: childRow({
          object_id: riverObject,
          public_label: "Riverwalk River Lantern",
          child_object_document_json: childDocument({
            object_id: riverObject,
            node_role: "temp_drop",
            district: "river_spine",
            public_state: "Seed clue live",
            object_streams: [
              { id: "relay", class: "route", label: "Collective", value: "4 / 20" },
              { id: "care", class: "care", label: "Trail", value: "Open" },
            ],
            game_meta: {
              visible_until: "2026-06-14T22:00:00-05:00",
              collective_progress: 4,
              collective_target: 20,
            },
          }),
        }),
        revocationDisplay: null,
      },
      "https://humanity.llc",
      new Date("2026-06-01T18:00:00.000Z"),
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vm.gameNode?.showsContribute).toBe(true);
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain('data-game-contribute="1"');
    expect(html).toContain("scan-game-contribute");
    expect(html).toContain("Contribute to quorum");
    expect(html).toContain("scan-game-contribute.mjs?v=1");
  });

  it("detects care pause and cooperative hints", () => {
    expect(
      isCareStreamPaused([
        { id: "care", class: "care", label: "Site", value: "Maintenance pause" },
      ])
    ).toBe(true);
    expect(
      gameNodeCoopHint("temp_drop", {
        visible_until: null,
        compromised: false,
        collective_progress: 4,
        collective_target: 20,
        unlocked_by: [],
        vouch_requires: [],
        scarcity_remaining: null,
        fragment_id: null,
      })
    ).toContain("together");
    const ctx = resolveGameNodeScanContext({
      objectType: "game_node",
      documentJson: childDocument({ node_role: "sanctuary" }),
      objectStreams: [],
      env: { CITY_GAME_ENABLED: "1" },
    });
    expect(ctx?.coopHint).toContain("sanctuary");
  });

  it("shows vouch pending on cabinet until library witness vouches", async () => {
    const cabinetObject = "obj_cr_node_07_cabinet";
    const vmPending = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: { ...qrRow(), object_id: cabinetObject },
        verification: summary(),
        childObject: childRow({
          object_id: cabinetObject,
          public_label: "Czech Village cabinet",
          public_state: "Unlocked together — ask the mural what remembers winter",
          child_object_document_json: childDocument({
            object_id: cabinetObject,
            node_role: "lore_archive",
            district: "czech_village",
            game_meta: {
              unlocked_by: ["node_04"],
              vouch_requires: ["node_10"],
              fragment_id: "czech_1",
            },
          }),
        }),
        revocationDisplay: null,
        gameVouchWitnesses: {
          node_10: {
            visible_until: null,
            compromised: false,
            collective_progress: null,
            collective_target: null,
            unlocked_by: [],
            vouch_requires: [],
            vouch_active_for: [],
            scarcity_remaining: 25,
            fragment_id: null,
          },
        },
      },
      "https://humanity.llc",
      new Date("2026-06-01T18:00:00.000Z"),
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vmPending.gameNode?.vouchGate?.met).toBe(false);
    const htmlPending = await renderScanPage(vmPending, "https://humanity.llc");
    expect(htmlPending).toContain("Vouch pending from node_10");
    expect(htmlPending).toContain("scan-game-vouch-note");

    const vmLive = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: { ...qrRow(), object_id: cabinetObject },
        verification: summary(),
        childObject: childRow({
          object_id: cabinetObject,
          public_label: "Czech Village cabinet",
          public_state: "Unlocked together — ask the mural what remembers winter",
          child_object_document_json: childDocument({
            object_id: cabinetObject,
            node_role: "lore_archive",
            district: "czech_village",
            game_meta: {
              unlocked_by: ["node_04"],
              vouch_requires: ["node_10"],
              fragment_id: "czech_1",
            },
          }),
        }),
        revocationDisplay: null,
        gameVouchWitnesses: {
          node_10: {
            visible_until: null,
            compromised: false,
            collective_progress: null,
            collective_target: null,
            unlocked_by: [],
            vouch_requires: [],
            vouch_active_for: ["node_07"],
            scarcity_remaining: 24,
            fragment_id: null,
          },
        },
      },
      "https://humanity.llc",
      new Date("2026-06-01T18:00:00.000Z"),
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vmLive.gameNode?.vouchGate?.met).toBe(true);
    const htmlLive = await renderScanPage(vmLive, "https://humanity.llc");
    expect(htmlLive).toContain("Witness vouch live · node_10");
    expect(htmlLive).not.toContain("Vouch pending from node_10");
  });

  it("renders sunset pass contribute on library witness and dormant at zero", async () => {
    const witnessObject = "obj_cr_node_10_library";
    const vmOpen = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: { ...qrRow(), object_id: witnessObject },
        verification: summary(),
        childObject: childRow({
          object_id: witnessObject,
          public_label: "Library witness seal",
          child_object_document_json: childDocument({
            object_id: witnessObject,
            node_role: "witness",
            district: "downtown",
            game_meta: { scarcity_remaining: 11 },
            object_streams: [
              { id: "relay", class: "route", label: "Passes", value: "11 sunset passes remain" },
            ],
          }),
        }),
        revocationDisplay: null,
      },
      "https://humanity.llc",
      new Date("2026-06-01T18:00:00.000Z"),
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vmOpen.gameNode?.contributeMode).toBe("scarcity");
    const htmlOpen = await renderScanPage(vmOpen, "https://humanity.llc");
    expect(htmlOpen).toContain("Claim sunset pass");
    expect(htmlOpen).toContain('data-game-contribute-mode="scarcity"');

    const vmClosed = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: { ...qrRow(), object_id: witnessObject },
        verification: summary(),
        childObject: childRow({
          object_id: witnessObject,
          public_label: "Library witness seal",
          public_state: "Witness seal closed for the night",
          child_object_document_json: childDocument({
            object_id: witnessObject,
            node_role: "witness",
            district: "downtown",
            game_meta: { scarcity_remaining: 0 },
          }),
        }),
        revocationDisplay: null,
      },
      "https://humanity.llc",
      new Date("2026-06-01T18:00:00.000Z"),
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vmClosed.gameNode?.mode).toBe("dormant");
    expect(vmClosed.gameNode?.showsContribute).toBe(false);
  });

  it("mutes game progression before and after the season window", async () => {
    const seasonWindow = {
      status: "planned",
      window: {
        starts_at: "2026-06-06T18:00:00-05:00",
        ends_at: "2026-06-08T22:00:00-05:00",
      },
    };
    const opts = {
      env: { CITY_GAME_ENABLED: "1" as const },
      seasonForWindow: seasonWindow,
    };

    const vmBefore = buildScanViewModel(
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
      new Date("2026-06-06T12:00:00-05:00"),
      opts
    );
    expect(vmBefore.gameNode?.mode).toBe("dormant");
    expect(vmBefore.gameNode?.seasonWindowPhase).toBe("before");
    const htmlBefore = await renderScanPage(vmBefore, "https://humanity.llc");
    expect(htmlBefore).toContain("Season not open yet");
    expect(htmlBefore).not.toContain("Contribute to quorum");

    const vmAfter = buildScanViewModel(
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
      new Date("2026-06-09T08:00:00-05:00"),
      opts
    );
    expect(vmAfter.gameNode?.seasonWindowPhase).toBe("after");
    const htmlAfter = await renderScanPage(vmAfter, "https://humanity.llc");
    expect(htmlAfter).toContain("Season ended");
  });
});
