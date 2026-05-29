import { describe, expect, it } from "vitest";

import {
  createdControlRootVisibleForMode,
  createdViewRestoreHashKey,
} from "../../site/js/created-view-mode-core.mjs";

describe("created-view-mode-core", () => {
  it("shows control root for control and view modes", () => {
    expect(createdControlRootVisibleForMode("control")).toBe(true);
    expect(createdControlRootVisibleForMode("view")).toBe(true);
    expect(createdControlRootVisibleForMode("setup")).toBe(false);
  });

  it("recognizes restore hash keys", () => {
    expect(createdViewRestoreHashKey("#recovery")).toBe("recovery");
    expect(createdViewRestoreHashKey("#backup")).toBe("backup");
    expect(createdViewRestoreHashKey("#restore")).toBe("restore");
    expect(createdViewRestoreHashKey("#revoke")).toBe(null);
  });
});
