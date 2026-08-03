import { describe, expect, it } from "vitest";

import {
  effectiveEntitlementsForAccount,
  mergeEntitlements,
  parseAccountOverrides,
  parseEntitlementsJson,
  utcDayKey,
  type StewardAccountRow,
} from "../src/steward/plans";

const HOSTED_PLAN: Record<string, boolean | number | null> = {
  "steward.hosted": true,
  "notify.push.live_proof": true,
  "poll.live_proof.auto_daily_cap": 4000,
  "game.season.node_cap": 40,
};

function account(
  status: StewardAccountRow["status"],
  overrides_json: string | null = null
): StewardAccountRow {
  return {
    account_id: "acc_plans_1",
    plan_id: "hosted_steward_v1",
    plan_version: 1,
    status,
    effective_from: "2026-05-01T00:00:00Z",
    effective_until: null,
    overrides_json,
  };
}

describe("parseEntitlementsJson", () => {
  it("returns a parsed object for valid entitlement JSON", () => {
    expect(parseEntitlementsJson('{"steward.hosted":true,"game.season.node_cap":15}')).toEqual({
      "steward.hosted": true,
      "game.season.node_cap": 15,
    });
  });

  it("returns {} for invalid JSON, arrays, and non-objects", () => {
    expect(parseEntitlementsJson("{")).toEqual({});
    expect(parseEntitlementsJson("[]")).toEqual({});
    expect(parseEntitlementsJson("null")).toEqual({});
    expect(parseEntitlementsJson('"hosted"')).toEqual({});
    expect(parseEntitlementsJson("12")).toEqual({});
  });
});

describe("mergeEntitlements", () => {
  it("lets overrides win without mutating the base map", () => {
    const base = { "steward.hosted": true, "poll.live_proof.auto_daily_cap": 4000 };
    const overrides = { "poll.live_proof.auto_daily_cap": 9000 };
    const merged = mergeEntitlements(base, overrides);
    expect(merged).toEqual({
      "steward.hosted": true,
      "poll.live_proof.auto_daily_cap": 9000,
    });
    expect(base["poll.live_proof.auto_daily_cap"]).toBe(4000);
  });

  it("shallow-copies base when overrides are null", () => {
    const base = { "steward.hosted": true };
    const merged = mergeEntitlements(base, null);
    expect(merged).toEqual(base);
    expect(merged).not.toBe(base);
  });
});

describe("parseAccountOverrides", () => {
  it("returns null for missing, empty, or empty-object JSON", () => {
    expect(parseAccountOverrides(null)).toBeNull();
    expect(parseAccountOverrides("")).toBeNull();
    expect(parseAccountOverrides("{}")).toBeNull();
    expect(parseAccountOverrides("[]")).toBeNull();
  });

  it("returns non-empty grant maps", () => {
    expect(parseAccountOverrides('{"game.season.node_cap":99}')).toEqual({
      "game.season.node_cap": 99,
    });
  });
});

describe("effectiveEntitlementsForAccount", () => {
  it("forces free-tier caps when expired or suspended", () => {
    for (const status of ["expired", "suspended"] as const) {
      const entitlements = effectiveEntitlementsForAccount(HOSTED_PLAN, account(status));
      expect(entitlements["steward.hosted"]).toBe(false);
      expect(entitlements["notify.push.live_proof"]).toBe(false);
      expect(entitlements["poll.live_proof.auto_daily_cap"]).toBe(400);
      expect(entitlements["game.season.node_cap"]).toBe(15);
      expect(entitlements["game.contribute.daily_cap"]).toBe(25000);
    }
  });

  it("ignores support overrides while expired or suspended", () => {
    const entitlements = effectiveEntitlementsForAccount(
      HOSTED_PLAN,
      account("expired", '{"steward.hosted":true,"poll.live_proof.auto_daily_cap":99999}')
    );
    expect(entitlements["steward.hosted"]).toBe(false);
    expect(entitlements["poll.live_proof.auto_daily_cap"]).toBe(400);
  });

  it("keeps plan entitlements for active, trialing, past_due, and canceled", () => {
    for (const status of ["active", "trialing", "past_due", "canceled"] as const) {
      const entitlements = effectiveEntitlementsForAccount(HOSTED_PLAN, account(status));
      expect(entitlements["steward.hosted"]).toBe(true);
      expect(entitlements["poll.live_proof.auto_daily_cap"]).toBe(4000);
      expect(entitlements["game.season.node_cap"]).toBe(40);
    }
  });

  it("merges support overrides onto the plan while the account is active", () => {
    const entitlements = effectiveEntitlementsForAccount(
      HOSTED_PLAN,
      account("active", '{"game.season.node_cap":99,"notify.push.live_proof":false}')
    );
    expect(entitlements["steward.hosted"]).toBe(true);
    expect(entitlements["game.season.node_cap"]).toBe(99);
    expect(entitlements["notify.push.live_proof"]).toBe(false);
    expect(entitlements["poll.live_proof.auto_daily_cap"]).toBe(4000);
  });
});

describe("utcDayKey", () => {
  it("returns UTC YYYY-MM-DD independent of local timezone offset", () => {
    expect(utcDayKey(new Date("2026-08-03T01:30:00.000Z"))).toBe("2026-08-03");
    expect(utcDayKey(new Date("2026-08-03T23:59:59.999Z"))).toBe("2026-08-03");
    expect(utcDayKey(new Date("2026-08-04T00:00:00.000Z"))).toBe("2026-08-04");
  });
});
