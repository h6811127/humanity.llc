import type { Env } from "../env";
import {
  buildStripeCheckoutSessionForm,
  parseStripeCheckoutSessionResponse,
  resolveStripePriceId,
  type StripeCheckoutPlanId,
  type StripeCheckoutSessionParams,
} from "./stripe-checkout-core";

export type StripeFetch = typeof fetch;

const STRIPE_API = "https://api.stripe.com/v1/checkout/sessions";

export function stripeCheckoutConfigured(env: Env): boolean {
  const secret = env.STRIPE_SECRET_KEY?.trim();
  return Boolean(secret && secret.startsWith("sk_"));
}

/**
 * Create a Stripe Checkout session (subscription mode).
 * @throws {Error} with message safe for API responses when Stripe rejects the request.
 */
export async function createStripeCheckoutSession(
  env: Env,
  params: StripeCheckoutSessionParams,
  fetchImpl: StripeFetch = fetch
): Promise<{ url: string; id: string }> {
  const secret = env.STRIPE_SECRET_KEY?.trim();
  if (!secret?.startsWith("sk_")) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  const form = buildStripeCheckoutSessionForm(params);
  const res = await fetchImpl(STRIPE_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Stripe returned a non-JSON response.");
  }

  if (!res.ok) {
    const err =
      json &&
      typeof json === "object" &&
      typeof (json as { error?: { message?: string } }).error?.message === "string"
        ? (json as { error: { message: string } }).error.message
        : `Stripe request failed (${res.status}).`;
    throw new Error(err);
  }

  const parsed = parseStripeCheckoutSessionResponse(json);
  if (!parsed) {
    throw new Error("Stripe checkout session response missing url or id.");
  }
  return parsed;
}

export function requireStripePriceForPlan(
  env: Env,
  planId: StripeCheckoutPlanId
): string | null {
  return resolveStripePriceId(env, planId);
}
