/**
 * WS-OBJECT-GRAPH-LAUNCH-V1 — public ship readiness for scan object graph.
 * @see docs/WS_OBJECT_GRAPH_LAUNCH_V1.md
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PAYLOAD_TYPES,
  getTestKeypair,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import { renderScanPage } from "../src/resolver/scan-html";
import { renderScanObjectGraphBlock } from "../src/resolver/scan-object-graph-html";
import {
  scanObjectGraphPeerLabel,
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

const repoRoot = path.join(fileURLToPath(new URL("../..", import.meta.url)));
const scanPassCss = fs.readFileSync(
  path.join(repoRoot, "site/scan-pass.css"),
  "utf8"
);

const PROFILE = CITY_GAME_SEASON_ROOT_PROFILE;
const QR = "qr_ws_object_graph_launch_v1";
const CABINET = "obj_cr_node_07_cabinet";
const LIBRARY = "obj_cr_node_10_library";
const LONG_PEER =
  "Czech Village Historical Society Memorial Reading Room Witness Station";

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

async function signedCrEdge(
  overrides: Partial<RelationshipEdgeDocument> = {}
): Promise<RelationshipEdgeDocument> {
  const operator = await getTestKeypair();
  const unsigned = { ...crWitnessEdgeDocumentUnsigned(PROFILE), ...overrides };
  return (await signDocument(
    withProtocolFields(unsigned, PAYLOAD_TYPES.RELATIONSHIP_EDGE),
    operator
  )) as RelationshipEdgeDocument;
}

describe("WS-OBJECT-GRAPH-LAUNCH-V1", () => {
  it("scan-pass.css includes dark theme rules for object graph", () => {
    expect(scanPassCss).toContain('html[data-theme="dark"] .scan-object-graph');
    expect(scanPassCss).toContain(
      'html[data-theme="dark"] .scan-object-graph-provenance'
    );
    expect(scanPassCss).toContain("overflow-wrap: anywhere");
  });

  it("does not expose raw object_id or authority jargon in graph HTML", async () => {
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
    const html = renderScanObjectGraphBlock(vm);

    expect(html).not.toContain(LIBRARY);
    expect(html).not.toContain("authority");
    expect(html).not.toContain("steward");
    expect(html).not.toContain("signed by");
    expect(html).toContain("scan-object-graph-provenance");
    expect(html).toContain("published by @cedar_rapids_wake");
  });

  it("missing peer label falls back to node id and shows board note", async () => {
    const edge = await signedCrEdge();
    const row = {
      edge_id: edge.edge_id,
      kind: "witnesses" as const,
      network_id: edge.network_id,
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
      peer_public_label: null,
    };

    expect(scanObjectGraphPeerLabel(row)).toBe("Nearby place · node_10");

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
    const html = renderScanObjectGraphBlock(vm);
    expect(html).toContain("Nearby place · node_10");
    expect(html).toContain("Public name unavailable");
    expect(html).not.toContain(LIBRARY);
  });

  it("long peer names wrap without breaking graph markup", async () => {
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
        witnessPeerLabels: { [LIBRARY]: LONG_PEER },
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    const html = renderScanObjectGraphBlock(vm);
    expect(html).toContain(LONG_PEER);
    expect(scanPassCss).toContain("overflow-wrap: anywhere");
    expect(html.match(/scan-object-graph-row/g)?.length).toBeGreaterThan(0);
  });

  it("revoked signed edge falls back to legacy vouch (no graph block)", async () => {
    const edge = await signedCrEdge({ status: "revoked" });
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

    expect(vm.relationships).toEqual([]);
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(renderScanObjectGraphBlock(vm)).toBe("");
    expect(html).not.toContain('id="scan-object-graph-heading"');
    expect(html).toContain("Vouch pending from node_10");
  });

  it("empty signed edge list renders no graph block", () => {
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
        witnessRelationshipEdgesIncoming: [],
      },
      "https://humanity.llc",
      CITY_GAME_SEASON_OPEN_NOW,
      { env: { CITY_GAME_ENABLED: "1" } }
    );
    expect(renderScanObjectGraphBlock(vm)).toBe("");
  });

  it("provenance copy avoids authority language", () => {
    const line = scanObjectGraphProvenanceLine("cedar_rapids_wake");
    expect(line).toContain("published by @cedar_rapids_wake");
    expect(line.toLowerCase()).not.toContain("authority");
    expect(line.toLowerCase()).not.toContain("steward");
    expect(line.toLowerCase()).not.toContain("signed");
  });

  it("production seed script supports remote D1 target", () => {
    const witnessSeed = fs.readFileSync(
      path.join(repoRoot, "worker/scripts/seed-relationship-edge-cr-witness.mjs"),
      "utf8"
    );
    const unlockSeed = fs.readFileSync(
      path.join(repoRoot, "worker/scripts/seed-relationship-edge-cr-unlock.mjs"),
      "utf8"
    );
    expect(witnessSeed).toContain('D1_TARGET === "remote"');
    expect(unlockSeed).toContain('D1_TARGET === "remote"');

    const migration = fs.readFileSync(
      path.join(repoRoot, "worker/migrations/0035_relationship_edges.sql"),
      "utf8"
    );
    expect(migration).toMatch(/unlocks/);

    const pkg = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")
    );
    expect(pkg.scripts["city-game:seed-relationship-edge:remote"]).toBeTruthy();
    expect(pkg.scripts["worker:migrate:remote"]).toBeTruthy();
  });

  it("created unlock panel exposes self-serve scan graph publish", () => {
    const createdHtml = fs.readFileSync(
      path.join(repoRoot, "site/created/index.html"),
      "utf8"
    );
    const unlockEdgesJs = fs.readFileSync(
      path.join(repoRoot, "site/js/created-child-object-game-node-unlock-edges.mjs"),
      "utf8"
    );
    expect(createdHtml).toContain("Publish scan graph edges");
    expect(createdHtml).toContain("child-object-game-node-unlock-edges-publish");
    expect(unlockEdgesJs).toContain("created-relationship-edge-publish.mjs");
  });
});
