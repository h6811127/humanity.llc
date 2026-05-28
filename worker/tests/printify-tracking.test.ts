import { describe, expect, it } from "vitest";

import {
  mergeTracking,
  parsePrintifyTrackingFromOrderBody,
  parsePrintifyTrackingFromWebhookData,
} from "../src/print/printify-tracking";

describe("printify-tracking", () => {
  it("parses tracking from Printify order shipments array", () => {
    const tracking = parsePrintifyTrackingFromOrderBody({
      status: "fulfilled",
      shipments: [
        {
          carrier: "USPS",
          tracking_number: "9400111899223344556677",
          tracking_url: "https://tools.usps.com/go/TrackConfirmAction",
        },
      ],
    });
    expect(tracking).toEqual({
      carrier: "USPS",
      tracking_number: "9400111899223344556677",
      tracking_url: "https://tools.usps.com/go/TrackConfirmAction",
    });
  });

  it("parses tracking from webhook shipment payload", () => {
    const tracking = parsePrintifyTrackingFromWebhookData({
      status: "fulfilled",
      shipments: [{ carrier: "UPS", number: "1Z999", url: "https://www.ups.com/track" }],
    });
    expect(tracking?.carrier).toBe("UPS");
    expect(tracking?.tracking_number).toBe("1Z999");
    expect(tracking?.tracking_url).toBe("https://www.ups.com/track");
  });

  it("prefers a shipment with a tracking URL over number-only candidates", () => {
    const tracking = parsePrintifyTrackingFromOrderBody({
      status: "fulfilled",
      shipments: [
        { carrier: "UPS", tracking_number: "1ZNUMBERONLY" },
        {
          carrier: "USPS",
          tracking_number: "9400111899223344556677",
          tracking_url: "https://tools.usps.com/go/TrackConfirmAction",
        },
      ],
    });

    expect(tracking).toEqual({
      carrier: "USPS",
      tracking_number: "9400111899223344556677",
      tracking_url: "https://tools.usps.com/go/TrackConfirmAction",
    });
  });

  it("falls back to webhook shipping object when shipments are absent", () => {
    const tracking = parsePrintifyTrackingFromWebhookData({
      status: "fulfilled",
      shipping: {
        carrier: "DHL",
        number: "JD014600006555555555",
        url: "https://www.dhl.com/us-en/home/tracking.html",
      },
    });

    expect(tracking).toEqual({
      carrier: "DHL",
      tracking_number: "JD014600006555555555",
      tracking_url: "https://www.dhl.com/us-en/home/tracking.html",
    });
  });

  it("mergeTracking prefers incoming fields", () => {
    expect(
      mergeTracking(
        { carrier: "USPS", tracking_number: "111", tracking_url: null },
        { carrier: null, tracking_number: "222", tracking_url: "https://track.example" }
      )
    ).toEqual({
      carrier: "USPS",
      tracking_number: "222",
      tracking_url: "https://track.example",
    });
  });
});
