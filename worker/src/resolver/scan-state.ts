import { deriveCredentialCodeSync } from "../../../site/js/qr-credential-code.mjs";
import { validateOfficialScanUrl } from "../../../site/js/qr-scan-url-lock.mjs";
import type { ScanContext } from "../db/scan";
import type { CardStatus, QrScope, QrStatus } from "../db/types";
import {
  publicReasonLabel,
  scanLayoutForMinimalFailureTrust,
  scanLayoutForRevocationDisplay,
  type RevocationDisplayMeta,
} from "./revocation-display";
import {
  resolveScanMalformedReason,
  type ScanMalformedReason,
} from "./scan-malformed-hint";
import { isQrCalendarExpired } from "./merch-qr-policy";
import { childObjectManifestoLine } from "./manifesto-display";
import {
  objectStreamsFromCardDocumentJson,
  objectStreamsFromChildDocumentJson,
} from "../validation/object-streams";
import type { ObjectPublicStream } from "../validation/object-streams";
import {
  resolveGameNodeScanContext,
  type GameNodeScanContext,
} from "../city-game/scan-view";

export const QR_ID_REGEX =
  /^qr_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8,40}$/;

export type { ScanMalformedReason } from "./scan-malformed-hint";
export { resolveScanMalformedReason } from "./scan-malformed-hint";

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
  objectStreams: ObjectPublicStream[];
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
  liveControlProvenAt: string | null;
  qrExpiresAt: string | null;
  qrIssuedAt: string | null;
  qrPayload: string | null;
  minimalScan: boolean;
  revocationDisplayMode: string | null;
  publicReason: string | null;
  primaryBadge: { label: string; tone: StatusTone };
  scanUrl: string | null;
  /** Human fingerprint for print / verifier (Phase F). */
  credentialCode: string | null;
  cacheControl: string;
  /** Set when kind === "malformed" (P2-1 differentiated copy). */
  malformedReason: ScanMalformedReason | null;
  childObjectType: string | null;
  childObjectId: string | null;
  gameNode: GameNodeScanContext | null;
}

/** Canonical HTTPS scan target for this request. */
export function resolveScanUrl(
  origin: string,
  profileId: string | null,
  qrId: string | null,
  payload: string | null | undefined
): string | null {
  const built =
    profileId && qrId
      ? `${origin.replace(/\/$/, "")}/c/${encodeURIComponent(profileId)}?q=${encodeURIComponent(qrId)}`
      : null;

  const stored = payload?.trim() || null;
  if (stored) {
    const check = validateOfficialScanUrl(stored, { profileId, qrId });
    if (check.ok) return stored;
    if (built) {
      const builtCheck = validateOfficialScanUrl(built, { profileId, qrId });
      if (builtCheck.ok) return built;
    }
    return null;
  }

  if (!built) return null;
  const builtCheck = validateOfficialScanUrl(built, { profileId, qrId });
  return builtCheck.ok ? built : null;
}

export function buildScanViewModel(
  profileId: string,
  qrId: string | null,
  ctx: ScanContext,
  origin: string = "https://humanity.llc",
  now: Date = new Date(),
  options: {
    env?: { CITY_GAME_ENABLED?: string };
    seasonForWindow?: Pick<
      import("../city-game/season-config").CrSeasonConfig,
      "window" | "status"
    >;
  } = {}
): ScanViewModel {
  if (!qrId) {
    return malformedView(profileId, null, origin, "missing_qr");
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
    return statusView(
      "card_revoked",
      card,
      qr,
      ctx.verification,
      origin,
      { label: "Disabled", tone: "bad" },
      revocationDisplayLayout(ctx.revocationDisplay),
      ctx.revocationDisplay
    );
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
    return statusView(
      "qr_revoked",
      card,
      qr,
      ctx.verification,
      origin,
      { label: "QR invalid", tone: "bad" },
      revocationDisplayLayout(ctx.revocationDisplay),
      ctx.revocationDisplay
    );
  }
  if (qr.status === "replaced") {
    return statusView("qr_replaced", card, qr, ctx.verification, origin, {
      label: "QR replaced",
      tone: "warn",
    });
  }
  if (qr.status === "expired" || isQrCalendarExpired(qr.scope, qr.expires_at, now)) {
    return statusView(
      "qr_expired",
      card,
      qr,
      ctx.verification,
      origin,
      { label: "QR expired", tone: "warn" },
      scanLayoutForMinimalFailureTrust()
    );
  }

  if (qr.scope === "child_object") {
    const child = ctx.childObject;
    if (!child) {
      return statusView(
        "unknown_qr",
        card,
        qr,
        ctx.verification,
        origin,
        { label: "Unknown object", tone: "neutral" },
        scanLayoutForMinimalFailureTrust()
      );
    }
    if (child.status !== "active") {
      return statusView(
        "qr_revoked",
        card,
        qr,
        ctx.verification,
        origin,
        { label: "Object unavailable", tone: "bad" },
        scanLayoutForMinimalFailureTrust()
      );
    }
    const objectCard = {
      ...card,
      manifesto_line: childObjectManifestoLine(child),
      card_document_json: child.child_object_document_json,
    };
    const objectStreams = objectStreamsFromChildDocumentJson(
      child.child_object_document_json
    );
    const gameNode = resolveGameNodeScanContext({
      objectType: child.object_type,
      objectId: child.object_id,
      documentJson: child.child_object_document_json,
      objectStreams,
      env: options.env ?? {},
      vouchWitnesses: ctx.gameVouchWitnesses ?? undefined,
      seasonForWindow: options.seasonForWindow,
      now,
    });
    const vm = baseView(
      {
        kind: "active",
        profileId,
        qrId,
        card: objectCard,
        qr,
        verification: ctx.verification,
        primaryBadge: { label: "Active", tone: "live" },
        showCardBlock: true,
        showHumanTrustBlock: true,
        showArtifactBlock: true,
        showLiveControlBlock: false,
        objectStreams,
        childObjectType: child.object_type,
        childObjectId: child.object_id,
        gameNode,
      },
      origin
    );
    return vm;
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
      showLiveControlBlock: true,
    },
    origin
  );
}

