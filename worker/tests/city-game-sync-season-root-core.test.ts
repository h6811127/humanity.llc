import { describe, expect, it } from "vitest";

import {
  applySeasonRootSync,
  seasonLooksProductionBound,
  shouldRefuseLocalSeasonRootSync,
} from "../scripts/city-game-sync-season-root-core.mjs";

describe("city-game-sync-season-root-core", () => {
  it("detects production-bound scan URLs across charter fields and nodes only by origin", () => {
    const productionCases = [
      {
        network_charter: {
          status_plate_scan_url:
            "https://www.humanity.llc/c/prod_root?q=qr_prod_status_plate",
        },
      },
      {
        network_charter: {
          game_node_scan_url: " https://humanity.llc/c/prod_root?q=qr_prod_node_04 ",
        },
      },
      {
        nodes: [
          {
            node_id: "node_01",
            scan_url: "https://www.humanity.llc/c/prod_root?q=qr_prod_node_01",
          },
        ],
      },
    ];

    for (const season of productionCases) {
      expect(seasonLooksProductionBound(season)).toBe(true);
    }

    const safeCases = [
      {
        network_charter: {
          status_plate_scan_url: "http://127.0.0.1:8787/c/local_root?q=qr_local",
          game_node_scan_url: "http://localhost:8787/c/local_root?q=qr_local_node_04",
        },
        nodes: [
          {
            node_id: "node_01",
            scan_url: "https://example.invalid/c/local_root?q=qr_local_node_01",
          },
        ],
      },
      {
        network_charter: {
          game_node_scan_url:
            "https://example.invalid/redirect?next=https%3A%2F%2Fhumanity.llc%2Fc%2Fprod_root",
        },
      },
      {
        nodes: [
          {
            node_id: "node_02",
            scan_url: "https://humanity.llc.evil.example/c/prod_root?q=qr_prod_node_02",
          },
        ],
      },
    ];

    for (const season of safeCases) {
      expect(seasonLooksProductionBound(season)).toBe(false);
    }
  });

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
});
