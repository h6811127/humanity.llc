/** Pure operator request budget rules — no I/O. @see docs/DEVICE_OS_REQUEST_BUDGET.md */

export const OPERATOR_REQUEST_EVENT = "worker_fetch";

export const DEFAULT_OPERATOR_REQUEST_SOFT_CAP = 80_000;
export const DEFAULT_OPERATOR_REQUEST_HARD_CAP = 100_000;

export type OperatorRequestBudgetState = "ok" | "soft_cap" | "hard_cap";

export function operatorRequestBudgetEnabled(env: {
  OPERATOR_REQUEST_BUDGET_ENABLED?: string;
}): boolean {
  return env.OPERATOR_REQUEST_BUDGET_ENABLED !== "0";
}

export function operatorRequestSoftCap(env: {
  OPERATOR_REQUEST_SOFT_CAP?: string;
}): number {
  const parsed = Number.parseInt(env.OPERATOR_REQUEST_SOFT_CAP ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_OPERATOR_REQUEST_SOFT_CAP;
}

export function operatorRequestHardCap(env: {
  OPERATOR_REQUEST_HARD_CAP?: string;
}): number {
  const parsed = Number.parseInt(env.OPERATOR_REQUEST_HARD_CAP ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_OPERATOR_REQUEST_HARD_CAP;
}

/** UTC calendar day key (YYYY-MM-DD). */
export function operatorRequestWindowKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function resolveOperatorRequestBudgetState(
  count: number,
  softCap: number,
  hardCap: number
): OperatorRequestBudgetState {
  if (count >= hardCap) return "hard_cap";
  if (count >= softCap) return "soft_cap";
  return "ok";
}

export function operatorHealthDegradedByBudget(
  state: OperatorRequestBudgetState
): boolean {
  return state === "soft_cap" || state === "hard_cap";
}
