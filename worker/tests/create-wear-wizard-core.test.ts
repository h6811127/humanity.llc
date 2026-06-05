import { describe, expect, it } from "vitest";

import {
  WEAR_PRINT_FOCUS,
  createdWearPrintHref,
  isWearCreateIntent,
  resolveWearSubmitStrategy,
  wearRootManifesto,
  wearSubmitButtonLabel,
} from "../../site/js/create-wear-wizard-core.mjs";

describe("isWearCreateIntent", () => {
  it("detects intent=wear", () => {
    expect(isWearCreateIntent(new URLSearchParams("intent=wear"))).toBe(true);
    expect(isWearCreateIntent(new URLSearchParams("intent=deploy"))).toBe(false);
  });
});

describe("resolveWearSubmitStrategy", () => {
  it("creates wear card when no saved general root", () => {
    expect(
      resolveWearSubmitStrategy({
        searchParams: new URLSearchParams("intent=wear"),
        walletEntries: [],
      })
    ).toBe("create_wear_card");
  });

  it("redirects when a general root with keys exists", () => {
    expect(
      resolveWearSubmitStrategy({
        searchParams: new URLSearchParams("intent=wear"),
        walletEntries: [
          {
            pilot_template: "general",
            profile_id: "p1",
            owner_private_key_b58: "priv",
          },
        ],
      })
    ).toBe("redirect_live");
  });
});

describe("createdWearPrintHref", () => {
  it("builds /created/ handoff with wear-print focus", () => {
    const href = createdWearPrintHref(
      { profile_id: "prof1", qr_id: "qr1" },
      "https://humanity.llc",
      { fresh: true }
    );
    expect(href).toContain("/created/?");
    expect(href).toContain("profile_id=prof1");
    expect(href).toContain("qr_id=qr1");
    expect(href).toContain(`focus=${WEAR_PRINT_FOCUS}`);
    expect(href).toContain("fresh=1");
  });
});

describe("wearRootManifesto", () => {
  it("prefers steward line over handle default", () => {
    expect(wearRootManifesto("river", "Open studio hours")).toBe("Open studio hours");
    expect(wearRootManifesto("river", "")).toContain("@river");
  });
});

describe("wearSubmitButtonLabel", () => {
  it("labels redirect and create paths", () => {
    expect(wearSubmitButtonLabel("redirect_live")).toContain("wearable QR");
    expect(wearSubmitButtonLabel("create_wear_card")).toContain("print QR");
  });
});
