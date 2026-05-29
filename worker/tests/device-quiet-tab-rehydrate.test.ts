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
});
