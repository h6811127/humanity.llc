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

/** Account-wide auto-poll counter (device_id empty string in usage_counters). */
export const STEWARD_ACCOUNT_USAGE_DEVICE = "";

/** M4 fair-use: soft ops threshold; hard enforcement at ACCOUNT_HARD_CAP. */
export const STEWARD_ACCOUNT_SOFT_CAP = 50_000;
export const STEWARD_ACCOUNT_HARD_CAP = 100_000;

/** Client/server fallback when plan entitlement is null (unlimited within fair use). */
export const STEWARD_NULL_DEVICE_CAP_FALLBACK = 4_000;

export const STEWARD_MANUAL_POLL_HEADER = "X-HC-Live-Proof-Manual";

function autoPollDailyCap(entitlements: EntitlementMap): number {
  const cap = entitlements["poll.live_proof.auto_daily_cap"];
  if (cap === null) return STEWARD_NULL_DEVICE_CAP_FALLBACK;
  return typeof cap === "number" && cap >= 0 ? cap : 400;
}

function isManualLiveProofCheck(request: Request): boolean {
  const v = request.headers.get(STEWARD_MANUAL_POLL_HEADER)?.trim();
  return v === "1" || v === "true";
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

  if (isManualLiveProofCheck(request)) {
    return null;
  }

  const resolved = await resolveEffectiveEntitlements(db, session.account_id);
  if (!resolved) {
    return jsonResponse({ error: "NOT_FOUND", message: "Account not found." }, 404);
  }

  const deviceCap = autoPollDailyCap(resolved.entitlements);
  const dayKey = utcDayKey();
  const deviceUsed = await getUsageCount(
    db,
    session.account_id,
    deviceId,
    STEWARD_POLL_AUTO_EVENT,
    dayKey
  );

  if (deviceUsed >= deviceCap) {
    return stewardQuotaExceededResponse(deviceUsed, deviceCap);
  }

  const accountUsed = await getUsageCount(
    db,
    session.account_id,
    STEWARD_ACCOUNT_USAGE_DEVICE,
    STEWARD_POLL_AUTO_EVENT,
    dayKey
  );

  if (accountUsed >= STEWARD_ACCOUNT_HARD_CAP) {
    return stewardQuotaExceededResponse(
      accountUsed,
      STEWARD_ACCOUNT_HARD_CAP,
      "Daily automatic live-proof check limit reached for this steward account."
    );
  }

  await incrementUsage(
    db,
    session.account_id,
    deviceId,
    STEWARD_POLL_AUTO_EVENT,
    dayKey
  );
  await incrementUsage(
    db,
    session.account_id,
    STEWARD_ACCOUNT_USAGE_DEVICE,
    STEWARD_POLL_AUTO_EVENT,
    dayKey
  );

  const newExpires = new Date(Date.now() + STEWARD_SESSION_TTL_MS).toISOString();
  await touchSession(db, tokenHash, newExpires);

  return null;
}

function stewardQuotaExceededResponse(
  used: number,
  limit: number,
  message = "Daily automatic live-proof check limit reached for this device."
): Response {
  return jsonResponse(
    {
      error: "steward_quota_exceeded",
      message,
      retry_after: 3600,
      usage: {
        [STEWARD_POLL_AUTO_EVENT]: used,
        limit,
      },
    },
    429
  );
}
