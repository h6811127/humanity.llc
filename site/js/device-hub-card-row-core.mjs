/**
 * Saved hub card row copy (pure helpers for device-hub-ui + tests).
 * @see docs/HUB_CARD_ROW_UX.md
 */

import { verificationTrustChip } from "./human-trust-ui.mjs";

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
  const parts = [ctx.objectTypeLabel];
  let verifyTone = "muted";
  if (ctx.includeVerification !== false) {
    const chip = verificationTrustChip({
      label: ctx.verificationLabel,
      state: ctx.verificationState,
    });
    if (chip.label) {
      parts.push(chip.label);
      verifyTone = chip.tone;
    }
  }
  return { text: parts.join(" · "), verifyTone };
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
