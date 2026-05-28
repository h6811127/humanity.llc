import type { StewardAccountRow, StewardPlanStatus } from "./plans";

/** M4: hosted caps continue for 7 days after payment failure. */
export const PAST_DUE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export const HOSTED_STEWARD_PLAN_ID = "hosted_steward_v1";
export const REFERENCE_FREE_PLAN_ID = "reference_free";

export interface StripeSubscriptionLike {
  id: string;
  customer: string;
  status: string;
  metadata?: Record<string, string> | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean;
  trial_end?: number | null;
}

export interface StewardBillingAccountUpdate {
  account_id: string;
  plan_id: string;
  plan_version: number;
  status: StewardPlanStatus;
  effective_from: string;
  effective_until: string | null;
  billing_customer_id: string;
  billing_subscription_id: string;
}

/**
 * Map Stripe subscription object → steward_accounts row (E5.2).
 * Returns null when metadata.account_id is missing (commerce must not grant hosted).
 */
export function stewardUpdateFromStripeSubscription(
  sub: StripeSubscriptionLike,
  now = Date.now()
): StewardBillingAccountUpdate | null {
  const accountId = sub.metadata?.account_id?.trim();
  if (!accountId) return null;

  const customerId =
    typeof sub.customer === "string" ? sub.customer.trim() : "";
  const subId = sub.id?.trim();
  if (!customerId || !subId) return null;

  const planId =
    sub.metadata?.plan_id?.trim() || HOSTED_STEWARD_PLAN_ID;
  const planVersion = parsePlanVersion(sub.metadata?.plan_version);

  const effectiveFrom = new Date(now).toISOString();
  const periodEndIso = stripePeriodEndIso(sub.current_period_end);

  const mapped = mapStripeSubscriptionStatus(sub.status, {
    cancel_at_period_end: sub.cancel_at_period_end === true,
    current_period_end: periodEndIso,
    trial_end: stripePeriodEndIso(sub.trial_end),
    now,
  });

  return {
    account_id: accountId,
    plan_id: mapped.plan_id,
    plan_version: planVersion,
    status: mapped.status,
    effective_from: effectiveFrom,
    effective_until: mapped.effective_until,
    billing_customer_id: customerId,
    billing_subscription_id: subId,
  };
}

function parsePlanVersion(raw: string | undefined): number {
  if (!raw) return 1;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function stripePeriodEndIso(sec: number | null | undefined): string | null {
  if (sec == null || !Number.isFinite(sec)) return null;
  return new Date(sec * 1000).toISOString();
}

/**
 * @param {string} stripeStatus Stripe subscription.status
 */
export function mapStripeSubscriptionStatus(
  stripeStatus: string,
  opts: {
    cancel_at_period_end: boolean;
    current_period_end: string | null;
    trial_end: string | null;
    now: number;
  }
): {
  status: StewardPlanStatus;
  plan_id: string;
  effective_until: string | null;
} {
  switch (stripeStatus) {
    case "trialing":
      return {
        status: "trialing",
        plan_id: HOSTED_STEWARD_PLAN_ID,
        effective_until: opts.trial_end ?? opts.current_period_end,
      };
    case "active":
      if (opts.cancel_at_period_end) {
        return {
          status: "canceled",
          plan_id: HOSTED_STEWARD_PLAN_ID,
          effective_until: opts.current_period_end,
        };
      }
      return {
        status: "active",
        plan_id: HOSTED_STEWARD_PLAN_ID,
        effective_until: null,
      };
    case "past_due":
    case "unpaid":
      return {
        status: "past_due",
        plan_id: HOSTED_STEWARD_PLAN_ID,
        effective_until: new Date(opts.now + PAST_DUE_GRACE_MS).toISOString(),
      };
    case "canceled":
      return {
        status: "canceled",
        plan_id: HOSTED_STEWARD_PLAN_ID,
        effective_until: opts.current_period_end,
      };
    case "incomplete":
    case "incomplete_expired":
    case "paused":
    default:
      return {
        status: "expired",
        plan_id: REFERENCE_FREE_PLAN_ID,
        effective_until: null,
      };
  }
}

/** Subscription ended — immediate downgrade (M2 / M4). */
export function stewardUpdateForSubscriptionDeleted(
  sub: StripeSubscriptionLike,
  now = Date.now()
): StewardBillingAccountUpdate | null {
  const accountId = sub.metadata?.account_id?.trim();
  if (!accountId) return null;
  const customerId =
    typeof sub.customer === "string" ? sub.customer.trim() : "";
  const subId = sub.id?.trim();
  if (!customerId || !subId) return null;
  return {
    account_id: accountId,
    plan_id: REFERENCE_FREE_PLAN_ID,
    plan_version: parsePlanVersion(sub.metadata?.plan_version),
    status: "expired",
    effective_from: new Date(now).toISOString(),
    effective_until: null,
    billing_customer_id: customerId,
    billing_subscription_id: subId,
  };
}

/** invoice.payment_failed — grace window at hosted caps (E5.3). */
export function stewardUpdateForPaymentFailed(
  accountId: string,
  customerId: string,
  subscriptionId: string | null,
  now = Date.now()
): Omit<StewardBillingAccountUpdate, "billing_subscription_id"> & {
  billing_subscription_id: string | null;
} {
  return {
    account_id: accountId,
    plan_id: HOSTED_STEWARD_PLAN_ID,
    plan_version: 1,
    status: "past_due",
    effective_from: new Date(now).toISOString(),
    effective_until: new Date(now + PAST_DUE_GRACE_MS).toISOString(),
    billing_customer_id: customerId,
    billing_subscription_id: subscriptionId,
  };
}

/** Lazy expiry when past_due grace elapsed (E5.3). */
export function shouldExpirePastDueAccount(
  account: StewardAccountRow,
  now = Date.now()
): boolean {
  if (account.status !== "past_due") return false;
  if (!account.effective_until) return false;
  const end = Date.parse(account.effective_until);
  return Number.isFinite(end) && end <= now;
}

export function stewardUpdateForExpiredAccount(
  account: StewardAccountRow,
  now = Date.now()
): Omit<StewardBillingAccountUpdate, "billing_customer_id" | "billing_subscription_id"> {
  return {
    account_id: account.account_id,
    plan_id: REFERENCE_FREE_PLAN_ID,
    plan_version: account.plan_version,
    status: "expired",
    effective_from: new Date(now).toISOString(),
    effective_until: null,
  };
}

/** Canceled subscription after period end → expired. */
export function shouldExpireCanceledAccount(
  account: StewardAccountRow,
  now = Date.now()
): boolean {
  if (account.status !== "canceled") return false;
  if (!account.effective_until) return false;
  const end = Date.parse(account.effective_until);
  return Number.isFinite(end) && end <= now;
}

export function isStewardBillingSubscriptionEvent(type: string): boolean {
  return (
    type === "customer.subscription.created" ||
    type === "customer.subscription.updated" ||
    type === "customer.subscription.deleted"
  );
}

/** Merch / one-off checkout must not enter hosted grant path (H6). */
export function isCommerceCheckoutEvent(type: string): boolean {
  return (
    type === "checkout.session.completed" ||
    type === "checkout.session.async_payment_succeeded"
  );
}
