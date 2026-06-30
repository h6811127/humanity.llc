/**
 * Writes dev HTML fixtures for WS-OBJECT-GRAPH-V1 manual review / screenshots.
 *
 *   npm run ws-object-graph:v1-kit
 *
 * Open with pages:dev:
 *   http://127.0.0.1:8788/dev/ws-object-graph-v1/cabinet-pending.html
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  PAYLOAD_TYPES,
  getTestKeypair,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";
import {
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

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "site/dev/ws-object-graph-v1");

const PROFILE = CITY_GAME_SEASON_ROOT_PROFILE;
const QR = "qr_ws_object_graph_kit";
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

function cabinetChild(unlockedBy: string[] = ["node_04"]): ChildObjectRow {
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
        unlocked_by: unlockedBy,
        vouch_requires: ["node_10"],
        fragment_id: "czech_1",
      },
    }),
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:00:00.000Z",
  };
}

function riverChild(): ChildObjectRow {
  return {
    object_id: RIVER,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: "Riverwalk River Lantern",
    public_state: "Collective light — contribute together",
    status: "active",
    child_object_document_json: JSON.stringify({
      object_id: RIVER,
      parent_profile_id: PROFILE,
      object_type: "game_node",
      season_id: "cr_season_01_wake",
      node_role: "quorum",
      district: "riverwalk",
      game_meta: {
        unlocked_by: [],
        vouch_requires: [],
        collective_progress: 12,
        collective_target: 20,
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

async function signedCrWitnessEdge(): Promise<RelationshipEdgeDocument> {
  const operator = await getTestKeypair();
  return (await signDocument(
    withProtocolFields(crWitnessEdgeDocumentUnsigned(PROFILE), PAYLOAD_TYPES.RELATIONSHIP_EDGE),
    operator
  )) as RelationshipEdgeDocument;
}

async function signedCrUnlockEdge(): Promise<RelationshipEdgeDocument> {
  const operator = await getTestKeypair();
  return (await signDocument(
    withProtocolFields(crUnlockEdgeDocumentUnsigned(PROFILE), PAYLOAD_TYPES.RELATIONSHIP_EDGE),
    operator
  )) as RelationshipEdgeDocument;
}

/** Expand graph block for PRODUCT-V1 screenshot captures (no live-check animation). */
function productScreenshotHtml(fullHtml: string, theme?: "dark"): string {
  let html = fullHtml
    .replace("scan-live-check--pending", "scan-live-check--ready")
    .replace(
      '<details class="scan-game-state-details',
      '<details open class="scan-game-state-details'
    )
    .replaceAll("scan-arrive-item scan-arrive-item--hidden", "scan-arrive-item");
  if (theme === "dark") {
    html = html.replace('<html lang="en">', '<html lang="en" data-theme="dark">');
  }
  return html;
}

describe("ws-object-graph-v1-kit", () => {
  it("writes dev HTML fixtures under site/dev/ws-object-graph-v1/", async () => {
    mkdirSync(outDir, { recursive: true });
    const edge = await signedCrWitnessEdge();
    const unlockEdge = await signedCrUnlockEdge();

    const fixtures: Array<{ name: string; html: string }> = [];

    const pendingVm = buildScanViewModel(
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
    fixtures.push({
      name: "cabinet-pending",
      html: await renderScanPage(pendingVm, "https://humanity.llc"),
    });

    const liveVm = buildScanViewModel(
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
        witnessPeerLabels: { [LIBRARY]: "Library witness" },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    fixtures.push({
      name: "cabinet-live",
      html: await renderScanPage(liveVm, "https://humanity.llc"),
    });

    const legacyVm = buildScanViewModel(
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
    fixtures.push({
      name: "cabinet-legacy-vouch",
      html: await renderScanPage(legacyVm, "https://humanity.llc"),
    });

    const outgoingVm = buildScanViewModel(
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
    fixtures.push({
      name: "library-unlocks-live",
      html: await renderScanPage(outgoingVm, "https://humanity.llc"),
    });

    const LONG_PEER =
      "Czech Village Historical Society Memorial Reading Room Witness Station";
    const longPeerVm = buildScanViewModel(
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
        witnessPeerLabels: { [LIBRARY]: LONG_PEER },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    fixtures.push({
      name: "cabinet-long-peer",
      html: await renderScanPage(longPeerVm, "https://humanity.llc"),
    });

    const missingPeerVm = buildScanViewModel(
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
    fixtures.push({
      name: "cabinet-missing-peer",
      html: await renderScanPage(missingPeerVm, "https://humanity.llc"),
    });

    const quorumPendingVm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(CABINET),
        verification: summary(),
        childObject: cabinetChild([]),
        revocationDisplay: null,
        witnessRelationshipEdgesIncoming: [unlockEdge],
        witnessPeerLabels: { [RIVER]: "Riverwalk River Lantern" },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    fixtures.push({
      name: "cabinet-quorum-pending",
      html: await renderScanPage(quorumPendingVm, "https://humanity.llc"),
    });

    const riverUnlocksVm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(RIVER),
        verification: summary(),
        childObject: riverChild(),
        revocationDisplay: null,
        witnessRelationshipEdgesOutgoing: [unlockEdge],
        witnessPeerLabels: { [CABINET]: "Czech Village cabinet" },
        relationshipPeerGameMeta: {
          [CABINET]: {
            visible_until: null,
            compromised: false,
            collective_progress: null,
            collective_target: null,
            unlocked_by: ["node_04"],
            vouch_requires: ["node_10"],
            vouch_active_for: [],
            scarcity_remaining: null,
            fragment_id: "czech_1",
          },
        },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    fixtures.push({
      name: "river-unlocks-live",
      html: await renderScanPage(riverUnlocksVm, "https://humanity.llc"),
    });

    const dualGateVm = buildScanViewModel(
      PROFILE,
      QR,
      {
        card: cardRow(),
        qr: qrRow(CABINET),
        verification: summary(),
        childObject: cabinetChild([]),
        revocationDisplay: null,
        gameVouchWitnesses: { node_10: witnessPending },
        witnessRelationshipEdgesIncoming: [edge, unlockEdge],
        witnessPeerLabels: {
          [LIBRARY]: "Library witness",
          [RIVER]: "Riverwalk River Lantern",
        },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    fixtures.push({
      name: "cabinet-dual-gate-pending",
      html: await renderScanPage(dualGateVm, "https://humanity.llc"),
    });

    const indexLinks = fixtures
      .map(
        (fixture) =>
          `<li><a href="./${fixture.name}.html">${fixture.name}</a></li>`
      )
      .join("\n");

    writeFileSync(
      join(outDir, "index.html"),
      `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>WS-OBJECT-GRAPH-V1 fixtures</title></head>
<body><h1>WS-OBJECT-GRAPH scan fixtures</h1><p>PRODUCT-V1 copy — expand Live object details for graph block.</p><ul>${indexLinks}</ul></body></html>`
    );

    for (const fixture of fixtures) {
      writeFileSync(join(outDir, `${fixture.name}.html`), fixture.html);
      const productHtml = productScreenshotHtml(fixture.html);
      writeFileSync(join(outDir, `${fixture.name}-product.html`), productHtml);
      if (fixture.name === "cabinet-pending") {
        writeFileSync(
          join(outDir, `${fixture.name}-dark-product.html`),
          productScreenshotHtml(fixture.html, "dark")
        );
      }
      expect(fixture.html.length).toBeGreaterThan(1000);
    }
  });
});
