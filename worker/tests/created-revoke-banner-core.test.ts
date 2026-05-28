import { describe, expect, it } from "vitest";

import {
  applyOwnerRevokedBanner,
  ownerRevokedBannerMessage,
  ownerRevokedBannerShouldShow,
} from "../../site/js/created-revoke-banner-core.mjs";

describe("ownerRevokedBannerMessage", () => {
  it("returns copy for known revoke kinds only", () => {
    expect(ownerRevokedBannerMessage("card")).toContain("Card disabled");
    expect(ownerRevokedBannerMessage("qr_credential")).toContain("This QR is revoked");
    expect(ownerRevokedBannerMessage("unknown")).toBe("");
    expect(ownerRevokedBannerMessage(undefined)).toBe("");
  });
});

describe("ownerRevokedBannerShouldShow", () => {
  it("is false when message is empty", () => {
    expect(ownerRevokedBannerShouldShow("card")).toBe(true);
    expect(ownerRevokedBannerShouldShow(undefined)).toBe(false);
  });
});

describe("applyOwnerRevokedBanner", () => {
  it("hides and clears text when kind is unknown", () => {
    const el = {
      hidden: false,
      textContent: "stale",
    };
    applyOwnerRevokedBanner(/** @type {HTMLElement} */ (el), undefined);
    expect(el.hidden).toBe(true);
    expect(el.textContent).toBe("");
  });

  it("sets message before unhiding", () => {
    const el = {
      hidden: true,
      textContent: "",
    };
    applyOwnerRevokedBanner(/** @type {HTMLElement} */ (el), "qr_credential");
    expect(el.hidden).toBe(false);
    expect(el.textContent).toContain("revoked");
  });
});
