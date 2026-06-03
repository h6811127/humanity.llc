export const LOST_ITEM_OFFER_MESSAGE_MAX = 280;
export const LOST_ITEM_OFFER_PENDING_MAX = 20;
export const LOST_ITEM_OFFER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const RELAY_OFFER_ID_REGEX = /^ro_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{12,40}$/;

export type LostItemOfferStatus = "pending" | "dismissed";

export type LostItemOfferRow = {
  offer_id: string;
  parent_profile_id: string;
  object_id: string;
  qr_id: string | null;
  message: string;
  status: LostItemOfferStatus;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

export function normalizeLostItemOfferMessage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > LOST_ITEM_OFFER_MESSAGE_MAX) return null;
  return trimmed;
}

export function lostItemOfferExpiresAt(now: Date = new Date()): string {
  return new Date(now.getTime() + LOST_ITEM_OFFER_TTL_MS).toISOString();
}

export function lostItemOfferPublicPayload(row: LostItemOfferRow) {
  return {
    offer_id: row.offer_id,
    object_id: row.object_id,
    message: row.message,
    status: row.status,
    created_at: row.created_at,
    expires_at: row.expires_at,
  };
}
