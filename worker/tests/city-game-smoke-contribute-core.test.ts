import { describe, expect, it } from "vitest";

import {
  assessCabinetUnlockedScanHtml,
  assessFinaleOpenScanHtml,
  gameContributeEndpoint,
  hasContributeBlockInScanHtml,
  parseContributeProgressFromScanHtml,
  readFragmentContributeResponse,
  readQuorumContributeResponse,
  remainingQuorumContributions,
  resolveSeedContributeNode,
  resolveSeedScanNode,
  synthContributorIp,
} from "../scripts/city-game-smoke-contribute-core.mjs";
import { GAME_NODE_SCAN_FOOT } from "../scripts/city-game-smoke-local-core.mjs";

describe("city-game-smoke-contribute-core", () => {
  it("builds game-contribute endpoint", () => {
    expect(
      gameContributeEndpoint("http://127.0.0.1:8787", "abc123", "obj_cr_node_04_river")
    ).toBe(
      "http://127.0.0.1:8787/.well-known/hc/v1/cards/abc123/objects/obj_cr_node_04_river/game-contribute"
    );
  });

  it("parses contribute progress from scan HTML", () => {
    const html = `<main><span id="scan-game-contribute-progress">4 / 20</span></main>`;
    expect(parseContributeProgressFromScanHtml(html)).toEqual({ progress: 4, target: 20 });
    expect(remainingQuorumContributions(4, 20)).toBe(16);
  });

  it("detects contribute block markup", () => {
    const html = `<main><section class="scan-game-contribute" id="scan-game-contribute"></section></main>`;
    expect(hasContributeBlockInScanHtml(html)).toBe(true);
  });

  it("reads quorum complete response", () => {
    const result = readQuorumContributeResponse({
      collective_progress: 20,
      collective_target: 20,
      quorum_complete: true,
      unlocked_nodes: ["node_07"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.quorumComplete).toBe(true);
      expect(result.unlockedNodes).toContain("node_07");
    }
  });

  it("reads fragment finale-open response", () => {
    const result = readFragmentContributeResponse({
      fragments_registered: 3,
      fragments_required: 3,
      finale_open: true,
      unlocked_nodes: ["node_13"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finaleOpen).toBe(true);
    }
  });

  it("assesses unlocked cabinet scan HTML", () => {
    const html = `<main>
      <h1>Czech Village cabinet</h1>
      <p>Unlocked together — ask the mural what remembers winter</p>
      <p>Open · unlocked by River Lantern</p>
      <p class="scan-hero-foot">${GAME_NODE_SCAN_FOOT}</p>
    </main>`;
    expect(assessCabinetUnlockedScanHtml(html).ok).toBe(true);
  });

  it("assesses finale-open scan HTML", () => {
    const html = `<main><p>Finale switch live — the alley arch is waking</p></main>`;
    expect(assessFinaleOpenScanHtml(html).ok).toBe(true);
  });

  it("resolves seed contribute node with season fallback", () => {
    const node = resolveSeedContributeNode(
      [
        {
          node_id: "node_04",
          object_id: "obj_cr_node_04_river",
          qr_id: "qr_river",
        },
      ],
      { node_04: { code: "CR-LANTERN-7K" } },
      "node_04"
    );
    expect(node).toMatchObject({
      siteCode: "CR-LANTERN-7K",
      objectId: "obj_cr_node_04_river",
    });
  });

  it("resolves scan-only seed node without site code", () => {
    const node = resolveSeedScanNode(
      [
        {
          node_id: "node_07",
          object_id: "obj_cr_node_07_cabinet",
          qr_id: "qr_cabinet",
          local_scan_url: "http://127.0.0.1:8787/c/x?q=qr_cabinet",
        },
      ],
      "node_07"
    );
    expect(node).toMatchObject({
      objectId: "obj_cr_node_07_cabinet",
      qrId: "qr_cabinet",
    });
    expect(resolveSeedContributeNode([], {}, "node_07")).toBeNull();
  });

  it("uses synth contributor IPs in RFC5737 range", () => {
    expect(synthContributorIp(0)).toBe("203.0.113.1");
    expect(synthContributorIp(16)).toBe("203.0.113.17");
  });
});
