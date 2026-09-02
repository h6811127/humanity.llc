import {
  resolveCardQrBinding,
} from "./created-card-qr-binding-core.mjs";
import { getCardJsonUrl, getCardStatusUrl } from "./hc-sign.mjs";

/**
 * Resolve live card-scoped QR id + epoch for a /created/ publish or rotate.
 * @param {string} profileId
 * @param {Record<string, unknown> | null | undefined} session
 */
export function resolveCreatedCardQrBinding(profileId, session) {
  return resolveCardQrBinding({
    profileId,
    session,
    fetchStatus(pid, qrId) {
      return fetch(getCardStatusUrl(pid, qrId), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
    },
    fetchCard(pid) {
      return fetch(getCardJsonUrl(pid), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
    },
  });
}
