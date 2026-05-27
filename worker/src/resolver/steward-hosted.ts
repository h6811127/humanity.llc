import { jsonResponseWithWeakEtag } from "../http/conditional-json";
import {
  clientIp,
  errorResponse,
  jsonResponse,
  OPERATOR_ID,
} from "../http/resolver";
import type { Env } from "../index";
import {
  hostedStewardEnabled,
  STEWARD_SESSION_TTL_MS,
} from "../steward/config";
import {
  accountHasLinkedProfile,
  getSessionByTokenHash,
  insertSession,
  linkProfileToAccount,
  listPublicPlans,
  applyStewardLifecycleTransitions,
  resolveEffectiveEntitlements,
  stewardSchemaReady,
  touchSession,
  upsertAccount,
  getUsageCount,
} from "../steward/db";
import {
  createStewardPushSseResponse,
  STEWARD_PUSH_MAX_CONNECTIONS_PER_ACCOUNT,
  stewardPushConnectionCount,
  stewardPushIpAtLimit,
} from "../steward/push";
import { STEWARD_NULL_DEVICE_CAP_FALLBACK } from "../steward/quota";
import { verifyStewardAccountLink } from "../steward/link-proof";
import { parseEntitlementsJson, utcDayKey } from "../steward/plans";
import {
  generateSessionToken,
  hashSessionToken,
  parseBearerToken,
} from "../steward/session-token";
import { PROTOCOL_VERSION } from "../crypto";

function hostedDisabled(): Response {
  return errorResponse(
    "hosted_steward_disabled",
    "Hosted steward extension is not enabled on this operator.",
    404
  );
}

function stewardSchemaMissing(): Response {
  return errorResponse(
    "steward_schema_missing",
    "Hosted steward tables are not migrated.",
    503
  );
}

async function requireStewardReady(
  env: Env,
  db: D1Database
): Promise<Response | null> {
  if (!hostedStewardEnabled(env)) return hostedDisabled();
  if (!(await stewardSchemaReady(db))) return stewardSchemaMissing();
  return null;
}

/**
 * GET /.well-known/hc/v1/operator/capabilities
 * Public; hosted block omitted when feature flag off.
 */
export async function handleGetOperatorCapabilities(
  request: Request,
  env: Env
): Promise<Response> {
  const body: Record<string, unknown> = {
    version: PROTOCOL_VERSION,
    protocol_version: PROTOCOL_VERSION,
    operator: {
      id: OPERATOR_ID,
      display_name: "Humanity Commons Reference Operator",
    },
    required_endpoints: {
      health: "/.well-known/hc/v1/health",
      cards: "/.well-known/hc/v1/cards",
    },
    extensions: {} as Record<string, unknown>,
  };

  if (env.DB && hostedStewardEnabled(env) && (await stewardSchemaReady(env.DB))) {
    body.extensions = {
      hosted_steward: {
        version: 1,
        optional: true,
        status: "enabled",
        endpoints: {
          capabilities: "/.well-known/hc/v1/operator/capabilities",
          plans: "/.well-known/hc/v1/operator/plans",
          entitlements: "/.well-known/hc/v1/steward/entitlements",
          session: "/.well-known/hc/v1/steward/session",
          push: "/.well-known/hc/v1/steward/push",
        },
      },
    };
  }

  return jsonResponse(body, 200, {
    "Cache-Control": "public, max-age=3600",
  });
}

/**
 * GET /.well-known/hc/v1/operator/plans
 */
export async function handleGetOperatorPlans(
  request: Request,
  env: Env,
  db: D1Database
): Promise<Response> {
  const gate = await requireStewardReady(env, db);
  if (gate) return gate;

  const rows = await listPublicPlans(db);
  const plans = rows.map((row) => ({
    plan_id: row.plan_id,
    plan_version: row.plan_version,
    description: row.description,
    entitlements: parseEntitlementsJson(row.entitlements_json),
    ...(row.plan_id === "hosted_steward_v1"
      ? {
          commercial: {
            status: "planning",
            pricing_document: "HOSTED_TIER_PRICING_AND_SLA.md",
          },
        }
      : {}),
  }));

  return jsonResponse(
    {
      version: PROTOCOL_VERSION,
      operator: { id: OPERATOR_ID },
      plans,
    },
    200,
    { "Cache-Control": "public, max-age=3600" }
  );
}

