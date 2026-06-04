import { describe, expect, it } from "vitest";

import {
  buildInstallQaWalkKitHtml,
  formatInstallQaWalkKitReport,
  installQaRegistryNodeIds,
  INSTALL_QA_PER_NODE_CHECKS,
  resolveInstallQaWalkNodes,
} from "../scripts/city-game-install-qa-walk-core.mjs";
import { INSTALL_QA_REQUIRED_NODE_COUNT } from "../scripts/city-game-smoke-local-core.mjs";

describe("city-game-install-qa-walk-core", () => {
  it("installQaRegistryNodeIds reads season registry order", () => {
    const ids = installQaRegistryNodeIds({
      nodes: [{ node_id: "node_02" }, { node_id: "node_01" }],
    });
    expect(ids).toEqual(["node_02", "node_01"]);
  });

  it("resolves all 15 pilot registry nodes (not comprehension probes only)", () => {
    const registry = Array.from({ length: INSTALL_QA_REQUIRED_NODE_COUNT }, (_, i) => {
      const n = i + 1;
      const node_id = `node_${String(n).padStart(2, "0")}`;
      return { node_id };
    });
    const seedNodes = registry.map((row) => ({
      node_id: row.node_id,
      public_label: row.node_id,
      qr_id: `qr_${row.node_id}`,
      local_scan_url: `http://127.0.0.1:8787/c/prof?q=qr_${row.node_id}`,
    }));
    const nodes = resolveInstallQaWalkNodes(
      seedNodes,
      "prof1",
      "192.168.1.42",
      installQaRegistryNodeIds({ nodes: registry })
    );
    expect(nodes).toHaveLength(INSTALL_QA_REQUIRED_NODE_COUNT);
    expect(nodes.every((n) => n.href?.includes("192.168.1.42"))).toBe(true);
  });

  it("resolves walk nodes from seed with LAN host", () => {
    const nodes = resolveInstallQaWalkNodes(
      [
        {
          node_id: "node_04",
          public_label: "River Lantern",
          qr_id: "qr_river",
          local_scan_url: "http://127.0.0.1:8787/c/prof1?q=qr_river",
        },
        { node_id: "node_14", public_label: "Care loop", qr_id: "qr_care" },
      ],
      "prof1",
      "192.168.1.42"
    );
    expect(nodes).toHaveLength(2);
    expect(nodes.find((n) => n.node_id === "node_04")?.href).toBe(
      "http://192.168.1.42:8787/c/prof1?q=qr_river"
    );
    expect(nodes.find((n) => n.node_id === "node_14")?.label).toBe("Care loop");
  });

  it("renders walk kit HTML with per-node checklist", () => {
    const html = buildInstallQaWalkKitHtml(
      [
        {
          node_id: "node_01",
          label: "Start",
          href: "http://192.168.1.42:8787/c/p?q=qr_01",
        },
      ],
      { host: "192.168.1.42" }
    );
    expect(html).toContain("15 nodes × 3 phones");
    expect(html).toContain("192.168.1.42");
    expect(html).toContain("node_01 · Start");
    expect(html).toContain("http://192.168.1.42:8787/c/p?q=qr_01");
    for (const check of INSTALL_QA_PER_NODE_CHECKS) {
      expect(html).toContain(check);
    }
    expect(html).toContain("noindex,nofollow");
  });

  it("formatInstallQaWalkKitReport lists walk URL and sign-off commands", () => {
    const report = formatInstallQaWalkKitReport({
      nodeCount: 15,
      walkUrl: "http://192.168.1.42:8788/dev/city-game-install-qa-walk.html",
      host: "192.168.1.42",
    });
    expect(report).toContain("15/15");
    expect(report).toContain("city-game-install-qa-walk.html");
    expect(report).toContain("install-map-sign-off");
    expect(report).toContain("install-qa-sign-off");
  });
});
