import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("device-hub-import", () => {
  it("uses mergeBackupIntoWallet and offers Open card controls after import", () => {
    const src = readFileSync(
      join(process.cwd(), "site/js/device-hub-import.mjs"),
      "utf8"
    );
    expect(src).toContain("mergeBackupIntoWallet");
    expect(src).toContain("hub-import-open-controls");
    expect(src).toContain("activateWalletEntry");
    expect(src).toContain("openCardNowPage");
  });
});
