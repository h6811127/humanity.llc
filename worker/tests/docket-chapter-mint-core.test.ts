import { describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

import {
  applyDocketChapterMintReceiptToRegistry,
  buildDocketChapterMintReceipt,
  isFixtureDocketChildScanPath,
  isMintableDocketChildQrPair,
  isMintedDocketChildScanPath,
  validateDocketChapterMintReceipt,
} from "../../site/js/docket-chapter-mint-core.mjs";
import { validateDocketChapterDiscoveryPins } from "../../site/js/docket-chapter-discovery-core.mjs";
import { parseDocketChildObjectScanPath } from "../../site/js/docket-live-object-bind-core.mjs";
import { assessWsDocketChapterMintPreflight } from "../scripts/ws-docket-chapter-mint-preflight-core.mjs";
import {
  buildWsDocketChapterMintKitHtml,
  validateWsDocketChapterMintKitHtml,
} from "../scripts/ws-docket-chapter-mint-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("docket-chapter-mint-core (QR-mint-v0)", () => {
  it("distinguishes fixture vs minted Base58 child QR paths", () => {
    expect(
      isFixtureDocketChildScanPath("/c/docketChapterCr01?q=qr_docket_chapter_cr_v1")
    ).toBe(true);
    expect(
      isMintedDocketChildScanPath("/c/docketChapterCr01?q=qr_docket_chapter_cr_v1")
    ).toBe(false);
    expect(
      isMintableDocketChildQrPair(
        "7Xk9mP2nQ4rT6vW8yZ1aB3cD",
        "qr_7Xk9mP2nQ4rT6vW8"
      )
    ).toBe(true);
    const path = "/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD?q=qr_7Xk9mP2nQ4rT6vW8";
    expect(isMintedDocketChildScanPath(path)).toBe(true);
    expect(parseDocketChildObjectScanPath(path)?.qrId).toBe("qr_7Xk9mP2nQ4rT6vW8");
  });

  it("builds a receipt and applies it to the chapter pins registry", () => {
    const pins = JSON.parse(
      readFileSync(join(root, "site/data/docket-chapter-discovery-pins.json"), "utf8")
    );
    expect(validateDocketChapterDiscoveryPins(pins).ok).toBe(true);

    const receipt = buildDocketChapterMintReceipt({
      pinId: "chapter-cr-research-circle",
      profileId: "7Xk9mP2nQ4rT6vW8yZ1aB3cD",
      qrId: "qr_7Xk9mP2nQ4rT6vW8",
      objectId: "obj_docket_casefile_chapter-cr-research-circle",
    });
    expect(validateDocketChapterMintReceipt(receipt).ok).toBe(true);
    expect(receipt.writes_published_case_json).toBe(false);

    const next = applyDocketChapterMintReceiptToRegistry(pins, receipt);
    expect(validateDocketChapterDiscoveryPins(next).ok).toBe(true);
    expect(next.pins[0].mint_status).toBe("minted");
    expect(next.pins[0].live_object.scan_path).toBe(receipt.scan_path);
  });

  it("refuses starter-four pin ids", () => {
    expect(() =>
      buildDocketChapterMintReceipt({
        pinId: "altman",
        profileId: "7Xk9mP2nQ4rT6vW8yZ1aB3cD",
        qrId: "qr_7Xk9mP2nQ4rT6vW8",
        objectId: "obj_docket_casefile_altman",
      })
    ).toThrow(/starter-four/);
  });
});

describe("ws-docket chapter mint kit + preflight", () => {
  it("builds valid kit HTML", () => {
    const html = buildWsDocketChapterMintKitHtml({
      origin: "http://127.0.0.1:8788",
    });
    expect(validateWsDocketChapterMintKitHtml(html)).toBe(true);
  });

  it("preflight ready after kit write", () => {
    expect(assessWsDocketChapterMintPreflight(root).engineeringMet).toBe(true);
  });
});
