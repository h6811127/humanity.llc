import { PROFILE_ID_REGEX } from "../crypto";

const QR_ID_REGEX =
  /^qr_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8,40}$/;

/** Why a scan URL is treated as malformed (P2-1 sad-path UX). */
export type ScanMalformedReason =
  | "invalid_profile_id"
  | "missing_qr"
  | "invalid_qr_id"
  | "redirect_blocked";

/**
 * @param {string | null} profileId
 * @param {string | null} qrId
 * @param {{ redirectBlocked?: boolean }} [opts]
 */
export function resolveScanMalformedReason(
  profileId: string | null,
  qrId: string | null,
  opts: { redirectBlocked?: boolean } = {}
): ScanMalformedReason {
  if (opts.redirectBlocked) return "redirect_blocked";
  if (!profileId || !PROFILE_ID_REGEX.test(profileId)) return "invalid_profile_id";
  if (!qrId) return "missing_qr";
  if (!QR_ID_REGEX.test(qrId)) return "invalid_qr_id";
  return "invalid_profile_id";
}

export function scanMalformedLead(reason: ScanMalformedReason): string {
  switch (reason) {
    case "missing_qr":
      return "This link is missing the QR parameter. Open the full URL from your sticker or wallet — it should include ?q=qr_… after the card id.";
    case "invalid_qr_id":
      return "The QR id in this link is not valid. Copy the complete scan URL from your printed QR — do not edit the qr_… segment.";
    case "redirect_blocked":
      return "This link uses query parameters that are not allowed on scan URLs. Use the plain scan URL from your QR.";
    case "invalid_profile_id":
    default:
      return "This link does not include a valid card id. Use the full scan URL from your QR or card record.";
  }
}

export function scanMalformedPageTitle(reason: ScanMalformedReason): string {
  switch (reason) {
    case "missing_qr":
      return "Add QR from your sticker";
    case "invalid_qr_id":
      return "Invalid QR in link";
    case "redirect_blocked":
      return "Invalid scan link";
    case "invalid_profile_id":
    default:
      return "Invalid card link";
  }
}

export function scanMalformedStatusHint(reason: ScanMalformedReason): string {
  switch (reason) {
    case "missing_qr":
      return "Missing ?q=qr_… on the scan URL. Copy the full link from your printed QR or /created/.";
    case "invalid_qr_id":
      return "The qr_id must start with qr_ followed by base58 characters from your printed QR.";
    case "redirect_blocked":
      return "Remove extra query parameters. Use only profile_id path and ?q=qr_… from your QR.";
    case "invalid_profile_id":
    default:
      return "Use your real profile_id (20–32 base58 characters) and qr_id (qr_ plus base58). Copy both from /created/ or the scan URL.";
  }
}
