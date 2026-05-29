/**
 * Shell bootstrap: rehydrate hc_created from hc_wallet when Tier 1 rules pass.
 * @see docs/QUIET_TAB_REHYDRATE.md
 */
import { activateWalletEntryGated } from "./device-control-activation.mjs";
import { controlActivationRequiresUnlock } from "./device-control-activation-core.mjs";
import { getTabSession } from "./device-keys.mjs";
import { loadWallet } from "./device-wallet.mjs";
import {
  shouldQuietTabRehydrate,
  soleSigningWalletEntry,
  walletEntriesWithSigningKeys,
} from "./device-quiet-tab-rehydrate-core.mjs";

/**
 * @returns {Promise<{ ok: true, profileId: string } | { skipped: string }>}
 */
export async function maybeQuietTabRehydrate() {
  const session = getTabSession();
  const hasTabControl = Boolean(session?.owner_private_key_b58);
  const wallet = loadWallet();
  const signingEntries = walletEntriesWithSigningKeys(wallet);
  const entry = soleSigningWalletEntry(wallet);
  const profileId = typeof entry?.profile_id === "string" ? entry.profile_id : "";

  if (
    !shouldQuietTabRehydrate({
      hasTabControl,
      signingWalletCount: signingEntries.length,
      requiresUnlock: controlActivationRequiresUnlock(profileId),
    })
  ) {
    if (hasTabControl) return { skipped: "has_tab_control" };
    if (signingEntries.length === 0) return { skipped: "no_saved" };
    if (signingEntries.length > 1) return { skipped: "multi_card" };
    if (controlActivationRequiresUnlock(profileId)) return { skipped: "requires_unlock" };
    return { skipped: "ineligible" };
  }

  if (!entry) return { skipped: "no_entry" };

  const result = await activateWalletEntryGated(entry);
  if (!result.ok) {
    return { skipped: "activation_failed" };
  }

  return { ok: true, profileId };
}
