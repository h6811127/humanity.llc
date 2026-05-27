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

/** Founding merch ignores calendar expiry even if a row was mis-minted with expires_at. */
export function isQrCalendarExpired(
  scope: QrScope | null | undefined,
  expiresAt: string | null,
  now: Date = new Date()
): boolean {
  if (isPrintArtifactScope(scope)) return false;
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
  if (isPrintArtifactScope(scope)) return null;
  if (expiresAt == null || expiresAt === "") return null;
  return expiresAt;
}

export function validatePrintArtifactMintExpiry(
  scope: QrScope | null | undefined,
  expiresAt: unknown
): { ok: true } | { ok: false; code: string; message: string } {
  if (!isPrintArtifactScope(scope)) return { ok: true };
  if (expiresAt == null || expiresAt === "") return { ok: true };
  return {
    ok: false,
    code: "PRINT_ARTIFACT_NO_CALENDAR_EXPIRY",
    message: "print_artifact credentials must not set expires_at (see MERCH_QR_LIFECYCLE_POLICY).",
  };
}
