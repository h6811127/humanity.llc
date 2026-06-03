/** @typedef {'list' | 'dismiss'} RelayOfferOwnerAction */

export const LOST_ITEM_OFFER_MESSAGE_MAX = 280;

/**
 * @param {unknown} raw
 */
export function normalizeLostItemOfferMessage(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > LOST_ITEM_OFFER_MESSAGE_MAX) return null;
  return trimmed;
}

/**
 * @param {string} profileId
 * @param {string} objectId
 */
export function postLostItemOfferUrl(profileId, objectId) {
  return `/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/objects/${encodeURIComponent(objectId)}/offer`;
}

/**
 * @param {string} profileId
 * @param {string} objectId
 */
export function postLostItemOfferOwnerUrl(profileId, objectId) {
  return `/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/objects/${encodeURIComponent(objectId)}/offer/owner`;
}
