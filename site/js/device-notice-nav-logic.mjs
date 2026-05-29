/**
 * Pure navigation plan for "keys in another tab" actions.
 */
import { otherTabSwitchConfirmMessage as ownershipOtherTabSwitchMessage } from "./device-ownership-copy-core.mjs";

/**
 * @param {{
 *   session: { profile_id?: string, owner_private_key_b58?: string } | null,
 *   entry: { profile_id: string },
 *   hasWalletEntry: boolean,
 * }} input
 * @returns {{ kind: 'dismiss' | 'open-wallet' | 'focus-only' | 'focus-then-open-wallet', needsConfirm?: boolean }}
 */
export function resolveOtherTabKeysAction(input) {
  const session = input.session;
  const hasKeys = !!(session?.owner_private_key_b58);
  const sameProfile = session?.profile_id === input.entry.profile_id;

  if (sameProfile && hasKeys) {
    return { kind: "dismiss" };
  }
  if (input.hasWalletEntry && !hasKeys) {
    return { kind: "open-wallet" };
  }
  if (hasKeys) {
    return input.hasWalletEntry
      ? { kind: "focus-then-open-wallet", needsConfirm: true }
      : { kind: "focus-only", needsConfirm: true };
  }
  return { kind: "focus-only" };
}

/** @param {{ profile_id?: string } | null} session @param {{ profile_id: string }} entry */
export function otherTabSwitchConfirmMessage(session, entry) {
  const here = session?.profile_id?.slice(0, 12) ?? "this tab";
  const there = entry.profile_id.slice(0, 12);
  return ownershipOtherTabSwitchMessage(here, there);
}
