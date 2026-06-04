import { describe, expect, it } from "vitest";
import {
  childObjectAddCountLabel,
  childObjectAddHubSubcopy,
  shouldShowChildObjectAddHub,
} from "../../site/js/created-child-object-add-hub-core.mjs";

describe("created-child-object-add-hub-core", () => {
  it("shows hub for general root cards", () => {
    expect(shouldShowChildObjectAddHub({ pilot_template: "general" })).toBe(true);
  });

  it("hides hub for non-general pilots", () => {
    expect(shouldShowChildObjectAddHub({ pilot_template: "status_plate" })).toBe(false);
  });

  it("builds parent subcopy from available object types", () => {
    expect(childObjectAddHubSubcopy({ pilot_template: "general" })).toBe(
      "status plates · lost items · game nodes (setup)"
    );
    expect(
      childObjectAddHubSubcopy({
        pilot_template: "general",
        issuer_public_key: "abc123",
      })
    ).toBe("status plates · lost items · game nodes");
  });

  it("formats registered count labels", () => {
    expect(childObjectAddCountLabel(0)).toBeNull();
    expect(childObjectAddCountLabel(1)).toBe("1 registered");
    expect(childObjectAddCountLabel(3)).toBe("3 registered");
  });
});
