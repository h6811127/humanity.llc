import { isPhaseAChildObjectType } from "./object-types";

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

const DEFAULT_TIMEZONE = "UTC";

export type ObjectTimePolicyPhase =
  | "unset"
  | "dormant"
  | "before"
  | "grace"
  | "after"
  | "outside_schedule"
  | "active";

export type ObjectTimePolicyScheduleSlot = {
  day_of_week?: number | null;
  local_hour_from?: number | null;
  local_hour_until?: number | null;
  public_state?: string | null;
};

export type ObjectTimePolicy = {
  valid_from: string | null;
  valid_until: string | null;
  dormant_until: string | null;
  /** Hours after `valid_until` before phase becomes `after` (recall grace). */
  grace_period_hours: number | null;
  timezone: string;
  schedule: ObjectTimePolicyScheduleSlot[];
};

export type ObjectTimePolicyScanContext = {
  phase: ObjectTimePolicyPhase;
  scanNote: string | null;
  chip: string | null;
  schedulePublicState: string | null;
  /** ISO instant when recall grace ends (only when phase is `grace`). */
  graceEndsAt: string | null;
};

const MAX_GRACE_PERIOD_HOURS = 720;

function readOptionalString(
  obj: Record<string, unknown>,
  field: string,
  max: number
): string | null {
  const value = obj[field];
  if (value == null) return null;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`time_policy.${field} must be a non-empty string or null.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new Error(`time_policy.${field} is too long.`);
  }
  return trimmed;
}

function readOptionalIsoField(
  obj: Record<string, unknown>,
  field: string
): string | null {
  const raw = readOptionalString(obj, field, 40);
  if (raw == null) return null;
  if (!ISO_RE.test(raw)) {
    throw new Error(`time_policy.${field} must be ISO 8601 or null.`);
  }
  return raw;
}

function readOptionalHour(
  obj: Record<string, unknown>,
  field: string
): number | null {
  const value = obj[field];
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`time_policy schedule slot ${field} must be a number or null.`);
  }
  const hour = Math.trunc(value);
  if (hour < 0 || hour > 24) {
    throw new Error(`time_policy schedule slot ${field} must be between 0 and 24.`);
  }
  return hour;
}

function readOptionalDayOfWeek(obj: Record<string, unknown>): number | null {
  const value = obj.day_of_week;
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("time_policy schedule slot day_of_week must be a number or null.");
  }
  const day = Math.trunc(value);
  if (day < 0 || day > 6) {
    throw new Error("time_policy schedule slot day_of_week must be between 0 (Sun) and 6 (Sat).");
  }
  return day;
}

function parseScheduleSlot(raw: unknown): ObjectTimePolicyScheduleSlot {
  if (!raw || typeof raw !== "object") {
    throw new Error("time_policy.schedule entries must be objects.");
  }
  const obj = raw as Record<string, unknown>;
  const localHourFrom = readOptionalHour(obj, "local_hour_from");
  const localHourUntil = readOptionalHour(obj, "local_hour_until");
  if (
    (localHourFrom == null) !== (localHourUntil == null)
  ) {
    throw new Error(
      "time_policy schedule slots require both local_hour_from and local_hour_until."
    );
  }
  const publicState = obj.public_state;
  if (
    publicState != null &&
    (typeof publicState !== "string" || !publicState.trim())
  ) {
    throw new Error("time_policy schedule slot public_state must be a string or null.");
  }
  return {
    day_of_week: readOptionalDayOfWeek(obj),
    local_hour_from: localHourFrom,
    local_hour_until: localHourUntil,
    public_state:
      typeof publicState === "string" && publicState.trim()
        ? publicState.trim().slice(0, 240)
        : null,
  };
}

function readOptionalGracePeriodHours(
  obj: Record<string, unknown>
): number | null {
  const value = obj.grace_period_hours;
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("time_policy.grace_period_hours must be a number or null.");
  }
  const hours = Math.trunc(value);
  if (hours < 1 || hours > MAX_GRACE_PERIOD_HOURS) {
    throw new Error(
      `time_policy.grace_period_hours must be between 1 and ${MAX_GRACE_PERIOD_HOURS}.`
    );
  }
  return hours;
}

/** Parse and validate optional `time_policy` on a signed child object document. */
export function parseObjectTimePolicy(
  doc: Record<string, unknown>
): ObjectTimePolicy | null {
  const raw = doc.time_policy;
  if (raw == null) return null;
  if (typeof raw !== "object") {
    throw new Error("time_policy must be an object.");
  }
  const obj = raw as Record<string, unknown>;
  const scheduleRaw = obj.schedule;
  let schedule: ObjectTimePolicyScheduleSlot[] = [];
  if (scheduleRaw != null) {
    if (!Array.isArray(scheduleRaw)) {
      throw new Error("time_policy.schedule must be an array.");
    }
    if (scheduleRaw.length > 14) {
      throw new Error("time_policy.schedule allows at most 14 slots.");
    }
    schedule = scheduleRaw.map(parseScheduleSlot);
  }
  const timezone =
    readOptionalString(obj, "timezone", 64) ?? DEFAULT_TIMEZONE;
  const validUntil = readOptionalIsoField(obj, "valid_until");
  const gracePeriodHours = readOptionalGracePeriodHours(obj);
  if (gracePeriodHours != null && !validUntil) {
    throw new Error("time_policy.grace_period_hours requires valid_until.");
  }
  return {
    valid_from: readOptionalIsoField(obj, "valid_from"),
    valid_until: validUntil,
    dormant_until: readOptionalIsoField(obj, "dormant_until"),
    grace_period_hours: gracePeriodHours,
    timezone,
    schedule,
  };
}

export function validateTimePolicyForChildDocument(
  doc: Record<string, unknown>,
  objectType: string
): void {
  if (!isPhaseAChildObjectType(objectType)) {
    if (doc.time_policy != null) {
      throw new Error("time_policy applies only to status_plate and lost_item_relay.");
    }
    return;
  }
  parseObjectTimePolicy(doc);
}

function parseInstant(raw: string | null | undefined): number | null {
  if (raw == null || !String(raw).trim()) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

export function localHourInTimeZone(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
  const hour = Number.parseInt(hourPart, 10);
  return Number.isFinite(hour) ? hour % 24 : 0;
}

export function localDayOfWeekInTimeZone(now: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(now);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

export function isLocalHourInRange(hour: number, from: number, until: number): boolean {
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

function scheduleSlotMatchesNow(
  slot: ObjectTimePolicyScheduleSlot,
  now: Date,
  timeZone: string
): boolean {
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

function resolveActiveScheduleSlot(
  policy: ObjectTimePolicy,
  now: Date
): ObjectTimePolicyScheduleSlot | null {
  if (!policy.schedule.length) return null;
  for (let i = policy.schedule.length - 1; i >= 0; i -= 1) {
    const slot = policy.schedule[i];
    if (scheduleSlotMatchesNow(slot, now, policy.timezone)) {
      return slot;
    }
  }
  return null;
}

export function graceEndsAtIso(
  policy: ObjectTimePolicy,
  now: Date = new Date()
): string | null {
  const validUntilMs = parseInstant(policy.valid_until);
  if (validUntilMs == null || policy.grace_period_hours == null) return null;
  const endsMs = validUntilMs + policy.grace_period_hours * 3_600_000;
  if (now.getTime() > endsMs) return null;
  return new Date(endsMs).toISOString();
}

export function resolveObjectTimePolicyPhase(
  policy: ObjectTimePolicy | null,
  now: Date = new Date()
): ObjectTimePolicyPhase {
  if (!policy) return "unset";

  const nowMs = now.getTime();
  const dormantUntilMs = parseInstant(policy.dormant_until);
  if (dormantUntilMs != null && nowMs < dormantUntilMs) {
    return "dormant";
  }

  const validFromMs = parseInstant(policy.valid_from);
  if (validFromMs != null && nowMs < validFromMs) {
    return "before";
  }

  const validUntilMs = parseInstant(policy.valid_until);
  if (validUntilMs != null && nowMs > validUntilMs) {
    const graceHours = policy.grace_period_hours;
    if (
      graceHours != null &&
      nowMs <= validUntilMs + graceHours * 3_600_000
    ) {
      return "grace";
    }
    return "after";
  }

  if (policy.schedule.length) {
    const activeSlot = resolveActiveScheduleSlot(policy, now);
    if (!activeSlot) return "outside_schedule";
  }

  return "active";
}

export function timePolicyScanNote(phase: ObjectTimePolicyPhase): string | null {
  switch (phase) {
    case "dormant":
      return "This object is asleep until its scheduled wake time. The QR still resolves — public state only.";
    case "before":
      return "This object is not valid yet. The QR still resolves — check back when the window opens.";
    case "after":
      return "This object's published window has ended. The QR still resolves — last public state only.";
    case "grace":
      return "This object is in a recall grace period — update or clear it before the window closes. The QR still resolves.";
    case "outside_schedule":
      return "This object is outside its published hours. The QR still resolves — schedule may resume later.";
    default:
      return null;
  }
}

export function timePolicyChip(phase: ObjectTimePolicyPhase): string | null {
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

export function timePolicyFromChildDocumentJson(
  documentJson: string | null | undefined
): ObjectTimePolicy | null {
  if (!documentJson?.trim()) return null;
  try {
    const doc = JSON.parse(documentJson) as Record<string, unknown>;
    return parseObjectTimePolicy(doc);
  } catch {
    return null;
  }
}

export function resolveChildTimePolicyContext(input: {
  documentJson: string | null | undefined;
  publicState: string;
  now?: Date;
}): {
  policy: ObjectTimePolicy | null;
  context: ObjectTimePolicyScanContext | null;
  publicState: string;
} {
  let policy: ObjectTimePolicy | null;
  try {
    if (!input.documentJson?.trim()) {
      return { policy: null, context: null, publicState: input.publicState };
    }
    const doc = JSON.parse(input.documentJson) as Record<string, unknown>;
    policy = parseObjectTimePolicy(doc);
  } catch {
    return { policy: null, context: null, publicState: input.publicState };
  }

  if (!policy) {
    return { policy: null, context: null, publicState: input.publicState };
  }

  const now = input.now ?? new Date();
  const phase = resolveObjectTimePolicyPhase(policy, now);
  const activeSlot =
    phase === "active" ? resolveActiveScheduleSlot(policy, now) : null;
  const schedulePublicState = activeSlot?.public_state?.trim() || null;
  const graceEndsAt = phase === "grace" ? graceEndsAtIso(policy, now) : null;
  let publicState = input.publicState;
  if (schedulePublicState) {
    publicState = schedulePublicState;
  }

  return {
    policy,
    context: {
      phase,
      scanNote: timePolicyScanNote(phase),
      chip: timePolicyChip(phase),
      schedulePublicState,
      graceEndsAt,
    },
    publicState,
  };
}