/**
 * POST /.well-known/hc/v1/steward/session
 */
export async function handlePostStewardSession(
  request: Request,
  env: Env,
  db: D1Database
): Promise<Response> {
  const gate = await requireStewardReady(env, db);
  if (gate) return gate;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  if (!o) {
    return errorResponse("MALFORMED_REQUEST", "Body required.", 400);
  }

  const profileId = typeof o.profile_id === "string" ? o.profile_id : "";
  const deviceId = typeof o.device_id === "string" ? o.device_id : "";
  const linkProof =
    o.link_proof && typeof o.link_proof === "object"
      ? (o.link_proof as Record<string, unknown>)
      : null;

  if (!linkProof) {
    return errorResponse("MALFORMED_REQUEST", "link_proof required.", 400);
  }

  const verified = await verifyStewardAccountLink(db, {
    profile_id: profileId,
    device_id: deviceId,
    link_proof: linkProof,
  });

  if (!verified.ok) {
    return errorResponse(verified.code, verified.message, verified.status);
  }

  const now = new Date();
  const effectiveFrom = now.toISOString();
  const existing = await db
    .prepare(`SELECT account_id FROM steward_accounts WHERE account_id = ?`)
    .bind(verified.account_id)
    .first();

  if (!existing) {
    await upsertAccount(db, {
      account_id: verified.account_id,
      plan_id: "reference_free",
      plan_version: 1,
      status: "active",
      effective_from: effectiveFrom,
      effective_until: null,
    });
  }

  await linkProfileToAccount(
    db,
    verified.account_id,
    verified.profile_id,
    effectiveFrom
  );

  const token = generateSessionToken();
  const tokenHash = await hashSessionToken(token);
  const expiresAt = new Date(now.getTime() + STEWARD_SESSION_TTL_MS).toISOString();
  await insertSession(db, tokenHash, verified.account_id, deviceId, expiresAt);

  return jsonResponse(
    {
      token,
      expires_in: Math.floor(STEWARD_SESSION_TTL_MS / 1000),
      account_id: verified.account_id,
    },
    200
  );
}

async function authenticateSession(
  db: D1Database,
  request: Request
): Promise<
  | { ok: true; account_id: string; device_id: string; token_hash: string }
  | { ok: false; response: Response }
> {
  const token = parseBearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: errorResponse(
        "UNAUTHORIZED",
        "Missing or invalid Authorization bearer token.",
        401
      ),
    };
  }

  const tokenHash = await hashSessionToken(token);
  const session = await getSessionByTokenHash(db, tokenHash);
  if (!session) {
    return {
      ok: false,
      response: errorResponse("UNAUTHORIZED", "Invalid or expired session.", 401),
    };
  }

  const expiresMs = Date.parse(session.expires_at);
  if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
    return {
      ok: false,
      response: errorResponse("UNAUTHORIZED", "Session expired.", 401),
    };
  }

  const headerDevice = request.headers.get("X-HC-Device-Id")?.trim() ?? "";
  const deviceId = session.device_id ?? headerDevice;

  const newExpires = new Date(Date.now() + STEWARD_SESSION_TTL_MS).toISOString();
  await touchSession(db, tokenHash, newExpires);

  return {
    ok: true,
    account_id: session.account_id,
    device_id: deviceId || "",
    token_hash: tokenHash,
  };
}

/**
 * GET /.well-known/hc/v1/steward/entitlements
 */
