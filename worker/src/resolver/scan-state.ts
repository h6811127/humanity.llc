import type { ScanContext } from "../db/scan";
import type { CardStatus, QrScope, QrStatus } from "../db/types";

/** QR IDs issued by the create client: `qr_` + base58. */
export const QR_ID_REGEX =
  /^qr_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8,40}$/;

export type ScanPageKind =
  | "active"
  | "malformed"
  | "unknown_profile"
  | "unknown_qr"
  | "profile_qr_mismatch"
  | "card_revoked"
  | "card_suspended"
  | "card_expired"
  | "qr_revoked"
  | "qr_expired"
  | "qr_replaced";

export type StatusTone = "live" | "warn" | "bad" | "neutral";

export interface ScanViewModel {
  kind: ScanPageKind;
  profileId: string | null;
  qrId: string | null;
  handle: string | null;
  manifestoLine: string | null;
  cardStatus: CardStatus | null;
  qrStatus: QrStatus | null;
  qrScope: QrScope | null;
  verificationLabel: string;
  primaryBadge: { label: string; tone: StatusTone };
  showCardBlock: boolean;
  showHumanTrustBlock: boolean;
  showQrBlock: boolean;
  showBearerWarning: boolean;
  cacheControl: string;
}

export function buildScanViewModel(
  profileId: string,
  qrId: string | null,
  ctx: ScanContext,
  now: Date = new Date()
): ScanViewModel {
  if (!qrId) {
    return malformedView(profileId, null, "missing_q");
  }

  if (!ctx.card) {
    return baseView({
      kind: "unknown_profile",
      profileId,
      qrId,
      primaryBadge: { label: "Unknown", tone: "neutral" },
      showCardBlock: false,
      showHumanTrustBlock: false,
      showQrBlock: true,
      showBearerWarning: true,
      cacheControl: "public, max-age=60",
    });
  }

  if (!ctx.qr) {
    return baseView({
      kind: "unknown_qr",
      profileId,
      qrId,
      card: ctx.card,
      verification: ctx.verification,
      primaryBadge: { label: "Unknown QR", tone: "neutral" },
      showCardBlock: true,
      showHumanTrustBlock: true,
      showQrBlock: true,
      showBearerWarning: true,
      cacheControl: "public, max-age=60",
    });
  }

  if (ctx.qr.profile_id !== profileId) {
    return baseView({
      kind: "profile_qr_mismatch",
      profileId,
      qrId,
      card: ctx.card,
      verification: ctx.verification,
      primaryBadge: { label: "Mismatch", tone: "bad" },
      showCardBlock: false,
      showHumanTrustBlock: false,
      showQrBlock: true,
      showBearerWarning: true,
      cacheControl: "public, max-age=60",
    });
  }

  const card = ctx.card;
  const qr = ctx.qr;
  const verificationLabel = ctx.verification?.label ?? "Registered";

  if (card.status === "revoked") {
    return statusView("card_revoked", card, qr, verificationLabel, {
      label: "Revoked",
      tone: "bad",
    });
  }
  if (card.status === "suspended") {
    return statusView("card_suspended", card, qr, verificationLabel, {
      label: "Suspended",
      tone: "warn",
    });
  }
  if (card.status === "expired") {
    return statusView("card_expired", card, qr, verificationLabel, {
      label: "Expired",
      tone: "warn",
    });
  }

  if (qr.status === "revoked") {
    return statusView("qr_revoked", card, qr, verificationLabel, {
      label: "QR revoked",
      tone: "bad",
    });
  }
  if (qr.status === "replaced") {
    return statusView("qr_replaced", card, qr, verificationLabel, {
      label: "QR replaced",
      tone: "warn",
    });
  }
  if (qr.status === "expired" || isQrPastExpiry(qr.expires_at, now)) {
    return statusView("qr_expired", card, qr, verificationLabel, {
      label: "QR expired",
      tone: "warn",
    });
  }

  return baseView({
    kind: "active",
    profileId,
    qrId,
    card,
    qr,
    verification: ctx.verification,
    primaryBadge: { label: "Active", tone: "live" },
    showCardBlock: true,
    showHumanTrustBlock: true,
    showQrBlock: true,
    showBearerWarning: true,
    cacheControl: "public, max-age=300, stale-while-revalidate=60",
  });
}

function statusView(
  kind: ScanPageKind,
  card: ScanContext["card"] & object,
  qr: ScanContext["qr"] & object,
  verificationLabel: string,
  primaryBadge: { label: string; tone: StatusTone }
): ScanViewModel {
  return baseView({
    kind,
    profileId: card.profile_id,
    qrId: qr.qr_id,
    card,
    qr,
    verificationLabel,
    primaryBadge,
    showCardBlock: true,
    showHumanTrustBlock: true,
    showQrBlock: true,
    showBearerWarning: true,
    cacheControl: "public, max-age=60",
  });
}

function isQrPastExpiry(expiresAt: string | null, now: Date): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  return Number.isFinite(t) && t < now.getTime();
}

function malformedView(
  profileId: string | null,
  qrId: string | null,
  _reason: string
): ScanViewModel {
  return baseView({
    kind: "malformed",
    profileId,
    qrId,
    primaryBadge: { label: "Invalid link", tone: "neutral" },
    showCardBlock: false,
    showHumanTrustBlock: false,
    showQrBlock: false,
    showBearerWarning: false,
    cacheControl: "public, max-age=60",
  });
}

export function malformedScanView(
  profileId: string | null,
  qrId: string | null
): ScanViewModel {
  return malformedView(profileId, qrId, "malformed");
}

interface BaseViewInput {
  kind: ScanPageKind;
  profileId: string | null;
  qrId: string | null;
  card?: ScanContext["card"];
  qr?: ScanContext["qr"];
  verification?: ScanContext["verification"] | null;
  verificationLabel?: string;
  primaryBadge: { label: string; tone: StatusTone };
  showCardBlock: boolean;
  showHumanTrustBlock: boolean;
  showQrBlock: boolean;
  showBearerWarning: boolean;
  cacheControl: string;
}

function baseView(input: BaseViewInput): ScanViewModel {
  const card = input.card ?? null;
  const qr = input.qr ?? null;
  return {
    kind: input.kind,
    profileId: input.profileId,
    qrId: input.qrId,
    handle: card?.handle ?? null,
    manifestoLine: card?.manifesto_line ?? null,
    cardStatus: card?.status ?? null,
    qrStatus: qr?.status ?? null,
    qrScope: qr?.scope ?? null,
    verificationLabel:
      input.verificationLabel ?? input.verification?.label ?? "Registered",
    primaryBadge: input.primaryBadge,
    showCardBlock: input.showCardBlock,
    showHumanTrustBlock: input.showHumanTrustBlock,
    showQrBlock: input.showQrBlock,
    showBearerWarning: input.showBearerWarning,
    cacheControl: input.cacheControl,
  };
}
