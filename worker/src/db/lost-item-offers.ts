import type { LostItemOfferRow, LostItemOfferStatus } from "../live-object/lost-item-offer-core";

export async function insertLostItemOffer(
  db: D1Database,
  row: LostItemOfferRow
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO lost_item_relay_offers (
        offer_id, parent_profile_id, object_id, qr_id, message,
        status, created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      row.offer_id,
      row.parent_profile_id,
      row.object_id,
      row.qr_id,
      row.message,
      row.status,
      row.created_at,
      row.updated_at,
      row.expires_at
    )
    .run();
}

export async function expireLostItemOffers(
  db: D1Database,
  nowIso: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE lost_item_relay_offers
       SET status = 'dismissed', updated_at = ?
       WHERE status = 'pending' AND expires_at <= ?`
    )
    .bind(nowIso, nowIso)
    .run();
}

export async function countPendingLostItemOffers(
  db: D1Database,
  objectId: string
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count FROM lost_item_relay_offers
       WHERE object_id = ? AND status = 'pending' AND expires_at > ?`
    )
    .bind(objectId, new Date().toISOString())
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function listPendingLostItemOffers(
  db: D1Database,
  profileId: string,
  objectId: string,
  limit = 20
): Promise<LostItemOfferRow[]> {
  const nowIso = new Date().toISOString();
  const { results } = await db
    .prepare(
      `SELECT offer_id, parent_profile_id, object_id, qr_id, message, status,
              created_at, updated_at, expires_at
       FROM lost_item_relay_offers
       WHERE parent_profile_id = ? AND object_id = ? AND status = 'pending'
         AND expires_at > ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(profileId, objectId, nowIso, limit)
    .all<LostItemOfferRow>();
  return results ?? [];
}

export type LostItemOfferProfileSummaryRow = {
  object_id: string;
  public_label: string;
  pending_count: number;
};

/** Pending finder-message counts per active lost-item relay under a root card. */
export async function summarizePendingLostItemOffersByProfile(
  db: D1Database,
  profileId: string,
  limit = 50
): Promise<LostItemOfferProfileSummaryRow[]> {
  const nowIso = new Date().toISOString();
  const { results } = await db
    .prepare(
      `SELECT o.object_id AS object_id,
              c.public_label AS public_label,
              COUNT(*) AS pending_count
       FROM lost_item_relay_offers o
       INNER JOIN child_objects c ON c.object_id = o.object_id
       WHERE o.parent_profile_id = ?
         AND o.status = 'pending'
         AND o.expires_at > ?
         AND c.parent_profile_id = ?
         AND c.object_type = 'lost_item_relay'
         AND c.status = 'active'
       GROUP BY o.object_id, c.public_label
       ORDER BY pending_count DESC, c.public_label ASC, o.object_id ASC
       LIMIT ?`
    )
    .bind(profileId, nowIso, profileId, limit)
    .all<LostItemOfferProfileSummaryRow>();
  return (results ?? []).map((row) => ({
    object_id: row.object_id,
    public_label: row.public_label,
    pending_count: Number(row.pending_count) || 0,
  }));
}

export async function getLostItemOffer(
  db: D1Database,
  offerId: string
): Promise<LostItemOfferRow | null> {
  return db
    .prepare(
      `SELECT offer_id, parent_profile_id, object_id, qr_id, message, status,
              created_at, updated_at, expires_at
       FROM lost_item_relay_offers WHERE offer_id = ?`
    )
    .bind(offerId)
    .first<LostItemOfferRow>();
}

export async function dismissLostItemOffer(
  db: D1Database,
  offerId: string,
  updatedAt: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE lost_item_relay_offers
       SET status = 'dismissed', updated_at = ?
       WHERE offer_id = ? AND status = 'pending'`
    )
    .bind(updatedAt, offerId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export type { LostItemOfferStatus };
