/**
 * Ephemeral / private browsing storage probe (RC-6).
 * @see docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md RC-6
 */

export const STORAGE_PROBE_KEY = "__hc_storage_probe__";

/**
 * @param {Pick<Storage, "setItem" | "getItem" | "removeItem"> | null | undefined} storage
 */
export function probeStorageWritable(storage) {
  if (!storage || typeof storage.setItem !== "function") {
    return { ok: false, reason: "unavailable" };
  }
  try {
    storage.setItem(STORAGE_PROBE_KEY, "1");
    const read = storage.getItem(STORAGE_PROBE_KEY);
    storage.removeItem(STORAGE_PROBE_KEY);
    if (read !== "1") {
      return { ok: false, reason: "readback_mismatch" };
    }
    return { ok: true };
  } catch (err) {
    const name =
      err && typeof err === "object" && "name" in err ? String(err.name) : "";
    if (name === "QuotaExceededError") {
      return { ok: false, reason: "quota_exceeded" };
    }
    return { ok: false, reason: "write_failed" };
  }
}

/**
 * True when localStorage cannot retain wallet rows.
 * @param {Pick<Storage, "setItem" | "getItem" | "removeItem"> | null | undefined} [local]
 */
export function isLocalStorageEphemeral(local) {
  let storage = local;
  if (storage === undefined) {
    try {
      storage = typeof localStorage !== "undefined" ? localStorage : null;
    } catch {
      return true;
    }
  }
  const probe = probeStorageWritable(storage);
  if (probe.ok) return false;
  return probe.reason !== "quota_exceeded";
}

/**
 * True when origin storage cannot retain wallet/session data (private mode, disabled storage).
 * Requires both local and session storage when available (create flow).
 * @param {{
 *   localStorage?: Pick<Storage, "setItem" | "getItem" | "removeItem"> | null;
 *   sessionStorage?: Pick<Storage, "setItem" | "getItem" | "removeItem"> | null;
 * }} [input]
 */
export function isEphemeralBrowsingStorage(input = {}) {
  let local = input.localStorage;
  if (local === undefined) {
    try {
      local = typeof localStorage !== "undefined" ? localStorage : null;
    } catch {
      local = null;
    }
  }
  const localProbe = probeStorageWritable(local);
  if (!localProbe.ok && localProbe.reason !== "quota_exceeded") return true;

  let session = input.sessionStorage;
  if (session === undefined) {
    try {
      session = typeof sessionStorage !== "undefined" ? sessionStorage : null;
    } catch {
      session = null;
    }
  }
  if (session == null) return false;
  const sessionProbe = probeStorageWritable(session);
  if (sessionProbe.ok) return false;
  return sessionProbe.reason !== "quota_exceeded";
}
