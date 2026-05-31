/**
 * Backup/recovery nudge before and after Tier 1 merch checkout.
 * @see docs/EPHEMERAL_STATE_AND_MERCH.md § Next step 2
 * @see docs/ROOT_CARD_AND_CHILD_OBJECTS.md § Custody and recovery
 */
import { ownershipBackupSeatbeltSatisfied } from "./created-first-session-gate-core.mjs";

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
 * Wallet row for the active merch session (tab session may omit seatbelt markers).
 * @param {string} profileId
 * @param {Pick<Window, "localStorage">} [storage]
 * @returns {Record<string, unknown> | null}
 */
function findWalletEntryForMerchSession(profileId, storage = globalThis) {
  const localStorage = storage.localStorage;
  if (!profileId || !localStorage) return null;
  try {
    const wallet = JSON.parse(localStorage.getItem("hc_wallet") || "[]");
    if (!Array.isArray(wallet)) return null;
    return wallet.find((entry) => entry?.profile_id === profileId) ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {Pick<Window, "localStorage">} [storage]
 */
export function shouldShowMerchBackupNudge(session, storage = globalThis) {
  if (!session?.profile_id) return false;
  const walletEntry = findWalletEntryForMerchSession(String(session.profile_id), storage);
  return !ownershipBackupSeatbeltSatisfied(session, walletEntry);
}

/**
 * Pre-checkout recovery gate — blocks Tier 1 checkout until seatbelt is satisfied.
 * @param {Record<string, unknown> | null | undefined} session
 * @param {Pick<Window, "localStorage">} [storage]
 */
export function merchPreCheckoutRecoveryGateState(session, storage = globalThis) {
  const blocked = shouldShowMerchBackupNudge(session, storage);
  return { blocked, shown: blocked };
}

/**
 * @param {"pre_checkout" | "post_checkout"} phase
 * @param {{ blocked?: boolean }} [opts]
 */
export function merchBackupNudgeCopy(phase, opts = {}) {
  const blocked = opts.blocked === true;
  if (phase === "post_checkout") {
    return {
      title: "Save a recovery method now — your ownership controls this print",
      body: "Your live object is tied to your Humanity Card ownership. Add a recovery method or export encrypted backup on Manage before you close this tab — we cannot restore lost control.",
    };
  }
  if (blocked) {
    return {
      title: "Save a recovery method before you print",
      body: "Checkout stays disabled until you add a recovery method or export encrypted backup on Manage. Your ownership will control this item on the scanner — we cannot restore lost control.",
    };
  }
  return {
    title: "Save a recovery method before you print",
    body: "Your ownership will control this hoodie or sticker on the scanner. Add a recovery method or export encrypted backup on Manage — we cannot restore lost control.",
  };
}
