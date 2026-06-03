import {
  CRYPTO_ERROR,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  verifySignedDocument,
} from "../crypto";
import { getChildObject, getChildObjectParent } from "../db/child-objects";
import {
  countPendingLostItemOffers,
  dismissLostItemOffer,
  expireLostItemOffers,
  getLostItemOffer,
  insertLostItemOffer,
  listPendingLostItemOffers,
} from "../db/lost-item-offers";
import { loadQrCredentialById } from "../db/qr-metadata";
import { checkRelayOfferRateLimit, hashIp } from "../db/rate-limit";
import { generateRelayOfferId } from "../id";
import { CHILD_OBJECT_TYPE_LOST_ITEM_RELAY } from "../live-object/object-types";
import {
  LOST_ITEM_OFFER_PENDING_MAX,
  lostItemOfferExpiresAt,
  lostItemOfferPublicPayload,
  normalizeLostItemOfferMessage,
  RELAY_OFFER_ID_REGEX,
} from "../live-object/lost-item-offer-core";
import { clientIp, errorResponse, jsonResponse } from "../http/resolver";
import { CHILD_OBJECT_ID_REGEX } from "./child-objects";
import { QR_ID_REGEX } from "./scan-state";

type FinderOfferBody = {
  qr_id?: unknown;
  message?: unknown;
};

type OwnerOfferBody = {
  query?: unknown;
};

function parentSignerAllowed(
  signerKey: string,
  parent: { public_key: string; recovery_public_key: string | null }
): boolean {
  if (signerKey === parent.public_key) return true;
  return Boolean(parent.recovery_public_key && signerKey === parent.recovery_public_key);
}

function isRelayOfferStorageError(message: string): boolean {
  return (
    message.includes("lost_item_relay_offers") ||
    message.includes("no such table") ||
    message.includes("SQLITE") ||
    message.includes("D1_ERROR")
  );
}

async function loadActiveLostItemRelay(
  db: D1Database,
  profileId: string,
  objectId: string
) {
  const child = await getChildObject(db, objectId);
  if (!child || child.parent_profile_id !== profileId) {
    return {
      ok: false as const,
      response: errorResponse("NOT_FOUND", "Lost-item relay not found.", 404),
    };
  }
  if (child.object_type !== CHILD_OBJECT_TYPE_LOST_ITEM_RELAY) {
    return {
      ok: false as const,
      response: errorResponse(
        "NOT_LOST_ITEM_RELAY",
        "Offer applies only to lost-item relay objects.",
        422
      ),
    };
  }
  if (child.status !== "active") {
    return {
      ok: false as const,
      response: errorResponse(
        "RELAY_UNAVAILABLE",
        "This return relay is not accepting messages.",
        409
      ),
    };
  }
  return { ok: true as const, child };
}

async function verifyQrForOffer(
  db: D1Database,
  profileId: string,
  objectId: string,
  qrId: string | null
): Promise<Response | null> {
  if (!qrId) return null;
  if (!QR_ID_REGEX.test(qrId)) {
    return errorResponse("INVALID_QR_ID", "Invalid qr_id.", 422);
  }
  const qr = await loadQrCredentialById(db, qrId);
  if (!qr || qr.profile_id !== profileId) {
    return errorResponse("QR_NOT_FOUND", "QR credential not found.", 404);
  }
  if (qr.scope !== "child_object" || qr.object_id !== objectId) {
    return errorResponse("QR_MISMATCH", "QR does not match this relay object.", 422);
  }
  if (qr.status !== "active") {
    return errorResponse(
      "RELAY_UNAVAILABLE",
      "This return relay is not accepting messages.",
      409
    );
  }
  return null;
}

/** Finder POST — anonymous message to owner relay (Layer 2 offer verb). */
export async function handlePostLostItemOffer(
  request: Request,
  db: D1Database,
  profileId: string,
  objectId: string
): Promise<Response> {
  if (!PROFILE_ID_REGEX.test(profileId)) {
    return errorResponse(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 400);
  }
  if (!CHILD_OBJECT_ID_REGEX.test(objectId)) {
    return errorResponse("INVALID_OBJECT_ID", "Invalid object_id.", 400);
  }

  let body: FinderOfferBody = {};
  try {
    body = (await request.json()) as FinderOfferBody;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const message = normalizeLostItemOfferMessage(body.message);
  if (!message) {
    return errorResponse(
      "MALFORMED_REQUEST",
      "message must be a non-empty string up to 280 characters.",
      422
    );
  }

  const qrId =
    typeof body.qr_id === "string" && body.qr_id.trim()
      ? body.qr_id.trim()
      : null;

  const ipHash = await hashIp(clientIp(request));
  const rate = await checkRelayOfferRateLimit(db, ipHash);
  if (!rate.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      "Too many relay messages from this network. Try again later.",
      429,
      rate.retryAfterSec ? { "Retry-After": String(rate.retryAfterSec) } : undefined
    );
  }

  const relay = await loadActiveLostItemRelay(db, profileId, objectId);
  if (!relay.ok) return relay.response;

  const qrError = await verifyQrForOffer(db, profileId, objectId, qrId);
  if (qrError) return qrError;

  const now = new Date();
  const nowIso = now.toISOString();

  try {
    await expireLostItemOffers(db, nowIso);
    const pending = await countPendingLostItemOffers(db, objectId);
    if (pending >= LOST_ITEM_OFFER_PENDING_MAX) {
      return errorResponse(
        "RELAY_OFFER_FULL",
        "This relay has too many pending messages. Try again later.",
        409
      );
    }

    const offerId = generateRelayOfferId();
    await insertLostItemOffer(db, {
      offer_id: offerId,
      parent_profile_id: profileId,
      object_id: objectId,
      qr_id: qrId,
      message,
      status: "pending",
      created_at: nowIso,
      updated_at: nowIso,
      expires_at: lostItemOfferExpiresAt(now),
    });

    return jsonResponse(
      {
        type: "relay_offer_accepted",
        version: "1.0",
        offer_id: offerId,
        object_id: objectId,
        message:
          "Message sent to the owner relay. It is not linked to an account or scan history.",
      },
      201,
      { "Cache-Control": "no-store" }
    );
  } catch (e) {
    const detail = String(e);
    if (isRelayOfferStorageError(detail)) {
      return errorResponse(
        "RESOLVER_SCHEMA",
        "Return relay is temporarily unavailable. Try again shortly.",
        503
      );
    }
    throw e;
  }
}

