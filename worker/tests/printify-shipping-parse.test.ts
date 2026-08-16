import { describe, expect, it } from "vitest";

import { parsePrintifyShippingAddress } from "../src/print/printify-shipping";

const VALID = {
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
  phone: "+15555550123",
  country: "us",
  region: "NY",
  address1: "123 Example St",
  address2: "Apt 4",
  city: "Brooklyn",
  zip: "11221",
};

describe("parsePrintifyShippingAddress", () => {
  it("accepts a complete address and uppercases country", () => {
    expect(parsePrintifyShippingAddress(VALID)).toEqual({
      ...VALID,
      country: "US",
    });
  });

  it("rejects non-objects and incomplete required fields", () => {
    expect(parsePrintifyShippingAddress(null)).toBeNull();
    expect(parsePrintifyShippingAddress("Ada")).toBeNull();
    expect(parsePrintifyShippingAddress({ first_name: "Ada" })).toBeNull();
    expect(parsePrintifyShippingAddress({ ...VALID, email: "   " })).toBeNull();
    expect(parsePrintifyShippingAddress({ ...VALID, address1: 123 })).toBeNull();
  });

  it("rejects oversize required fields and non-ISO country codes", () => {
    expect(parsePrintifyShippingAddress({ ...VALID, first_name: "A".repeat(81) })).toBeNull();
    expect(parsePrintifyShippingAddress({ ...VALID, email: `${"a".repeat(250)}@x.com` })).toBeNull();
    expect(parsePrintifyShippingAddress({ ...VALID, country: "USA" })).toBeNull();
    expect(parsePrintifyShippingAddress({ ...VALID, zip: "1".repeat(33) })).toBeNull();
    expect(parsePrintifyShippingAddress({ ...VALID, city: "C".repeat(121) })).toBeNull();
    expect(parsePrintifyShippingAddress({ ...VALID, address1: "S".repeat(201) })).toBeNull();
  });

  it("defaults optional phone, region, and address2 when missing or invalid", () => {
    expect(
      parsePrintifyShippingAddress({
        first_name: "Ada",
        last_name: "Lovelace",
        email: "ada@example.com",
        country: "US",
        address1: "123 Example St",
        city: "Brooklyn",
        zip: "11221",
      })
    ).toEqual({
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      phone: "",
      country: "US",
      region: "",
      address1: "123 Example St",
      address2: "",
      city: "Brooklyn",
      zip: "11221",
    });

    expect(
      parsePrintifyShippingAddress({
        ...VALID,
        phone: "1".repeat(41),
        region: "R".repeat(81),
        address2: "A".repeat(201),
      })
    ).toEqual({
      ...VALID,
      country: "US",
      phone: "",
      region: "",
      address2: "",
    });
  });

  it("trims required strings before accepting them", () => {
    expect(
      parsePrintifyShippingAddress({
        ...VALID,
        first_name: "  Ada  ",
        city: " Brooklyn ",
        zip: " 11221 ",
      })
    ).toEqual({
      ...VALID,
      first_name: "Ada",
      city: "Brooklyn",
      zip: "11221",
      country: "US",
    });
  });
});
