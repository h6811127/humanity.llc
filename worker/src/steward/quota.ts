import { jsonResponse } from "../http/resolver";
import type { Env } from "../index";
import { hostedStewardEnabled, STEWARD_SESSION_TTL_MS } from "./config";
import {
  getSessionByTokenHash,
  getUsageCount,
  incrementUsage,
  profileLinkedAccount,
  resolveEffectiveEntitlements,
  stewardSchemaReady,
  touchSession,
} from "./db";
import { utcDayKey, type EntitlementMap } from "./plans";
import {
  hashSessionToken,
  parseBearerToken,
} from "./session-token";

export const STEWARD_POLL_AUTO_EVENT = "poll.live_proof.auto";

function autoPollDailyCap(entitlements: EntitlementMap): number {
  const cap = entitlements["poll.live_proof.auto_daily_cap"];
  return typeof cap === "number" && cap >= 0 ? cap : 400;
}

/**
 * When hosted steward is enabled and a valid bearer session is linked to
 * `profileId`, increment server auto-poll usage and return 429 at cap (M2/E1.7).
 * Returns null when metering does not apply (no session, wrong link, flag off).
 */
export async function enforceStewardAutoPollQuota(
  request: Request,
  env: Env,
  db: D1Database,
  profileId: string
): Promise<Response | null> {
  if (!hostedStewardEnabled(env) || !(await stewardSchemaReady(db))) {
    return null;
  }

  const token = parseBearerToken(request);
  if (!token) return null;

  const tokenHash = await hashSessionToken(token);
  const session = await getSessionByTokenHash(db, tokenHash);
  if (!session) {
    return jsonResponse(
      { error: "UNAUTHORIZED", message: "Invalid or expired session." },
      401
    );
  }

  const expiresMs = Date.parse(session.expires_at);
  if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
    return jsonResponse(
      { error: "UNAUTHORIZED", message: "Session expired." },
      401
    );
  }

  const linkedAccount = await profileLinkedAccount(db, profileId);
  if (!linkedAccount || linkedAccount !== session.account_id) {
    return null;
  }

  const headerDevice = request.headers.get("X-HC-Device-Id")?.trim() ?? "";
  const deviceId = session.device_id || headerDevice;
  if (!deviceId) return null;

  const resolved = await resolveEffectiveEntitlements(db, session.account_id);
  if (!resolved) {
    return jsonResponse({ error: "NOT_FOUND", message: "Account not found." }, 404);
  }

  const cap = autoPollDailyCap(resolved.entitlements);
  const dayKey = utcDayKey();
  const used = await getUsageCount(
    db,
    session.account_id,
    deviceId,
    STEWARD_POLL_AUTO_EVENT,
    dayKey
  );

  if (used >= cap) {
    return jsonResponse(
      {
        error: "steward_quota_exceeded",
        message:
          "Daily automatic live-proof check limit reached for this account.",
        retry_after: 3600,
        usage: {
          [STEWARD_POLL_AUTO_EVENT]: used,
          limit: cap,
        },
      },
      429
    );
  }

  await incrementUsage(
    db,
    session.account_id,
    deviceId,
    STEWARD_POLL_AUTO_EVENT,
    dayKey
  );

  const newExpires = new Date(Date.now() + STEWARD_SESSION_TTL_MS).toISOString();
  await touchSession(db, tokenHash, newExpires);

  return null;
}
