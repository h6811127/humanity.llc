import type { ShopifyOrderLike } from "./shopify-order-metadata";
import {
  parsePrintifyShippingAddress,
  type PrintifyShippingAddress,
} from "../print/printify-shipping";

export interface ShopifyShippingAddressLike {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  province_code?: string | null;
  country?: string | null;
  country_code?: string | null;
  zip?: string | null;
  phone?: string | null;
}

function splitName(full: string): { first_name: string; last_name: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "Customer", last_name: "Customer" };
  if (parts.length === 1) return { first_name: parts[0]!, last_name: parts[0]! };
  return { first_name: parts[0]!, last_name: parts.slice(1).join(" ") };
}

/** Map Shopify order shipping + email to Printify address_to shape. */
export function parseShopifyOrderShippingAddress(
  order: ShopifyOrderLike
): PrintifyShippingAddress | null {
  const ship = order.shipping_address;
  if (!ship || typeof ship !== "object") return null;

  const s = ship as ShopifyShippingAddressLike;
  let first_name = typeof s.first_name === "string" ? s.first_name.trim() : "";
  let last_name = typeof s.last_name === "string" ? s.last_name.trim() : "";
  if ((!first_name || !last_name) && typeof s.name === "string" && s.name.trim()) {
    const split = splitName(s.name);
    if (!first_name) first_name = split.first_name;
    if (!last_name) last_name = split.last_name;
  }

  const country =
    (typeof s.country_code === "string" && s.country_code.trim()) ||
    (typeof s.country === "string" && s.country.trim()) ||
    "";
  const region =
    (typeof s.province_code === "string" && s.province_code.trim()) ||
    (typeof s.province === "string" && s.province.trim()) ||
    "";

  const email = typeof order.email === "string" ? order.email.trim().toLowerCase() : "";

  return parsePrintifyShippingAddress({
    first_name,
    last_name,
    email,
    phone: s.phone ?? "",
    country,
    region,
    address1: s.address1 ?? "",
    address2: s.address2 ?? "",
    city: s.city ?? "",
    zip: s.zip ?? "",
  });
}
