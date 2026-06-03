import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { walletEntryHasSigningMaterial } from "../../site/js/device-tab-session-core.mjs";
import { walletEntryPublicView } from "../../site/js/device-wallet.mjs";
import { buildWalletSummary } from "../../site/js/device-wallet-summary-core.mjs";
import { qrIdFromScanUrl } from "../../site/js/device-wallet.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("recovery import → Open controls (regression)", () => {
  it("treats recovery-only wallet rows as having signing material", () => {
    const entry = {
      profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      recovery_private_key_b58: "recPriv",
      recovery_public_key_b58: "recPub",
      recovery_key_acknowledged: true,
    };
    expect(walletEntryHasSigningMaterial(entry)).toBe(true);
    expect(walletEntryPublicView(entry).has_signing_key).toBe(true);
    const summary = buildWalletSummary([entry], "fp", qrIdFromScanUrl);
    expect(summary.signingKeyCount).toBe(1);
  });

  it("openCardNowPageGated activates recovery keys before navigation", () => {
    const src = readFileSync(
      join(root, "site/js/device-control-activation.mjs"),
      "utf8"
    );
    expect(src).toContain("tabSessionHasSigningKeys(target)");
    expect(src).not.toMatch(/target\?\.owner_private_key_b58\s*\)\s*\{/);
  });

  it("createdPageUrlForEntry activates recovery keys for steward deep links", () => {
    const src = readFileSync(join(root, "site/js/device-keys.mjs"), "utf8");
    expect(src).toContain("tabSessionHasSigningKeys(target) && !opts.skipActivate");
  });

  it("hub entryHasSigningMaterial includes recovery-only public views", () => {
    const publicView = walletEntryPublicView({
      profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      recovery_private_key_b58: "recPriv",
    });
    expect(walletEntryHasSigningMaterial(publicView)).toBe(true);
  });
});
