import { describe, expect, it } from "vitest";

import {
  applyDocketChapterMintReceiptToPin,
  applyDocketChapterMintReceiptToRegistry,
  assessDocketChapterMintExecution,
  buildDocketChapterMintReceipt,
  docketChapterCasefileObjectId,
  isMintableDocketChildQrPair,
  isMintedDocketChildScanPath,
  validateDocketChapterMintReceipt,
} from "../../site/js/docket-chapter-mint-core.mjs";

const GOOD_PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD";
const GOOD_QR = "qr_7Xk9mP2nQ4rT6vW8";

describe("docket chapter mint id + production edges", () => {
  it("rejects Base58-lookalike ids that include 0 O I or l", () => {
    expect(isMintableDocketChildQrPair(GOOD_PROFILE, GOOD_QR)).toBe(true);
    expect(isMintableDocketChildQrPair(`${GOOD_PROFILE}0`, GOOD_QR)).toBe(false);
    expect(isMintableDocketChildQrPair(GOOD_PROFILE.replace("X", "O"), GOOD_QR)).toBe(
      false
    );
    expect(isMintableDocketChildQrPair(GOOD_PROFILE, "qr_7Xk9mP2nQ4rT6vI8")).toBe(
      false
    );
    expect(isMintableDocketChildQrPair(GOOD_PROFILE, "qr_7Xk9mP2nQ4rT6vl8")).toBe(
      false
    );
    expect(isMintableDocketChildQrPair("short", GOOD_QR)).toBe(false);
    expect(isMintedDocketChildScanPath(`/c/${GOOD_PROFILE}?q=${GOOD_QR}`)).toBe(true);
    expect(
      isMintedDocketChildScanPath("/c/docketChapterCr01?q=qr_docket_chapter_cr_v1")
    ).toBe(false);
  });

  it("allows local mint without production flags and refuses --production off humanity.llc", () => {
    expect(
      assessDocketChapterMintExecution({
        apiOrigin: "http://127.0.0.1:8787/",
        scanOrigin: "http://127.0.0.1:8788",
        currentMintStatus: "fixture",
      })
    ).toMatchObject({ ok: true, isLocal: true, isProduction: false });

    const flaggedLocal = assessDocketChapterMintExecution({
      apiOrigin: "http://localhost:8787",
      scanOrigin: "http://localhost:8788",
      production: true,
      currentMintStatus: "fixture",
    });
    expect(flaggedLocal.ok).toBe(false);
    expect(flaggedLocal.errors.join(" ")).toMatch(/--production requires API_ORIGIN/);

    const badScan = assessDocketChapterMintExecution({
      apiOrigin: "https://humanity.llc",
      scanOrigin: "https://evil.example",
      production: true,
      confirmProduction: true,
      replay: true,
      currentMintStatus: "minted",
    });
    expect(badScan.ok).toBe(false);
    expect(badScan.errors.join(" ")).toMatch(/SCAN_ORIGIN must be https:\/\/humanity\.llc/);
  });

  it("refuses starter-four object ids and receipts", () => {
    expect(() => docketChapterCasefileObjectId("altman")).toThrow(/starter-four/);
    expect(docketChapterCasefileObjectId("")).toBeNull();
    expect(docketChapterCasefileObjectId("chapter-cr-research-circle")).toBe(
      "obj_docket_casefile_chapter-cr-research-circle"
    );

    expect(
      validateDocketChapterMintReceipt({
        version: 1,
        kind: "hc.docket.chapter_mint_receipt.v0",
        pin_id: "musk",
        object_id: "obj_docket_casefile_musk",
        object_type: "status_plate",
        parent_profile_id: GOOD_PROFILE,
        qr_id: GOOD_QR,
        scan_path: `/c/${GOOD_PROFILE}?q=${GOOD_QR}`,
        mint_status: "minted",
        writes_published_case_json: false,
        starter_four_safe: true,
      }).ok
    ).toBe(false);
  });

  it("refuses receipts that would write published case JSON or use fixture ids", () => {
    const receipt = buildDocketChapterMintReceipt({
      pinId: "chapter-cr-research-circle",
      profileId: GOOD_PROFILE,
      qrId: GOOD_QR,
      objectId: "obj_docket_casefile_chapter-cr-research-circle",
    });
    expect(validateDocketChapterMintReceipt(receipt).ok).toBe(true);
    expect(
      validateDocketChapterMintReceipt({
        ...receipt,
        writes_published_case_json: true,
      }).ok
    ).toBe(false);
    expect(() =>
      buildDocketChapterMintReceipt({
        pinId: "chapter-cr-research-circle",
        profileId: GOOD_PROFILE,
        qrId: GOOD_QR,
        objectId: "not_an_obj",
      })
    ).toThrow(/objectId must start with obj_/);
  });

  it("applies a receipt only to the matching chapter pin", () => {
    const receipt = buildDocketChapterMintReceipt({
      pinId: "chapter-cr-research-circle",
      profileId: GOOD_PROFILE,
      qrId: GOOD_QR,
      objectId: "obj_docket_casefile_chapter-cr-research-circle",
    });
    expect(() =>
      applyDocketChapterMintReceiptToPin(
        { id: "chapter-other", live_object: {} },
        receipt
      )
    ).toThrow(/does not match pin/);
    expect(() =>
      applyDocketChapterMintReceiptToRegistry({ pins: [] }, receipt)
    ).toThrow(/not found in registry/);

    const next = applyDocketChapterMintReceiptToRegistry(
      {
        pins: [
          { id: "chapter-other", mint_status: "fixture", live_object: {} },
          {
            id: "chapter-cr-research-circle",
            mint_status: "fixture",
            live_object: { scan_path: "/c/docketChapterCr01?q=qr_docket_chapter_cr_v1" },
          },
        ],
      },
      receipt
    );
    expect(next.pins[0].mint_status).toBe("fixture");
    expect(next.pins[1].mint_status).toBe("minted");
    expect(next.pins[1].live_object.scan_path).toBe(receipt.scan_path);
  });
});
