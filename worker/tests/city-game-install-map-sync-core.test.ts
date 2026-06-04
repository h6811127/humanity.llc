import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseInstallMapRegistry } from "../scripts/city-game-install-map-core.mjs";
import {
  formatInstallMapRegistryRow,
  syncInstallMapRegistrySection,
} from "../scripts/city-game-install-map-sync-core.mjs";
import { loadAndMergeWaveOpenSeason } from "../scripts/merge-city-game-wave-open.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const installMapSample = readFileSync(
  join(root, "docs/CITY_GAME_NODE_INSTALL_MAP.md"),
  "utf8"
);

describe("city-game-install-map-sync-core", () => {
  it("formats wave-open row with role notes", () => {
    const line = formatInstallMapRegistryRow({
      node_id: "node_16",
      label: "Red treaty · NewBo depot wall",
      district: "newbo",
      object_id: "obj_cr_node_16_red_hq",
      role: "sanctuary",
      node_class: "faction_hq",
    });
    expect(line).toContain("node_16");
    expect(line).toContain("Faction HQ");
  });

  it("syncs install map to 40 nodes from merged season", () => {
    const season = loadAndMergeWaveOpenSeason({ write: false });
    const synced = syncInstallMapRegistrySection(installMapSample, season.nodes ?? []);
    const rows = parseInstallMapRegistry(synced);
    expect(rows).toHaveLength(40);
    expect(rows.find((r) => r.node_id === "node_40")).toBeTruthy();
    expect(rows.find((r) => r.node_id === "node_01")?.qrIssued).toBe(true);
  });
});
