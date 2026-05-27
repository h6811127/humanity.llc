import { describe, expect, it } from "vitest";

import {
  normalizeMerchFunnelEvent,
  normalizeMerchFunnelRef,
  utcDayKey,
} from "../src/commerce/merch-funnel-core";
import {
  appendMerchRefToCreateUrl,
  appendMerchRefToHref,
  normalizeMerchRef,
} from "../../site/js/merch-funnel-core.mjs";

describe("merch-funnel-core (server)", () => {
  it("accepts allowed refs and rejects unknown", () => {
    expect(normalizeMerchFunnelRef("tier0_sticker")).toBe("tier0_sticker");
    expect(normalizeMerchFunnelRef(" TIER0_SHOP ")).toBe("tier0_shop");
    expect(normalizeMerchFunnelRef("customize_hoodie")).toBe("customize_hoodie");
    expect(normalizeMerchFunnelRef("unknown_campaign")).toBeNull();
    expect(normalizeMerchFunnelRef("")).toBeNull();
  });

  it("accepts funnel events", () => {
    expect(normalizeMerchFunnelEvent("scan_landing")).toBe("scan_landing");
    expect(normalizeMerchFunnelEvent("create_attributed")).toBe("create_attributed");
    expect(normalizeMerchFunnelEvent("page_view")).toBeNull();
  });

  it("formats UTC day keys", () => {
    expect(utcDayKey("2026-05-27T15:30:00.000Z")).toBe("2026-05-27");
  });
});

describe("merch-funnel-core (client)", () => {
  it("matches server ref allowlist", () => {
    expect(normalizeMerchRef("tier0_sticker")).toBe("tier0_sticker");
    expect(normalizeMerchRef("bad ref")).toBeNull();
  });

  it("appends hc_ref to create URLs", () => {
    expect(
      appendMerchRefToCreateUrl("/create/", "tier0_sticker")
    ).toBe("/create/?hc_ref=tier0_sticker");
    expect(
      appendMerchRefToCreateUrl("/wallet/", "tier0_sticker")
    ).toBe("/wallet/");
  });

  it("appends hc_ref to customize and other shop URLs", () => {
    expect(
      appendMerchRefToHref("/shop/customize/", "scan_customize")
    ).toBe("/shop/customize/?hc_ref=scan_customize");
    expect(
      appendMerchRefToHref("/shop/customize/?product=hoodie", "scan_customize")
    ).toBe("/shop/customize/?product=hoodie&hc_ref=scan_customize");
  });
});
