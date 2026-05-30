/**
 * Shell bootstrap: rehydrate hc_created from hc_wallet when D10 rules pass.
 * @see docs/QUIET_TAB_REHYDRATE.md
 */
import { activateWalletEntryGated } from "./device-control-activation.mjs";
import { controlActivationRequiresUnlock } from "./device-control-activation-core.mjs";
import { getTabSession } from "./device-keys.mjs";
import { loadWallet } from "./device-wallet.mjs";
import {
  resolveQuietTabRehydrateTarget,
  shouldQuietTabRehydrate,
  walletEntriesWithSigningKeys,
} from "./device-quiet-tab-rehydrate-core.mjs";
import {
  getLastActiveProfileId,
  isQuietTabRehydrateEnabled,
  setQuietTabRehydratedProfile,
} from "./device-quiet-tab-rehydrate-prefs.mjs";
import { invalidateCrossTabNotificationState } from "./device-cross-tab-state.mjs";
import { resetPresenceInboxGatherCache } from "./device-inbox.mjs";
import {
  notifyProfileSavedOnDevice,
  syncTabKeysPresence,
} from "./device-tab-presence.mjs";

/**
 * Demote cross-tab chrome after bootstrap rehydrate (D10 Tier 3).
 * @param {string} profileId
 */
export function applyQuietRehydrateCrossTabDemotion(profileId) {
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid) return;
  setQuietTabRehydratedProfile(pid);
  notifyProfileSavedOnDevice(pid);
  syncTabKeysPresence();
  invalidateCrossTabNotificationState();
  resetPresenceInboxGatherCache();
  window.dispatchEvent(
    new CustomEvent("hc-quiet-tab-rehydrated", { detail: { profile_id: pid } })
  );
}

/**
 * @param {{ excludeProfileId?: string | null }} [opts]
 * @returns {Promise<{ ok: true, profileId: string } | { skipped: string }>}
 */
export async function maybeQuietTabRehydrate(opts = {}) {
  const session = getTabSession();
  const hasTabControl = Boolean(session?.owner_private_key_b58);
  const wallet = loadWallet();
  const signingEntries = walletEntriesWithSigningKeys(wallet);
  const quietRehydrateEnabled = isQuietTabRehydrateEnabled();
  const lastActiveProfileId = getLastActiveProfileId();
  const excludeProfileId = opts.excludeProfileId ?? null;
  const entry = resolveQuietTabRehydrateTarget(
    wallet,
    lastActiveProfileId,
    excludeProfileId
  );
  const profileId = typeof entry?.profile_id === "string" ? entry.profile_id : "";

  if (
    !shouldQuietTabRehydrate({
      hasTabControl,
      signingWalletCount: signingEntries.length,
      targetEntry: entry,
      requiresUnlock: controlActivationRequiresUnlock(profileId),
      quietRehydrateEnabled,
    })
  ) {
    if (hasTabControl) return { skipped: "has_tab_control" };
    if (signingEntries.length === 0) return { skipped: "no_saved" };
    if (signingEntries.length > 1 && !quietRehydrateEnabled) {
      return { skipped: "multi_card_opt_out" };
    }
    if (signingEntries.length > 1 && !entry) return { skipped: "no_last_active" };
    if (controlActivationRequiresUnlock(profileId)) return { skipped: "requires_unlock" };
    return { skipped: "ineligible" };
  }

  if (!entry) return { skipped: "no_entry" };

  const result = await activateWalletEntryGated(entry);
  if (!result.ok) {
    return { skipped: "activation_failed" };
  }

  applyQuietRehydrateCrossTabDemotion(profileId);
  return { ok: true, profileId };
}

/**
 * P0b-3 / P1-1: sole saved signing row on scan when default-vouch auto-activate did not run.
 * Mirrors D10 gates via {@link maybeQuietTabRehydrate} — no default profile or vouch opt-in required.
 * @returns {Promise<{ ok: true, profileId: string } | { skipped: string }>}
 */
export async function trySoleSigningRowRehydrateForScan() {
  const signingEntries = walletEntriesWithSigningKeys(loadWallet());
  if (signingEntries.length !== 1) {
    return { skipped: "not_sole_signing_row" };
  }
  return maybeQuietTabRehydrate();
}
