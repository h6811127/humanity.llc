/**
 * Stripe billing webhooks → steward_accounts lifecycle (E5).
 * @see docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md Epic E5
 */
import { errorResponse, jsonResponse } from "./resolver";
import { verifyStripeWebhookSignature } from "./stripe-webhook-verify";
import type { Env } from "../env";
import { hostedStewardEnabled } from "../steward/config";
import {
  applyStewardBillingUpdate,
  getAccount,
  getAccountByBillingCustomer,
  getAccountByBillingSubscription,
  revokeAllSessionsForAccount,
  stewardSchemaReady,
} from "../steward/db";
import {
  HOSTED_GAME_SEASON_PLAN_ID,
  HOSTED_STEWARD_PLAN_ID,
  isCommerceCheckoutEvent,
  isStewardBillingSubscriptionEvent,
  stewardUpdateForPaymentFailed,
  stewardUpdateForSubscriptionDeleted,
  stewardUpdateFromHostedCheckoutSession,
  stewardUpdateFromStripeSubscription,
  type StripeSubscriptionLike,
} from "../steward/billing-lifecycle";
import { closeStewardPushConnectionsForAccount } from "../steward/push";
import { deleteStewardWebPushSubscriptionsForAccount } from "../steward/web-push-db";

export interface StripeWebhookEvent {
  id?: string;
  type: string;
  data?: { object?: Record<string, unknown> };
}

async function finalizeExpiredAccount(
  db: D1Database,
  accountId: string
): Promise<void> {
  await revokeAllSessionsForAccount(db, accountId);
  closeStewardPushConnectionsForAccount(accountId);
  await deleteStewardWebPushSubscriptionsForAccount(db, accountId);
}

async function applyBillingUpdate(
  db: D1Database,
  update: Parameters<typeof applyStewardBillingUpdate>[1]
): Promise<"ok" | "account_missing"> {
  const applied = await applyStewardBillingUpdate(db, update);
  if (!applied) return "account_missing";
  if (update.status === "expired") {
    await finalizeExpiredAccount(db, update.account_id);
  }
  return "ok";
}

function asSubscription(obj: Record<string, unknown>): StripeSubscriptionLike | null {
  const id = typeof obj.id === "string" ? obj.id : "";
  const customer =
    typeof obj.customer === "string"
      ? obj.customer
      : typeof obj.customer === "object" &&
          obj.customer &&
          typeof (obj.customer as { id?: string }).id === "string"
        ? (obj.customer as { id: string }).id
        : "";
  const status = typeof obj.status === "string" ? obj.status : "";
  if (!id || !customer || !status) return null;
  const metadata: Record<string, string> = {};
  if (obj.metadata && typeof obj.metadata === "object") {
    for (const [k, v] of Object.entries(obj.metadata as Record<string, unknown>)) {
      if (typeof v === "string") metadata[k] = v;
    }
  }
  return {
    id,
    customer,
    status,
    metadata,
    current_period_end:
      typeof obj.current_period_end === "number" ? obj.current_period_end : null,
    cancel_at_period_end: obj.cancel_at_period_end === true,
    trial_end: typeof obj.trial_end === "number" ? obj.trial_end : null,
  };
}

async function handleSubscriptionEvent(
  db: D1Database,
  type: string,
  sub: StripeSubscriptionLike
): Promise<"ok" | "ignored" | "account_missing"> {
  if (type === "customer.subscription.deleted") {
    const update = stewardUpdateForSubscriptionDeleted(sub);
    if (!update) return "ignored";
    return applyBillingUpdate(db, update);
  }
  const update = stewardUpdateFromStripeSubscription(sub);
  if (!update) return "ignored";
  return applyBillingUpdate(db, update);
}

