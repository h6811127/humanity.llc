import { describe, expect, it } from "vitest";

import {
  applySeasonRootSync,
  assessProductionSeedForSync,
  seasonLooksProductionBound,
  seedScanUrlEmbedsProfile,
  shouldRefuseLocalSeasonRootSync,
  shouldRefuseLocalWriteSeason,
} from "../scripts/city-game-sync-season-root-core.mjs";

const PROD_SEASON = {
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

describe("city-game-sync-season-root-core", () => {
  it("refuses default local sync when season JSON is production-bound", () => {
    expect(seasonLooksProductionBound(PROD_SEASON)).toBe(true);
    expect(
      shouldRefuseLocalSeasonRootSync({
        useProduction: false,
        forceLocal: false,
        season: PROD_SEASON,
      })
    ).toBe(true);
    expect(
      shouldRefuseLocalSeasonRootSync({
        useProduction: false,
        forceLocal: true,
        season: PROD_SEASON,
      })
    ).toBe(false);
    expect(
      shouldRefuseLocalSeasonRootSync({
        useProduction: true,
        forceLocal: false,
        season: PROD_SEASON,
      })
    ).toBe(false);
  });

  it("refuses local --write-season on production-bound season without --force-local", () => {
    expect(
      shouldRefuseLocalWriteSeason({
        productionOut: false,
        forceLocal: false,
        season: PROD_SEASON,
      })
    ).toBe(true);
    expect(
      shouldRefuseLocalWriteSeason({
        productionOut: false,
        forceLocal: true,
        season: PROD_SEASON,
      })
    ).toBe(false);
    expect(
      shouldRefuseLocalWriteSeason({
        productionOut: true,
        forceLocal: false,
        season: PROD_SEASON,
      })
    ).toBe(false);
  });

  it("assesses production seed URLs for profile embed and root change", () => {
    const matchingSeed = {
      profile_id: "GcP3Ee17yGqMHdidhEVMYBzq",
      nodes: [
        {
          node_id: "node_01",
          scan_url: "https://humanity.llc/c/GcP3Ee17yGqMHdidhEVMYBzq?q=qr_1",
        },
      ],
    };
    expect(assessProductionSeedForSync({ seed: matchingSeed, season: PROD_SEASON })).toEqual({
      ok: true,
      profileId: "GcP3Ee17yGqMHdidhEVMYBzq",
    });

    const localProfileOnProdOrigin = {
      profile_id: "local_only_profile_id_abc",
      nodes: [
        {
          node_id: "node_01",
          // Local seed-local often stamps humanity.llc for a local profile — origin OK, profile wrong.
          scan_url: "https://humanity.llc/c/local_only_profile_id_abc?q=qr_1",
        },
      ],
    };
    const mismatched = assessProductionSeedForSync({
      seed: localProfileOnProdOrigin,
      season: PROD_SEASON,
    });
    expect(mismatched.ok).toBe(false);
    if (!mismatched.ok) {
      expect(mismatched.code).toBe("ROOT_PROFILE_CHANGE");
    }
    expect(
      assessProductionSeedForSync({
        seed: localProfileOnProdOrigin,
        season: PROD_SEASON,
        force: true,
      }).ok
    ).toBe(true);

    const localhostSeed = {
      profile_id: "GcP3Ee17yGqMHdidhEVMYBzq",
      nodes: [
        {
          node_id: "node_01",
          scan_url: "http://127.0.0.1:8787/c/GcP3Ee17yGqMHdidhEVMYBzq?q=qr_1",
        },
      ],
    };
    const nonProd = assessProductionSeedForSync({ seed: localhostSeed, season: PROD_SEASON });
    expect(nonProd.ok).toBe(false);
    if (!nonProd.ok) {
      expect(nonProd.code).toBe("SEED_NON_PRODUCTION_URL");
    }

    const wrongProfilePath = {
      profile_id: "GcP3Ee17yGqMHdidhEVMYBzq",
      nodes: [
        {
          node_id: "node_01",
          scan_url: "https://humanity.llc/c/SomeoneElseProfileId123?q=qr_1",
        },
      ],
    };
    const pathMismatch = assessProductionSeedForSync({
      seed: wrongProfilePath,
      season: PROD_SEASON,
    });
    expect(pathMismatch.ok).toBe(false);
    if (!pathMismatch.ok) {
      expect(pathMismatch.code).toBe("SEED_PROFILE_URL_MISMATCH");
    }

    expect(
      seedScanUrlEmbedsProfile(
        "https://humanity.llc/c/GcP3Ee17yGqMHdidhEVMYBzq?q=qr_1",
        "GcP3Ee17yGqMHdidhEVMYBzq"
      )
    ).toBe(true);
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
