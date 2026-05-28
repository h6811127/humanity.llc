/**
 * Printed artifact QR lifecycle rules.
 * Policy: docs/MERCH_QR_LIFECYCLE_POLICY.md
 */

import type { QrScope } from "../db/types";

/** Copy for limits panel on active print_artifact scans. */
export const PRINT_ARTIFACT_NO_CALENDAR_EXPIRY_NOTE =
  "This object QR does not expire on a calendar schedule. The owner can revoke or replace it.";

export function isPrintArtifactScope(scope: QrScope | null | undefined): boolean {
  return scope === "print_artifact";
}

export function isChildObjectQrScope(scope: QrScope | null | undefined): boolean {
  return scope === "child_object";
}

/** Item- and object-scoped QRs do not use calendar expiry in v1. */
export function isItemScopedQrScope(scope: QrScope | null | undefined): boolean {
  return isPrintArtifactScope(scope) || isChildObjectQrScope(scope);
}

/** Founding merch ignores calendar expiry even if a row was mis-minted with expires_at. */
export function isQrCalendarExpired(
  scope: QrScope | null | undefined,
  expiresAt: string | null,
  now: Date = new Date()
): boolean {
  if (isItemScopedQrScope(scope)) return false;
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return false;
  return t <= now.getTime();
}

/** Fulfillment and mint paths must persist null for print_artifact. */
export function normalizeExpiresAtForScope(
  scope: QrScope | null | undefined,
  expiresAt: string | null | undefined
): string | null {
  if (isItemScopedQrScope(scope)) return null;
  if (expiresAt == null || expiresAt === "") return null;
  return expiresAt;
}

export function validatePrintArtifactMintExpiry(
  scope: QrScope | null | undefined,
  expiresAt: unknown
): { ok: true } | { ok: false; code: string; message: string } {
  return validateItemScopedMintExpiry(scope, expiresAt);
}

export function validateItemScopedMintExpiry(
  scope: QrScope | null | undefined,
  expiresAt: unknown
): { ok: true } | { ok: false; code: string; message: string } {
  if (!isItemScopedQrScope(scope)) return { ok: true };
  if (expiresAt == null || expiresAt === "") return { ok: true };
  const label = isChildObjectQrScope(scope) ? "child_object" : "print_artifact";
  return {
    ok: false,
    code: "ITEM_SCOPED_NO_CALENDAR_EXPIRY",
    message: `${label} credentials must not set expires_at.`,
  };
}

/**
 * Persisted expiry for signed QR credentials at create/rotate/mint.
 * Tier 0 batch campaign QRs use explicit JSON `null` on card-scoped credentials.
 */
export function resolveStoredQrExpiresAt(
  scope: QrScope | null | undefined,
  signedExpiresAt: unknown,
  defaultExpiryIso: () => string
): string | null {
  if (isItemScopedQrScope(scope)) return null;
  if (signedExpiresAt === null) return null;
  if (typeof signedExpiresAt === "string" && signedExpiresAt.length > 0) {
    return signedExpiresAt;
  }
  return defaultExpiryIso();
}
