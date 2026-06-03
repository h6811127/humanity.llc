/** @see docs/LIVE_OBJECT_ARCHITECTURE.md Layer 1 — time_policy on Phase A child objects */

export const DEFAULT_TIME_POLICY_TIMEZONE = "America/Chicago";

export const TIME_POLICY_DAY_OPTIONS = [
  { value: "", label: "Every day" },
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

/**
 * @param {unknown} value
 */
export function datetimeLocalToIso(value) {
  if (value == null || (typeof value === "string" && !value.trim())) return null;
  if (typeof value !== "string") {
    throw new Error("Date must be a valid local date and time.");
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error("Date must be a valid local date and time.");
  }
  return parsed.toISOString();
}

/**
 * @param {unknown} value
 */
export function isoToDatetimeLocal(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

/**
 * @param {unknown} row
 */
export function timePolicyFromChildRow(row) {
  if (!row || typeof row !== "object") return null;
  const policy = /** @type {Record<string, unknown>} */ (row).time_policy;
  if (!policy || typeof policy !== "object") return null;
  return /** @type {Record<string, unknown>} */ (policy);
}

/**
 * @param {unknown} row
 */
export function preserveChildDocumentFields(row) {
  /** @type {Record<string, unknown>} */
  const extra = {};
  const timePolicy = timePolicyFromChildRow(row);
  if (timePolicy) extra.time_policy = timePolicy;
  if (row && typeof row === "object") {
    const custody = /** @type {Record<string, unknown>} */ (row).custody;
    if (custody && typeof custody === "object") extra.custody = custody;
  }
  return extra;
}

/**
 * @param {FormData | Record<string, FormDataEntryValue | string | null | undefined>} input
 */
export function buildTimePolicyFromForm(input) {
  const read = (key) => {
    if (input instanceof FormData) return input.get(key);
    return input[key] ?? null;
  };
  const enabled = read("time_policy_enabled");
  if (enabled !== "1" && enabled !== "on" && enabled !== true) {
    return null;
  }

  const timezoneRaw = read("time_policy_timezone");
  const timezone =
    typeof timezoneRaw === "string" && timezoneRaw.trim()
      ? timezoneRaw.trim()
      : DEFAULT_TIME_POLICY_TIMEZONE;

  /** @type {Record<string, unknown>} */
  const policy = {
    timezone,
    valid_from: null,
    valid_until: datetimeLocalToIso(read("time_policy_valid_until")),
    dormant_until: datetimeLocalToIso(read("time_policy_dormant_until")),
    schedule: [],
  };

  const graceRaw = read("time_policy_grace_period_hours");
  if (typeof graceRaw === "string" && graceRaw.trim()) {
    const graceHours = Number(graceRaw);
    if (!Number.isFinite(graceHours) || graceHours < 1 || graceHours > 720) {
      throw new Error("Recall grace hours must be between 1 and 720.");
    }
    if (!policy.valid_until) {
      throw new Error("Set a valid-until date before adding recall grace hours.");
    }
    policy.grace_period_hours = Math.trunc(graceHours);
  }

  const hourFromRaw = read("time_policy_schedule_hour_from");
  const hourUntilRaw = read("time_policy_schedule_hour_until");
  const hourFrom =
    typeof hourFromRaw === "string" && hourFromRaw !== "" ? Number(hourFromRaw) : null;
  const hourUntil =
    typeof hourUntilRaw === "string" && hourUntilRaw !== "" ? Number(hourUntilRaw) : null;
  const hasScheduleHours =
    Number.isFinite(hourFrom) && Number.isFinite(hourUntil) && hourFrom != null && hourUntil != null;

  if (hasScheduleHours) {
    if (hourFrom < 0 || hourFrom > 23 || hourUntil < 0 || hourUntil > 24) {
      throw new Error("Schedule hours must be between 0 and 24.");
    }
    /** @type {Record<string, unknown>} */
    const slot = {
      local_hour_from: hourFrom,
      local_hour_until: hourUntil,
    };
    const dayRaw = read("time_policy_schedule_day");
    if (typeof dayRaw === "string" && dayRaw !== "") {
      const day = Number(dayRaw);
      if (!Number.isFinite(day) || day < 0 || day > 6) {
        throw new Error("Schedule day must be between Sunday (0) and Saturday (6).");
      }
      slot.day_of_week = day;
    }
    const scheduleStateRaw = read("time_policy_schedule_public_state");
    if (typeof scheduleStateRaw === "string" && scheduleStateRaw.trim()) {
      slot.public_state = scheduleStateRaw.trim().slice(0, 240);
    }
    policy.schedule = [slot];
  }

  const hasWindow =
    policy.valid_until || policy.dormant_until || policy.grace_period_hours != null;
  const hasSchedule = policy.schedule.length > 0;
  if (!hasWindow && !hasSchedule) {
    throw new Error("Turn on at least one window or weekly schedule before publishing time policy.");
  }

  return policy;
}

/**
 * @param {unknown} row
 */
export function timePolicyFormDefaults(row) {
  const policy = timePolicyFromChildRow(row);
  const schedule =
    policy && Array.isArray(policy.schedule) && policy.schedule[0] && typeof policy.schedule[0] === "object"
      ? /** @type {Record<string, unknown>} */ (policy.schedule[0])
      : null;
  return {
    enabled: Boolean(policy),
    valid_until: isoToDatetimeLocal(policy?.valid_until),
    dormant_until: isoToDatetimeLocal(policy?.dormant_until),
    timezone:
      typeof policy?.timezone === "string" && policy.timezone.trim()
        ? policy.timezone.trim()
        : DEFAULT_TIME_POLICY_TIMEZONE,
    schedule_day:
      schedule && schedule.day_of_week != null ? String(schedule.day_of_week) : "",
    schedule_hour_from:
      schedule && schedule.local_hour_from != null ? String(schedule.local_hour_from) : "",
    schedule_hour_until:
      schedule && schedule.local_hour_until != null ? String(schedule.local_hour_until) : "",
    schedule_public_state:
      typeof schedule?.public_state === "string" ? schedule.public_state : "",
    grace_period_hours:
      policy && policy.grace_period_hours != null
        ? String(policy.grace_period_hours)
        : "",
  };
}

/**
 * @param {unknown} row
 * @param {Record<string, unknown> | null | undefined} timePolicy
 */
export function childObjectUpdateExtraFields(row, timePolicy = undefined) {
  return mergeChildObjectDocumentFields(row, { timePolicy });
}

/**
 * @param {unknown} row
 * @param {{ timePolicy?: Record<string, unknown> | null; custody?: Record<string, unknown> | null }} patch
 */
export function mergeChildObjectDocumentFields(row, patch = {}) {
  const extra = preserveChildDocumentFields(row);
  if (patch.timePolicy !== undefined) {
    if (patch.timePolicy == null) delete extra.time_policy;
    else extra.time_policy = patch.timePolicy;
  }
  if (patch.custody !== undefined) {
    if (patch.custody == null) delete extra.custody;
    else extra.custody = patch.custody;
  }
  return extra;
}
