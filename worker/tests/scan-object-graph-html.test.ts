import { describe, expect, it } from "vitest";

import { renderScanObjectGraphBlock } from "../src/resolver/scan-object-graph-html";
import type { ScanViewModel } from "../src/resolver/scan-state";
import { CR_WITNESS_EDGE_LABEL } from "../src/live-object/relationship-edge-spec";
import { SCAN_OBJECT_GRAPH_INTRO } from "../src/resolver/scan-object-graph-copy";

function baseVm(overrides: Partial<ScanViewModel> = {}): ScanViewModel {
  return {
    kind: "active",
    profileId: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    qrId: "qr_test",
    handle: null,
    manifestoLine: null,
    objectStreams: [],
    cardStatus: "active",
    qrStatus: "active",
    qrScope: "child_object",
    qrEpoch: 1,
    verificationLabel: "Registered",
    verificationState: "registered",
    verificationMethod: "registered",
    vouchCount: 0,
    latestVouchAt: null,
    showCardBlock: true,
    showHumanTrustBlock: true,
    showArtifactBlock: true,
    showLiveControlBlock: false,
    liveControlAvailable: false,
    liveControlProvenAt: null,
    qrExpiresAt: null,
    qrIssuedAt: null,
    qrPayload: null,
    minimalScan: false,
    revocationDisplayMode: null,
    publicReason: null,
    primaryBadge: { label: "Active", tone: "live" },
    scanUrl: null,
    credentialCode: null,
    cacheControl: "public, max-age=60",
    malformedReason: null,
    childObjectType: "game_node",
    childObjectId: "obj_cr_node_07_cabinet",
    childPublicLabel: "Cabinet",
    childPublicState: "State",
    childTimePolicy: null,
    childCustody: null,
    capabilities: [],
    gameNode: null,
    scanTrust: null,
    relationships: [],
    relationshipRules: null,
    ...overrides,
  };
}

describe("scan-object-graph-html", () => {
  it("renders nothing without signed relationships", () => {
    expect(renderScanObjectGraphBlock(baseVm())).toBe("");
  });

  it("renders required by, unlocks, satisfaction, and signed authority", () => {
    const html = renderScanObjectGraphBlock(
      baseVm({
        relationships: [
          {
            edge_id: "edge_cr_witness_10_07",
            kind: "witnesses",
            network_id: "cr_season_01_wake",
            from_object_id: "obj_cr_node_10_library",
            to_object_id: "obj_cr_node_07_cabinet",
            from_node_id: "node_10",
            to_node_id: "node_07",
            label: CR_WITNESS_EDGE_LABEL,
            status: "active",
            satisfied: false,
            pending_node_ids: ["node_10"],
            satisfied_node_ids: [],
            direction: "incoming",
            role: "required_by",
            rule_source: "signed_edge",
            peer_object_id: "obj_cr_node_10_library",
            peer_public_label: "Library witness",
          },
        ],
        relationshipRules: {
          signed: true,
          steward_profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
          network_id: "cr_season_01_wake",
          edge_count: 1,
        },
        handle: "cedar_rapids_wake",
      })
    );

    expect(html).toContain("scan-object-graph");
    expect(html).toContain("How this place connects");
    expect(html).toContain("Before you can open this");
    expect(html).toContain(CR_WITNESS_EDGE_LABEL);
    expect(html).toContain("Library witness");
    expect(html).toContain("Missing");
    expect(html).toContain("@cedar_rapids_wake");
    expect(html).toContain("published by");
    expect(html).toContain(SCAN_OBJECT_GRAPH_INTRO);
  });
});
