export type StewardPlanStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "expired"
  | "suspended";

export interface StewardAccountRow {
  account_id: string;
  plan_id: string;
  plan_version: number;
  status: StewardPlanStatus;
  effective_from: string;
  effective_until: string | null;
  overrides_json: string | null;
}

export type EntitlementMap = Record<string, boolean | number | null>;

export function parseEntitlementsJson(raw: string): EntitlementMap {
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object" || Array.isArray(o)) return {};
    return o as EntitlementMap;
  } catch {
    return {};
  }
}

export function mergeEntitlements(
  base: EntitlementMap,
  overrides: EntitlementMap | null
): EntitlementMap {
  if (!overrides) return { ...base };
  return { ...base, ...overrides };
}

/** Account overrides JSON (support grants) — only known entitlement keys. */
export function parseAccountOverrides(raw: string | null): EntitlementMap | null {
  if (!raw) return null;
  const o = parseEntitlementsJson(raw);
  return Object.keys(o).length ? o : null;
}

export function effectiveEntitlementsForAccount(
  planEntitlements: EntitlementMap,
  account: StewardAccountRow
): EntitlementMap {
  if (account.status === "expired" || account.status === "suspended") {
    return parseEntitlementsJson(
      '{"steward.hosted":false,"notify.push.live_proof":false,"poll.live_proof.auto_daily_cap":400,"poll.live_proof.idle_ms":60000,"poll.live_proof.active_ms":5000,"poll.network.max_parallel":2,"poll.network.manual_max_parallel":1,"wallet.large_threshold":10,"sw.periodic_min_ms":900000}'
    );
  }
  return mergeEntitlements(
    planEntitlements,
    parseAccountOverrides(account.overrides_json)
  );
}

export function utcDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
