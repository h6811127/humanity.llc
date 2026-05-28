export const ARTIFACT_INTENT_STATUSES = [
  "draft",
  "proofed",
  "attached_to_cart",
  "expired",
  "converted",
  "blocked",
] as const;

export type ArtifactIntentStatus = (typeof ARTIFACT_INTENT_STATUSES)[number];

export interface ArtifactIntentRow {
  artifact_intent_id: string;
  profile_id: string;
  source_qr_id: string;
  product_id: string | null;
  quantity: number;
  planned_item_qr_ids_json: string;
  planned_print_artifact_ids_json: string;
  pending_mint_credentials_json: string | null;
  status: ArtifactIntentStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface InsertArtifactIntentInput {
  artifact_intent_id: string;
  profile_id: string;
  source_qr_id: string;
  product_id: string | null;
  quantity: number;
  planned_item_qr_ids: string[];
  planned_print_artifact_ids: string[];
  status: ArtifactIntentStatus;
  expires_at: string;
  created_at: string;
}

export async function insertArtifactIntent(
  db: D1Database,
  input: InsertArtifactIntentInput
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO artifact_intents (
        artifact_intent_id, profile_id, source_qr_id, product_id, quantity,
        planned_item_qr_ids_json, planned_print_artifact_ids_json,
        status, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.artifact_intent_id,
      input.profile_id,
      input.source_qr_id,
      input.product_id,
      input.quantity,
      JSON.stringify(input.planned_item_qr_ids),
      JSON.stringify(input.planned_print_artifact_ids),
      input.status,
      input.expires_at,
      input.created_at,
      input.created_at
    )
    .run();
}

export async function getArtifactIntent(
  db: D1Database,
  artifactIntentId: string
): Promise<ArtifactIntentRow | null> {
  return db
    .prepare(
      `SELECT artifact_intent_id, profile_id, source_qr_id, product_id, quantity,
              planned_item_qr_ids_json, planned_print_artifact_ids_json,
              pending_mint_credentials_json,
              status, expires_at, created_at, updated_at
       FROM artifact_intents WHERE artifact_intent_id = ?`
    )
    .bind(artifactIntentId)
    .first<ArtifactIntentRow>();
}

export async function updateArtifactIntentPendingMint(
  db: D1Database,
  artifactIntentId: string,
  pendingMintCredentialsJson: string,
  updatedAt: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE artifact_intents
       SET pending_mint_credentials_json = ?, updated_at = ?
       WHERE artifact_intent_id = ?`
    )
    .bind(pendingMintCredentialsJson, updatedAt, artifactIntentId)
    .run();
}

export async function updateArtifactIntentStatus(
  db: D1Database,
  artifactIntentId: string,
  status: ArtifactIntentStatus,
  updatedAt: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE artifact_intents SET status = ?, updated_at = ? WHERE artifact_intent_id = ?`
    )
    .bind(status, updatedAt, artifactIntentId)
    .run();
}
