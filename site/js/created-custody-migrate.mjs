/**
 * /created/ Manage — switch device_unlock ↔ full_keys (WS-CUSTODY C3).
 */

import { CUSTODY_MODE_DEVICE_UNLOCK } from "./device-custody-mode-core.mjs";
import { custodyMigrationPanelState } from "./device-custody-migrate-core.mjs";
import {
  migrateSavedCardToDeviceUnlock,
  migrateSavedCardToFullKeys,
} from "./device-custody-migrate.mjs";
import { reEnrollDeviceUnlockForProfile } from "./device-custody-reenroll.mjs";
import {
  CUSTODY_MIGRATE_MODE_DEVICE_UNLOCK,
  CUSTODY_MIGRATE_MODE_FULL_KEYS,
  CUSTODY_MIGRATE_SUMMARY_DEVICE_UNLOCK,
  CUSTODY_MIGRATE_SUMMARY_FULL_KEYS,
  CUSTODY_MIGRATE_TO_DEVICE_UNLOCK_LEAD,
  CUSTODY_MIGRATE_TO_FULL_KEYS_LEAD,
  CUSTODY_MIGRATE_FULL_KEYS_ACK,
  CUSTODY_MIGRATE_UNLOCK_FIRST_HINT,
  CUSTODY_REENROLL_DEVICE_UNLOCK_LEAD,
  CUSTODY_REENROLL_DEVICE_UNLOCK_BTN,
  CUSTODY_REENROLL_NEED_BACKUP_HINT,
} from "./device-ownership-copy-core.mjs";
import { isDeviceUnlockWebAuthnAvailable } from "./device-custody-webauthn-core.mjs";
import { defaultWalletLabel, findWalletEntryByProfileId } from "./device-wallet.mjs";

/**
 * @param {{
 *   profileId: string,
 *   getSession: () => Record<string, unknown> | null,
 *   setSession: (next: Record<string, unknown>) => void,
 * }} opts
 */
