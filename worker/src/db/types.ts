/**
 * D1 row types aligned with docs/V1_IMPLEMENTATION_CONTRACTS.md
 * (M1.2 — schema only; write paths arrive in M2/M4).
 */

export const CARD_STATUSES = [
  "active",
  "revoked",
  "suspended",
  "expired",
] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

export const QR_SCOPES = ["card", "print_artifact"] as const;
export type QrScope = (typeof QR_SCOPES)[number];

export const QR_STATUSES = [
  "active",
  "revoked",
  "expired",
  "replaced",
] as const;
export type QrStatus = (typeof QR_STATUSES)[number];

export const VERIFICATION_STATES = [
  "unverified",
  "registered",
  "verified_human",
  "steward",
  "revoked",
  "suspended",
] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

export const VERIFICATION_METHODS = [
  "none",
  "registered",
  "vouch",
  "ceremony",
  "device_proof",
  "steward",
] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const REVOCATION_TARGET_KINDS = ["card", "qr_credential"] as const;
export type RevocationTargetKind = (typeof REVOCATION_TARGET_KINDS)[number];

export const VOUCH_METHODS = ["in_person"] as const;
export type VouchMethod = (typeof VOUCH_METHODS)[number];

export const VOUCH_STATUSES = ["active", "revoked"] as const;
export type VouchStatus = (typeof VOUCH_STATUSES)[number];

/** Default verification row created with a new card (M2). */
export const DEFAULT_REGISTERED_SUMMARY = {
  state: "registered" as const,
  level: 1,
  label: "Registered",
  method: "registered" as const,
  vouch_count: 0,
  latest_accepted_vouch_at: null as string | null,
  credential_ids_json: "[]",
};

export interface CardRow {
  profile_id: string;
  public_key: string;
  handle: string;
  handle_normalized: string;
  manifesto_line: string;
  status: CardStatus;
  card_document_json: string;
  created_at: string;
  updated_at: string;
}

export interface QrCredentialRow {
  qr_id: string;
  profile_id: string;
  epoch: number;
  scope: QrScope;
  print_artifact_id: string | null;
  resolver_hint: string;
  status: QrStatus;
  payload: string;
  issued_at: string;
  expires_at: string | null;
  credential_document_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationSummaryRow {
  profile_id: string;
  state: VerificationState;
  level: number;
  label: string;
  method: VerificationMethod;
  vouch_count: number;
  latest_accepted_vouch_at: string | null;
  credential_ids_json: string;
  summary_document_json: string | null;
  updated_at: string;
}

export interface RevocationRow {
  revocation_id: string;
  profile_id: string;
  target_kind: RevocationTargetKind;
  target_qr_id: string | null;
  reason: string;
  signed_document_json: string;
  revoked_at: string;
  public_notice: string | null;
  cause_category: string | null;
  appeal_deadline: string | null;
  issuer_public_key: string | null;
  created_at: string;
}

export interface VouchRow {
  vouch_id: string;
  voucher_profile_id: string;
  vouchee_profile_id: string;
  nonce: string;
  statement: string;
  method: VouchMethod;
  status: VouchStatus;
  signed_document_json: string;
  revocation_document_json: string | null;
  revocation_nonce: string | null;
  issuer_public_key: string;
  created_at: string;
  revoked_at: string | null;
}
