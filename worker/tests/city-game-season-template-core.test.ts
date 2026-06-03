import { describe, expect, it } from "vitest";

import {
  annotateTemplateRegistrationState,
  defaultObjectIdForSeasonNode,
  enrichTemplateRow,
  pendingBulkTemplateRows,
  resolveSeasonTemplateRows,
  STARTER_S1_NODE_TEMPLATE,
} from "../../site/js/city-game-season-template-core.mjs";
import {
  mergeBulkEditorRows,
  summarizeBulkTemplateRows,
} from "../../site/js/created-child-object-game-node-bulk-core.mjs";

describe("city-game-season-template-core", () => {
  it("provides 15-node S1 starter footprint", () => {
    expect(STARTER_S1_NODE_TEMPLATE).toHaveLength(15);
    expect(STARTER_S1_NODE_TEMPLATE[0]?.node_id).toBe("node_01");
    expect(STARTER_S1_NODE_TEMPLATE[3]?.role).toBe("temp_drop");
  });

  it("builds default object ids from season id", () => {
    expect(defaultObjectIdForSeasonNode("my_city_season_01", "node_04")).toBe(
      "obj_my_city_season_01_node_04"
    );
  });

  it("enriches template rows with game_node defaults", () => {
    const row = enrichTemplateRow(
      { node_id: "node_04", role: "temp_drop", district: "river", label: "Lantern" },
      "demo_season_01"
    );
    expect(row.object_id).toBe("obj_demo_season_01_node_04");
    expect(row.game_meta.collective_target).toBe(20);
    expect(row.object_streams).toHaveLength(4);
  });

  it("prefers season JSON nodes over starter template", () => {
    const rows = resolveSeasonTemplateRows(
      {
        nodes: [
          {
            node_id: "node_01",
            role: "relay_gate",
            district: "downtown",
            label: "Main square",
            object_id: "obj_ex_node_01",
          },
        ],
      },
      "example_city_season_01"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.label).toBe("Main square");
    expect(rows[0]?.object_id).toBe("obj_ex_node_01");
  });

  it("falls back to starter when season has no nodes", () => {
    const rows = resolveSeasonTemplateRows({ nodes: [] }, "new_city_season_01");
    expect(rows).toHaveLength(15);
    expect(rows[0]?.object_id).toBe("obj_new_city_season_01_node_01");
  });

  it("marks registered template rows by object_id", () => {
    const template = resolveSeasonTemplateRows({ nodes: [] }, "new_city_season_01");
    const annotated = annotateTemplateRegistrationState(template, [
      {
        object_type: "game_node",
        object_id: "obj_new_city_season_01_node_01",
      },
    ]);
    expect(annotated[0]?.registered).toBe(true);
    expect(annotated[1]?.registered).toBe(false);
    expect(pendingBulkTemplateRows(annotated)).toHaveLength(14);
  });
});

describe("created-child-object-game-node-bulk-core", () => {
  it("summarizes bulk template registration state", () => {
    const rows = [
      { node_id: "node_01", label: "A", registered: true },
      { node_id: "node_02", label: "B", registered: false, selected: true },
    ];
    expect(summarizeBulkTemplateRows(rows)).toEqual({
      total: 2,
      registered: 1,
      pending: 1,
    });
  });

  it("merges edited labels from the bulk table", () => {
    const template = [
      { node_id: "node_01", label: "Before", registered: false },
      { node_id: "node_02", label: "Two", registered: true },
    ];
    const merged = mergeBulkEditorRows(template, [
      { node_id: "node_01", label: "After", selected: true },
    ]);
    expect(merged[0]?.label).toBe("After");
    expect(merged[1]?.registered).toBe(true);
  });
});
