import { describe, expect, it } from "vitest";

import { showcaseHandle } from "../scripts/seed-showcase-core.mjs";

describe("seed-showcase-core", () => {
  it("showcaseHandle keeps base on first attempt", () => {
    expect(showcaseHandle("studio_door_showcase", 0)).toBe("studio_door_showcase");
  });

  it("showcaseHandle adds suffix on retry attempts", () => {
    const retry = showcaseHandle("studio_door_showcase", 1);
    expect(retry).toMatch(/^studio_door_showcase_[A-Za-z0-9]{6}$/);
    expect(retry).not.toBe("studio_door_showcase");
  });
});
