import { describe, expect, it } from "vitest";

import {
  buildDeviceUnlockUser,
  deviceUnlockRpId,
  parseWrappedOwnerKey,
  resolveDeviceUnlockRpId,
} from "../../site/js/device-custody-webauthn-core.mjs";
import { WRAPPED_OWNER_KEY_VERSION } from "../../site/js/device-custody-mode-core.mjs";

describe("device-custody-webauthn-core", () => {
  it("resolves rpId for local and production hosts", () => {
    expect(resolveDeviceUnlockRpId("localhost")).toBe("localhost");
    expect(resolveDeviceUnlockRpId("127.0.0.1")).toBe("127.0.0.1");
    expect(resolveDeviceUnlockRpId("staging.humanity.llc")).toBe("humanity.llc");
    expect(deviceUnlockRpId()).toBe("humanity.llc");
  });

  it("builds stable user handle from profile id", () => {
    const user = buildDeviceUnlockUser("prof_abc123", "My card");
    expect(user.name).toBe("prof_abc123");
    expect(user.displayName).toBe("My card");
    expect(user.id).toBeInstanceOf(Uint8Array);
  });

  it("parses wrapped owner key v1", () => {
    const wrap = {
      version: WRAPPED_OWNER_KEY_VERSION,
      credential_id: "cred-id",
      prf_salt: "salt",
      iv: "iv",
      ciphertext: "cipher",
    };
    expect(parseWrappedOwnerKey(wrap)).toEqual(wrap);
    expect(parseWrappedOwnerKey({ ...wrap, version: 99 })).toBeNull();
  });
});
