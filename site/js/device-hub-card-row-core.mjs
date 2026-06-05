/**
 * Saved hub card row copy (pure helpers for device-hub-ui + tests).
 * @see docs/HUB_CARD_ROW_UX.md
 */

import { verificationTrustChip } from "./human-trust-ui.mjs";

/** Hub object-type labels that add no steward value without a specific subtype or trust chip. */
export const GENERIC_HUB_OBJECT_TYPE_LABELS = new Set(["Object", "Account"]);

/** @param {string | null | undefined} label */
export function isGenericHubVerificationLabel(label) {
  const normalized = String(label ?? "").trim();
  return !normalized || normalized === "Registered" || normalized === "Unknown";
}

/** @param {{ label?: string, tone?: string } | null | undefined} chip */
export function isMeaningfulHubVerificationChip(chip) {
  return Boolean(chip?.label) && !isGenericHubVerificationLabel(chip.label);
}

/** @param {string | null | undefined} objectTypeLabel */
export function isGenericHubObjectTypeLabel(objectTypeLabel) {
  return GENERIC_HUB_OBJECT_TYPE_LABELS.has(String(objectTypeLabel ?? "").trim());
}

/**
 * @param {number | null | undefined} at
 * @param {number} [now]
 */
export function formatCheckedAgo(at, now = Date.now()) {
  if (typeof at !== "number" || !Number.isFinite(at)) return "";
  const deltaMs = Math.max(0, now - at);
  const mins = Math.floor(deltaMs / 60000);
  if (mins < 1) return "checked just now";
  if (mins < 60) return `checked ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `checked ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `checked ${days}d ago`;
}

/**
 * @param {{ handle?: string | null, label?: string | null }} entry
 */
export function hubCardTitle(entry) {
  const rawHandle = entry?.handle ? String(entry.handle).replace(/^@/, "").trim() : "";
  const handleAt = rawHandle ? `@${rawHandle}` : "";
  const label = String(entry?.label || "").trim();
  const labelNorm = label.replace(/^@/, "").toLowerCase();
  const handleNorm = rawHandle.toLowerCase();

  if (label && handleNorm && labelNorm && labelNorm !== handleNorm) {
    return label;
  }
  if (handleAt) return handleAt;
  if (label) return label;
  return "Saved card";
}

/**
 * @param {{
 *   objectTypeLabel: string,
 *   verificationLabel?: string | null,
 *   verificationState?: string | null,
 *   includeVerification?: boolean,
 * }} ctx
 */
export function hubCardIdentityLine(ctx) {
  const objectTypeLabel = String(ctx.objectTypeLabel ?? "").trim();
  const genericType = isGenericHubObjectTypeLabel(objectTypeLabel);

  let verifyTone = "muted";
  /** @type {{ label: string, tone: string } | null} */
  let verifyChip = null;
  if (ctx.includeVerification !== false) {
    verifyChip = verificationTrustChip({
      label: ctx.verificationLabel,
      state: ctx.verificationState,
    });
  }

  const meaningfulVerify =
    verifyChip != null && isMeaningfulHubVerificationChip(verifyChip);

  /** @type {string[]} */
  const parts = [];
  if (!genericType && objectTypeLabel) {
    parts.push(objectTypeLabel);
  }
  if (meaningfulVerify && verifyChip) {
    parts.push(verifyChip.label);
    verifyTone = verifyChip.tone;
  }

  const text = parts.join(" · ");
  return { text, verifyTone, visible: text.length > 0 };
}

/**
 * @param {{
 *   status?: string | null,
 *   scanKind?: string | null,
 *   checkedAt?: number | null,
 *   now?: number,
 * }} ctx
 * @returns {{ label: string, tone: 'ok' | 'warn' | 'muted' | 'offline' }}
 */
export function hubCardStatusLine(ctx) {
  const scanKind = String(ctx.scanKind || "").toLowerCase();
  const status = String(ctx.status || "").toLowerCase();
  const checked = formatCheckedAgo(ctx.checkedAt ?? null, ctx.now);

  if (scanKind === "card_revoked") {
    return {
      label: checked ? `Disabled on network · ${checked}` : "Disabled on network",
      tone: "warn",
    };
  }
  if (scanKind === "qr_revoked") {
    return {
      label: checked ? `QR revoked · ${checked}` : "QR revoked",
      tone: "warn",
    };
  }
  if (scanKind === "active" || status === "active") {
    return {
      label: checked ? `Reachable · ${checked}` : "Reachable",
      tone: "ok",
    };
  }
  if (scanKind === "unknown_profile" || scanKind === "unknown_qr") {
    return {
      label: checked ? `Not on network · ${checked}` : "Not on network",
      tone: "warn",
    };
  }
  if (scanKind === "malformed" || scanKind === "profile_qr_mismatch") {
    return {
      label: checked ? `Invalid on network · ${checked}` : "Invalid on network",
      tone: "warn",
    };
  }
  if (status === "checking") {
    return { label: "Checking network…", tone: "muted" };
  }
  if (status === "offline" || status === "error") {
    return {
      label: checked ? `Can't reach resolver · ${checked}` : "Can't reach resolver",
      tone: "offline",
    };
  }
  if (checked) {
    return { label: checked, tone: "muted" };
  }
  return { label: "Not checked yet", tone: "muted" };
}
