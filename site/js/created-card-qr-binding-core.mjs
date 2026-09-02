/**
 * Live card-scoped QR public copy (active_qr_id + epoch) for /created/ publishes.
 * GET /cards/{id} may be stale after a manifesto update that hardcoded epoch 1;
 * GET …/status?q= reads qr_credentials and is the network source of truth.
 */

/**
 * @param {unknown} binding
 * @returns {binding is { active_qr_id: string, epoch: number }}
 */
export function isValidCardQrBinding(binding) {
  if (!binding || typeof binding !== "object") return false;
  const qrId = /** @type {{ active_qr_id?: unknown }} */ (binding).active_qr_id;
  const epoch = /** @type {{ epoch?: unknown }} */ (binding).epoch;
  return (
    typeof qrId === "string" &&
    qrId.trim().length > 0 &&
    Number.isInteger(epoch) &&
    /** @type {number} */ (epoch) >= 1
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @returns {string | null}
 */
export function sessionCardQrId(session) {
  const qrId = typeof session?.qr_id === "string" ? session.qr_id.trim() : "";
  return qrId || null;
}

/**
 * In-tab session after create/rotate. `qr_epoch` is often missing until the first
 * status resolve — do not invent epoch 1 from qr_id alone.
 * @param {Record<string, unknown> | null | undefined} session
 */
export function cardQrBindingFromSession(session) {
  const qrId = sessionCardQrId(session);
  const epoch = session?.qr_epoch;
  if (!qrId || !Number.isInteger(epoch) || /** @type {number} */ (epoch) < 1) {
    return null;
  }
  return { active_qr_id: qrId, epoch: /** @type {number} */ (epoch) };
}

/**
 * @param {Record<string, unknown> | null | undefined} body
 * @param {string | null} [fallbackQrId]
 */
export function cardQrBindingFromStatusPayload(body, fallbackQrId = null) {
  const scan = body && typeof body === "object" ? body.scan : null;
  const scanObj = scan && typeof scan === "object" ? scan : null;
  const qr = scanObj && typeof scanObj.qr === "object" && scanObj.qr ? scanObj.qr : null;
  const qrIdRaw =
    (typeof scanObj?.qr_id === "string" && scanObj.qr_id.trim()) ||
    (typeof fallbackQrId === "string" ? fallbackQrId.trim() : "");
  const epoch = qr && "epoch" in qr ? qr.epoch : null;
  if (!qrIdRaw || !Number.isInteger(epoch) || /** @type {number} */ (epoch) < 1) {
    return null;
  }
  return { active_qr_id: qrIdRaw, epoch: /** @type {number} */ (epoch) };
}

/**
 * Signed card JSON. After a poisoned manifesto update this may still say epoch 1.
 * @param {Record<string, unknown> | null | undefined} card
 */
export function cardQrBindingFromCardDocument(card) {
  const qr = card && typeof card.qr === "object" && card.qr ? card.qr : null;
  const qrId = typeof qr?.active_qr_id === "string" ? qr.active_qr_id.trim() : "";
  const epoch = qr && "epoch" in qr ? qr.epoch : null;
  if (!qrId || !Number.isInteger(epoch) || /** @type {number} */ (epoch) < 1) {
    return null;
  }
  return { active_qr_id: qrId, epoch: /** @type {number} */ (epoch) };
}

/**
 * @param {{
 *   profileId: string;
 *   session?: Record<string, unknown> | null;
 *   fetchStatus?: (profileId: string, qrId: string) => Promise<Response>;
 *   fetchCard?: (profileId: string) => Promise<Response>;
 * }} input
 */
export async function resolveCardQrBinding(input) {
  const fromSession = cardQrBindingFromSession(input.session);
  if (fromSession) return fromSession;

  const qrId = sessionCardQrId(input.session);
  if (qrId && input.fetchStatus) {
    try {
      const res = await input.fetchStatus(input.profileId, qrId);
      if (res?.ok) {
        const body = await res.json();
        const fromStatus = cardQrBindingFromStatusPayload(
          body && typeof body === "object" ? body : null,
          qrId
        );
        if (fromStatus) return fromStatus;
      }
    } catch {
      /* fall through */
    }
  }

  if (input.fetchCard) {
    try {
      const res = await input.fetchCard(input.profileId);
      if (res?.ok) {
        const card = await res.json();
        const fromCard = cardQrBindingFromCardDocument(
          card && typeof card === "object" ? card : null
        );
        if (fromCard) return fromCard;
      }
    } catch {
      /* fall through */
    }
  }

  throw new Error("Could not load current QR epoch from the network.");
}
