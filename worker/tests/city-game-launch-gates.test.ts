import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { renderScanPage } from "../src/resolver/scan-html";
import {
  buildScanViewModel,
  httpStatusForScanKind,
} from "../src/resolver/scan-state";
import type { CardRow, ChildObjectRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const RIVER_OBJECT = "obj_cr_node_04_river";
const BRIDGE_OBJECT = "obj_cr_node_05_bridge";

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

function qrRow(objectId: string): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "child_object",
    print_artifact_id: null,
    object_id: objectId,
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

function riverChildDocument(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    object_id: RIVER_OBJECT,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: "Riverwalk River Lantern",
    public_state: "Seed clue live",
    status: "active",
    season_id: "cr_season_01_wake",
    node_role: "temp_drop",
    district: "river_spine",
    object_streams: [
      { id: "territory", class: "place", label: "Object", value: "Temp drop" },
      { id: "relay", class: "route", label: "Collective", value: "20 / 20" },
      { id: "bulletin", class: "narrative", label: "Clue", value: "Lantern woke" },
      { id: "care", class: "care", label: "Trail", value: "Open" },
    ],
    game_meta: {
      visible_until: "2026-06-10T22:00:00-05:00",
      compromised: false,
      collective_progress: 20,
      collective_target: 20,
      unlocked_by: [],
      vouch_requires: [],
      scarcity_remaining: null,
      fragment_id: null,
    },
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:05:00.000Z",
    ...overrides,
  });
}

function bridgeChildDocument() {
  return JSON.stringify({
    object_id: BRIDGE_OBJECT,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: "16th Avenue bridge",
    public_state: "Relay poisoned — compromised",
    status: "active",
    season_id: "cr_season_01_wake",
    node_role: "relay_gate",
    district: "river_spine",
    object_streams: [
      { id: "territory", class: "place", label: "Controller", value: "Neutral" },
      { id: "relay", class: "route", label: "Relay status", value: "Poisoned" },
      { id: "bulletin", class: "narrative", label: "Bulletin", value: "Do not trust" },
      { id: "care", class: "care", label: "Bridge", value: "Open · not a safety cert" },
    ],
    game_meta: {
      visible_until: null,
      compromised: true,
      collective_progress: null,
      collective_target: null,
      unlocked_by: [],
      vouch_requires: [],
      scarcity_remaining: null,
      fragment_id: null,
    },
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:05:00.000Z",
  });
}

describe("city game launch gates", () => {
  it("temp drop past visible_until shows dormant copy but stays HTTP 200", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(RIVER_OBJECT),
        verification: summary(),
        childObject: {
          object_id: RIVER_OBJECT,
          parent_profile_id: PROFILE,
          object_type: "game_node",
          public_label: "Riverwalk River Lantern",
          public_state: "Seed clue live",
          status: "active",
          child_object_document_json: riverChildDocument(),
          created_at: "2026-06-01T12:00:00.000Z",
          updated_at: "2026-06-01T12:05:00.000Z",
        },
        revocationDisplay: null,
      },
      "https://humanity.llc",
      new Date("2026-06-15T12:00:00.000Z"),
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vm.kind).toBe("active");
    expect(httpStatusForScanKind(vm.kind)).toBe(200);
    expect(vm.gameNode?.mode).toBe("dormant");

    const html = await renderScanPage(vm, "https://humanity.llc");
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html;
    expect(main).toContain("scan-game-dormant-note");
    expect(main).toContain("Riverwalk River Lantern");
    expect(main).not.toMatch(/class="scan-game-coop-hint"/);
  });

  it("revoked compromised game_node shows unavailable truth, not game bulletins", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(BRIDGE_OBJECT),
        verification: summary(),
        childObject: {
          object_id: BRIDGE_OBJECT,
          parent_profile_id: PROFILE,
          object_type: "game_node",
          public_label: "16th Avenue bridge",
          public_state: "Relay poisoned — compromised",
          status: "disabled",
          child_object_document_json: bridgeChildDocument(),
          created_at: "2026-06-01T12:00:00.000Z",
          updated_at: "2026-06-01T12:10:00.000Z",
        },
        revocationDisplay: null,
      },
      "https://humanity.llc",
      new Date("2026-06-01T18:00:00.000Z"),
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vm.kind).toBe("qr_revoked");
    expect(vm.primaryBadge.label).toBe("Object unavailable");
    expect(vm.gameNode).toBeNull();

    const html = await renderScanPage(vm, "https://humanity.llc");
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html;
    expect(main).toContain("This QR is no longer valid");
    expect(main).not.toContain("Poisoned");
    expect(main).not.toMatch(/class="scan-game-chips"/);
  });

  it("every season node template includes a care stream row", async () => {
    const { buildAllGameNodeTemplates } = await import(
      "../scripts/city-game-node-defaults.mjs"
    );
    const templates = buildAllGameNodeTemplates(season.nodes, season.season_id);
    for (const node of templates) {
      const care = node.object_streams.find(
        (s: { class: string; id: string }) => s.class === "care" || s.id === "care"
      );
      expect(care, `${node.node_id} missing care stream`).toBeTruthy();
    }
    const fountain = templates.find(
      (n: { node_id: string }) => n.node_id === "node_14"
    );
    expect(String(fountain?.object_streams.find((s: { id: string }) => s.id === "care")?.value)).toMatch(
      /safety|certify/i
    );
  });
});
