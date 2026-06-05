import { describe, expect, it } from "vitest";

import {
  CREATE_CUSTODY_DEVICE_UNLOCK_DEFAULT_HINT,
  CREATE_CUSTODY_SUMMARY,
  CREATE_PUBLIC_CARD_NOTICE,
  CREATE_RECOVERY_HINT_DEVICE_UNLOCK,
} from "../../site/js/device-ownership-copy-core.mjs";

describe("create trust stack copy (P0)", () => {
  it("public notice is one honest sentence without protocol stack", () => {
    expect(CREATE_PUBLIC_CARD_NOTICE).toMatch(/public/i);
    expect(CREATE_PUBLIC_CARD_NOTICE).not.toMatch(/network/i);
    expect(CREATE_PUBLIC_CARD_NOTICE.length).toBeLessThan(180);
  });

  it("recovery hint before submit stays short and mentions operator limit", () => {
    expect(CREATE_RECOVERY_HINT_DEVICE_UNLOCK).toMatch(/next screen/i);
    expect(CREATE_RECOVERY_HINT_DEVICE_UNLOCK).toMatch(/not stored by humanity/i);
  });

  it("custody summary uses task language", () => {
    expect(CREATE_CUSTODY_SUMMARY).toBe("Use this device to manage updates.");
    expect(CREATE_CUSTODY_DEVICE_UNLOCK_DEFAULT_HINT.toLowerCase()).not.toContain("signing key");
  });
});
