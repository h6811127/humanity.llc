import { describe, expect, it } from "vitest";

import {
  scanLayoutForMinimalFailureTrust,
  scanLayoutForRevocationDisplay,
} from "../src/resolver/revocation-display";

describe("scan layout for revocation display (F2-9)", () => {
  it("minimal failure trust keeps card and QR groups, hides human trust", () => {
    const layout = scanLayoutForMinimalFailureTrust();
    expect(layout.minimalScan).toBe(true);
    expect(layout.showCardBlock).toBe(true);
    expect(layout.showArtifactBlock).toBe(true);
    expect(layout.showHumanTrustBlock).toBe(false);
    expect(layout.showLiveControlBlock).toBe(false);
  });

  it("tombstone mode uses full status panel without QR artifact group", () => {
    const layout = scanLayoutForRevocationDisplay({
      display_mode: "tombstone",
      public_reason: "event_ended",
    });
    expect(layout.minimalScan).toBe(false);
    expect(layout.showCardBlock).toBe(true);
    expect(layout.showArtifactBlock).toBe(false);
  });
});
