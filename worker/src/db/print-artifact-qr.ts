export interface ActivePrintArtifactQrRow {
  qr_id: string;
  print_artifact_id: string;
}

export async function getActivePrintArtifactQr(
  db: D1Database,
  profileId: string,
  printArtifactId: string
): Promise<ActivePrintArtifactQrRow | null> {
  return db
    .prepare(
      `SELECT qr_id, print_artifact_id FROM qr_credentials
       WHERE profile_id = ? AND print_artifact_id = ? AND scope = 'print_artifact'
         AND status = 'active'
       LIMIT 1`
    )
    .bind(profileId, printArtifactId)
    .first<ActivePrintArtifactQrRow>();
}

export interface InsertPrintArtifactQrParams {
  qrId: string;
  profileId: string;
  epoch: number;
  printArtifactId: string;
  payload: string;
  issuedAt: string;
  credentialDocumentJson: string;
}

export async function insertPrintArtifactQr(
  db: D1Database,
  params: InsertPrintArtifactQrParams
): Promise<void> {
  const now = params.issuedAt;
  const result = await db
    .prepare(
      `INSERT INTO qr_credentials (
        qr_id, profile_id, epoch, scope, print_artifact_id, resolver_hint,
        status, payload, issued_at, expires_at, credential_document_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, 'print_artifact', ?, 'https://humanity.llc', 'active', ?, ?, NULL, ?, ?, ?)`
    )
    .bind(
      params.qrId,
      params.profileId,
      params.epoch,
      params.printArtifactId,
      params.payload,
      params.issuedAt,
      params.credentialDocumentJson,
      now,
      now
    )
    .run();

  if (!result.success) {
    throw new Error(result.error ?? "D1 insert print_artifact QR failed");
  }
}
