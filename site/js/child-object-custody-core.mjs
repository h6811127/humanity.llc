import { datetimeLocalToIso, isoToDatetimeLocal } from "./child-object-time-policy-core.mjs";

/**
 * @param {unknown} row
 */
export function custodyFromChildRow(row) {
  if (!row || typeof row !== "object") return null;
  const custody = /** @type {Record<string, unknown>} */ (row).custody;
  if (!custody || typeof custody !== "object") return null;
  return /** @type {Record<string, unknown>} */ (custody);
}

/**
 * @param {FormData | Record<string, FormDataEntryValue | string | null | undefined>} input
 */
export function buildCustodyFromForm(input) {
  const read = (key) => {
    if (input instanceof FormData) return input.get(key);
    return input[key] ?? null;
  };
  const enabled = read("custody_enabled");
  if (enabled !== "1" && enabled !== "on" && enabled !== true) {
    return null;
  }

  const holderRaw = read("custody_holder_label");
  const holderLabel =
    typeof holderRaw === "string" ? holderRaw.trim().slice(0, 80) : "";
  if (!holderLabel) {
    throw new Error("Who holds this object is required when publishing custody.");
  }

  const noteRaw = read("custody_note");
  const note =
    typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim().slice(0, 120) : null;

  return {
    holder_label: holderLabel,
    until: datetimeLocalToIso(read("custody_until")),
    note,
  };
}

/**
 * @param {unknown} row
 */
export function custodyFormDefaults(row) {
  const custody = custodyFromChildRow(row);
  return {
    enabled: Boolean(custody),
    holder_label: typeof custody?.holder_label === "string" ? custody.holder_label : "",
    until: isoToDatetimeLocal(custody?.until),
    note: typeof custody?.note === "string" ? custody.note : "",
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} custody
 * @param {Date} [now]
 * @returns {string | null}
 */
export function custodyHubHint(custody, now = new Date()) {
  if (!custody || typeof custody !== "object") return null;
  const holder =
    typeof custody.holder_label === "string" ? custody.holder_label.trim() : "";
  if (!holder) return null;
  const untilRaw = custody.until;
  if (typeof untilRaw === "string" && untilRaw.trim()) {
    const untilMs = Date.parse(untilRaw);
    if (!Number.isNaN(untilMs) && untilMs <= now.getTime()) return null;
  }
  return `Held by ${holder}`;
}
