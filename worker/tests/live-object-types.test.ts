import { describe, expect, it } from "vitest";

import {
  CHILD_OBJECT_TYPE_GAME_NODE,
  CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
  CHILD_OBJECT_TYPE_STATUS_PLATE,
  isPhaseAChildObjectType,
} from "../src/live-object/object-types";

describe("isPhaseAChildObjectType", () => {
  it("accepts Phase A pilot object types", () => {
    expect(isPhaseAChildObjectType(CHILD_OBJECT_TYPE_STATUS_PLATE)).toBe(true);
    expect(isPhaseAChildObjectType(CHILD_OBJECT_TYPE_LOST_ITEM_RELAY)).toBe(true);
  });

  it("rejects game_node and unknown / empty types", () => {
    expect(isPhaseAChildObjectType(CHILD_OBJECT_TYPE_GAME_NODE)).toBe(false);
    expect(isPhaseAChildObjectType("menu")).toBe(false);
    expect(isPhaseAChildObjectType("")).toBe(false);
    expect(isPhaseAChildObjectType(null)).toBe(false);
    expect(isPhaseAChildObjectType(undefined)).toBe(false);
  });
});
