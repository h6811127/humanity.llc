import { describe, expect, it } from "vitest";

import {
  mergeTracking,
  parsePrintifyTrackingFromOrderBody,
  parsePrintifyTrackingFromWebhookData,
  trackingIsEmpty,
} from "../src/print/printify-tracking";

describe("printify-tracking edges", () => {
  it("treats null, empty, and whitespace-only tracking as empty", () => {
    expect(trackingIsEmpty(null)).toBe(true);
    expect(
      trackingIsEmpty({ carrier: null, tracking_number: null, tracking_url: null })
    ).toBe(true);
    expect(
      parsePrintifyTrackingFromOrderBody({
        shipments: [{ carrier: "   ", number: "", url: "  " }],
      })
    ).toBeNull();
  });

  it("rejects oversize carrier, number, and URL fields", () => {
    expect(
      parsePrintifyTrackingFromOrderBody({
        shipments: [
          {
            carrier: "C".repeat(81),
            tracking_number: "N".repeat(121),
            tracking_url: "https://example.com/" + "u".repeat(500),
          },
        ],
      })
    ).toBeNull();
  });

  it("accepts camelCase aliases on a single shipment object", () => {
    expect(
      parsePrintifyTrackingFromOrderBody({
        tracking: {
          carrier: "USPS",
          trackingNumber: "9400",
          trackingUrl: "https://tools.usps.com/go/TrackConfirmAction",
        },
      })
    ).toEqual({
      carrier: "USPS",
      tracking_number: "9400",
      tracking_url: "https://tools.usps.com/go/TrackConfirmAction",
    });
  });

  it("returns null for non-objects and empty shipment lists", () => {
    expect(parsePrintifyTrackingFromOrderBody(null)).toBeNull();
    expect(parsePrintifyTrackingFromOrderBody("usps")).toBeNull();
    expect(parsePrintifyTrackingFromOrderBody({ shipments: [] })).toBeNull();
    expect(parsePrintifyTrackingFromWebhookData(undefined)).toBeNull();
  });

  it("prefers a number-only shipment over carrier-only when no URL exists", () => {
    expect(
      parsePrintifyTrackingFromWebhookData({
        shipments: [{ carrier: "UPS" }, { tracking_number: "1Z999" }],
      })
    ).toEqual({
      carrier: null,
      tracking_number: "1Z999",
      tracking_url: null,
    });
  });

  it("keeps existing tracking when incoming is empty", () => {
    const existing = {
      carrier: "USPS",
      tracking_number: "111",
      tracking_url: "https://track.example/111",
    };
    expect(mergeTracking(existing, null)).toEqual(existing);
    expect(
      mergeTracking(existing, {
        carrier: null,
        tracking_number: null,
        tracking_url: null,
      })
    ).toEqual(existing);
  });

  it("takes incoming tracking when existing is empty", () => {
    const incoming = {
      carrier: "DHL",
      tracking_number: "JD01",
      tracking_url: null,
    };
    expect(mergeTracking(null, incoming)).toEqual(incoming);
    expect(
      mergeTracking(
        { carrier: null, tracking_number: null, tracking_url: null },
        incoming
      )
    ).toEqual(incoming);
  });
});
