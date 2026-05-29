import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("device-quiet-tab-rehydrate wiring", () => {
  it("device-status awaits quiet rehydrate before chrome refresh", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "site/js/device-status.mjs"),
      "utf8"
    );
    expect(src).toContain("maybeQuietTabRehydrate");
    expect(src).toContain("bootDeviceStatusShell");
    expect(src).toContain("await maybeQuietTabRehydrate()");
  });

  it("quiet rehydrate applies Tier 3 cross-tab demotion on success", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "site/js/device-quiet-tab-rehydrate.mjs"),
      "utf8"
    );
    expect(src).toContain("applyQuietRehydrateCrossTabDemotion");
    expect(src).toContain("notifyProfileSavedOnDevice");
    expect(src).toContain("setQuietTabRehydratedProfile");
  });

  it("shell presence filters cross-tab after quiet rehydrate", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "site/js/device-tab-presence.mjs"),
      "utf8"
    );
    expect(src).toContain("getQuietTabRehydratedProfile");
    expect(src).toContain("filterCrossTabEntriesAfterQuietRehydrate");
  });
});
