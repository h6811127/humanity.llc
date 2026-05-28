import { describe, expect, it } from "vitest";

import { parseShopifyOrderShippingAddress } from "../src/commerce/shopify-shipping-address";

describe("parseShopifyOrderShippingAddress", () => {
  it("maps Shopify shipping_address to Printify address_to", () => {
    const address = parseShopifyOrderShippingAddress({
      id: 1,
      email: "Buyer@Example.com",
      shipping_address: {
        first_name: "Ada",
        last_name: "Lovelace",
        address1: "123 Example St",
        address2: "Apt 4",
        city: "Brooklyn",
        province_code: "NY",
        country_code: "US",
        zip: "11221",
        phone: "+15555550123",
      },
    });

    expect(address).toEqual({
      first_name: "Ada",
      last_name: "Lovelace",
      email: "buyer@example.com",
      phone: "+15555550123",
      country: "US",
      region: "NY",
      address1: "123 Example St",
      address2: "Apt 4",
      city: "Brooklyn",
      zip: "11221",
    });
  });

  it("splits name when first/last missing", () => {
    const address = parseShopifyOrderShippingAddress({
      id: 1,
      email: "buyer@example.com",
      shipping_address: {
        name: "River Example",
        address1: "1 Main St",
        city: "Portland",
        province: "OR",
        country_code: "US",
        zip: "97201",
      },
    });

    expect(address?.first_name).toBe("River");
    expect(address?.last_name).toBe("Example");
  });

  it("returns null when shipping_address missing", () => {
    expect(parseShopifyOrderShippingAddress({ id: 1, email: "buyer@example.com" })).toBeNull();
  });
});
