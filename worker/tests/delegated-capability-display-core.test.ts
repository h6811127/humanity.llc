import { describe, expect, it } from "vitest";

import {
  delegatedAccessHintsByObjectId,
  delegatedAccessHintForObject,
} from "../../site/js/delegated-capability-display-core.mjs";

describe("delegated-capability-display-core", () => {
  it("skips revoked and expired capabilities", () => {
    const hints = delegatedAccessHintsByObjectId(
      [
        { status: "revoked", expires_at: "2027-01-01T00:00:00Z", scope: { object_ids: ["obj_a"] } },
        {
          status: "active",
          expires_at: "2026-01-01T00:00:00Z",
          scope: { object_ids: ["obj_b"] },
        },
        {
          status: "active",
          expires_at: "2027-06-01T00:00:00Z",
          scope: { object_ids: ["obj_c"] },
        },
      ],
      Date.parse("2026-06-01T00:00:00Z")
    );
    expect(hints.has("obj_a")).toBe(false);
    expect(hints.has("obj_b")).toBe(false);
    expect(hints.get("obj_c")).toContain("Limited signer");
  });

  it("delegatedAccessHintForObject reads from map", () => {
    const map = new Map([["obj_x", "Limited signer · expires Jun 1, 2027"]]);
    expect(delegatedAccessHintForObject(map, "obj_x")).toContain("Limited signer");
    expect(delegatedAccessHintForObject(map, "obj_y")).toBeNull();
  });
});
