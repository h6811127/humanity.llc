/**
 * Post-checkout print QR activation on /shop/thanks/ (Tier 1).
 * @see docs/MERCH_TIER1_TECHNICAL_FEASIBILITY.md § Engineering follow-ups
 */

/**
 * @param {{ status?: string, planned_items?: { planned_qr_id: string, print_artifact_id: string }[] } | null | undefined} mint
 * @param {boolean} tier1Thanks
 */
export function shouldOfferThanksMint(mint, tier1Thanks) {
  if (!tier1Thanks) return false;
  if (!mint || mint.status !== "pending") return false;
  return Array.isArray(mint.planned_items) && mint.planned_items.length > 0;
}

/**
 * @param {boolean} hasSigningSession
 */
export function thanksMintLeadCopy(hasSigningSession) {
  if (hasSigningSession) {
    return "Payment cleared, but your unique print QR still needs your card key once. Sign below to activate it for production — same step as checkout when pre-sign did not finish.";
  }
  return "Open this page on the device where you created your card (or import your backup on /created/), then enter your order details above and sign to activate your print QR.";
}

/**
 * @param {"idle" | "signing" | "complete" | "error"} phase
 * @param {string} [detail]
 */
export function thanksMintButtonLabel(phase, detail) {
  switch (phase) {
    case "signing":
      return "Signing…";
    case "complete":
      return "Print QR active";
    case "error":
      return "Try again";
    default:
      return "Sign & activate print QR";
  }
}

/**
 * @param {{ mint_status?: string, message?: string, failure_count?: number }} payload
 */
export function thanksMintResultMessage(payload) {
  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }
  if (payload.mint_status === "complete") {
    return "Your print QR is active. Production can continue.";
  }
  if (payload.failure_count) {
    return "Some credentials could not be activated. Try again or contact support.";
  }
  return "Could not activate print QR.";
}

/**
 * @param {string} origin
 * @param {{ order: string, email: string, qr_credentials: Record<string, unknown>[] }} body
 */
export async function postBuyerOrderMint(origin, body) {
  const base = typeof origin === "string" ? origin.trim().replace(/\/$/, "") : "";
  if (!base) throw new Error("API origin unavailable.");

  const res = await fetch(`${base}/v1/store/order-mint`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : "Could not activate print QR.";
    throw new Error(msg);
  }
  return data;
}
