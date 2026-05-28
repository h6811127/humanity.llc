import { describe, expect, it } from "vitest";

import {
  formatUsdCents,
  parsePrintifyShippingQuoteOptions,
  pickShippingQuoteOption,
} from "../src/print/printify-shipping-quote";

describe("parsePrintifyShippingQuoteOptions", () => {
  it("parses array of shipping methods", () => {
    const options = parsePrintifyShippingQuoteOptions([
      { id: 1, name: "Standard", cost: 399, currency: "USD" },
      { id: 2, name: "Express", cost: 899, currency: "USD" },
    ]);
    expect(options).toHaveLength(2);
    expect(options[0]).toEqual({
      shipping_method_id: 1,
      label: "Standard",
      shipping_cost: 399,
      currency: "USD",
    });
  });

  it("prefers configured shipping method id", () => {
    const options = parsePrintifyShippingQuoteOptions([
      { id: 1, name: "Standard", cost: 399 },
      { id: 2, name: "Express", cost: 899 },
    ]);
    expect(pickShippingQuoteOption(options, 2)?.label).toBe("Express");
  });

  it("parses Printify compact shipping map", () => {
    const options = parsePrintifyShippingQuoteOptions({ standard: 849, priority: 1299 });
    expect(options).toEqual([
      {
        shipping_method_id: 1,
        label: "Standard",
        shipping_cost: 849,
        currency: "USD",
      },
      {
        shipping_method_id: 2,
        label: "Priority",
        shipping_cost: 1299,
        currency: "USD",
      },
    ]);
    expect(pickShippingQuoteOption(options, 1)?.shipping_cost).toBe(849);
  });

  it("formats USD cents for display", () => {
    expect(formatUsdCents(399)).toBe("$3.99");
  });
});
