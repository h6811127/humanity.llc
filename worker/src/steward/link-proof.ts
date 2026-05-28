import { CRYPTO_ERROR, PAYLOAD_TYPES, PROFILE_ID_REGEX, verifySignedDocument } from "../crypto";
import { OPERATOR_ID } from "../http/resolver";
import { getCardOwner } from "../db/revoke";
import {
  consumeStewardLinkNonce,
  stewardLinkNonceUsed,
} from "./db";
import {
  ACCOUNT_ID_REGEX,
  DEVICE_ID_REGEX,
  STEWARD_LINK_MAX_CLOCK_SKEW_MS,
  STEWARD_LINK_MAX_TTL_MS,
} from "./config";

export interface LinkProofInput {
  profile_id: string;
  device_id: string;
  link_proof: Record<string, unknown>;
}

export type LinkProofResult =
  | { ok: true; account_id: string; profile_id: string; device_id: string }
  | { ok: false; code: string; message: string; status: number };

function parseIsoMs(iso: string): number | null {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export async function verifyStewardAccountLink(
  db: D1Database,
  input: LinkProofInput,
  pathProfileId?: string
): Promise<LinkProofResult> {
  const profileId = input.profile_id?.trim() ?? pathProfileId ?? "";
  if (!PROFILE_ID_REGEX.test(profileId)) {
    return {
      ok: false,
      code: CRYPTO_ERROR.INVALID_PROFILE_ID,
      message: "Invalid profile_id.",
      status: 400,
    };
  }
  if (pathProfileId && pathProfileId !== profileId) {
    return {
      ok: false,
      code: "PROFILE_MISMATCH",
      message: "profile_id does not match link proof.",
      status: 400,
    };
  }

  const deviceId = input.device_id?.trim() ?? "";
  if (!DEVICE_ID_REGEX.test(deviceId)) {
    return {
      ok: false,
      code: "INVALID_DEVICE_ID",
      message: "Invalid device_id.",
      status: 400,
    };
  }

  const doc = input.link_proof;
  if (!doc || typeof doc !== "object") {
    return {
      ok: false,
      code: "MALFORMED_REQUEST",
      message: "link_proof required.",
      status: 400,
    };
  }

  const nonce =
    typeof doc.nonce === "string" && doc.nonce.length > 0 ? doc.nonce : null;
  if (!nonce) {
    return {
      ok: false,
      code: "MALFORMED_REQUEST",
      message: "link_proof must include nonce.",
      status: 422,
    };
  }

  if (await stewardLinkNonceUsed(db, nonce)) {
    return {
      ok: false,
      code: CRYPTO_ERROR.REPLAYED_NONCE,
      message: "Link nonce already used.",
      status: 409,
    };
  }

  const owner = await getCardOwner(db, profileId);
  if (!owner) {
    return { ok: false, code: "NOT_FOUND", message: "Card not found.", status: 404 };
  }
  if (owner.status !== "active") {
    return {
      ok: false,
      code: "CARD_NOT_ACTIVE",
      message: "Card is not active.",
      status: 403,
    };
  }

  const verify = await verifySignedDocument(doc as Record<string, unknown>, {
    expectedType: PAYLOAD_TYPES.STEWARD_ACCOUNT_LINK,
    expectedPublicKeyBase58: owner.public_key,
  });

  if (!verify.ok) {
    const status =
      verify.code === CRYPTO_ERROR.REPLAYED_NONCE
        ? 409
        : verify.code === CRYPTO_ERROR.INVALID_PROFILE_ID
          ? 400
          : 401;
    return { ok: false, code: verify.code, message: verify.message, status };
  }

  const unsigned = verify.unsigned;
  if (unsigned.profile_id !== profileId) {
    return {
      ok: false,
      code: "PROFILE_MISMATCH",
      message: "Signed profile_id mismatch.",
      status: 401,
    };
  }

  const accountId =
    typeof unsigned.account_id === "string" ? unsigned.account_id : "";
  if (!ACCOUNT_ID_REGEX.test(accountId)) {
    return {
      ok: false,
      code: "INVALID_ACCOUNT_ID",
      message: "Invalid account_id in link proof.",
      status: 422,
    };
  }

  const operatorId =
    typeof unsigned.operator_id === "string" ? unsigned.operator_id : "";
  if (operatorId !== OPERATOR_ID) {
    return {
      ok: false,
      code: "OPERATOR_MISMATCH",
      message: "operator_id must match this operator.",
      status: 422,
    };
  }

  if (unsigned.device_id !== deviceId) {
    return {
      ok: false,
      code: "DEVICE_MISMATCH",
      message: "device_id does not match link proof.",
      status: 422,
    };
  }

  const now = Date.now();
  const issuedAt = parseIsoMs(String(unsigned.issued_at ?? ""));
  const expiresAt = parseIsoMs(String(unsigned.expires_at ?? ""));
  if (issuedAt === null || expiresAt === null) {
    return {
      ok: false,
      code: "MALFORMED_REQUEST",
      message: "Invalid issued_at or expires_at.",
      status: 422,
    };
  }
  if (issuedAt > now + STEWARD_LINK_MAX_CLOCK_SKEW_MS) {
    return {
      ok: false,
      code: "LINK_NOT_YET_VALID",
      message: "issued_at is in the future.",
      status: 422,
    };
  }
  if (expiresAt <= now) {
    return {
      ok: false,
      code: "LINK_EXPIRED",
      message: "Link proof expired.",
      status: 401,
    };
  }
  if (expiresAt - issuedAt > STEWARD_LINK_MAX_TTL_MS) {
    return {
      ok: false,
      code: "LINK_TTL_TOO_LONG",
      message: "Link proof TTL exceeds 15 minutes.",
      status: 422,
    };
  }

  const usedAt = new Date().toISOString();
  await consumeStewardLinkNonce(db, nonce, usedAt);

  return {
    ok: true,
    account_id: accountId,
    profile_id: profileId,
    device_id: deviceId,
  };
}
