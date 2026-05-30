import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("device-wallet-corrupt-core", () => {
  it("exports shared import/help actions for hub corrupt card", async () => {
    const mod = await import("../../site/js/device-wallet-corrupt-core.mjs");
    expect(mod.WALLET_CORRUPT_IMPORT_ATTR).toBe("data-wallet-corrupt-import");
    expect(mod.walletCorruptActionsHtml()).toContain("data-wallet-corrupt-import");
    expect(mod.walletCorruptActionsHtml()).toContain("/help/#ownership");
  });

  it("hub and wallet chrome use shared corrupt scroll helper", () => {
    const hubSrc = readFileSync(
      join(root, "site/js/device-hub-wallet-corrupt.mjs"),
      "utf8"
    );
    const walletSrc = readFileSync(join(root, "site/js/wallet-page-chrome.mjs"), "utf8");
    expect(hubSrc).toContain("device-wallet-corrupt-core.mjs");
    expect(walletSrc).toContain("scrollToHubImportForm");
    expect(walletSrc).toContain("WALLET_CORRUPT_HELP_HREF");
    expect(walletSrc).toContain("WALLET_CORRUPT_PAGE_DETAIL");
  });
});
