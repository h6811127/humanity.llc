import { describe, expect, it } from "vitest";

import {
  assessGameScanHtml,
  extractScanMain,
  forbiddenCopyInMain,
  GAME_NODE_SCAN_FOOT,
  hasRenderedClass,
  resolveSmokeScanUrl,
} from "../scripts/city-game-smoke-local-core.mjs";

describe("city-game-smoke-local-core", () => {
  it("passes game scan HTML without meta chips (node_01 shape)", () => {
    const html = `<html><head><style>.scan-game-dormant-note { color: red; }</style></head><main>
      <h1 class="scan-hero-title">NewBo relay arch</h1>
      <p class="scan-game-coop-hint" role="note">Regroup hint</p>
      <p class="scan-hero-foot">${GAME_NODE_SCAN_FOOT}</p>
    </main></html>`;
    expect(assessGameScanHtml(html, { nodeId: "node_01", label: "NewBo relay arch", requireCoopHint: true })).toEqual({
      ok: true,
    });
  });

  it("passes game scan HTML with meta chips (node_04 shape)", () => {
    const html = `<main>
      <h1 class="scan-hero-title">Riverwalk River Lantern</h1>
      <ul class="scan-game-chips"><li class="scan-game-chip">Collective 4/20</li></ul>
      <p class="scan-game-coop-hint" role="note">Share the seed clue outward</p>
      <p class="scan-hero-foot">${GAME_NODE_SCAN_FOOT}</p>
    </main>`;
    expect(
      assessGameScanHtml(html, {
        nodeId: "node_04",
        label: "Riverwalk River Lantern",
        requireCoopHint: true,
      })
    ).toEqual({ ok: true });
  });

  it("ignores dormant CSS outside main", () => {
    const html = `<style>.scan-game-dormant-note { opacity: 0.7; }</style><main>
      <p class="scan-hero-foot">${GAME_NODE_SCAN_FOOT}</p>
    </main>`;
    expect(assessGameScanHtml(html, { nodeId: "node_01" }).ok).toBe(true);
  });

  it("fails when game foot copy missing", () => {
    const result = assessGameScanHtml("<main>status plate only</main>", { nodeId: "node_01" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("game scan foot");
    }
  });

  it("fails on forbidden copy with word boundaries", () => {
    const html = `<main><p class="scan-hero-foot">${GAME_NODE_SCAN_FOOT}</p><p>leaderboard</p></main>`;
    const result = assessGameScanHtml(html, { nodeId: "node_01" });
    expect(result.ok).toBe(false);
  });

  it("does not flag xp inside unrelated words", () => {
    expect(forbiddenCopyInMain("vouch-explainer-actions expanded-max", "xp")).toBe(false);
  });

  it("hasRenderedClass matches arrive-hidden coop hints", () => {
    const main =
      '<p class="scan-arrive-item scan-arrive-item--hidden scan-game-coop-hint" role="note">hint</p>';
    expect(hasRenderedClass(main, "scan-game-coop-hint")).toBe(true);
  });

  it("extractScanMain isolates hero markup", () => {
    const html = "<style>.scan-game-chips{}</style><main><p>inside</p></main>";
    expect(extractScanMain(html)).toBe("<p>inside</p>");
  });

  it("resolveSmokeScanUrl prefers local_scan_url", () => {
    expect(
      resolveSmokeScanUrl(
        "http://127.0.0.1:8787",
        "http://127.0.0.1:8787/c/p?q=qr_1",
        "https://humanity.llc/c/p?q=qr_1"
      )
    ).toBe("http://127.0.0.1:8787/c/p?q=qr_1");
  });
});
