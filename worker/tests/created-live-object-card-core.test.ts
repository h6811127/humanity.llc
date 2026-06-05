import { describe, expect, it } from "vitest";

import {
  CREATED_LIVE_OBJECT_LIMIT_TEASER,
  CREATED_LIVE_PUBLISH_CONFIRM,
  createdLiveObjectArriveSequenceMs,
  createdLiveObjectStatusChipLabel,
} from "../../site/js/created-live-object-card-core.mjs";

describe("createdLiveObjectStatusChipLabel", () => {
  it("maps active network labels", () => {
    expect(createdLiveObjectStatusChipLabel("Active")).toBe("QR active");
    expect(createdLiveObjectStatusChipLabel("reachable")).toBe("QR active");
  });

  it("returns null for empty placeholders", () => {
    expect(createdLiveObjectStatusChipLabel(" - ")).toBeNull();
    expect(createdLiveObjectStatusChipLabel("")).toBeNull();
  });

  it("passes through revoked and expired", () => {
    expect(createdLiveObjectStatusChipLabel("Revoked")).toBe("QR revoked");
    expect(createdLiveObjectStatusChipLabel("expired")).toBe("QR expired");
  });
});

describe("createdLiveObjectArriveSequenceMs", () => {
  it("includes forming, stagger, and settle windows", () => {
    expect(createdLiveObjectArriveSequenceMs(3)).toBeGreaterThan(500);
  });
});

describe("copy constants", () => {
  it("exposes limit teaser and publish confirm", () => {
    expect(CREATED_LIVE_OBJECT_LIMIT_TEASER).toContain("Scanners see");
    expect(CREATED_LIVE_PUBLISH_CONFIRM).toBe("Same ink. New meaning.");
  });
});
