import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  attachSiteCodesToSeedNodes,
  buildSeedSiteCodeRows,
  contributeModeForNode,
  missingSeedSiteCodeWarnings,
  seasonContributableNodeIds,
} from "../scripts/city-game-seed-site-codes-core.mjs";

const season = JSON.parse(
  readFileSync(join(process.cwd(), "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("city-game seed site codes", () => {
  it("lists all autonomous contribute nodes from season automation", () => {
    expect(seasonContributableNodeIds(season)).toEqual([
      "node_01",
      "node_04",
      "node_09",
      "node_10",
      "node_11",
    ]);
  });

  it("maps contribute modes for spine nodes", () => {
    expect(contributeModeForNode(season, "node_04")).toBe("quorum");
    expect(contributeModeForNode(season, "node_09")).toBe("fragment");
    expect(contributeModeForNode(season, "node_10")).toBe("scarcity");
    expect(contributeModeForNode(season, "node_07")).toBeNull();
  });

  it("exports sticker-ready site code rows with scan URLs", () => {
    const rows = buildSeedSiteCodeRows(season, [
      {
        node_id: "node_04",
        public_label: "Riverwalk River Lantern",
        object_id: "obj_cr_node_04_river",
        scan_url: "https://humanity.llc/c/p?q=qr1",
        local_scan_url: "http://127.0.0.1:8787/c/p?q=qr1",
      },
      {
        node_id: "node_10",
        public_label: "Library witness seal",
        object_id: "obj_cr_node_10_library",
        scan_url: "https://humanity.llc/c/p?q=qr10",
      },
    ]);

    expect(rows).toHaveLength(5);
    expect(missingSeedSiteCodeWarnings(rows)).toEqual([]);

    const river = rows.find((row) => row.node_id === "node_04");
    expect(river).toMatchObject({
      site_code: "CR-LANTERN-7K",
      contribute_mode: "quorum",
      local_scan_url: "http://127.0.0.1:8787/c/p?q=qr1",
    });

    const witness = rows.find((row) => row.node_id === "node_10");
    expect(witness).toMatchObject({
      site_code: "CR-WITNS-4P",
      contribute_mode: "scarcity",
    });
  });

  it("attaches site codes onto seeded node rows", () => {
    const nodes = attachSiteCodesToSeedNodes(season, [
      { node_id: "node_04", public_label: "Riverwalk River Lantern" },
      { node_id: "node_02", public_label: "NewBo café window" },
    ]);

    expect(nodes[0]).toMatchObject({
      site_code: "CR-LANTERN-7K",
      contribute_mode: "quorum",
    });
    expect(nodes[1]).not.toHaveProperty("site_code");
  });
});
