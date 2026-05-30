import { describe, expect, it } from "vitest";

import {
  CREATED_VIEW_LIVE_PROOF_ID,
  CREATED_VIEW_LIVE_SIGNING_ONLY_IDS,
  createdViewDefaultTabId,
} from "../../site/js/created-view-live-core.mjs";

describe("created-view-live-core", () => {
  it("defaults to Live tab without restore hash", () => {
    expect(createdViewDefaultTabId(null)).toBe("now");
    expect(createdViewDefaultTabId(undefined)).toBe("now");
  });

  it("opens Manage when hash targets restore", () => {
    expect(createdViewDefaultTabId("recovery")).toBe("advanced");
    expect(createdViewDefaultTabId("backup")).toBe("advanced");
  });

  it("lists signing-only Live sections", () => {
    expect(CREATED_VIEW_LIVE_SIGNING_ONLY_IDS).toContain("created-live-primary-block");
    expect(CREATED_VIEW_LIVE_SIGNING_ONLY_IDS).toContain("created-live-scanners-see");
    expect(CREATED_VIEW_LIVE_PROOF_ID).toBe("live-control-proof");
  });
});