async function handleInvoicePaymentFailed(
  db: D1Database,
  obj: Record<string, unknown>
): Promise<"ok" | "ignored" | "account_missing"> {
  const customerId =
    typeof obj.customer === "string"
      ? obj.customer
      : typeof obj.customer === "object" &&
          obj.customer &&
          typeof (obj.customer as { id?: string }).id === "string"
        ? (obj.customer as { id: string }).id
        : "";
  if (!customerId) return "ignored";

  const subscriptionId =
    typeof obj.subscription === "string" ? obj.subscription : null;

  let account =
    (subscriptionId
      ? await getAccountByBillingSubscription(db, subscriptionId)
      : null) ?? (await getAccountByBillingCustomer(db, customerId));

  const metadataAccountId =
    obj.metadata &&
    typeof obj.metadata === "object" &&
    typeof (obj.metadata as Record<string, unknown>).account_id === "string"
      ? String((obj.metadata as Record<string, string>).account_id).trim()
      : "";

  if (!account && metadataAccountId) {
    account = await getAccount(db, metadataAccountId);
  }
  if (!account) return "ignored";

  const update = stewardUpdateForPaymentFailed(
    account.account_id,
    customerId,
    subscriptionId
  );
  return applyBillingUpdate(db, update);
}

/**
 * POST /.well-known/hc/v1/operator/billing/webhook
 * Stripe-signed; no CORS preflight from Stripe servers.
 */
export async function handlePostBillingWebhook(
  request: Request,
  env: Env,
  db: D1Database
): Promise<Response> {
  if (!hostedStewardEnabled(env)) {
    return errorResponse(
      "hosted_steward_disabled",
      "Hosted steward extension is not enabled.",
      404
    );
  }
  if (!(await stewardSchemaReady(db))) {
    return errorResponse(
      "steward_schema_missing",
      "Hosted steward tables are not migrated.",
      503
    );
  }

  const secret = env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return errorResponse(
      "billing_not_configured",
      "Stripe webhook secret is not configured.",
      503
    );
  }

  const payload = await request.text();
  const sigError = await verifyStripeWebhookSignature(
    payload,
    request.headers.get("Stripe-Signature"),
    secret
  );
  if (sigError) {
    const status =
      sigError === "timestamp_skew" || sigError === "invalid_signature" ? 400 : 401;
    return errorResponse("invalid_webhook_signature", sigError, status);
  }

  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(payload) as StripeWebhookEvent;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const type = typeof event.type === "string" ? event.type : "";
  const obj = event.data?.object;
  if (!type || !obj || typeof obj !== "object") {
    return jsonResponse({ received: true, ignored: true }, 200);
  }

  if (isCommerceCheckoutEvent(type)) {
    const mode = typeof obj.mode === "string" ? obj.mode : "";
    const metadata =
      obj.metadata && typeof obj.metadata === "object"
        ? (obj.metadata as Record<string, unknown>)
        : {};
    const accountId =
      typeof metadata.account_id === "string" ? metadata.account_id.trim() : "";
    const planMeta =
      typeof metadata.plan_id === "string" ? metadata.plan_id.trim() : "";
    const hostedIntent =
      metadata.steward_plan === HOSTED_STEWARD_PLAN_ID ||
      planMeta === HOSTED_STEWARD_PLAN_ID ||
      planMeta === HOSTED_GAME_SEASON_PLAN_ID;
    if (mode === "payment" || !hostedIntent || !accountId) {
      return jsonResponse({ received: true, ignored: true, reason: "commerce" }, 200);
    }
    if (type === "checkout.session.completed") {
      const update = stewardUpdateFromHostedCheckoutSession(obj);
      if (update) {
        const result = await applyBillingUpdate(db, update);
        return jsonResponse(
          { received: true, result, source: "checkout.session.completed" },
          200
        );
      }
      return jsonResponse(
        { received: true, ignored: true, reason: "checkout_incomplete" },
        200
      );
    }
  }

  if (isStewardBillingSubscriptionEvent(type)) {
    const sub = asSubscription(obj);
    if (!sub) {
      return jsonResponse({ received: true, ignored: true }, 200);
    }
    const result = await handleSubscriptionEvent(db, type, sub);
    return jsonResponse({ received: true, result }, 200);
  }

  if (type === "invoice.payment_failed") {
    const result = await handleInvoicePaymentFailed(db, obj);
    return jsonResponse({ received: true, result }, 200);
  }

  return jsonResponse({ received: true, ignored: true }, 200);
}
