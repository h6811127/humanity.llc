import { describe, expect, it } from "vitest";

import {
  patchWalletEntryFromCardMeta,
  repairWalletEntriesFromResolver,
} from "../../site/js/device-wallet-scan-url-repair.mjs";

const PROFILE_ID = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_ID = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3c";
const ORIGIN = "https://humanity.llc";

describe("device-wallet-scan-url-repair", () => {
  it("patches wallet row from resolver card metadata", () => {
    const patched = patchWalletEntryFromCardMeta(
      {
        profile_id: PROFILE_ID,
        scan_url: `${ORIGIN}/c/${PROFILE_ID}`,
        label: PROFILE_ID.slice(0, 12),
      },
      ORIGIN,
      {
        qrId: QR_ID,
        handle: "spencer",
        manifestoLine: "Be human.",
        ownerPublicKey: null,
      }
    );
    expect(patched.qr_id).toBe(QR_ID);
    expect(patched.scan_url).toContain("?q=");
    expect(patched.label).toBe("@spencer");
  });

  it("fetches active_qr_id and repairs broken scan_url rows", async () => {
    const result = await repairWalletEntriesFromResolver(
      [
        {
          profile_id: PROFILE_ID,
          scan_url: `${ORIGIN}/c/${PROFILE_ID}`,
        },
      ],
      ORIGIN,
      async () => ({
        qrId: QR_ID,
        handle: "spencer",
        manifestoLine: null,
        ownerPublicKey: null,
      })
    );
    expect(result.changed).toBe(true);
    expect(result.entries[0].qr_id).toBe(QR_ID);
    expect(result.entries[0].scan_url).toBe(
      `${ORIGIN}/c/${encodeURIComponent(PROFILE_ID)}?q=${encodeURIComponent(QR_ID)}`
    );
  });
});
