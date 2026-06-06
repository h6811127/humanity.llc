/**
 * Wear BYOP create wizard (PRODUCT_POSITIONING step 15).
 * @see docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md § Step 15
 */

import {
  listGeneralRootsWithKeys,
  pickPreferredGeneralRoot,
  generalRootDisplayLabel,
} from "./create-flow-convergence-core.mjs";

export const WEAR_PRINT_FOCUS = "wear-print";

/** @typedef {"standard" | "redirect_live" | "create_wear_card"} WearSubmitStrategy */

/**
 * @param {URLSearchParams} searchParams
 */
export function isWearCreateIntent(searchParams) {
  return searchParams.get("intent") === "wear";
}

/**
 * @param {string} handle
 * @param {string} [manifesto]
 */
export function wearRootManifesto(handle, manifesto) {
  const line = String(manifesto || "").trim();
  if (line) return line;
  const normalized = String(handle || "").trim().replace(/^@/, "");
  if (normalized) return `Live on @${normalized}`;
  return "Live on what I wear";
}

/**
 * @param {{
 *   searchParams: URLSearchParams;
 *   walletEntries: unknown[];
 * }} ctx
 * @returns {WearSubmitStrategy}
 */
export function resolveWearSubmitStrategy(ctx) {
  if (!isWearCreateIntent(ctx.searchParams)) return "standard";
  if (ctx.gateBypass) return "create_wear_card";
  const preferredRoot = pickPreferredGeneralRoot(listGeneralRootsWithKeys(ctx.walletEntries));
  if (preferredRoot) return "redirect_live";
  return "create_wear_card";
}

/**
 * @param {WearSubmitStrategy} strategy
 * @param {Record<string, unknown> | null | undefined} [preferredRoot]
 */
export function wearSubmitButtonLabel(strategy, preferredRoot) {
  const handle =
    preferredRoot && typeof preferredRoot === "object"
      ? generalRootDisplayLabel(preferredRoot)
      : "";
  if (strategy === "redirect_live") {
    return handle ? `Open ${handle} to add wearable QR` : "Open Live to add wearable QR";
  }
  if (strategy === "create_wear_card") return "Create card & print QR";
  return null;
}

/**
 * @param {Record<string, unknown>} entry
 * @param {string} [origin]
 * @param {{ fresh?: boolean }} [opts]
 */
export function createdWearPrintHref(entry, origin = "https://humanity.llc", opts = {}) {
  if (!entry?.profile_id) return null;
  const url = new URL("/created/", origin);
  url.searchParams.set("profile_id", String(entry.profile_id));
  const qrId =
    typeof entry.qr_id === "string"
      ? entry.qr_id.trim()
      : (() => {
          const scanUrl = typeof entry.scan_url === "string" ? entry.scan_url.trim() : "";
          if (!scanUrl) return "";
          try {
            return new URL(scanUrl, origin).searchParams.get("q")?.trim() || "";
          } catch {
            return "";
          }
        })();
  if (qrId) url.searchParams.set("qr_id", qrId);
  if (opts.fresh) url.searchParams.set("fresh", "1");
  url.searchParams.set("focus", WEAR_PRINT_FOCUS);
  return `${url.pathname}${url.search}`;
}
