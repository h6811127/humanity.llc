import { describe, expect, it } from "vitest";

import { GAME_NODE_SCAN_FOOT } from "../scripts/city-game-smoke-local-core.mjs";
import {
  applyInstallQaScenarioPass,
  formatInstallQaScenarioReport,
  runInstallQaScenarioHttpChecks,
  selectScenarioNodes,
} from "../scripts/city-game-install-qa-scenario-core.mjs";
import { INSTALL_QA_E2_PENDING } from "../scripts/city-game-install-qa-core.mjs";

const sampleHtml = `<main><p class="scan-game-coop-hint">coop</p><p>${GAME_NODE_SCAN_FOOT}</p></main>`;

function sampleNodes() {
  return [
    "node_01",
    "node_02",
    "node_04",
    "node_05",
    "node_07",
    "node_09",
    "node_11",
    "node_12",
    "node_14",
  ].map((node_id) => ({
    node_id,
    local_scan_url: `http://127.0.0.1:8787/c/p?q=${node_id}`,
  }));
}

describe("city-game-install-qa-scenario-core", () => {
  it("selects scenario nodes in checklist order", () => {
    const selected = selectScenarioNodes(sampleNodes());
    expect(selected.map((node) => node.node_id)).toEqual([
      "node_01",
      "node_02",
      "node_04",
      "node_05",
      "node_07",
      "node_09",
      "node_11",
      "node_12",
      "node_14",
    ]);
  });

  it("runs HTTP baseline with injected fetch", async () => {
    const result = await runInstallQaScenarioHttpChecks({
      apiOrigin: "http://127.0.0.1:8787",
      nodes: sampleNodes(),
      fetchHtml: async (url) => {
        const html = url.includes("node_04")
          ? `<main><p class="scan-game-coop-hint">coop</p><div class="scan-game-contribute"></div><p>${GAME_NODE_SCAN_FOOT}</p></main>`
          : sampleHtml;
        return { ok: true, status: 200, html };
      },
    });
    expect(result.ok).toBe(true);
    expect(result.passed).toHaveLength(9);
  });

  it("formats scenario report and applies E2 marker", () => {
    const text = formatInstallQaScenarioReport({
      ok: true,
      passed: ["node_01"],
      failures: [],
      missing: [],
      e2SignedOff: false,
    });
    expect(text).toContain("install-qa-scenario");
    const out = applyInstallQaScenarioPass(`before\n${INSTALL_QA_E2_PENDING}\nafter`, {
      dateIso: "2026-06-04",
    });
    expect(out).toContain("☑ **2026-06-04**");
  });
});