export async function handleGetStewardEntitlements(
  request: Request,
  env: Env,
  db: D1Database
): Promise<Response> {
  const gate = await requireStewardReady(env, db);
  if (gate) return gate;

  const auth = await authenticateSession(db, request);
  if (!auth.ok) return auth.response;

  const transitioned = await applyStewardLifecycleTransitions(
    db,
    auth.account_id
  );
  if (!transitioned) {
    return errorResponse("NOT_FOUND", "Account not found.", 404);
  }

  const resolved = await resolveEffectiveEntitlements(db, auth.account_id);
  if (!resolved) {
    return errorResponse("NOT_FOUND", "Account not found.", 404);
  }

  const { account, entitlements } = resolved;
  const deviceId = auth.device_id || "";
  const dayKey = utcDayKey();
  const autoPollUsed = await getUsageCount(
    db,
    auth.account_id,
    deviceId,
    "poll.live_proof.auto",
    dayKey
  );

  const autoCap =
    typeof entitlements["poll.live_proof.auto_daily_cap"] === "number"
      ? entitlements["poll.live_proof.auto_daily_cap"]
      : entitlements["poll.live_proof.auto_daily_cap"] === null
        ? STEWARD_NULL_DEVICE_CAP_FALLBACK
        : 400;

  const body = {
    version: "1.0",
    operator: { id: OPERATOR_ID },
    account_id: account.account_id,
    plan_id: account.plan_id,
    plan_version: account.plan_version,
    effective_from: account.effective_from,
    effective_until: account.effective_until,
    status: account.status,
    entitlements,
    usage: {
      period: "utc_day",
      period_key: dayKey,
      counters: {
        "poll.live_proof.auto": autoPollUsed,
      },
      limits: {
        "poll.live_proof.auto": autoCap,
      },
    },
  };

  return jsonResponseWithWeakEtag(request, body, 200, {
    "Cache-Control": "private, max-age=300",
  });
}

function acceptsStewardPushSse(request: Request): boolean {
  const accept = request.headers.get("Accept") ?? "";
  return accept.includes("text/event-stream");
}

/**
 * GET /.well-known/hc/v1/steward/push — E4b SSE subscribe.
 */
export async function handleGetStewardPush(
  request: Request,
  env: Env,
  db: D1Database
): Promise<Response> {
  const gate = await requireStewardReady(env, db);
  if (gate) return gate;

  if (!acceptsStewardPushSse(request)) {
    return errorResponse(
      "NOT_ACCEPTABLE",
      "Accept must include text/event-stream.",
      406
    );
  }

  const auth = await authenticateSession(db, request);
  if (!auth.ok) return auth.response;

  const resolved = await resolveEffectiveEntitlements(db, auth.account_id);
  if (!resolved) {
    return errorResponse("NOT_FOUND", "Account not found.", 404);
  }

  const { account, entitlements } = resolved;
  if (account.status !== "active" && account.status !== "trialing") {
    return errorResponse(
      "FORBIDDEN",
      "Push not available for this account status.",
      403
    );
  }
  if (entitlements["steward.hosted"] !== true) {
    return errorResponse(
      "FORBIDDEN",
      "Hosted steward plan required for push.",
      403
    );
  }
  if (entitlements["notify.push.live_proof"] !== true) {
    return errorResponse(
      "FORBIDDEN",
      "Push not entitled for this account.",
      403
    );
  }

  if (!(await accountHasLinkedProfile(db, auth.account_id))) {
    return errorResponse(
      "FORBIDDEN",
      "Link at least one card profile before subscribing to push.",
      403
    );
  }

  if (
    stewardPushConnectionCount(auth.account_id) >=
    STEWARD_PUSH_MAX_CONNECTIONS_PER_ACCOUNT
  ) {
    return errorResponse(
      "steward_push_connection_limit",
      "Too many concurrent push connections for this account.",
      429,
      { "Retry-After": "60" }
    );
  }

  const ip = clientIp(request);
  if (stewardPushIpAtLimit(ip)) {
    return errorResponse(
      "steward_push_ip_limit",
      "Too many concurrent push connections from this network.",
      429,
      { "Retry-After": "60" }
    );
  }

  return createStewardPushSseResponse(request, {
    accountId: auth.account_id,
    deviceId: auth.device_id,
    clientIp: ip,
  });
}
