/**
 * Printify API client stub (O-002). Real HTTP submit when token + shop id configured.
 */

export interface PrintifySubmitInput {
  print_order_id: string;
  template_id: string;
  planned_item_qr_ids: string[];
}

export interface PrintifySubmitResult {
  ok: true;
  printify_order_id: string;
  printify_shop_id: number;
}

export interface PrintifySubmitError {
  ok: false;
  code: "PRINTIFY_UNCONFIGURED" | "PRINTIFY_SUBMIT_DEFERRED";
  message: string;
}

export function printifyConfigured(env: {
  PRINTIFY_API_TOKEN?: string;
  PRINTIFY_SHOP_ID?: string;
}): boolean {
  return Boolean(env.PRINTIFY_API_TOKEN?.trim() && env.PRINTIFY_SHOP_ID?.trim());
}

/**
 * External Printify order creation is deferred until operator approves production.
 * Returns deferred when credentials exist but live API wiring is not enabled yet.
 */
export async function submitPrintifyOrder(
  env: { PRINTIFY_API_TOKEN?: string; PRINTIFY_SHOP_ID?: string },
  _input: PrintifySubmitInput
): Promise<PrintifySubmitResult | PrintifySubmitError> {
  if (!printifyConfigured(env)) {
    return {
      ok: false,
      code: "PRINTIFY_UNCONFIGURED",
      message: "Printify credentials are not configured.",
    };
  }
  return {
    ok: false,
    code: "PRINTIFY_SUBMIT_DEFERRED",
    message: "Printify HTTP submit is deferred; order stays awaiting_production_approval.",
  };
}
