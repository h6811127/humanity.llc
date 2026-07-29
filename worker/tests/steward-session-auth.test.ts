import { describe, expect, it } from "vitest";

import { authenticateStewardSession } from "../src/resolver/steward-session-auth";
import { STEWARD_SESSION_TTL_MS } from "../src/steward/config";
import { hashSessionToken } from "../src/steward/session-token";

const ACCOUNT = "acc_TestSessionAuth1";
const DEVICE = "devSessionAuth1111";
const TOKEN = "test_session_token_for_auth_unit_32b";

type SessionRow = {
  token_hash: string;
  account_id: string;
  device_id: string | null;
  expires_at: string;
  last_seen_at?: string;
};

function sessionAuthDb(sessions: Map<string, SessionRow>) {
  const touches: Array<{ tokenHash: string; expiresAt: string; lastSeenAt: string }> =
    [];

  const db = {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM steward_sessions WHERE token_hash")) {
            return sessions.get(String(params[0])) ?? null;
          }
          return null;
        },
        run: async () => {
          if (sql.includes("UPDATE steward_sessions SET last_seen_at")) {
            const lastSeenAt = String(params[0]);
            const expiresAt = String(params[1]);
            const tokenHash = String(params[2]);
            touches.push({ tokenHash, expiresAt, lastSeenAt });
            const row = sessions.get(tokenHash);
            if (row) {
              row.last_seen_at = lastSeenAt;
              row.expires_at = expiresAt;
              sessions.set(tokenHash, row);
            }
          }
          return { success: true };
        },
      }),
    }),
  } as unknown as D1Database;

  return { db, touches };
}

function authRequest(token?: string, deviceId?: string): Request {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (deviceId) headers.set("X-HC-Device-Id", deviceId);
  return new Request("https://humanity.llc/.well-known/hc/v1/steward/entitlements", {
    headers,
  });
}

async function seedSession(
  sessions: Map<string, SessionRow>,
  overrides: Partial<SessionRow> = {}
): Promise<string> {
  const tokenHash = await hashSessionToken(TOKEN);
  sessions.set(tokenHash, {
    token_hash: tokenHash,
    account_id: ACCOUNT,
    device_id: DEVICE,
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    ...overrides,
  });
  return tokenHash;
}

describe("authenticateStewardSession", () => {
  it("rejects missing Authorization bearer", async () => {
    const { db } = sessionAuthDb(new Map());
    const result = await authenticateStewardSession(db, authRequest());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    const body = (await result.response.json()) as { error: string; message: string };
    expect(body.error).toBe("UNAUTHORIZED");
    expect(body.message).toMatch(/Missing or invalid Authorization bearer token/i);
  });

  it("rejects unknown session token hashes", async () => {
    const { db } = sessionAuthDb(new Map());
    const result = await authenticateStewardSession(db, authRequest(TOKEN));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    const body = (await result.response.json()) as { error: string; message: string };
    expect(body.error).toBe("UNAUTHORIZED");
    expect(body.message).toBe("Invalid or expired session.");
  });

  it("rejects expired sessions without touching TTL", async () => {
    const sessions = new Map<string, SessionRow>();
    await seedSession(sessions, {
      expires_at: new Date(Date.now() - 1_000).toISOString(),
    });
    const { db, touches } = sessionAuthDb(sessions);

    const result = await authenticateStewardSession(db, authRequest(TOKEN));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    const body = (await result.response.json()) as { error: string; message: string };
    expect(body.error).toBe("UNAUTHORIZED");
    expect(body.message).toBe("Session expired.");
    expect(touches).toHaveLength(0);
  });

  it("rejects sessions with non-finite expires_at", async () => {
    const sessions = new Map<string, SessionRow>();
    await seedSession(sessions, { expires_at: "not-a-date" });
    const { db, touches } = sessionAuthDb(sessions);

    const result = await authenticateStewardSession(db, authRequest(TOKEN));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    const body = (await result.response.json()) as { message: string };
    expect(body.message).toBe("Session expired.");
    expect(touches).toHaveLength(0);
  });

  it("accepts a valid session, returns ids, and slides expiry", async () => {
    const sessions = new Map<string, SessionRow>();
    const tokenHash = await seedSession(sessions);
    const { db, touches } = sessionAuthDb(sessions);
    const before = Date.now();

    const result = await authenticateStewardSession(db, authRequest(TOKEN));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.account_id).toBe(ACCOUNT);
    expect(result.device_id).toBe(DEVICE);
    expect(result.token_hash).toBe(tokenHash);
    expect(touches).toHaveLength(1);
    expect(touches[0]?.tokenHash).toBe(tokenHash);

    const newExpiresMs = Date.parse(touches[0]!.expiresAt);
    expect(newExpiresMs).toBeGreaterThanOrEqual(before + STEWARD_SESSION_TTL_MS - 5_000);
    expect(newExpiresMs).toBeLessThanOrEqual(Date.now() + STEWARD_SESSION_TTL_MS + 5_000);
    expect(sessions.get(tokenHash)?.expires_at).toBe(touches[0]!.expiresAt);
  });

  it("falls back to X-HC-Device-Id when the session has no device_id", async () => {
    const sessions = new Map<string, SessionRow>();
    await seedSession(sessions, { device_id: null });
    const { db } = sessionAuthDb(sessions);

    const result = await authenticateStewardSession(
      db,
      authRequest(TOKEN, "devHeaderFallback99")
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.device_id).toBe("devHeaderFallback99");
  });
});
