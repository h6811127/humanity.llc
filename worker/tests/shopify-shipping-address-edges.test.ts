import { describe, expect, it } from "vitest";

import { parseShopifyOrderShippingAddress } from "../src/commerce/shopify-shipping-address";
import type { ShopifyOrderLike } from "../src/commerce/shopify-order-metadata";

function order(
  shipping: Record<string, unknown> | null | undefined,
  email: unknown = "Buyer@Example.com"
): ShopifyOrderLike {
  return {
    id: 42,
    email: email as ShopifyOrderLike["email"],
    shipping_address: shipping as ShopifyOrderLike["shipping_address"],
  };
}

const COMPLETE_SHIP = {
  first_name: "Ada",
  last_name: "Lovelace",
  address1: "123 Example St",
  city: "Brooklyn",
  province_code: "NY",
  country_code: "US",
  zip: "11221",
};

describe("parseShopifyOrderShippingAddress leftover edges", () => {
  it("duplicates a single-token name into first and last", () => {
    const address = parseShopifyOrderShippingAddress(
      order({
        name: "Madonna",
        address1: "1 Main St",
        city: "Portland",
        province: "OR",
        country_code: "US",
        zip: "97201",
      })
    );
    expect(address?.first_name).toBe("Madonna");
    expect(address?.last_name).toBe("Madonna");
  });

  it("fills only the missing name half from a multi-token name", () => {
    const address = parseShopifyOrderShippingAddress(
      order({
        first_name: "Ada",
        name: "River Example",
        address1: "1 Main St",
        city: "Portland",
        province_code: "OR",
        country_code: "US",
        zip: "97201",
      })
    );
    expect(address?.first_name).toBe("Ada");
    expect(address?.last_name).toBe("Example");
  });

  it("prefers country_code over country and uppercases ISO", () => {
    const address = parseShopifyOrderShippingAddress(
      order({
        ...COMPLETE_SHIP,
        country_code: "ca",
        country: "United States",
      })
    );
    expect(address?.country).toBe("CA");
  });

  it("falls back to country when country_code is blank", () => {
    const address = parseShopifyOrderShippingAddress(
      order({
        ...COMPLETE_SHIP,
        country_code: "  ",
        country: "US",
      })
    );
    expect(address?.country).toBe("US");
  });

  it("prefers province_code over province", () => {
    const address = parseShopifyOrderShippingAddress(
      order({
        ...COMPLETE_SHIP,
        province_code: "ON",
        province: "Ontario",
      })
    );
    expect(address?.region).toBe("ON");
  });

  it("falls back to province when province_code is blank", () => {
    const address = parseShopifyOrderShippingAddress(
      order({
        ...COMPLETE_SHIP,
        province_code: "",
        province: "Oregon",
      })
    );
    expect(address?.region).toBe("Oregon");
  });

  it("lowercases email before Printify validation", () => {
    const address = parseShopifyOrderShippingAddress(
      order(COMPLETE_SHIP, "  Buyer@Example.COM  ")
    );
    expect(address?.email).toBe("buyer@example.com");
  });

  it("returns null when email is missing or blank", () => {
    expect(parseShopifyOrderShippingAddress(order(COMPLETE_SHIP, null))).toBeNull();
    expect(parseShopifyOrderShippingAddress(order(COMPLETE_SHIP, "   "))).toBeNull();
  });

  it("returns null when required address fields are missing", () => {
    expect(
      parseShopifyOrderShippingAddress(
        order({
          first_name: "Ada",
          last_name: "Lovelace",
          city: "Brooklyn",
          country_code: "US",
          zip: "11221",
        })
      )
    ).toBeNull();
    expect(
      parseShopifyOrderShippingAddress(
        order({
          ...COMPLETE_SHIP,
          country_code: "",
          country: "",
        })
      )
    ).toBeNull();
  });

  it("returns null for a non-object shipping_address", () => {
    expect(parseShopifyOrderShippingAddress(order(null))).toBeNull();
    expect(
      parseShopifyOrderShippingAddress({
        id: 1,
        email: "buyer@example.com",
        shipping_address: "not-an-object" as unknown as ShopifyOrderLike["shipping_address"],
      })
    ).toBeNull();
  });
});
