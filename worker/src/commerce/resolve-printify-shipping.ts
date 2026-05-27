import { loadEncryptedShippingAddress } from "../db/commerce-fulfillment-pii";
import type { Env } from "../index";
import {
  parsePrintifyShippingAddress,
  type PrintifyShippingAddress,
} from "../print/printify-shipping";

export type PrintifyShippingSource = "request_body" | "encrypted_store";

export interface ResolvedPrintifyShipping {
  address: PrintifyShippingAddress;
  source: PrintifyShippingSource;
}

/** Operator submit: explicit body wins; else decrypt Shopify webhook shipping. */
export async function resolvePrintifyShippingForSubmit(
  env: Env,
  db: D1Database,
  commerceOrderId: string,
  bodyAddress: unknown
): Promise<ResolvedPrintifyShipping | null> {
  const fromBody = parsePrintifyShippingAddress(bodyAddress);
  if (fromBody) {
    return { address: fromBody, source: "request_body" };
  }

  const stored = await loadEncryptedShippingAddress(db, env, commerceOrderId);
  if (stored) {
    return { address: stored, source: "encrypted_store" };
  }

  return null;
}
