import { afterEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../src/index";
import { LIVE_PROOF_PENDING_TYPE } from "../src/steward/push";
import {
  clearWebPushSendCacheForTests,
  fanOutWebPushLiveProofPending,
} from "../src/steward/web-push-send";

const ACCOUNT = "acc_webPushFanout1";
const VAPID_PUBLIC =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const VAPID_PRIVATE =
  "UUxI4O8-FbRPOA3_Z-vy_xYs9DIFYP5dYKI13sOJEvI";

function mockFanoutDb() {
  return {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => ({
        first: async () => {
          if (sql.includes("sqlite_master")) {
            if (params[0] === "steward_web_push_subscriptions") return { 1: 1 };
            return { 1: 1 };
          }
          return null;
        },
        all: async () => ({
          results: [
            {
              endpoint: "https://push.example.test/sub/1",
              account_id: ACCOUNT,
              device_id: "dev_1",
              p256dh:
                "BMVa1/ONWNvzwqczIVJz3q+bkT0yzIOLrgwZfzOd6B3nLi3FgqRSXdpe+kG2Ad4GoGy6MYx6z7H+gJbVB0PKEA8=",
              auth_key: "IkRYX7oHtMTTC1bPyb0lBw==",
              expiration_time: null,
              created_at: "2026-05-26T12:00:00.000Z",
              updated_at: "2026-05-26T12:00:00.000Z",
            },
          ],
        }),
        run: async () => ({ success: true }),
      }),
    }),
  } as unknown as D1Database;
}

afterEach(() => {
  clearWebPushSendCacheForTests();
  vi.unstubAllGlobals();
});

describe("fanOutWebPushLiveProofPending", () => {
  it("returns 0 when VAPID private key is missing", async () => {
    const db = mockFanoutDb();
    const env: Env = {
      DB: db,
      STEWARD_VAPID_PUBLIC_KEY: VAPID_PUBLIC,
    };
    const delivered = await fanOutWebPushLiveProofPending(env, db, ACCOUNT, {
      type: LIVE_PROOF_PENDING_TYPE,
      version: 1,
      operator_id: "humanity.llc",
      account_id: ACCOUNT,
      profile_id: "prof_1",
      qr_id: "qr_1",
      challenge_id: "lc_1",
      issued_at: "2026-05-26T12:00:00.000Z",
      expires_at: "2026-05-26T12:02:00.000Z",
    });
    expect(delivered).toBe(0);
  });

  it("POSTs encrypted payload when keys and subscriptions exist", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const db = mockFanoutDb();
    const env: Env = {
      DB: db,
      STEWARD_VAPID_PUBLIC_KEY: VAPID_PUBLIC,
      STEWARD_VAPID_PRIVATE_KEY: VAPID_PRIVATE,
    };
    const delivered = await fanOutWebPushLiveProofPending(env, db, ACCOUNT, {
      type: LIVE_PROOF_PENDING_TYPE,
      version: 1,
      operator_id: "humanity.llc",
      account_id: ACCOUNT,
      profile_id: "prof_1",
      qr_id: "qr_1",
      challenge_id: "lc_1",
      issued_at: "2026-05-26T12:00:00.000Z",
      expires_at: "2026-05-26T12:02:00.000Z",
    });
    expect(delivered).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("push.example.test");
    expect(init.method).toBe("POST");
    expect(String(init.headers && (init.headers as Record<string, string>)["Content-Encoding"])).toBe(
      "aes128gcm"
    );
    expect(String(init.headers && (init.headers as Record<string, string>).Authorization)).toMatch(
      /^vapid t=/
    );
  });
});