export function malformedScanView(
  profileId: string | null,
  qrId: string | null,
  origin: string = "https://humanity.llc",
  reason?: ScanMalformedReason
): ScanViewModel {
  return malformedView(
    profileId,
    qrId,
    origin,
    reason ?? resolveScanMalformedReason(profileId, qrId)
  );
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
    return baseView(
      {
        kind: "card_revoked",
        profileId,
        qrId: null,
        card,
        verification,
        primaryBadge: { label: "Disabled", tone: "bad" },
        showCardBlock: false,
        showHumanTrustBlock: false,
        showArtifactBlock: false,
        showLiveControlBlock: false,
        minimalScan: true,
      },
      origin
    );
  }

  if (card.status === "suspended") {
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

function revocationDisplayLayout(
  row: ScanContext["revocationDisplay"]
): Partial<
  Pick<
    ScanViewModel,
    | "minimalScan"
    | "showCardBlock"
    | "showHumanTrustBlock"
    | "showArtifactBlock"
    | "showLiveControlBlock"
  >
> {
  if (!row?.display_mode) {
    return scanLayoutForRevocationDisplay(null);
  }
  return scanLayoutForRevocationDisplay({
    display_mode: row.display_mode as RevocationDisplayMeta["display_mode"],
    public_reason: row.public_reason,
  });
}

function statusView(
  kind: ScanPageKind,
  card: ScanContext["card"] & object,
  qr: ScanContext["qr"] & object,
  verification: ScanContext["verification"],
  origin: string,
  primaryBadge: { label: string; tone: StatusTone },
  display?: Partial<
    Pick<
      ScanViewModel,
      | "minimalScan"
      | "showCardBlock"
      | "showHumanTrustBlock"
      | "showArtifactBlock"
      | "showLiveControlBlock"
    >
  >,
  revocationDisplay?: ScanContext["revocationDisplay"]
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
      showCardBlock: display?.showCardBlock ?? true,
      showHumanTrustBlock: display?.showHumanTrustBlock ?? true,
      showArtifactBlock: display?.showArtifactBlock ?? true,
      showLiveControlBlock: display?.showLiveControlBlock ?? true,
      minimalScan: display?.minimalScan ?? false,
      revocationDisplayMode: revocationDisplay?.display_mode ?? null,
      publicReason: revocationDisplay?.public_reason ?? null,
    },
    origin
  );
}

function malformedView(
  profileId: string | null,
  qrId: string | null,
  origin: string,
  reason: ScanMalformedReason
): ScanViewModel {
  const vm = baseView(
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
  return { ...vm, malformedReason: reason };
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
  showLiveControlBlock?: boolean;
  minimalScan?: boolean;
  revocationDisplayMode?: string | null;
  publicReason?: string | null;
  objectStreams?: ObjectPublicStream[];
  childObjectType?: string | null;
  childObjectId?: string | null;
  gameNode?: GameNodeScanContext | null;
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
    objectStreams:
      input.objectStreams ??
      objectStreamsFromCardDocumentJson(card?.card_document_json),
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
    showLiveControlBlock:
      input.showLiveControlBlock ??
      (isHealthy || input.kind.startsWith("qr_") || input.kind.startsWith("card_")),
    liveControlAvailable: false,
    liveControlProvenAt: null,
    qrExpiresAt: qr?.expires_at ?? null,
    qrIssuedAt: qr?.issued_at ?? null,
    qrPayload: qr?.payload ?? null,
    minimalScan: input.minimalScan ?? false,
    revocationDisplayMode: input.revocationDisplayMode ?? null,
    publicReason: input.publicReason ?? null,
    primaryBadge: input.primaryBadge,
    scanUrl: resolveScanUrl(origin, input.profileId, input.qrId, qr?.payload),
    credentialCode:
      input.profileId && input.qrId
        ? deriveCredentialCodeSync(input.profileId, input.qrId)
        : null,
    cacheControl: isHealthy ? CACHE_ACTIVE : CACHE_INACTIVE,
    malformedReason: null,
    childObjectType: input.childObjectType ?? null,
    childObjectId: input.childObjectId ?? null,
    gameNode: input.gameNode ?? null,
  };
}
