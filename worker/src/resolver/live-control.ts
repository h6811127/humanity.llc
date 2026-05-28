import {
  CRYPTO_ERROR,
  isSignatureBlock,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  verifySignedDocument,
} from "../crypto";
import { checkLiveControlGetRateLimit, hashIp } from "../db/rate-limit";
import { getCardOwner } from "../db/revoke";
import { loadScanContext } from "../db/scan";
import {
  getLatestPendingLiveControlChallenge,
  getLiveControlChallenge,
  insertLiveControlChallenge,
  markLiveControlExpired,
  markLiveControlProven,
  type LiveControlChallengeRow,
} from "../db/live-control";
import { jsonResponseWithWeakEtag } from "../http/conditional-json";
import {
  clientIp,
  errorResponse,
  jsonResponse,
  requestOrigin,
} from "../http/resolver";
import {
  buildScanViewModel,
  QR_ID_REGEX,
  type ScanPageKind,
} from "./scan-state";
import type { Env } from "../env";
import { notifyLiveProofPending } from "../steward/push";
import { enforceStewardAutoPollQuota } from "../steward/quota";
import {
  generateLiveControlChallengeId,
  generateVerifierSessionId,
  randomBase58,
} from "../id";

const CHALLENGE_TTL_MS = 120_000;
const PROOF_DISPLAY_TTL_MS = 5 * 60_000;
const CHALLENGE_ID_REGEX =
  /^lc_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{12,40}$/;

async function enforceLiveControlGetRateLimit(
  request: Request,
  db: D1Database
): Promise<Response | null> {
  const ipHash = await hashIp(clientIp(request));
  const rate = await checkLiveControlGetRateLimit(db, ipHash);
  if (!rate.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      "Too many live control requests from this network. Try again later.",
      429,
      rate.retryAfterSec
        ? { "Retry-After": String(rate.retryAfterSec) }
        : undefined
    );
  }
  return null;
}

interface CreateChallengeBody {
  qr_id?: unknown;
  client_origin?: unknown;
}

interface SubmitResponseBody {
  response?: unknown;
}

