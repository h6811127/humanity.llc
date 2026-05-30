import { describe, expect, it } from "vitest";

import { createdViewLiveQrTasksVisible } from "../../site/js/created-view-live-readonly-core.mjs";

describe("createdViewLiveQrTasksVisible", () => {
  it("shows read-only QR tasks only in view mode", () => {
    expect(createdViewLiveQrTasksVisible("view")).toBe(true);
    expect(createdViewLiveQrTasksVisible("control")).toBe(false);
    expect(createdViewLiveQrTasksVisible("setup")).toBe(false);
  });
});
