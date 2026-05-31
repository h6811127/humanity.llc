/**
 * Shell bootstrap: rehydrate hc_created from hc_wallet when D10 rules pass.
 * @see docs/QUIET_TAB_REHYDRATE.md
 */
import { activateWalletEntryGated } from "./device-control-activation.mjs";
import { controlActivationRequiresUnlock } from "./device-control-activation-core.mjs";
import { getTabSession } from "./device-keys.mjs";
import { loadWallet } from "./device-wallet.mjs";
import {
  quietRehydrateBlockedByOtherTabPresence,
  quietRehydrateBlockedOnScanForDifferentCard,
  quietRehydrateBlockedForUrlProfile,
  resolveQuietTabRehydrateTarget,
  shouldQuietTabRehydrate,
  walletEntriesWithSigningKeys,
} from "./device-quiet-tab-rehydrate-core.mjs";
import { PRESENCE_CHANGE_COALESCE_MS } from "./device-tab-presence-core.mjs";
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
 * @param {{ excludeProfileId?: string | null, urlProfileId?: string | null }} [opts]
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
  const urlProfileId = opts.urlProfileId ?? null;
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
      urlProfileId,
    })
  ) {
    if (hasTabControl) return { skipped: "has_tab_control" };
    if (signingEntries.length === 0) return { skipped: "no_saved" };
    if (signingEntries.length > 1 && !quietRehydrateEnabled) {
      return { skipped: "multi_card_opt_out" };
    }
    if (signingEntries.length > 1 && !entry) return { skipped: "no_last_active" };
    if (controlActivationRequiresUnlock(profileId)) return { skipped: "requires_unlock" };
    if (quietRehydrateBlockedForUrlProfile(entry, urlProfileId)) {
      return { skipped: "url_profile_mismatch" };
    }
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

function readTabKeysPresenceMap() {
  try {
    const raw = localStorage.getItem("hc_tab_keys_presence");
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getThisTabId() {
  let id = sessionStorage.getItem("hc_tab_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("hc_tab_id", id);
  }
  return id;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Scan bootstrap: wait briefly for other tabs to heartbeat before sole-card rehydrate.
 * Prevents stealing cross-tab banner UX when keys live in another tab (E2E + real multi-tab).
 *
 * @param {{ excludeProfileId?: string | null, graceMs?: number }} [opts]
 */
export async function maybeQuietTabRehydrateForScan(opts = {}) {
  const excludeProfileId = opts.excludeProfileId ?? null;
  const graceMs = opts.graceMs ?? PRESENCE_CHANGE_COALESCE_MS * 2;
  const wallet = loadWallet();
  const signingEntries = walletEntriesWithSigningKeys(wallet);
  const entry = resolveQuietTabRehydrateTarget(
    wallet,
    getLastActiveProfileId(),
    excludeProfileId
  );
  const targetProfileId =
    typeof entry?.profile_id === "string" ? entry.profile_id.trim() : "";
  if (
    entry &&
    quietRehydrateBlockedOnScanForDifferentCard(entry, excludeProfileId)
  ) {
    return { skipped: "scanning_other_card" };
  }
  if (!targetProfileId || signingEntries.length === 0) {
    return maybeQuietTabRehydrate({ excludeProfileId });
  }

  const tabId = getThisTabId();
  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline) {
    if (
      quietRehydrateBlockedByOtherTabPresence(
        readTabKeysPresenceMap(),
        targetProfileId,
        tabId
      )
    ) {
      return { skipped: "other_tab_holds_keys" };
    }
    await sleep(100);
  }

  if (
    quietRehydrateBlockedByOtherTabPresence(
      readTabKeysPresenceMap(),
      targetProfileId,
      tabId
    )
  ) {
    return { skipped: "other_tab_holds_keys" };
  }

  return maybeQuietTabRehydrate({ excludeProfileId });
}

/**
 * P0b-3 / P1-1: sole saved signing row on scan when default-vouch auto-activate did not run.
 * Uses {@link maybeQuietTabRehydrateForScan} so vouchee / cross-tab gates match scan-tab-keys.
 *
 * @param {{ excludeProfileId?: string | null }} [opts] scan vouchee profile_id
 * @returns {Promise<{ ok: true, profileId: string } | { skipped: string }>}
 */
export async function trySoleSigningRowRehydrateForScan(opts = {}) {
  const signingEntries = walletEntriesWithSigningKeys(loadWallet());
  if (signingEntries.length !== 1) {
    return { skipped: "not_sole_signing_row" };
  }
  let excludeProfileId = opts.excludeProfileId ?? null;
  if (!excludeProfileId && typeof document !== "undefined") {
    const header = document.getElementById("scan-safety-header");
    excludeProfileId =
      header instanceof HTMLElement ? header.dataset.profileId?.trim() || null : null;
  }
  return maybeQuietTabRehydrateForScan({ excludeProfileId });
}
