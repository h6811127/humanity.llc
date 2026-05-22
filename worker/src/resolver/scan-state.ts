import type { ScanContext } from "../db/scan";
import type { CardStatus, QrScope, QrStatus } from "../db/types";

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
  qrEpoch: number | null;
  verificationLabel: string;
  verificationState: string | null;
  verificationMethod: string | null;
  vouchCount: number;
  latestVouchAt: string | null;
  showCardBlock: boolean;
  showHumanTrustBlock: boolean;
  showArtifactBlock: boolean;
  showLiveControlBlock: boolean;
  liveControlAvailable: boolean;
  primaryBadge: { label: string; tone: StatusTone };
  cacheControl: string;
}

export function buildScanViewModel(
  profileId: string,
  qrId: string | null,
  ctx: ScanContext,
  now: Date = new Date()
): ScanViewModel {
  if (!qrId) {
    return malformedView(profileId, null);
  }

  if (!ctx.card) {
    return baseView({
      kind: "unknown_profile",
      profileId,
      qrId,
      primaryBadge: { label: "Unknown card", tone: "neutral" },
      showCardBlock: true,
      showHumanTrustBlock: false,
      showArtifactBlock: true,
      verificationLabel: "Unknown",
      verificationState: "unknown",
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
      showArtifactBlock: true,
    });
  }

  if (ctx.qr.profile_id !== profileId) {
    return baseView({
      kind: "profile_qr_mismatch",
      profileId,
      qrId,
      primaryBadge: { label: "Mismatch", tone: "bad" },
      showCardBlock: false,
      showHumanTrustBlock: false,
      showArtifactBlock: true,
      verificationLabel: "Unknown",
    });
  }

  const card = ctx.card;
  const qr = ctx.qr;

  if (card.status === "revoked") {
    return statusView("card_revoked", card, qr, ctx.verification, {
      label: "Card revoked",
      tone: "bad",
    });
  }
  if (card.status === "suspended") {
    return statusView("card_suspended", card, qr, ctx.verification, {
      label: "Suspended",
      tone: "warn",
    });
  }
  if (card.status === "expired") {
    return statusView("card_expired", card, qr, ctx.verification, {
      label: "Card expired",
      tone: "warn",
    });
  }
  if (qr.status === "revoked") {
    return statusView("qr_revoked", card, qr, ctx.verification, {
      label: "QR revoked",
      tone: "bad",
    });
  }
  if (qr.status === "replaced") {
    return statusView("qr_replaced", card, qr, ctx.verification, {
      label: "QR replaced",
      tone: "warn",
    });
  }
  if (qr.status === "expired" || isQrPastExpiry(qr.expires_at, now)) {
    return statusView("qr_expired", card, qr, ctx.verification, {
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
    showArtifactBlock: true,
  });
}

export function malformedScanView(
  profileId: string | null,
  qrId: string | null
): ScanViewModel {
  return malformedView(profileId, qrId);
}

function statusView(
  kind: ScanPageKind,
  card: ScanContext["card"] & object,
  qr: ScanContext["qr"] & object,
  verification: ScanContext["verification"],
  primaryBadge: { label: string; tone: StatusTone }
): ScanViewModel {
  return baseView({
    kind,
    profileId: card.profile_id,
    qrId: qr.qr_id,
    card,
    qr,
    verification,
    primaryBadge,
    showCardBlock: true,
    showHumanTrustBlock: true,
    showArtifactBlock: true,
  });
}

function isQrPastExpiry(expiresAt: string | null, now: Date): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  return Number.isFinite(t) && t < now.getTime();
}

function malformedView(
  profileId: string | null,
  qrId: string | null
): ScanViewModel {
  return baseView({
    kind: "malformed",
    profileId,
    qrId,
    primaryBadge: { label: "Invalid link", tone: "neutral" },
    showCardBlock: false,
    showHumanTrustBlock: false,
    showArtifactBlock: false,
    verificationLabel: "Unknown",
  });
}

interface BaseViewInput {
  kind: ScanPageKind;
  profileId: string | null;
  qrId: string | null;
  card?: ScanContext["card"];
  qr?: ScanContext["qr"];
  verification?: ScanContext["verification"] | null;
  verificationLabel?: string;
  verificationState?: string;
  primaryBadge: { label: string; tone: StatusTone };
  showCardBlock: boolean;
  showHumanTrustBlock: boolean;
  showArtifactBlock: boolean;
}

function baseView(input: BaseViewInput): ScanViewModel {
  const card = input.card ?? null;
  const qr = input.qr ?? null;
  const verification = input.verification ?? null;
  const isHealthy = input.kind === "active";

  return {
    kind: input.kind,
    profileId: input.profileId,
    qrId: input.qrId,
    handle: card?.handle ?? null,
    manifestoLine: card?.manifesto_line ?? null,
    cardStatus: card?.status ?? null,
    qrStatus: qr?.status ?? null,
    qrScope: qr?.scope ?? null,
    qrEpoch: qr?.epoch ?? null,
    verificationLabel:
      input.verificationLabel ?? verification?.label ?? "Registered",
    verificationState:
      input.verificationState ?? verification?.state ?? null,
    verificationMethod: verification?.method ?? null,
    vouchCount: verification?.vouch_count ?? 0,
    latestVouchAt: verification?.latest_accepted_vouch_at ?? null,
    showCardBlock: input.showCardBlock,
    showHumanTrustBlock: input.showHumanTrustBlock,
    showArtifactBlock: input.showArtifactBlock,
    showLiveControlBlock: isHealthy || input.kind.startsWith("qr_") || input.kind.startsWith("card_"),
    liveControlAvailable: false,
    primaryBadge: input.primaryBadge,
    cacheControl: isHealthy
      ? "public, max-age=300, stale-while-revalidate=60"
      : "public, max-age=60",
  };
}
