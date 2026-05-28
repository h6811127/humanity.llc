import { getChildObject } from "./child-objects";
import { getRevocationDisplay } from "./revoke";
import type {
  CardRow,
  ChildObjectRow,
  QrCredentialRow,
  VerificationSummaryRow,
} from "./types";

export interface ScanContext {
  card: CardRow | null;
  qr: QrCredentialRow | null;
  childObject: ChildObjectRow | null;
  verification: VerificationSummaryRow | null;
  revocationDisplay: {
    display_mode: string | null;
    public_reason: string | null;
  } | null;
}

export async function loadScanContext(
  db: D1Database,
  profileId: string,
  qrId: string
): Promise<ScanContext> {
  const card = await db
    .prepare(
      `SELECT profile_id, public_key, handle, handle_normalized, manifesto_line,
              status, card_document_json, created_at, updated_at
       FROM cards WHERE profile_id = ?`
    )
    .bind(profileId)
    .first<CardRow>();

  const qr = await db
    .prepare(
      `SELECT qr_id, profile_id, epoch, scope, print_artifact_id, object_id, resolver_hint,
              status, payload, issued_at, expires_at, credential_document_json,
              created_at, updated_at
       FROM qr_credentials WHERE qr_id = ?`
    )
    .bind(qrId)
    .first<QrCredentialRow>();

  let childObject: ChildObjectRow | null = null;
  if (qr?.scope === "child_object" && qr.object_id) {
    const row = await getChildObject(db, qr.object_id);
    if (row && row.parent_profile_id === profileId) {
      childObject = row;
    }
  }

  let verification: VerificationSummaryRow | null = null;
  if (card) {
    verification = await db
      .prepare(
        `SELECT profile_id, state, level, label, method, vouch_count,
                latest_accepted_vouch_at, credential_ids_json, summary_document_json,
                updated_at
         FROM verification_summaries WHERE profile_id = ?`
      )
      .bind(profileId)
      .first<VerificationSummaryRow>();
  }

  let revocationDisplay: ScanContext["revocationDisplay"] = null;
  if (card?.status === "revoked") {
    revocationDisplay = await getRevocationDisplay(db, profileId, "card", null);
  } else if (qr?.status === "revoked") {
    revocationDisplay = await getRevocationDisplay(
      db,
      profileId,
      "qr_credential",
      qrId
    );
  }

  return {
    card: card ?? null,
    qr: qr ?? null,
    childObject,
    verification,
    revocationDisplay,
  };
}