export async function handlePostLiveControlChallenge(
  request: Request,
  db: D1Database,
  profileId: string,
  opts?: { env?: Env; executionCtx?: ExecutionContext }
): Promise<Response> {
  if (!PROFILE_ID_REGEX.test(profileId)) {
    return errorResponse(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 422);
  }

  let body: CreateChallengeBody = {};
  try {
    body = (await request.json()) as CreateChallengeBody;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const qrId = typeof body.qr_id === "string" ? body.qr_id.trim() : null;
  if (qrId && !QR_ID_REGEX.test(qrId)) {
    return errorResponse("INVALID_QR_ID", "Invalid qr_id.", 422);
  }
  if (!qrId) {
    return errorResponse(
      "QR_REQUIRED",
      "Live control alpha starts from a scan QR.",
      422
    );
  }

  const ctx = await loadScanContext(db, profileId, qrId);
  const vm = buildScanViewModel(profileId, qrId, ctx, requestOrigin(request));
  if (vm.kind !== "active") {
    return errorResponse(
      "LIVE_CONTROL_UNAVAILABLE",
      liveControlUnavailableMessage(vm.kind),
      409
    );
  }

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + CHALLENGE_TTL_MS);
  const challengeId = generateLiveControlChallengeId();
  const verifierSessionId = generateVerifierSessionId();
  const nonce = randomBase58(24);

  try {
    await insertLiveControlChallenge(db, {
      challengeId,
      profileId,
      qrId,
      nonce,
      verifierSessionId,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    if (String(e).includes("live_control_challenges")) {
      return errorResponse(
        "RESOLVER_SCHEMA",
        "Resolver database is missing live control storage. Apply D1 migration 0006_live_control_challenges.sql and redeploy.",
        503
      );
    }
    throw e;
  }

  const issuedAtIso = issuedAt.toISOString();
  const expiresAtIso = expiresAt.toISOString();

  if (opts?.env && opts?.executionCtx) {
    opts.executionCtx.waitUntil(
      notifyLiveProofPending(opts.env, db, {
        profile_id: profileId,
        qr_id: qrId,
        challenge_id: challengeId,
        issued_at: issuedAtIso,
        expires_at: expiresAtIso,
      }).catch((err) => {
        console.error("steward_push_notify_failed", err);
      })
    );
  }

  return jsonResponse(
    challengeBody(
      {
        challenge_id: challengeId,
        profile_id: profileId,
        qr_id: qrId,
        nonce,
        verifier_session_id: verifierSessionId,
        status: "pending",
        issued_at: issuedAtIso,
        expires_at: expiresAtIso,
        proven_at: null,
        signer_public_key: null,
        response_document_json: null,
        created_at: issuedAt.toISOString(),
        updated_at: issuedAt.toISOString(),
      },
      request,
      localClientOrigin(body.client_origin)
    ),
    201
  );
}

export async function handleGetLiveControlChallenge(
  request: Request,
  db: D1Database,
  profileId: string,
  challengeId: string,
  env?: Env
): Promise<Response> {
  const rateLimited = await enforceLiveControlGetRateLimit(request, db);
  if (rateLimited) return rateLimited;

  if (env) {
    const quota = await enforceStewardAutoPollQuota(request, env, db, profileId);
    if (quota) return quota;
  }

  if (!PROFILE_ID_REGEX.test(profileId)) {
    return errorResponse(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 422);
  }
  if (!CHALLENGE_ID_REGEX.test(challengeId)) {
    return errorResponse("INVALID_CHALLENGE_ID", "Invalid challenge_id.", 422);
  }

  const challenge = await getLiveControlChallenge(db, challengeId);
  if (!challenge || challenge.profile_id !== profileId) {
    return errorResponse("CHALLENGE_NOT_FOUND", "Live control request not found.", 404);
  }

  const current = await expireIfNeeded(db, challenge);
  return jsonResponse(challengeBody(current, request), 200, {
    "Cache-Control": "no-store",
  });
}

export async function handleGetPendingLiveControlChallenge(
  request: Request,
  db: D1Database,
  profileId: string,
  env?: Env
): Promise<Response> {
  const rateLimited = await enforceLiveControlGetRateLimit(request, db);
  if (rateLimited) return rateLimited;

  if (env) {
    const quota = await enforceStewardAutoPollQuota(request, env, db, profileId);
    if (quota) return quota;
  }

  if (!PROFILE_ID_REGEX.test(profileId)) {
    return errorResponse(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 422);
  }

  const url = new URL(request.url);
  const qrId = url.searchParams.get("qr_id")?.trim() || null;
  if (!qrId || !QR_ID_REGEX.test(qrId)) {
    return errorResponse("INVALID_QR_ID", "Query must include valid qr_id.", 422);
  }

  const nowIso = new Date().toISOString();
  const challenge = await getLatestPendingLiveControlChallenge(
    db,
    profileId,
    qrId,
    nowIso
  );
  if (!challenge) {
    return errorResponse(
      "CHALLENGE_NOT_FOUND",
      "No pending live control request for this QR.",
      404
    );
  }

  const current = await expireIfNeeded(db, challenge);
  if (current.status !== "pending") {
    return errorResponse(
      "CHALLENGE_NOT_FOUND",
      "No pending live control request for this QR.",
      404
    );
  }

  return jsonResponseWithWeakEtag(request, challengeBody(current, request), 200, {
    "Cache-Control": "private, max-age=15",
  });
}

export async function handlePostLiveControlResponse(
  request: Request,
  db: D1Database,
  profileId: string
): Promise<Response> {
  if (!PROFILE_ID_REGEX.test(profileId)) {
    return errorResponse(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 422);
  }

  let body: SubmitResponseBody;
  try {
    body = (await request.json()) as SubmitResponseBody;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  if (!body.response || typeof body.response !== "object") {
    return errorResponse(
      "MALFORMED_REQUEST",
      "Body must include signed `response`.",
      400
    );
  }

  const response = body.response as Record<string, unknown>;
  const verify = await verifySignedDocument(response, {
    expectedType: PAYLOAD_TYPES.LIVE_CONTROL_RESPONSE,
  });
  if (!verify.ok) {
    return errorResponse(verify.code, verify.message, 401);
  }

  if (response.profile_id !== profileId) {
    return errorResponse("PROFILE_MISMATCH", "Live control profile mismatch.", 422);
  }

  const challengeId = response.challenge_id;
  if (typeof challengeId !== "string" || !CHALLENGE_ID_REGEX.test(challengeId)) {
    return errorResponse("INVALID_CHALLENGE_ID", "Invalid challenge_id.", 422);
  }

  const challenge = await getLiveControlChallenge(db, challengeId);
  if (!challenge || challenge.profile_id !== profileId) {
    return errorResponse("CHALLENGE_NOT_FOUND", "Live control request not found.", 404);
  }

  const current = await expireIfNeeded(db, challenge);
  if (current.status === "expired") {
    return errorResponse(
      "LIVE_CONTROL_EXPIRED",
      "Control was not proven. This request expired.",
      410
    );
  }
  if (current.status === "proven") {
    return errorResponse(
      "LIVE_CONTROL_ALREADY_PROVEN",
      "This live control request was already proven.",
      409
    );
  }

  if (response.qr_id !== current.qr_id) {
    return errorResponse("QR_MISMATCH", "Live control QR mismatch.", 422);
  }

  const sig = response.signature;
  if (!isSignatureBlock(sig)) {
    return errorResponse(
      CRYPTO_ERROR.MALFORMED_SIGNATURE_BLOCK,
      "Missing or invalid signature block.",
      401
    );
  }

  const owner = await getCardOwner(db, profileId);
  if (!owner || owner.status !== "active") {
    return errorResponse(
      "LIVE_CONTROL_UNAVAILABLE",
      "Live control requires an active card.",
      409
    );
  }
  if (
    sig.public_key !== owner.public_key &&
    sig.public_key !== owner.recovery_public_key
  ) {
    return errorResponse(
      CRYPTO_ERROR.INVALID_SIGNATURE,
      "Live control must be signed by the card owner or recovery key.",
      401
    );
  }

  const provenAt =
    (typeof response.signed_at === "string" && response.signed_at) ||
    new Date().toISOString();
  await markLiveControlProven(db, {
    challengeId: current.challenge_id,
    signerPublicKey: sig.public_key,
    responseDocumentJson: JSON.stringify(response),
    provenAt,
  });

  const proven = {
    ...current,
    status: "proven" as const,
    proven_at: provenAt,
    signer_public_key: sig.public_key,
    response_document_json: JSON.stringify(response),
    updated_at: provenAt,
  };

  return jsonResponse(challengeBody(proven, request), 200, {
    "Cache-Control": "no-store",
  });
}

async function expireIfNeeded(
  db: D1Database,
  challenge: LiveControlChallengeRow
): Promise<LiveControlChallengeRow> {
  if (challenge.status !== "pending") return challenge;
  const now = Date.now();
  if (Date.parse(challenge.expires_at) >= now) return challenge;
  const updatedAt = new Date(now).toISOString();
  await markLiveControlExpired(db, challenge.challenge_id, updatedAt);
  return { ...challenge, status: "expired", updated_at: updatedAt };
}

function challengeBody(
  challenge: LiveControlChallengeRow,
  request: Request,
  originOverride?: string | null
) {
  const origin = originOverride ?? liveControlApiOrigin(request);
  const ownerUrl = new URL(`${ownerPageOrigin(origin)}/created/`);
  ownerUrl.searchParams.set("profile_id", challenge.profile_id);
  if (challenge.qr_id) ownerUrl.searchParams.set("qr_id", challenge.qr_id);
  ownerUrl.searchParams.set("live_challenge", challenge.challenge_id);
  if (challenge.qr_id) {
    const returnUrl = new URL(`${origin}/c/${challenge.profile_id}`);
    returnUrl.searchParams.set("q", challenge.qr_id);
    returnUrl.searchParams.set("live_challenge", challenge.challenge_id);
    ownerUrl.searchParams.set("return_url", returnUrl.href);
  }

  const statusUrl = new URL(
    `${origin}/.well-known/hc/v1/cards/${encodeURIComponent(
      challenge.profile_id
    )}/live-control/challenges/${encodeURIComponent(challenge.challenge_id)}`
  );

  const proofExpiresAt = challenge.proven_at
    ? new Date(Date.parse(challenge.proven_at) + PROOF_DISPLAY_TTL_MS).toISOString()
    : null;

  return {
    type: "live_control_challenge",
    version: "1.0",
    challenge_id: challenge.challenge_id,
    profile_id: challenge.profile_id,
    qr_id: challenge.qr_id,
    nonce: challenge.nonce,
    verifier_session_id: challenge.verifier_session_id,
    status: challenge.status,
    issued_at: challenge.issued_at,
    expires_at: challenge.expires_at,
    proven_at: challenge.proven_at,
    proof_expires_at: proofExpiresAt,
    owner_url: ownerUrl.href,
    return_url: challenge.qr_id ? ownerUrl.searchParams.get("return_url") : null,
    status_url: statusUrl.href,
    message:
      challenge.status === "proven"
        ? "Control proven moments ago. This does not prove legal identity."
        : "Ask the card owner to prove live control.",
  };
}

function liveControlApiOrigin(request: Request): string {
  const originHeader = request.headers.get("Origin") ?? "";
  if (isLocalOrigin(originHeader)) return originHeader;
  const host = request.headers.get("Host") ?? "";
  if (host.startsWith("localhost:") || host.startsWith("127.0.0.1:")) {
    return `http://${host}`;
  }
  return requestOrigin(request);
}

function ownerPageOrigin(apiOrigin: string): string {
  if (isLocalOrigin(apiOrigin)) {
    return "http://localhost:8788";
  }
  return apiOrigin;
}

function isLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function localClientOrigin(origin: unknown): string | null {
  if (typeof origin !== "string") return null;
  return isLocalOrigin(origin) ? origin : null;
}

function liveControlUnavailableMessage(kind: ScanPageKind): string {
  switch (kind) {
    case "qr_revoked":
    case "qr_expired":
    case "qr_replaced":
      return "Live control requires an active QR.";
    case "card_revoked":
    case "card_suspended":
    case "card_expired":
      return "Live control requires an active card.";
    default:
      return "Live control is not available for this scan.";
  }
}
