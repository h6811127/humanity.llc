/** Printify address_to — operator body override or encrypted store from Shopify webhook. */

export interface PrintifyShippingAddress {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  address1: string;
  address2: string;
  city: string;
  zip: string;
}

function readString(raw: unknown, maxLen: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > maxLen) return null;
  return trimmed;
}

export function parsePrintifyShippingAddress(raw: unknown): PrintifyShippingAddress | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const first_name = readString(o.first_name, 80);
  const last_name = readString(o.last_name, 80);
  const email = readString(o.email, 254);
  const country = readString(o.country, 2);
  const address1 = readString(o.address1, 200);
  const city = readString(o.city, 120);
  const zip = readString(o.zip, 32);

  if (!first_name || !last_name || !email || !country || !address1 || !city || !zip) {
    return null;
  }

  return {
    first_name,
    last_name,
    email,
    phone: readString(o.phone, 40) ?? "",
    country: country.toUpperCase(),
    region: readString(o.region, 80) ?? "",
    address1,
    address2: readString(o.address2, 200) ?? "",
    city,
    zip,
  };
}
