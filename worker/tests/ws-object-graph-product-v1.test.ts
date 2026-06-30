/**
 * WS-OBJECT-GRAPH-PRODUCT-V1 — stranger-facing copy on scan graph block only.
 * @see docs/WS_OBJECT_GRAPH_PRODUCT_V1.md
 */
import { describe, expect, it } from "vitest";

import {
  PAYLOAD_TYPES,
  getTestKeypair,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import { renderScanPage } from "../src/resolver/scan-html";
import { renderScanObjectGraphBlock } from "../src/resolver/scan-object-graph-html";
import {
  SCAN_OBJECT_GRAPH_HEADING,
  SCAN_OBJECT_GRAPH_INTRO,
  scanObjectGraphNextStep,
  scanObjectGraphProvenanceLine,
} from "../src/resolver/scan-object-graph-copy";
import { buildScanViewModel } from "../src/resolver/scan-state";
import {
  CR_WITNESS_EDGE_LABEL,
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
const QR = "qr_ws_object_graph_product_v1";
const CABINET = "obj_cr_node_07_cabinet";
const LIBRARY = "obj_cr_node_10_library";

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
      game_meta: { vouch_active_for: vouchActiveFor, scarcity_remaining: 24 },
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

const witnessLive = { ...witnessPending, vouch_active_for: ["node_07"] };

async function signedCrEdge(): Promise<RelationshipEdgeDocument> {
  const operator = await getTestKeypair();
  return (await signDocument(
    withProtocolFields(crWitnessEdgeDocumentUnsigned(PROFILE), PAYLOAD_TYPES.RELATIONSHIP_EDGE),
    operator
  )) as RelationshipEdgeDocument;
}

describe("WS-OBJECT-GRAPH-PRODUCT-V1", () => {
  it("shows network intro and scanner-friendly headings", async () => {
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
    const html = renderScanObjectGraphBlock(vm);

    expect(html).toContain(SCAN_OBJECT_GRAPH_HEADING);
    expect(html).toContain(SCAN_OBJECT_GRAPH_INTRO);
    expect(html).toContain("Before you can open this");
    expect(html).not.toContain("Place in the network");
    expect(html).not.toContain("Required by");
  });

  it("Missing and Live rows include actionable next steps", async () => {
    const edge = await signedCrEdge();
    const pendingRow = {
      edge_id: "edge_cr_witness_10_07",
      kind: "witnesses" as const,
      network_id: "cr_season_01_wake",
      from_object_id: LIBRARY,
      to_object_id: CABINET,
      from_node_id: "node_10",
      to_node_id: "node_07",
      label: CR_WITNESS_EDGE_LABEL,
      status: "active" as const,
      satisfied: false,
      pending_node_ids: ["node_10"],
      satisfied_node_ids: [],
      direction: "incoming" as const,
      role: "required_by" as const,
      rule_source: "signed_edge" as const,
      peer_object_id: LIBRARY,
      peer_public_label: "Library witness",
    };

    expect(scanObjectGraphNextStep(pendingRow)).toBe(
      "Visit Library witness first, then return here."
    );

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
    expect(htmlPending).toContain(
      "Not yet open — visit Library witness first, then return here."
    );

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
    expect(htmlLive).toContain("You're clear — continue here.");

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
    expect(htmlOutgoing).toContain(
      "Your visit here helped open Czech Village cabinet."
    );
  });

  it("names the season operator in plain language", async () => {
    expect(scanObjectGraphProvenanceLine("cedar_rapids_wake")).toContain(
      "published by @cedar_rapids_wake"
    );

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
    expect(html).toContain("@cedar_rapids_wake");
    expect(html).toContain("published by");
    expect(html).not.toContain("(season steward)");
  });
});
