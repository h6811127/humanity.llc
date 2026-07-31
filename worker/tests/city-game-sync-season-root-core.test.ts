import { describe, expect, it } from "vitest";

import {
  applySeasonRootSync,
  seasonLooksProductionBound,
  shouldRefuseLocalSeasonRootSync,
} from "../scripts/city-game-sync-season-root-core.mjs";

describe("city-game-sync-season-root-core", () => {
  it("refuses default local sync when season JSON is production-bound", () => {
    const season = {
      season_root_profile_id: "GcP3Ee17yGqMHdidhEVMYBzq",
      network_charter: {
        game_node_scan_url:
          "https://humanity.llc/c/GcP3Ee17yGqMHdidhEVMYBzq?q=qr_prod_node_04",
      },
      nodes: [
        {
          node_id: "node_01",
          scan_url: "https://humanity.llc/c/GcP3Ee17yGqMHdidhEVMYBzq?q=qr_prod_node_01",
        },
      ],
    };

    expect(seasonLooksProductionBound(season)).toBe(true);
    expect(
      shouldRefuseLocalSeasonRootSync({ useProduction: false, forceLocal: false, season })
    ).toBe(true);
    expect(
      shouldRefuseLocalSeasonRootSync({ useProduction: false, forceLocal: true, season })
    ).toBe(false);
    expect(
      shouldRefuseLocalSeasonRootSync({ useProduction: true, forceLocal: false, season })
    ).toBe(false);
  });

  it("detects production binding from status plate scan URLs on the www host", () => {
    const season = {
      network_charter: {
        status_plate_scan_url:
          "https://www.humanity.llc/c/GcP3Ee17yGqMHdidhEVMYBzq?q=qr_prod_status",
      },
      nodes: [],
    };

    expect(seasonLooksProductionBound(season)).toBe(true);
    expect(
      shouldRefuseLocalSeasonRootSync({ useProduction: false, forceLocal: false, season })
    ).toBe(true);
  });

  it("allows default local sync when all committed scan URLs are dev-only", () => {
    const season = {
      network_charter: {
        status_plate_scan_url: "http://127.0.0.1:8787/c/local_root?q=qr_status",
        game_node_scan_url: "http://localhost:8787/c/local_root?q=qr_node_04",
      },
      nodes: [
        {
          node_id: "node_01",
          scan_url: "http://127.0.0.1:8787/c/local_root?q=qr_node_01",
        },
      ],
    };

    expect(seasonLooksProductionBound(season)).toBe(false);
    expect(
      shouldRefuseLocalSeasonRootSync({ useProduction: false, forceLocal: false, season })
    ).toBe(false);
  });

  it("requires a seed profile id before rewriting the season root", () => {
    expect(() => applySeasonRootSync({ season: {}, seed: {} })).toThrow(/profile_id/);
    expect(() =>
      applySeasonRootSync({ season: {}, seed: { profile_id: "   " } })
    ).toThrow(/profile_id/);
  });

  it("applies seed root and node scan URLs to a cloned season object", () => {
    const inputSeason = {
      season_root_profile_id: "old_root",
      network_charter: {
        game_node_scan_url: "https://example.invalid/old-node-04",
      },
      nodes: [
        { node_id: "node_01", scan_url: "https://example.invalid/old-node-01" },
        { node_id: "node_04", scan_url: "https://example.invalid/old-node-04" },
      ],
    };
    const seed = {
      profile_id: "new_root",
      nodes: [
        { node_id: "node_01", scan_url: "http://127.0.0.1:8787/c/new_root?q=qr_1" },
        {
          node_id: "node_04",
          scan_url: "http://127.0.0.1:8787/c/new_root?q=qr_4",
          qr_id: "qr_4",
        },
      ],
    };

    const result = applySeasonRootSync({ season: inputSeason, seed });

    expect(result.previous).toBe("old_root");
    expect(result.profileId).toBe("new_root");
    expect(result.scanUrlsUpdated).toBe(2);
    expect(result.season.season_root_profile_id).toBe("new_root");
    expect(result.season.network_charter.game_node_scan_url).toBe(
      "http://127.0.0.1:8787/c/new_root?q=qr_4"
    );
    expect(result.season.nodes[1].qr_id).toBe("qr_4");
    expect(inputSeason.season_root_profile_id).toBe("old_root");
  });

  it("skips season nodes without matching seed rows without crashing", () => {
    const inputSeason = {
      nodes: [
        { node_id: "node_01", scan_url: "https://example.invalid/old-node-01" },
        { node_id: "node_99", scan_url: "https://example.invalid/stays-put" },
      ],
    };
    const result = applySeasonRootSync({
      season: inputSeason,
      seed: {
        profile_id: "new_root",
        nodes: [
          { node_id: "node_01", scan_url: "http://127.0.0.1:8787/c/new_root?q=qr_1" },
        ],
      },
    });

    expect(result.scanUrlsUpdated).toBe(1);
    expect(result.season.nodes[0].scan_url).toBe("http://127.0.0.1:8787/c/new_root?q=qr_1");
    expect(result.season.nodes[1].scan_url).toBe("https://example.invalid/stays-put");
  });
});
