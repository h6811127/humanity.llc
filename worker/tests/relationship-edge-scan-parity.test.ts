import { describe, expect, it } from "vitest";

import {
  PAYLOAD_TYPES,
  getTestKeypair,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import { renderScanPage } from "../src/resolver/scan-html";
import {
  buildScanViewModel,
} from "../src/resolver/scan-state";
import { scanStatusBodyFromViewModel } from "../src/resolver/scan-status";
import {
  CR_UNLOCK_EDGE_LABEL,
  CR_WITNESS_EDGE_LABEL,
  crUnlockEdgeDocumentUnsigned,
  crWitnessEdgeDocumentUnsigned,
  type RelationshipEdgeDocument,
} from "../src/live-object/relationship-edge-spec";
import type {
  CardRow,
  ChildObjectRow,
  QrCredentialRow,
  VerificationSummaryRow,
} from "../src/db/types";
import {
  CITY_GAME_SEASON_OPEN_NOW,
  CITY_GAME_SEASON_ROOT_PROFILE,
} from "./city-game-fixture-profile";

const PROFILE = CITY_GAME_SEASON_ROOT_PROFILE;
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const CABINET = "obj_cr_node_07_cabinet";
const LIBRARY = "obj_cr_node_10_library";
const RIVER = "obj_cr_node_04_river";

function cardRow(): CardRow {
  return {
    profile_id: PROFILE,
    public_key: "pk",
    handle: "cedar_rapids_wake",
    handle_normalized: "cedar_rapids_wake",
    manifesto_line: "Wake season",
    status: "active",
    card_document_json: "{}",
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:00:00.000Z",
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
    issued_at: "2026-06-01T12:00:00.000Z",
    expires_at: "2027-06-01T12:00:00.000Z",
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

function childRow(overrides: Partial<ChildObjectRow> = {}): ChildObjectRow {
  return {
    object_id: CABINET,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: "Czech Village cabinet",
    public_state: "Unlocked together — ask the mural what remembers winter",
    status: "active",
    child_object_document_json: JSON.stringify({
      object_id: CABINET,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      season_id: "cr_season_01_wake",
      node_role: "lore_archive",
      district: "czech_village",
      game_meta: {
        unlocked_by: ["node_04"],
        vouch_requires: ["node_10"],
        fragment_id: "czech_1",
      },
    }),
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:00:00.000Z",
    ...overrides,
  };
}

const witnessPending = {
  visible_until: null,
  compromised: false,
  collective_progress: null,
  collective_target: null,
  unlocked_by: [],
  vouch_requires: [],
  vouch_active_for: [] as string[],
  scarcity_remaining: 25,
  fragment_id: null,
};

const witnessLive = {
  ...witnessPending,
  vouch_active_for: ["node_07"],
  scarcity_remaining: 24,
};

async function signedCrEdge(): Promise<RelationshipEdgeDocument> {
  const operator = await getTestKeypair();
  const unsigned = crWitnessEdgeDocumentUnsigned(PROFILE);
  return (await signDocument(
    withProtocolFields(unsigned, PAYLOAD_TYPES.RELATIONSHIP_EDGE),
    operator
  )) as RelationshipEdgeDocument;
}

describe("relationship-edge scan parity", () => {
  it("legacy vouch_requires path unchanged without signed witness edges", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(),
        verification: summary(),
        childObject: childRow(),
        revocationDisplay: null,
        gameVouchWitnesses: { node_10: witnessPending },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vm.gameNode?.vouchGate?.met).toBe(false);
    expect(vm.relationships).toEqual([]);
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("Vouch pending from node_10");
    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.relationships).toBeUndefined();
  });

  it("signed witness edge produces same scan HTML and exposes relationships[]", async () => {
    const edge = await signedCrEdge();

    const vmPending = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(),
        verification: summary(),
        childObject: childRow(),
        revocationDisplay: null,
        gameVouchWitnesses: { node_10: witnessPending },
        witnessRelationshipEdgesIncoming: [edge],
        witnessPeerLabels: { [LIBRARY]: "Library witness" },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vmPending.gameNode?.vouchGate?.met).toBe(false);
    expect(vmPending.relationships[0]).toMatchObject({
      edge_id: "edge_cr_witness_10_07",
      satisfied: false,
      direction: "incoming",
      role: "required_by",
      rule_source: "signed_edge",
      pending_node_ids: ["node_10"],
    });
    const htmlPending = await renderScanPage(vmPending, "https://humanity.llc");
    expect(htmlPending).toContain("scan-object-graph");
    expect(htmlPending).toContain(CR_WITNESS_EDGE_LABEL);
    expect(htmlPending).toContain("Before you can open this");
    expect(htmlPending).toContain("Missing");
    expect(htmlPending).toContain("@cedar_rapids_wake");
    expect(htmlPending).toContain("published by");
    expect(htmlPending).toContain("Not yet open — visit Library witness first");
    expect(htmlPending).not.toContain("Vouch pending from node_10");
    expect(scanStatusBodyFromViewModel(vmPending).scan.relationships).toHaveLength(1);
    expect(scanStatusBodyFromViewModel(vmPending).scan.relationship_rules?.signed).toBe(
      true
    );

    const vmLive = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(),
        verification: summary(),
        childObject: childRow(),
        revocationDisplay: null,
        gameVouchWitnesses: { node_10: witnessLive },
        witnessRelationshipEdgesIncoming: [edge],
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vmLive.gameNode?.vouchGate?.met).toBe(true);
    expect(vmLive.relationships[0]?.satisfied).toBe(true);
    const htmlLive = await renderScanPage(vmLive, "https://humanity.llc");
    expect(htmlLive).toContain("scan-object-graph");
    expect(htmlLive).toContain("Live");
    expect(htmlLive).not.toContain("Witness vouch live · node_10");
    expect(scanStatusBodyFromViewModel(vmLive).scan.relationships?.[0]?.satisfied).toBe(
      true
    );
  });

  it("signed unlock edge suppresses legacy Unlocked by chips (OG-2)", async () => {
    const unlockEdge = crUnlockEdgeDocumentUnsigned(PROFILE);

    const vmPending = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(),
        verification: summary(),
        childObject: childRow({
          child_object_document_json: JSON.stringify({
            object_id: CABINET,
            parent_profile_id: PROFILE,
            object_type: "game_node",
            season_id: "cr_season_01_wake",
            node_role: "lore_archive",
            district: "czech_village",
            game_meta: {
              unlocked_by: [],
              vouch_requires: ["node_10"],
              fragment_id: "czech_1",
            },
          }),
        }),
        revocationDisplay: null,
        witnessRelationshipEdgesIncoming: [unlockEdge],
        witnessPeerLabels: { [RIVER]: "Riverwalk River Lantern" },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vmPending.relationships[0]).toMatchObject({
      kind: "unlocks",
      direction: "incoming",
      role: "required_by",
      satisfied: false,
      edge_id: "edge_cr_unlock_04_07",
    });
    const htmlPending = await renderScanPage(vmPending, "https://humanity.llc");
    expect(htmlPending).toContain("scan-object-graph");
    expect(htmlPending).toContain(CR_UNLOCK_EDGE_LABEL);
    expect(htmlPending).toContain("Before you can open this");
    expect(htmlPending).not.toContain("Unlocked by node_04");

    const vmLive = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(),
        verification: summary(),
        childObject: childRow(),
        revocationDisplay: null,
        witnessRelationshipEdgesIncoming: [unlockEdge],
        witnessPeerLabels: { [RIVER]: "Riverwalk River Lantern" },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    expect(vmLive.relationships[0]?.satisfied).toBe(true);
    const htmlLive = await renderScanPage(vmLive, "https://humanity.llc");
    expect(htmlLive).toContain("Live");
    expect(htmlLive).not.toContain("Unlocked by node_04");
    expect(scanStatusBodyFromViewModel(vmLive).scan.relationships?.[0]?.kind).toBe(
      "unlocks"
    );
  });

  it("signed unlock only keeps legacy vouch chips until witness edge is signed", async () => {
    const unlockEdge = crUnlockEdgeDocumentUnsigned(PROFILE);
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(),
        verification: summary(),
        childObject: childRow({
          child_object_document_json: JSON.stringify({
            object_id: CABINET,
            parent_profile_id: PROFILE,
            object_type: "game_node",
            season_id: "cr_season_01_wake",
            node_role: "lore_archive",
            district: "czech_village",
            game_meta: {
              unlocked_by: [],
              vouch_requires: ["node_10"],
              fragment_id: "czech_1",
            },
          }),
        }),
        revocationDisplay: null,
        gameVouchWitnesses: { node_10: witnessPending },
        witnessRelationshipEdgesIncoming: [unlockEdge],
        witnessPeerLabels: { [RIVER]: "Riverwalk River Lantern" },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).not.toContain("Unlocked by node_04");
    expect(html).toContain("Vouch pending from node_10");
  });

  it("signed witness + unlock edges compose dual required_by rows (OG-2 multi-edge)", async () => {
    const witnessEdge = crWitnessEdgeDocumentUnsigned(PROFILE);
    const unlockEdge = crUnlockEdgeDocumentUnsigned(PROFILE);
    const child = childRow({
      child_object_document_json: JSON.stringify({
        object_id: CABINET,
        parent_profile_id: PROFILE,
        object_type: "game_node",
        season_id: "cr_season_01_wake",
        node_role: "lore_archive",
        district: "czech_village",
        game_meta: {
          unlocked_by: [],
          vouch_requires: ["node_10"],
          fragment_id: "czech_1",
        },
      }),
    });

    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(),
        verification: summary(),
        childObject: child,
        revocationDisplay: null,
        gameVouchWitnesses: { node_10: witnessPending },
        witnessRelationshipEdgesIncoming: [witnessEdge, unlockEdge],
        witnessPeerLabels: {
          [LIBRARY]: "Library witness",
          [RIVER]: "Riverwalk River Lantern",
        },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vm.relationships).toHaveLength(2);
    expect(vm.relationships.map((row) => row.kind)).toEqual(["witnesses", "unlocks"]);
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("Before you can open this");
    expect(html).toContain(CR_WITNESS_EDGE_LABEL);
    expect(html).toContain(CR_UNLOCK_EDGE_LABEL);
    expect(html).not.toContain("Vouch pending from node_10");
    expect(html).not.toContain("Unlocked by node_04");
    expect(html).toContain("Not yet open — visit Library witness first");
  });

  it("uses edge path even when vouch_requires cleared on target meta", () => {
    const child = childRow({
      child_object_document_json: JSON.stringify({
        object_id: CABINET,
        parent_profile_id: PROFILE,
        object_type: "game_node",
        season_id: "cr_season_01_wake",
        node_role: "lore_archive",
        district: "czech_village",
        game_meta: {
          unlocked_by: ["node_04"],
          vouch_requires: [],
          fragment_id: "czech_1",
        },
      }),
    });

    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(),
        verification: summary(),
        childObject: child,
        revocationDisplay: null,
        gameVouchWitnesses: { node_10: witnessPending },
        witnessRelationshipEdgesIncoming: [
          {
            ...crWitnessEdgeDocumentUnsigned(PROFILE),
          },
        ],
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vm.gameNode?.vouchGate?.required).toEqual(["node_10"]);
    expect(vm.gameNode?.vouchGate?.met).toBe(false);
  });
});
