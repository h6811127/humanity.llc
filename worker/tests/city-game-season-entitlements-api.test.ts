import { describe, expect, it, vi } from "vitest";
import { CR_SEASON_01 } from "../src/city-game/season-config";
import {
  accountMayAccessGameSeason,
  buildGameSeasonUsageBlock,
  listAuthorizedSeasonIdsForAccount,
  parseGameSeasonIdQuery,
} from "../src/city-game/season-entitlements-api";
import { HOSTED_GAME_SEASON_ENTITLEMENTS } from "../src/city-game/season-entitlements";
import { handleGetStewardEntitlements } from "../src/resolver/steward-hosted";
import type { Env } from "../src/env";

const SEASON_ROOT = CR_SEASON_01.season_root_profile_id!.trim();
const ACCOUNT = "acc_game_season_test";
const DEVICE = "dev_game_season";

function stewardDbWithSeasonLink() {
  const profiles = new Map<string, string>([[SEASON_ROOT, ACCOUNT]]);
  const usage = new Map<string, number>();

  return {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...args: unknown[]) => ({
        first: vi.fn(async () => {
          if (sql.includes("sqlite_master") && sql.includes("name = ?")) {
            const table = String(args[0]);
            if (table === "game_season_usage_counters" || table === "steward_accounts") {
              return { 1: 1 };
            }
            return null;
          }
          if (sql.includes("steward_account_profiles") && sql.includes("account_id")) {
            if (sql.includes("profile_id = ?")) {
              return profiles.get(String(args[0])) === ACCOUNT
                ? { account_id: ACCOUNT }
                : null;
            }
            return { profile_id: SEASON_ROOT };
          }
          if (sql.includes("steward_account_profiles") && sql.includes("WHERE account_id")) {
            return { profile_id: SEASON_ROOT };
          }
          if (sql.includes("game_season_usage_counters") && sql.includes("SELECT count")) {
            const key = `${args[0]}:${args[1]}:${args[2]}`;
            const count = usage.get(key) ?? 0;
            return count > 0 ? { count } : null;
          }
          if (sql.includes("FROM steward_accounts WHERE account_id")) {
            return {
              account_id: ACCOUNT,
              plan_id: "hosted_game_season_v1",
              plan_version: 1,
              status: "active",
              effective_from: "2026-01-01T00:00:00.000Z",
              effective_until: null,
              overrides_json: null,
            };
          }
          if (sql.includes("steward_plan_definitions")) {
            return {
              entitlements_json: JSON.stringify(HOSTED_GAME_SEASON_ENTITLEMENTS),
            };
          }
          if (sql.includes("steward_usage_counters")) {
            return { count: 0 };
          }
          if (sql.includes("steward_sessions")) {
            return {
              token_hash: "hash",
              account_id: ACCOUNT,
              device_id: DEVICE,
              expires_at: new Date(Date.now() + 86_400_000).toISOString(),
            };
          }
          return null;
        }),
        run: vi.fn(async () => ({ success: true })),
        all: vi.fn(async () => {
          if (sql.includes("steward_account_profiles") && sql.includes("account_id")) {
            return { results: [{ profile_id: SEASON_ROOT }] };
          }
          return { results: [] };
        }),
      })),
    })),
  } as unknown as D1Database;
}

describe("parseGameSeasonIdQuery", () => {
  it("accepts valid season ids", () => {
    const url = new URL(
      "https://humanity.llc/.well-known/hc/v1/steward/entitlements?season_id=cr_season_01_wake"
    );
    expect(parseGameSeasonIdQuery(url)).toBe("cr_season_01_wake");
  });

  it("rejects invalid season ids", () => {
    const url = new URL(
      "https://humanity.llc/.well-known/hc/v1/steward/entitlements?season_id=INVALID"
    );
    expect(parseGameSeasonIdQuery(url)).toBeNull();
  });
});

describe("listAuthorizedSeasonIdsForAccount", () => {
  it("returns bundled season when root profile is linked", async () => {
    const db = stewardDbWithSeasonLink();
    const ids = await listAuthorizedSeasonIdsForAccount(db, ACCOUNT);
    expect(ids).toContain(CR_SEASON_01.season_id);
  });
});

describe("buildGameSeasonUsageBlock", () => {
  it("returns limits and counters", async () => {
    const db = stewardDbWithSeasonLink();
    const block = await buildGameSeasonUsageBlock(
      db,
      CR_SEASON_01,
      HOSTED_GAME_SEASON_ENTITLEMENTS
    );
    expect(block?.season_id).toBe(CR_SEASON_01.season_id);
    expect(block?.limits["game.season.node_cap"]).toBe(50);
    expect(block?.usage.counters["game.contribute"]).toBe(0);
  });
});

describe("GET /steward/entitlements game_season", () => {
  it("includes game_season when season_id query matches linked root", async () => {
    const db = stewardDbWithSeasonLink();
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };

    const res = await handleGetStewardEntitlements(
      new Request(
        `https://humanity.llc/.well-known/hc/v1/steward/entitlements?season_id=${CR_SEASON_01.season_id}`,
        {
          headers: {
            Authorization: "Bearer test-token",
            "X-HC-Device-Id": DEVICE,
          },
        }
      ),
      env,
      db
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      game_season?: { season_id: string; limits: Record<string, number> };
    };
    expect(body.game_season?.season_id).toBe(CR_SEASON_01.season_id);
    expect(body.game_season?.limits["game.season.node_cap"]).toBe(50);
  });

  it("returns 403 when season_id is not linked", async () => {
    const db = stewardDbWithSeasonLink();
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };

    const res = await handleGetStewardEntitlements(
      new Request(
        "https://humanity.llc/.well-known/hc/v1/steward/entitlements?season_id=other_season_99",
        {
          headers: {
            Authorization: "Bearer test-token",
            "X-HC-Device-Id": DEVICE,
          },
        }
      ),
      env,
      db
    );

    expect(res.status).toBe(403);
  });
});

describe("accountMayAccessGameSeason", () => {
  it("is true when account owns season root profile", async () => {
    const db = stewardDbWithSeasonLink();
    expect(
      await accountMayAccessGameSeason(db, ACCOUNT, CR_SEASON_01.season_id)
    ).toBe(true);
  });
});
