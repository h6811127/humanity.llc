import { describe, expect, it } from "vitest";

import {
  DEFAULT_OPERATOR_REQUEST_HARD_CAP,
  DEFAULT_OPERATOR_REQUEST_SOFT_CAP,
  operatorHealthDegradedByBudget,
  operatorRequestBudgetEnabled,
  operatorRequestHardCap,
  operatorRequestSoftCap,
  operatorRequestWindowKey,
  resolveOperatorRequestBudgetState,
} from "../src/operator/request-budget-core";

describe("operator request budget core", () => {
  it("uses UTC day window keys", () => {
    expect(operatorRequestWindowKey(new Date("2026-06-03T23:59:59.000Z"))).toBe(
      "2026-06-03"
    );
    expect(operatorRequestWindowKey(new Date("2026-06-04T00:00:00.000Z"))).toBe(
      "2026-06-04"
    );
  });

  it("defaults soft/hard caps and allows opt-out", () => {
    expect(operatorRequestSoftCap({})).toBe(DEFAULT_OPERATOR_REQUEST_SOFT_CAP);
    expect(operatorRequestHardCap({})).toBe(DEFAULT_OPERATOR_REQUEST_HARD_CAP);
    expect(operatorRequestBudgetEnabled({})).toBe(true);
    expect(operatorRequestBudgetEnabled({ OPERATOR_REQUEST_BUDGET_ENABLED: "0" })).toBe(
      false
    );
  });

  it("respects env overrides", () => {
    expect(operatorRequestSoftCap({ OPERATOR_REQUEST_SOFT_CAP: "12000" })).toBe(
      12000
    );
    expect(operatorRequestHardCap({ OPERATOR_REQUEST_HARD_CAP: "15000" })).toBe(
      15000
    );
  });

  it("resolves budget states at soft and hard caps", () => {
    expect(
      resolveOperatorRequestBudgetState(
        DEFAULT_OPERATOR_REQUEST_SOFT_CAP - 1,
        DEFAULT_OPERATOR_REQUEST_SOFT_CAP,
        DEFAULT_OPERATOR_REQUEST_HARD_CAP
      )
    ).toBe("ok");
    expect(
      resolveOperatorRequestBudgetState(
        DEFAULT_OPERATOR_REQUEST_SOFT_CAP,
        DEFAULT_OPERATOR_REQUEST_SOFT_CAP,
        DEFAULT_OPERATOR_REQUEST_HARD_CAP
      )
    ).toBe("soft_cap");
    expect(
      resolveOperatorRequestBudgetState(
        DEFAULT_OPERATOR_REQUEST_HARD_CAP,
        DEFAULT_OPERATOR_REQUEST_SOFT_CAP,
        DEFAULT_OPERATOR_REQUEST_HARD_CAP
      )
    ).toBe("hard_cap");
  });

  it("marks health degraded at soft cap", () => {
    expect(operatorHealthDegradedByBudget("ok")).toBe(false);
    expect(operatorHealthDegradedByBudget("soft_cap")).toBe(true);
    expect(operatorHealthDegradedByBudget("hard_cap")).toBe(true);
  });
});
