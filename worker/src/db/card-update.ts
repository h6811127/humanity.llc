export interface CardForUpdateRow {
  public_key: string;
  recovery_public_key: string | null;
  handle: string;
  handle_normalized: string;
  manifesto_line: string;
  status: string;
  card_document_json: string;
  created_at: string;
  updated_at: string;
}

export async function getCardForUpdate(
  db: D1Database,
  profileId: string
): Promise<CardForUpdateRow | null> {
  return db
    .prepare(
      `SELECT public_key, recovery_public_key, handle, handle_normalized, manifesto_line,
              status, card_document_json, created_at, updated_at
       FROM cards WHERE profile_id = ?`
    )
    .bind(profileId)
    .first<CardForUpdateRow>();
}

export async function applyCardUpdate(
  db: D1Database,
  profileId: string,
  manifestoLine: string,
  cardDocumentJson: string,
  updatedAt: string
): Promise<void> {
  const result = await db
    .prepare(
      `UPDATE cards SET manifesto_line = ?, card_document_json = ?, updated_at = ?
       WHERE profile_id = ? AND status = 'active'`
    )
    .bind(manifestoLine, cardDocumentJson, updatedAt, profileId)
    .run();

  if (!result.success || result.meta.changes === 0) {
    throw new Error("Card update failed or card is not active.");
  }
}
