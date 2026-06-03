/**
 * POST /.well-known/hc/v1/steward/billing/checkout — Stripe subscription checkout (WS-REV R1).
 */
import { errorResponse, jsonResponse } from "../http/resolver";
import type { Env } from "../env";
import { hostedStewardEnabled } from "../steward/config";
import { getAccount, stewardSchemaReady } from "../steward/db";
import {
  buildCheckoutCancelUrl,
  buildCheckoutReturnUrl,
  isStripeCheckoutPlanId,
  isValidCheckoutSiteOrigin,
  normalizeCheckoutReturnPath,
} from "../steward/stripe-checkout-core";
import {
  createStripeCheckoutSession,
  requireStripePriceForPlan,
  stripeCheckoutConfigured,
} from "../steward/stripe-checkout";
import { authenticateStewardSession } from "./steward-session-auth";

function hostedDisabled(): Response {
  return errorResponse(
    "hosted_steward_disabled",
    "Hosted steward extension is not enabled on this operator.",
    404
  );
}

function stewardSchemaMissing(): Response {
  return errorResponse(
    "steward_schema_missing",
    "Hosted steward tables are not migrated.",
    503
  );
}

async function requireStewardReady(
  env: Env,
  db: D1Database
): Promise<Response | null> {
  if (!hostedStewardEnabled(env)) return hostedDisabled();
  if (!(await stewardSchemaReady(db))) return stewardSchemaMissing();
  return null;
}

const DEFAULT_SITE_ORIGIN = "https://humanity.llc";

/**
 * POST /.well-known/hc/v1/steward/billing/checkout
 *
 * Auth: steward session bearer.
 * Body: { plan_id, site_origin?, return_path? }
 */
export async function handlePostStewardBillingCheckout(
  request: Request,
  env: Env,
  db: D1Database
): Promise<Response> {
  const gate = await requireStewardReady(env, db);
  if (gate) return gate;

  const auth = await authenticateStewardSession(db, request);
  if (!auth.ok) return auth.response;

  if (!stripeCheckoutConfigured(env)) {
    return errorResponse(
      "billing_not_configured",
      "Stripe checkout is not configured on this operator.",
      503
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  if (!o) {
    return errorResponse("MALFORMED_REQUEST", "Body required.", 400);
  }

  const planId = typeof o.plan_id === "string" ? o.plan_id.trim() : "";
  if (!isStripeCheckoutPlanId(planId)) {
    return errorResponse(
      "invalid_plan_id",
      `plan_id must be one of: hosted_steward_v1, hosted_game_season_v1.`,
      400
    );
  }

  const siteOriginRaw =
    typeof o.site_origin === "string" && o.site_origin.trim()
      ? o.site_origin.trim().replace(/\/$/, "")
      : DEFAULT_SITE_ORIGIN;
  if (!isValidCheckoutSiteOrigin(siteOriginRaw)) {
    return errorResponse(
      "invalid_site_origin",
      "site_origin must be an allowed operator site URL.",
      400
    );
  }

  const returnPath = normalizeCheckoutReturnPath(
    typeof o.return_path === "string" ? o.return_path : undefined
  );

  const priceId = requireStripePriceForPlan(env, planId);
  if (!priceId) {
    return errorResponse(
      "billing_not_configured",
      `Stripe price is not configured for ${planId}.`,
      503
    );
  }

  const account = await getAccount(db, auth.account_id);
  if (!account) {
    return errorResponse("NOT_FOUND", "Account not found.", 404);
  }

  let successUrl: string;
  let cancelUrl: string;
  try {
    successUrl = buildCheckoutReturnUrl(siteOriginRaw, auth.account_id, returnPath);
    cancelUrl = buildCheckoutCancelUrl(siteOriginRaw, returnPath);
  } catch (err) {
    return errorResponse(
      "MALFORMED_REQUEST",
      err instanceof Error ? err.message : "Invalid checkout URLs.",
      400
    );
  }

  try {
    const session = await createStripeCheckoutSession(env, {
      priceId,
      accountId: auth.account_id,
      planId,
      successUrl,
      cancelUrl,
      existingCustomerId: account.billing_customer_id,
    });

    return jsonResponse(
      {
        checkout_url: session.url,
        session_id: session.id,
        plan_id: planId,
        account_id: auth.account_id,
      },
      200
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe checkout failed.";
    return errorResponse("stripe_checkout_failed", message, 502);
  }
}
