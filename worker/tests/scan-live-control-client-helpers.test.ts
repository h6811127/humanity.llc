import { describe, expect, it } from "vitest";

import { scanLiveControlClientHelpersJs } from "../src/resolver/scan-live-control-client-helpers";

describe("scan-live-control-client-helpers", () => {
  it("exports safe JSON parse and plain-language error helpers", () => {
    const js = scanLiveControlClientHelpersJs();
    expect(js).toContain("parseLiveControlJsonResponse");
    expect(js).toContain("liveControlChallengeCreateError");
    expect(js).toContain("stripResolverUrlsFromMessage");
    expect(js).toContain("Control check is temporarily unavailable. Try again shortly.");
    expect(js).toContain("Could not start control check. Try again in a moment.");
    expect(js).toContain("Could not reach humanity.llc.");
  });
});
