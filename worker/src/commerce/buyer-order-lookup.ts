import { hashBuyerEmail, normalizeBuyerEmail } from "./buyer-email-hash";
import { getCommerceOrderForBuyerLookup } from "../db/commerce-orders";
import { getPrintOrdersByCommerceOrderId } from "../db/print-orders";
import type { CommerceOrderRow } from "../db/commerce-orders";
import type { PrintOrderRow } from "../db/print-orders";

export function normalizeBuyerOrderRef(raw: string): string {
  return raw.trim().replace(/^#+/, "");
}

export interface BuyerOrderLookupResult {
  commerce: CommerceOrderRow;
  printOrders: PrintOrderRow[];
}

/** Match checkout email + order number to commerce + print rows (404 when no match). */
export async function lookupBuyerOrder(
  db: D1Database,
  orderRef: string,
  emailRaw: string
): Promise<BuyerOrderLookupResult | null> {
  const normalizedOrder = normalizeBuyerOrderRef(orderRef);
  if (!normalizedOrder) return null;

  const email = normalizeBuyerEmail(emailRaw);
  if (!email) return null;

  const emailHash = await hashBuyerEmail(email);
  const commerce = await getCommerceOrderForBuyerLookup(db, normalizedOrder);
  if (!commerce || commerce.buyer_email_hash !== emailHash) {
    return null;
  }

  const printOrders = await getPrintOrdersByCommerceOrderId(db, commerce.commerce_order_id);
  return { commerce, printOrders };
}
