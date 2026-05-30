import { describe, expect, it } from "vitest";

import {
  childObjectPatchPlan,
  childObjectRowSignature,
  childObjectRowsUnchanged,
} from "../../site/js/hub-child-object-patch-core.mjs";

describe("childObjectRowSignature", () => {
  it("orders object ids for stable compare", () => {
    const sig = childObjectRowSignature([
      { object_id: "b" },
      { object_id: "a" },
    ]);
    expect(sig).toBe("a|b");
    expect(childObjectRowsUnchanged(sig, "a|b")).toBe(true);
    expect(childObjectRowsUnchanged(sig, "a")).toBe(false);
  });
});

describe("childObjectPatchPlan", () => {
  it("plans add and remove", () => {
    const plan = childObjectPatchPlan(["a", "b"], ["b", "c"]);
    expect(plan.toRemove).toEqual(["a"]);
    expect(plan.toAdd).toEqual(["c"]);
    expect(plan.toKeep).toEqual(["b"]);
    expect(plan.changed).toBe(true);
  });

  it("no change when ids match", () => {
    const plan = childObjectPatchPlan(["a"], ["a"]);
    expect(plan.changed).toBe(false);
  });
});
