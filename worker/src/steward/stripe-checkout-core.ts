import {
  HOSTED_GAME_SEASON_PLAN_ID,
  HOSTED_STEWARD_PLAN_ID,
} from "./billing-lifecycle";
import { ACCOUNT_ID_REGEX } from "./config";

/** Paid plans sold via Stripe Checkout (subscription mode). */
export const STRIPE_CHECKOUT_PLAN_IDS = [
  HOSTED_STEWARD_PLAN_ID,
  HOSTED_GAME_SEASON_PLAN_ID,
] as const;

export type StripeCheckoutPlanId = (typeof STRIPE_CHECKOUT_PLAN_IDS)[number];

const CHECKOUT_PLAN_SET = new Set<string>(STRIPE_CHECKOUT_PLAN_IDS);

export function isStripeCheckoutPlanId(planId: string): planId is StripeCheckoutPlanId {
  return CHECKOUT_PLAN_SET.has(planId);
}

/** Wrangler var / secret names for Stripe Price ids (`price_…`). */
export function stripePriceEnvKey(planId: StripeCheckoutPlanId): string {
  switch (planId) {
    case HOSTED_STEWARD_PLAN_ID:
      return "STRIPE_PRICE_HOSTED_STEWARD_V1";
    case HOSTED_GAME_SEASON_PLAN_ID:
      return "STRIPE_PRICE_HOSTED_GAME_SEASON_V1";
    default:
      return "";
  }
}

export function resolveStripePriceId(
  env: Record<string, string | undefined>,
  planId: StripeCheckoutPlanId
): string | null {
  const raw = env[stripePriceEnvKey(planId)]?.trim();
  return raw && raw.startsWith("price_") ? raw : null;
}

export function isValidCheckoutSiteOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname;
    return (
      host === "humanity.llc" ||
      host.endsWith(".humanity.llc") ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".pages.dev")
    );
  } catch {
    return false;
  }
}

/**
 * @param path Must start with `/` (no scheme).
 */
export function normalizeCheckoutReturnPath(path: string | undefined): string {
  const raw = typeof path === "string" ? path.trim() : "";
  if (!raw || raw === "/") return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.includes("://") || raw.includes("?")) return "/";
  return raw;
}

export function buildCheckoutReturnUrl(
  siteOrigin: string,
  accountId: string,
  returnPath: string
): string {
  if (!ACCOUNT_ID_REGEX.test(accountId)) {
    throw new Error("Invalid steward account_id for checkout return URL.");
  }
  const base = siteOrigin.replace(/\/$/, "");
  const url = new URL(normalizeCheckoutReturnPath(returnPath), `${base}/`);
  url.searchParams.set("hc_account_id", accountId.trim());
  return url.href;
}

export function buildCheckoutCancelUrl(siteOrigin: string, returnPath: string): string {
  const base = siteOrigin.replace(/\/$/, "");
  const path = normalizeCheckoutReturnPath(returnPath);
  const url = new URL(path, `${base}/`);
  url.searchParams.set("hosted_checkout", "canceled");
  return url.href;
}

/** Stripe subscription + session metadata (webhook grant path). */
export function stripeHostedCheckoutMetadata(
  accountId: string,
  planId: StripeCheckoutPlanId,
  planVersion = 1
): Record<string, string> {
  if (!ACCOUNT_ID_REGEX.test(accountId)) {
    throw new Error("Invalid steward account_id for Stripe metadata.");
  }
  return {
    account_id: accountId.trim(),
    plan_id: planId,
    plan_version: String(planVersion),
  };
}

export interface StripeCheckoutSessionParams {
  priceId: string;
  accountId: string;
  planId: StripeCheckoutPlanId;
  successUrl: string;
  cancelUrl: string;
  existingCustomerId?: string | null;
}

/** Body for Stripe `POST /v1/checkout/sessions` (form-encoded). */
export function buildStripeCheckoutSessionForm(
  params: StripeCheckoutSessionParams
): URLSearchParams {
  const meta = stripeHostedCheckoutMetadata(params.accountId, params.planId);
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("success_url", params.successUrl);
  form.set("cancel_url", params.cancelUrl);
  form.set("client_reference_id", params.accountId);
  form.set("line_items[0][price]", params.priceId);
  form.set("line_items[0][quantity]", "1");
  for (const [k, v] of Object.entries(meta)) {
    form.set(`metadata[${k}]`, v);
    form.set(`subscription_data[metadata][${k}]`, v);
  }
  const customer = params.existingCustomerId?.trim();
  if (customer && customer.startsWith("cus_")) {
    form.set("customer", customer);
  }
  return form;
}

export function parseStripeCheckoutSessionResponse(
  body: unknown
): { url: string; id: string } | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const url = typeof o.url === "string" ? o.url : "";
  const id = typeof o.id === "string" ? o.id : "";
  if (!url.startsWith("https://") || !id.startsWith("cs_")) return null;
  return { url, id };
}