export function initCreatedCustodyMigrate(opts) {
  const panel = document.getElementById("created-custody-mode-panel");
  if (!panel) return null;

  const details = document.getElementById("created-custody-mode-details");
  const summarySub = document.getElementById("created-custody-mode-summary-sub");
  const currentEl = document.getElementById("created-custody-mode-current");
  const toFullBlock = document.getElementById("created-custody-migrate-to-full-keys");
  const toDeviceBlock = document.getElementById("created-custody-migrate-to-device-unlock");
  const fullAck = document.getElementById("created-custody-full-keys-ack");
  const fullBtn = document.getElementById("created-custody-migrate-full-keys-btn");
  const deviceBtn = document.getElementById("created-custody-migrate-device-unlock-btn");
  const reenrollBlock = document.getElementById("created-custody-reenroll-device-unlock");
  const reenrollBtn = document.getElementById("created-custody-reenroll-device-unlock-btn");
  const statusEl = document.getElementById("created-custody-migrate-status");

  function setStatus(msg, isError = false) {
    if (!statusEl) return;
    statusEl.hidden = !msg;
    statusEl.textContent = msg;
    statusEl.className = isError ? "form-status error" : "form-status";
  }

  const blockedHint = document.getElementById("created-custody-migrate-blocked-hint");

  function refresh() {
    const session = opts.getSession();
    const walletEntry = findWalletEntryByProfileId(opts.profileId);
    const state = custodyMigrationPanelState({
      walletEntry,
      session,
      webAuthnAvailable: isDeviceUnlockWebAuthnAvailable(),
    });

    if (details) details.hidden = !state.showPanel;
    if (!state.showPanel) {
      setStatus("");
      return;
    }

    const isDeviceUnlock = state.custodyMode === CUSTODY_MODE_DEVICE_UNLOCK;
    if (summarySub) {
      summarySub.textContent = isDeviceUnlock
        ? CUSTODY_MIGRATE_SUMMARY_DEVICE_UNLOCK
        : CUSTODY_MIGRATE_SUMMARY_FULL_KEYS;
    }
    if (currentEl) {
      currentEl.textContent = isDeviceUnlock
        ? CUSTODY_MIGRATE_MODE_DEVICE_UNLOCK
        : CUSTODY_MIGRATE_MODE_FULL_KEYS;
    }
    if (toFullBlock) toFullBlock.hidden = !state.canMigrateToFullKeys;
    if (toDeviceBlock) toDeviceBlock.hidden = !state.canMigrateToDeviceUnlock;
    if (reenrollBlock) reenrollBlock.hidden = !state.showReenrollDeviceUnlock;
    if (fullBtn) fullBtn.disabled = !state.canMigrateToFullKeys;
    if (deviceBtn) deviceBtn.disabled = !state.canMigrateToDeviceUnlock;
    if (reenrollBtn) reenrollBtn.disabled = !state.canReenrollDeviceUnlock;
    if (fullAck instanceof HTMLInputElement) {
      fullAck.checked = state.hasRecoverySeatbelt;
      fullAck.disabled = state.hasRecoverySeatbelt;
    }
    if (blockedHint) {
      const showBlocked =
        state.showPanel &&
        !state.canMigrateToFullKeys &&
        !state.canMigrateToDeviceUnlock &&
        !state.canReenrollDeviceUnlock &&
        (state.blockedReason || state.reenrollBlockedReason);
      blockedHint.hidden = !showBlocked;
      if (showBlocked) {
        blockedHint.textContent =
          state.reenrollBlockedReason === "need_owner_backup"
            ? CUSTODY_REENROLL_NEED_BACKUP_HINT
            : CUSTODY_MIGRATE_UNLOCK_FIRST_HINT;
      }
    }
  }

  fullBtn?.addEventListener("click", async () => {
    setStatus("Switching to full control keys…");
    const session = opts.getSession();
    if (!session) {
      setStatus("Ownership not loaded in this tab.", true);
      return;
    }
    const result = await migrateSavedCardToFullKeys(opts.profileId, session, {
      recoveryAcknowledged: fullAck instanceof HTMLInputElement && fullAck.checked,
    });
    if (!result.ok) {
      setStatus(result.error || "Could not switch custody mode.", true);
      return;
    }
    opts.setSession({ ...session, custody_mode: "full_keys" });
    setStatus("Switched to full control keys on this device.");
    refresh();
    window.dispatchEvent(new Event("hc-device-hub-changed"));
  });

  deviceBtn?.addEventListener("click", async () => {
    setStatus("Enrolling passkey…");
    const session = opts.getSession();
    if (!session) {
      setStatus("Ownership not loaded in this tab.", true);
      return;
    }
    const result = await migrateSavedCardToDeviceUnlock(
      session,
      defaultWalletLabel(session)
    );
    if (!result.ok) {
      setStatus(result.error || "Could not switch custody mode.", true);
      return;
    }
    opts.setSession({ ...session, custody_mode: "device_unlock" });
    setStatus("Switched to This device — Face ID / Touch ID unlock.");
    refresh();
    window.dispatchEvent(new Event("hc-device-hub-changed"));
  });

  reenrollBtn?.addEventListener("click", async () => {
    setStatus("Enrolling passkey on this device…");
    const session = opts.getSession();
    if (!session) {
      setStatus("Ownership not loaded in this tab.", true);
      return;
    }
    const result = await reEnrollDeviceUnlockForProfile(
      opts.profileId,
      session,
      defaultWalletLabel(session)
    );
    if (!result.ok) {
      setStatus(result.error || "Could not set up Face ID on this device.", true);
      return;
    }
    opts.setSession({ ...session, custody_mode: "device_unlock" });
    setStatus("Face ID / Touch ID set up on this device.");
    refresh();
    window.dispatchEvent(new Event("hc-device-hub-changed"));
  });

  refresh();
  return { refresh };
}
