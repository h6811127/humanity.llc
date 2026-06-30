/**
 * WS-OBJECT-GRAPH-V1 verification checklist — scan page only.
 * @see docs/WS_OBJECT_GRAPH_V1.md
 */
import { describe, expect, it } from "vitest";

import {
  PAYLOAD_TYPES,
  getTestKeypair,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import {
  buildMapNodeChips,
  deriveMapNodeSnapshot,
} from "../src/city-game/map-node-snapshot";
import { CR_SEASON_01 } from "../src/city-game/season-config";
import { resolveSeasonWindowPhase } from "../src/city-game/season-window";
import { mapVouchChipValue } from "../src/city-game/witness-gate";
import { renderScanPage } from "../src/resolver/scan-html";
import { renderScanObjectGraphBlock } from "../src/resolver/scan-object-graph-html";
import { buildScanViewModel } from "../src/resolver/scan-state";
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
const STEWARD_HANDLE = "cedar_rapids_wake";
const QR = "qr_ws_object_graph_v1";
const CABINET = "obj_cr_node_07_cabinet";
const LIBRARY = "obj_cr_node_10_library";
const RIVER = "obj_cr_node_04_river";

function cardRow(): CardRow {
  return {
    profile_id: PROFILE,
    public_key: "pk",
    handle: STEWARD_HANDLE,
    handle_normalized: STEWARD_HANDLE,
    manifesto_line: "Wake season",
    status: "active",
    card_document_json: "{}",
    created_at: "2026-06-01T12:00:00.000Z",
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

function cabinetChild(): ChildObjectRow {
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
  };
}

function libraryChild(vouchActiveFor: string[]): ChildObjectRow {
  return {
    object_id: LIBRARY,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: "Library witness",
    public_state: "Sunset pass witness seal",
    status: "active",
    child_object_document_json: JSON.stringify({
      object_id: LIBRARY,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      season_id: "cr_season_01_wake",
      node_role: "witness",
      district: "downtown",
      game_meta: {
        vouch_active_for: vouchActiveFor,
        scarcity_remaining: 24,
      },
    }),
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:00:00.000Z",
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

describe("WS-OBJECT-GRAPH-V1 verify", () => {
  it("real scan page shows graph block with required by / unlocks groups", async () => {
    const edge = await signedCrEdge();
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(CABINET),
        verification: summary(),
        childObject: cabinetChild(),
        revocationDisplay: null,
        gameVouchWitnesses: { node_10: witnessPending },
        witnessRelationshipEdgesIncoming: [edge],
        witnessPeerLabels: { [LIBRARY]: "Library witness" },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    const html = await renderScanPage(vm, "https://humanity.llc");

    expect(html).toContain("scan-object-graph");
    expect(html).toContain("How this place connects");
    expect(html).toContain("Before you can open this");
    expect(html).toContain(CR_WITNESS_EDGE_LABEL);
    expect(html).toContain("Live object details");
    expect(renderScanObjectGraphBlock(vm)).toContain("scan-object-graph");
  });

  it("legacy vouch_requires still works without signed edges", async () => {
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(CABINET),
        verification: summary(),
        childObject: cabinetChild(),
        revocationDisplay: null,
        gameVouchWitnesses: { node_10: witnessPending },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    const html = await renderScanPage(vm, "https://humanity.llc");

    expect(vm.relationships).toEqual([]);
    expect(vm.gameNode?.vouchGate?.met).toBe(false);
    expect(html).not.toContain('id="scan-object-graph-heading"');
    expect(html).not.toContain("How this place connects");
    expect(html).toContain("Vouch pending from node_10");
    expect(html).toContain("scan-game-vouch-note");
    expect(scanStatusBodyFromViewModel(vm).scan.relationships).toBeUndefined();
  });

  it("signed RelationshipEdge takes precedence over cleared vouch_requires", async () => {
    const edge = await signedCrEdge();
    const child = cabinetChild();
    const doc = JSON.parse(child.child_object_document_json) as Record<string, unknown>;
    (doc.game_meta as Record<string, unknown>).vouch_requires = [];
    child.child_object_document_json = JSON.stringify(doc);

    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(CABINET),
        verification: summary(),
        childObject: child,
        revocationDisplay: null,
        gameVouchWitnesses: { node_10: witnessLive },
        witnessRelationshipEdgesIncoming: [edge],
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vm.gameNode?.vouchGate?.met).toBe(true);
    expect(vm.relationships[0]?.satisfied).toBe(true);
    expect(vm.relationships[0]?.rule_source).toBe("signed_edge");
  });

  it("object page names who declares the signed rule", async () => {
    const edge = await signedCrEdge();
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(CABINET),
        verification: summary(),
        childObject: cabinetChild(),
        revocationDisplay: null,
        gameVouchWitnesses: { node_10: witnessPending },
        witnessRelationshipEdgesIncoming: [edge],
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    const body = scanStatusBodyFromViewModel(vm);

    expect(html).toContain(`@${STEWARD_HANDLE}`);
    expect(html).toContain("published by");
    expect(body.scan.relationship_rules).toMatchObject({
      signed: true,
      steward_profile_id: PROFILE,
      network_id: "cr_season_01_wake",
    });
  });

  it("missing and satisfied witness states are understandable on scan page", async () => {
    const edge = await signedCrEdge();

    const vmPending = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(CABINET),
        verification: summary(),
        childObject: cabinetChild(),
        revocationDisplay: null,
        gameVouchWitnesses: { node_10: witnessPending },
        witnessRelationshipEdgesIncoming: [edge],
        witnessPeerLabels: { [LIBRARY]: "Library witness" },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    const htmlPending = await renderScanPage(vmPending, "https://humanity.llc");
    expect(htmlPending).toContain("Missing");
    expect(htmlPending).toContain("Visit Library witness first, then return here.");
    expect(htmlPending).toContain(CR_WITNESS_EDGE_LABEL);

    const vmLive = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(CABINET),
        verification: summary(),
        childObject: cabinetChild(),
        revocationDisplay: null,
        gameVouchWitnesses: { node_10: witnessLive },
        witnessRelationshipEdgesIncoming: [edge],
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    const htmlLive = await renderScanPage(vmLive, "https://humanity.llc");
    expect(htmlLive).toContain("Live");
    expect(vmLive.relationships[0]?.satisfied).toBe(true);

    const vmOutgoing = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(LIBRARY),
        verification: summary(),
        childObject: libraryChild(["node_07"]),
        revocationDisplay: null,
        witnessRelationshipEdgesOutgoing: [edge],
        witnessPeerLabels: { [CABINET]: "Czech Village cabinet" },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    const htmlOutgoing = await renderScanPage(vmOutgoing, "https://humanity.llc");
    expect(htmlOutgoing).toContain("Places you help unlock");
    expect(htmlOutgoing).toContain("Czech Village cabinet");
    expect(vmOutgoing.relationships.some((row) => row.direction === "outgoing")).toBe(
      true
    );
  });

  it("board/map snapshot behavior is unchanged by scan object graph", () => {
    const meta = {
      visible_until: null,
      compromised: false,
      collective_progress: null,
      collective_target: null,
      unlocked_by: ["node_04"],
      vouch_requires: ["node_10"],
      vouch_active_for: [],
      scarcity_remaining: null,
      fragment_id: "czech_1",
    };
    const gatePending = {
      required: ["node_10"],
      satisfied: [],
      pending: ["node_10"],
      met: false,
    };
    const gateLive = {
      required: ["node_10"],
      satisfied: ["node_10"],
      pending: [],
      met: true,
    };

    expect(mapVouchChipValue(meta, gatePending)).toBe("Sealed · needs node_10");
    expect(mapVouchChipValue(meta, gateLive)).toBe("Path open");

    const child = cabinetChild();
    const snap = deriveMapNodeSnapshot({
      child,
      season: CR_SEASON_01,
      env: { CITY_GAME_ENABLED: "1" },
      now: CITY_GAME_SEASON_OPEN_NOW,
      witnessMetaByNodeId: { node_10: witnessPending },
    });
    expect(snap?.vouch_gate?.met).toBe(false);
    const chips = snap
      ? buildMapNodeChips(snap, resolveSeasonWindowPhase(CITY_GAME_SEASON_OPEN_NOW, CR_SEASON_01))
      : [];
    expect(chips.find((chip) => chip.label === "Vouch")?.value).toBe(
      "Sealed · needs node_10"
    );

    const legacyVm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(CABINET),
        verification: summary(),
        childObject: child,
        revocationDisplay: null,
        gameVouchWitnesses: { node_10: witnessPending },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    expect(renderScanObjectGraphBlock(legacyVm)).toBe("");
    expect(legacyVm.relationships).toEqual([]);
  });

  it("signed unlock edge on cabinet replaces Unlocked by chips (OG-2)", async () => {
    const unlockEdge = crUnlockEdgeDocumentUnsigned(PROFILE);
    const child: ChildObjectRow = {
      ...cabinetChild(),
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
    };
    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(CABINET),
        verification: summary(),
        childObject: child,
        revocationDisplay: null,
        witnessRelationshipEdgesIncoming: [unlockEdge],
        witnessPeerLabels: { [RIVER]: "Riverwalk River Lantern" },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );

    expect(vm.relationships[0]).toMatchObject({
      kind: "unlocks",
      satisfied: false,
      label: CR_UNLOCK_EDGE_LABEL,
    });
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("How this place connects");
    expect(html).toContain("Before you can open this");
    expect(html).not.toContain("Unlocked by node_04");
    expect(scanStatusBodyFromViewModel(vm).scan.relationships?.[0]?.kind).toBe(
      "unlocks"
    );
  });

  it("cabinet with witness + unlock signed edges shows dual graph rows (OG-2 multi-edge)", async () => {
    const witnessEdge = crWitnessEdgeDocumentUnsigned(PROFILE);
    const unlockEdge = crUnlockEdgeDocumentUnsigned(PROFILE);
    const child: ChildObjectRow = {
      ...cabinetChild(),
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
    };

    const vm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(CABINET),
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
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect((html.match(/class="scan-object-graph-row/g) ?? []).length).toBe(2);
    expect(html).toContain(CR_WITNESS_EDGE_LABEL);
    expect(html).toContain(CR_UNLOCK_EDGE_LABEL);
    expect(html).not.toContain("Unlocked by");
    expect(html).not.toContain("Vouch pending");
    expect(scanStatusBodyFromViewModel(vm).scan.relationships).toHaveLength(2);
  });
});
