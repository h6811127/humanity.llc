/**
 * Backup/recovery nudge before and after Tier 1 merch checkout.
 * @see docs/EPHEMERAL_STATE_AND_MERCH.md § Next step 2
 * @see docs/ROOT_CARD_AND_CHILD_OBJECTS.md § Custody and recovery
 */
import { rootHasChildObjectBackupSeatbelt } from "./child-object-backup-gate-core.mjs";

/**
 * @param {Record<string, unknown>} entry
 */
function hasSigningKeys(entry) {
  return (
    typeof entry?.owner_private_key_b58 === "string" ||
    typeof entry?.recovery_private_key_b58 === "string"
  );
}

/**
 * Card session record from hc_created, else first wallet entry with keys.
 * @param {Pick<Window, "sessionStorage" | "localStorage">} [storage]
 * @returns {Record<string, unknown> | null}
 */
export function loadRootSessionRecordForMerch(storage = globalThis) {
  const sessionStorage = storage.sessionStorage;
  const localStorage = storage.localStorage;
  if (sessionStorage) {
    try {
      const raw = sessionStorage.getItem("hc_created");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.profile_id && hasSigningKeys(parsed)) return parsed;
      }
    } catch {
      /* ignore */
    }
  }
  if (localStorage) {
    try {
      const wallet = JSON.parse(localStorage.getItem("hc_wallet") || "[]");
      if (Array.isArray(wallet)) {
        for (const entry of wallet) {
          if (entry?.profile_id && hasSigningKeys(entry)) return entry;
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function shouldShowMerchBackupNudge(session) {
  if (!session?.profile_id) return false;
  return !rootHasChildObjectBackupSeatbelt(session);
}

/**
 * @param {"pre_checkout" | "post_checkout"} phase
 */
export function merchBackupNudgeCopy(phase) {
  if (phase === "post_checkout") {
    return {
      title: "Save backup now — your key controls this print",
      body: "Your live object is tied to your Humanity Card key. Export encrypted backup or save your recovery key on Manage before you close this tab — we cannot recover your tree if you lose the key.",
    };
  }
  return {
    title: "Save backup before you print",
    body: "Your card key will control this hoodie or sticker on the scanner. Export encrypted backup or save your recovery key on Manage now — we cannot recover your tree if you lose the key.",
  };
}
