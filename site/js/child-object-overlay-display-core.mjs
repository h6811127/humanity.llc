/**
 * Hub / steward display for Layer 1 overlays (time_policy, custody).
 * Mirrors resolver phase semantics in worker/src/live-object/time-policy.ts.
 * @see docs/LIVE_OBJECT_ARCHITECTURE.md Layer 1
 */

import { custodyFromChildRow, custodyHubHint } from "./child-object-custody-core.mjs";
import { timePolicyFromChildRow } from "./child-object-time-policy-core.mjs";

/**
 * @param {unknown} phase
 * @returns {string | null}
 */
export function timePolicyHubChip(phase) {
  switch (phase) {
    case "dormant":
      return "Object asleep";
    case "before":
      return "Not valid yet";
    case "after":
      return "Window ended";
    case "grace":
      return "Recall grace";
    case "outside_schedule":
      return "Outside hours";
    default:
      return null;
  }
}

/**
 * @param {unknown} value
 */
function parseInstant(value) {
  if (value == null || (typeof value === "string" && !value.trim())) return null;
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

/**
 * @param {Date} now
 * @param {string} timeZone
 */
function localHourInTimeZone(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
  const hour = Number.parseInt(hourPart, 10);
  return Number.isFinite(hour) ? hour % 24 : 0;
}

/**
 * @param {Date} now
 * @param {string} timeZone
 */
function localDayOfWeekInTimeZone(now, timeZone) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(now);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? 0;
}

/**
 * @param {number} hour
 * @param {number} from
 * @param {number} until
 */
function isLocalHourInRange(hour, from, until) {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const start = ((from % 24) + 24) % 24;
  let end = until;
  if (end === 24) end = 24;
  else end = ((until % 24) + 24) % 24;

  if (start === end) return true;
  if (start < end) {
    if (until === 24) return normalizedHour >= start;
    return normalizedHour >= start && normalizedHour < end;
  }
  return normalizedHour >= start || normalizedHour < end;
}

/**
 * @param {Record<string, unknown>} slot
 * @param {Date} now
 * @param {string} timeZone
 */
function scheduleSlotMatchesNow(slot, now, timeZone) {
  if (slot.day_of_week != null) {
    if (localDayOfWeekInTimeZone(now, timeZone) !== slot.day_of_week) {
      return false;
    }
  }
  if (slot.local_hour_from != null && slot.local_hour_until != null) {
    const hour = localHourInTimeZone(now, timeZone);
    return isLocalHourInRange(hour, slot.local_hour_from, slot.local_hour_until);
  }
  return true;
}

/**
 * @param {Record<string, unknown>} policy
 * @param {Date} now
 */
function resolveActiveScheduleSlot(policy, now) {
  const schedule = Array.isArray(policy.schedule) ? policy.schedule : [];
  if (!schedule.length) return null;
  for (let i = schedule.length - 1; i >= 0; i -= 1) {
    const slot = schedule[i];
    if (slot && typeof slot === "object" && scheduleSlotMatchesNow(slot, now, policy.timezone)) {
      return slot;
    }
  }
  return null;
}

/**
 * @param {Record<string, unknown> | null} policy
 * @param {Date} [now]
 */
export function resolveTimePolicyPhaseFromPolicy(policy, now = new Date()) {
  if (!policy) return "unset";

  const timezone =
    typeof policy.timezone === "string" && policy.timezone.trim()
      ? policy.timezone.trim()
      : "UTC";
  const normalized = { ...policy, timezone, schedule: Array.isArray(policy.schedule) ? policy.schedule : [] };

  const nowMs = now.getTime();
  const dormantUntilMs = parseInstant(normalized.dormant_until);
  if (dormantUntilMs != null && nowMs < dormantUntilMs) {
    return "dormant";
  }

  const validFromMs = parseInstant(normalized.valid_from);
  if (validFromMs != null && nowMs < validFromMs) {
    return "before";
  }

  const validUntilMs = parseInstant(normalized.valid_until);
  if (validUntilMs != null && nowMs > validUntilMs) {
    const graceHours = normalized.grace_period_hours;
    if (
      graceHours != null &&
      Number.isFinite(Number(graceHours)) &&
      nowMs <= validUntilMs + Number(graceHours) * 3_600_000
    ) {
      return "grace";
    }
    return "after";
  }

  if (normalized.schedule.length) {
    if (!resolveActiveScheduleSlot(normalized, now)) {
      return "outside_schedule";
    }
  }

  return "active";
}

/**
 * @param {unknown} row
 * @param {Date} [now]
 */
export function resolveTimePolicyPhaseFromRow(row, now = new Date()) {
  return resolveTimePolicyPhaseFromPolicy(timePolicyFromChildRow(row), now);
}

/**
 * @param {unknown} row
 * @param {Date} [now]
 */
export function custodyHubHintFromRow(row, now = new Date()) {
  return custodyHubHint(custodyFromChildRow(row), now);
}

/**
 * Apply Layer 1 overlay hints to a hub status line (never uses scan analytics copy).
 * @param {{ label: string, tone: 'ok' | 'warn' | 'muted' }} base
 * @param {{
 *   timePolicy?: Record<string, unknown> | null,
 *   custody?: Record<string, unknown> | null,
 *   delegatedHint?: string | null,
 *   now?: Date,
 * }} overlays
 */
export function applyHubChildObjectOverlays(base, overlays = {}) {
  const now = overlays.now ?? new Date();
  const phase = resolveTimePolicyPhaseFromPolicy(overlays.timePolicy ?? null, now);
  const chip = timePolicyHubChip(phase);
  const custodyHint = custodyHubHint(overlays.custody ?? null, now);
  const delegatedHint =
    typeof overlays.delegatedHint === "string" ? overlays.delegatedHint.trim() : "";

  let { label, tone } = base;

  if (chip && phase !== "active" && phase !== "unset") {
    const generic =
      label === "Scan link ready" || label === "Not published yet" || label === "No scan link yet";
    label = generic || !label ? chip : `${chip} · ${label}`;
    tone = "warn";
  }

  if (custodyHint && tone !== "warn") {
    if (label && !label.toLowerCase().startsWith("held by")) {
      label = `${custodyHint} · ${label}`;
    } else if (!label) {
      label = custodyHint;
    }
  }

  if (delegatedHint) {
    const hasDelegated = label.toLowerCase().includes("limited signer");
    if (!hasDelegated) {
      label = label ? `${delegatedHint} · ${label}` : delegatedHint;
    }
    if (tone === "ok") tone = "muted";
  }

  return { label, tone };
}
