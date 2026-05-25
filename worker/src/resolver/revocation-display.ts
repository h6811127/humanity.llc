export const REVOCATION_DISPLAY_MODES = ["minimal", "tombstone", "private"] as const;
export type RevocationDisplayMode = (typeof REVOCATION_DISPLAY_MODES)[number];

export const REVOCATION_PUBLIC_REASONS = [
  "event_ended",
  "rotated",
  "lost_item",
  "owner_revoked",
  "compromised",
  "other",
] as const;
export type RevocationPublicReason = (typeof REVOCATION_PUBLIC_REASONS)[number];

export interface RevocationDisplayMeta {
  display_mode: RevocationDisplayMode;
  public_reason: string | null;
}

const DISPLAY_MODE_SET = new Set<string>(REVOCATION_DISPLAY_MODES);
const PUBLIC_REASON_SET = new Set<string>(REVOCATION_PUBLIC_REASONS);

export function parseRevocationDisplayFields(
  unsigned: Record<string, unknown>
): { ok: true; meta: RevocationDisplayMeta } | { ok: false; message: string } {
  let displayMode: RevocationDisplayMode = "minimal";
  if (unsigned.display_mode !== undefined && unsigned.display_mode !== null) {
    if (
      typeof unsigned.display_mode !== "string" ||
      !DISPLAY_MODE_SET.has(unsigned.display_mode)
    ) {
      return {
        ok: false,
        message: "display_mode must be minimal, tombstone, or private.",
      };
    }
    displayMode = unsigned.display_mode as RevocationDisplayMode;
  }

  let publicReason: string | null = null;
  if (unsigned.public_reason !== undefined && unsigned.public_reason !== null) {
    if (
      typeof unsigned.public_reason !== "string" ||
      !PUBLIC_REASON_SET.has(unsigned.public_reason)
    ) {
      return {
        ok: false,
        message:
          "public_reason must be event_ended, rotated, lost_item, owner_revoked, compromised, or other.",
      };
    }
    publicReason = unsigned.public_reason;
  }

  return { ok: true, meta: { display_mode: displayMode, public_reason: publicReason } };
}

export function scanLayoutForRevocationDisplay(
  meta: RevocationDisplayMeta | null | undefined
): {
  minimalScan: boolean;
  showCardBlock: boolean;
  showHumanTrustBlock: boolean;
  showArtifactBlock: boolean;
  showLiveControlBlock: boolean;
} {
  const mode = meta?.display_mode ?? "minimal";
  if (mode === "tombstone") {
    return {
      minimalScan: false,
      showCardBlock: true,
      showHumanTrustBlock: false,
      showArtifactBlock: false,
      showLiveControlBlock: false,
    };
  }
  return {
    minimalScan: true,
    showCardBlock: false,
    showHumanTrustBlock: false,
    showArtifactBlock: false,
    showLiveControlBlock: false,
  };
}

export function publicReasonLabel(reason: string | null | undefined): string | null {
  if (!reason) return null;
  switch (reason) {
    case "event_ended":
      return "Event ended";
    case "rotated":
      return "QR rotated";
    case "lost_item":
      return "Lost item recovered or closed";
    case "owner_revoked":
      return "Revoked by owner";
    case "compromised":
      return "Compromised or abused";
    case "other":
      return "Owner revoked";
    default:
      return null;
  }
}
