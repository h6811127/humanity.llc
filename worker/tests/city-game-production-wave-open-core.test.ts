import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  CR_SEASON_PATH,
  CR_WAVE_OPEN_PATH,
  mergeWaveOpenIntoSeason,
} from "../scripts/merge-city-game-wave-open.mjs";
import {
  planProductionWaveOpenMint,
  waveOpenMintTemplates,
} from "../scripts/city-game-production-wave-open-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function loadSeasonForWaveOpenTests() {
  const onDisk = JSON.parse(readFileSync(CR_SEASON_PATH, "utf8"));
  const spineCount = (onDisk.nodes ?? []).filter(
    (n) => Number(String(n.node_id).replace("node_", "")) <= 15
  ).length;
  if ((onDisk.nodes ?? []).length >= 40 && spineCount === 15) {
    return onDisk;
  }
  const wave = JSON.parse(readFileSync(CR_WAVE_OPEN_PATH, "utf8"));
  return mergeWaveOpenIntoSeason(onDisk, wave);
}

const season = loadSeasonForWaveOpenTests();

describe("city-game-production-wave-open-core", () => {
  it("lists 25 pending templates when production seed has spine only", () => {
    const spineIds = new Set(
      season.nodes
        .filter((n) => Number(String(n.node_id).replace("node_", "")) <= 15)
        .map((n) => n.node_id)
    );
    const pending = waveOpenMintTemplates(season.nodes, season.season_id, spineIds);
    expect(pending).toHaveLength(25);
    expect(pending[0]?.node_id).toBe("node_16");
    expect(pending[pending.length - 1]?.node_id).toBe("node_40");
  });

  it("plans mint when seed has keys and spine rows", () => {
    const plan = planProductionWaveOpenMint({
      season,
      seed: {
        profile_id: "GcP3Ee17yGqMHdidhEVMYBzq",
        owner_private_key_b58: "abc",
        owner_public_key: "def",
        nodes: season.nodes
          .filter((n) => Number(String(n.node_id).replace("node_", "")) <= 15)
          .map((n) => ({ node_id: n.node_id, scan_url: "https://humanity.llc/c/x?q=1" })),
      },
    });
    expect(plan.issues).toEqual([]);
    expect(plan.pendingCount).toBe(25);
    expect(plan.existingCount).toBe(15);
    expect(plan.ready).toBe(true);
  });

  it("reports no pending when seed already has 40 rows", () => {
    const plan = planProductionWaveOpenMint({
      season,
      seed: {
        profile_id: "GcP3",
        owner_private_key_b58: "k",
        owner_public_key: "p",
        nodes: season.nodes.map((n) => ({
          node_id: n.node_id,
          scan_url: "https://humanity.llc/c/x?q=1",
        })),
      },
    });
    expect(plan.pendingCount).toBe(0);
    expect(plan.ready).toBe(false);
  });
});
