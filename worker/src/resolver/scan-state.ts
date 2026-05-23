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

/** HTTP status for scan HTML + status JSON (Technical Standards §9.5). */
export function httpStatusForScanKind(kind: ScanPageKind): number {
  switch (kind) {
    case "unknown_profile":
    case "unknown_qr":
      return 404;
    case "malformed":
    case "profile_qr_mismatch":
      return 400;
    case "card_revoked":
      return 410;
    default:
      return 200;
  }
}

export const CACHE_ACTIVE =
  "public, max-age=300, stale-while-revalidate=3600";
export const CACHE_INACTIVE = "public, max-age=60";

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
  scanUrl: string | null;
  cacheControl: string;
}

/** Canonical HTTPS scan target for this request. */
export function resolveScanUrl(
  origin: string,
  profileId: string | null,
  qrId: string | null,
  payload: string | null | undefined
): string | null {
  if (payload?.trim()) return payload.trim();
  if (!profileId || !qrId) return null;
  const base = origin.replace(/\/$/, "");
  return `${base}/c/${encodeURIComponent(profileId)}?q=${encodeURIComponent(qrId)}`;
}

export function buildScanViewModel(
  profileId: string,
  qrId: string | null,
  ctx: ScanContext,
  origin: string = "https://humanity.llc",
  now: Date = new Date()
): ScanViewModel {
  if (!qrId) {
    return malformedView(profileId, null, origin);
  }

  if (!ctx.card) {
    return baseView(
      {
      kind: "unknown_profile",
      profileId,
      qrId,
      primaryBadge: { label: "Unknown card", tone: "neutral" },
      showCardBlock: true,
      showHumanTrustBlock: false,
      showArtifactBlock: true,
      verificationLabel: "Unknown",
      verificationState: "unknown",
      },
      origin
    );
  }

  if (!ctx.qr) {
    return baseView(
      {
      kind: "unknown_qr",
      profileId,
      qrId,
      card: ctx.card,
      verification: ctx.verification,
      primaryBadge: { label: "Unknown QR", tone: "neutral" },
      showCardBlock: true,
      showHumanTrustBlock: true,
      showArtifactBlock: true,
      },
      origin
    );
  }

  if (ctx.qr.profile_id !== profileId) {
    return baseView(
      {
      kind: "profile_qr_mismatch",
      profileId,
      qrId,
      primaryBadge: { label: "Mismatch", tone: "bad" },
      showCardBlock: false,
      showHumanTrustBlock: false,
      showArtifactBlock: true,
      verificationLabel: "Unknown",
      },
      origin
    );
  }

  const card = ctx.card;
  const qr = ctx.qr;

  if (card.status === "revoked") {
    return statusView("card_revoked", card, qr, ctx.verification, origin, {
      label: "Card revoked",
      tone: "bad",
    });
  }
  if (card.status === "suspended") {
    return statusView("card_suspended", card, qr, ctx.verification, origin, {
      label: "Suspended",
      tone: "warn",
    });
  }
  if (card.status === "expired") {
    return statusView("card_expired", card, qr, ctx.verification, origin, {
      label: "Card expired",
      tone: "warn",
    });
  }
  if (qr.status === "revoked") {
    return statusView("qr_revoked", card, qr, ctx.verification, origin, {
      label: "QR revoked",
      tone: "bad",
    });
  }
  if (qr.status === "replaced") {
    return statusView("qr_replaced", card, qr, ctx.verification, origin, {
      label: "QR replaced",
      tone: "warn",
    });
  }
  if (qr.status === "expired" || isQrPastExpiry(qr.expires_at, now)) {
    return statusView("qr_expired", card, qr, ctx.verification, origin, {
      label: "QR expired",
      tone: "warn",
    });
  }

  return baseView(
    {
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
    },
    origin
  );
}

export function malformedScanView(
  profileId: string | null,
  qrId: string | null,
  origin: string = "https://humanity.llc"
): ScanViewModel {
  return malformedView(profileId, qrId, origin);
}

/**
 * Card-level scan status without ?q= (M3.4 status JSON, no QR artifact block).
 */
export function buildCardOnlyScanViewModel(
  profileId: string,
  card: ScanContext["card"],
  verification: ScanContext["verification"],
  origin: string = "https://humanity.llc"
): ScanViewModel {
  if (!card) {
    return baseView(
      {
        kind: "unknown_profile",
        profileId,
        qrId: null,
        primaryBadge: { label: "Unknown card", tone: "neutral" },
        showCardBlock: true,
        showHumanTrustBlock: false,
        showArtifactBlock: false,
        verificationLabel: "Unknown",
        verificationState: "unknown",
      },
      origin
    );
  }

  let kind: ScanPageKind = "active";
  let badge = { label: "Active", tone: "live" as StatusTone };

  if (card.status === "revoked") {
    kind = "card_revoked";
    badge = { label: "Card revoked", tone: "bad" };
  } else if (card.status === "suspended") {
    kind = "card_suspended";
    badge = { label: "Suspended", tone: "warn" };
  } else if (card.status === "expired") {
    kind = "card_expired";
    badge = { label: "Card expired", tone: "warn" };
  }

  return baseView(
    {
      kind,
      profileId,
      qrId: null,
      card,
      verification,
      primaryBadge: badge,
      showCardBlock: true,
      showHumanTrustBlock: true,
      showArtifactBlock: false,
    },
    origin
  );
}

function statusView(
  kind: ScanPageKind,
  card: ScanContext["card"] & object,
  qr: ScanContext["qr"] & object,
  verification: ScanContext["verification"],
  origin: string,
  primaryBadge: { label: string; tone: StatusTone }
): ScanViewModel {
  return baseView(
    {
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
    },
    origin
  );
}

function isQrPastExpiry(expiresAt: string | null, now: Date): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  return Number.isFinite(t) && t < now.getTime();
}

function malformedView(
  profileId: string | null,
  qrId: string | null,
  origin: string
): ScanViewModel {
  return baseView(
    {
      kind: "malformed",
      profileId,
      qrId,
      primaryBadge: { label: "Invalid link", tone: "neutral" },
      showCardBlock: false,
      showHumanTrustBlock: false,
      showArtifactBlock: false,
      verificationLabel: "Unknown",
    },
    origin
  );
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

function baseView(input: BaseViewInput, origin: string): ScanViewModel {
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
    scanUrl: resolveScanUrl(origin, input.profileId, input.qrId, qr?.payload),
    cacheControl: isHealthy ? CACHE_ACTIVE : CACHE_INACTIVE,
  };
}