async function verifiedOwnerOfferQuery(
  request: Request,
  db: D1Database,
  profileId: string,
  objectId: string
): Promise<
  | {
      ok: true;
      action: "list" | "dismiss";
      offerId: string | null;
    }
  | { ok: false; response: Response }
> {
  let body: OwnerOfferBody;
  try {
    body = (await request.json()) as OwnerOfferBody;
  } catch {
    return {
      ok: false,
      response: errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400),
    };
  }

  const query = body.query;
  if (!query || typeof query !== "object") {
    return {
      ok: false,
      response: errorResponse("MALFORMED_REQUEST", "query is required.", 422),
    };
  }

  const verified = await verifySignedDocument(query as Record<string, unknown>, {
    expectedType: PAYLOAD_TYPES.RELAY_OFFER_OWNER_QUERY,
  });
  if (!verified.ok) {
    return {
      ok: false,
      response: errorResponse(verified.code, verified.message, 401),
    };
  }

  const doc = verified.unsigned;
  if (doc.profile_id !== profileId || doc.object_id !== objectId) {
    return {
      ok: false,
      response: errorResponse("PROFILE_OBJECT_MISMATCH", "Query path mismatch.", 422),
    };
  }

  const parent = await getChildObjectParent(db, profileId);
  if (!parent || parent.status !== "active") {
    return {
      ok: false,
      response: errorResponse("NOT_FOUND", "Parent card not found.", 404),
    };
  }
  if (!parentSignerAllowed(verified.signature.public_key, parent)) {
    return {
      ok: false,
      response: errorResponse(
        CRYPTO_ERROR.INVALID_SIGNATURE,
        "Query must be signed by the card owner or recovery key.",
        401
      ),
    };
  }

  const action = doc.action;
  if (action !== "list" && action !== "dismiss") {
    return {
      ok: false,
      response: errorResponse(
        "MALFORMED_REQUEST",
        "action must be list or dismiss.",
        422
      ),
    };
  }

  let offerId: string | null = null;
  if (action === "dismiss") {
    if (typeof doc.offer_id !== "string" || !RELAY_OFFER_ID_REGEX.test(doc.offer_id)) {
      return {
        ok: false,
        response: errorResponse("MALFORMED_REQUEST", "offer_id is required.", 422),
      };
    }
    offerId = doc.offer_id;
  }

  return { ok: true, action, offerId };
}

/** Owner POST — list or dismiss pending finder messages (signed query). */
export async function handlePostLostItemOfferOwner(
  request: Request,
  db: D1Database,
  profileId: string,
  objectId: string
): Promise<Response> {
  if (!PROFILE_ID_REGEX.test(profileId)) {
    return errorResponse(CRYPTO_ERROR.INVALID_PROFILE_ID, "Invalid profile_id.", 400);
  }
  if (!CHILD_OBJECT_ID_REGEX.test(objectId)) {
    return errorResponse("INVALID_OBJECT_ID", "Invalid object_id.", 400);
  }

  const relay = await loadActiveLostItemRelay(db, profileId, objectId);
  if (!relay.ok) return relay.response;

  const verified = await verifiedOwnerOfferQuery(request, db, profileId, objectId);
  if (!verified.ok) return verified.response;

  const nowIso = new Date().toISOString();

  try {
    await expireLostItemOffers(db, nowIso);

    if (verified.action === "list") {
      const offers = await listPendingLostItemOffers(db, profileId, objectId);
      return jsonResponse(
        {
          type: "relay_offer_list",
          version: "1.0",
          object_id: objectId,
          offers: offers.map(lostItemOfferPublicPayload),
        },
        200,
        { "Cache-Control": "no-store" }
      );
    }

    const dismissed = await dismissLostItemOffer(db, verified.offerId!, nowIso);
    if (!dismissed) {
      const existing = await getLostItemOffer(db, verified.offerId!);
      if (
        existing &&
        existing.parent_profile_id === profileId &&
        existing.object_id === objectId &&
        existing.status === "dismissed"
      ) {
        return jsonResponse(
          {
            type: "relay_offer_dismissed",
            version: "1.0",
            offer_id: existing.offer_id,
            status: existing.status,
          },
          200,
          { "Cache-Control": "no-store" }
        );
      }
      return errorResponse("NOT_FOUND", "Offer not found.", 404);
    }

    return jsonResponse(
      {
        type: "relay_offer_dismissed",
        version: "1.0",
        offer_id: verified.offerId,
        status: "dismissed",
      },
      200,
      { "Cache-Control": "no-store" }
    );
  } catch (e) {
    const detail = String(e);
    if (isRelayOfferStorageError(detail)) {
      return errorResponse(
        "RESOLVER_SCHEMA",
        "Return relay is temporarily unavailable. Try again shortly.",
        503
      );
    }
    throw e;
  }
}
