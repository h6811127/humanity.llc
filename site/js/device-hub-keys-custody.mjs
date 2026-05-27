/**
 * Unified Keys custody panel in the device hub.
 * @see docs/KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md Phases 1 + 4
 */
import {
  buildHubKeysCustodyPanel,
  hubKeysCustodyPanelEnabledInDom,
} from "./device-hub-keys-custody-core.mjs";
import { gatherInboxInput } from "./device-inbox.mjs";
import { getTabSession, openCardNowPage } from "./device-keys.mjs";
import { loadWallet } from "./device-wallet.mjs";
import { isKeysCustodyNoticeDismissed, dismissKeysCustodyNotice } from "./device-keys-custody-core.mjs";
import { keysCustodyHtml } from "./device-keys-custody.mjs";
import { actOnOtherTabKeys, openSaveKeysForThisTab, walletEntryForProfile } from "./device-notice-nav.mjs";
import {
  actOnOrphanRemovedTabKeys,
  clearOrphanKeysOnDevice,
} from "./device-orphan-keys-nav.mjs";
import {
  getDefaultVouchProfileId,
  isVouchAutoActivateEnabled,
  setDefaultVouchProfile,
} from "./vouch-ready-keys.mjs";
import { getSignLock } from "./vouch-sign-lock.mjs";

export { hubKeysCustodyPanelEnabledInDom as hasUnifiedHubKeysCustodyPanel };

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function walletEntryLabel(entry) {
  if (entry?.label) return entry.label;
  if (entry?.handle) return `@${entry.handle}`;
  if (entry?.profile_id) return `${String(entry.profile_id).slice(0, 12)}…`;
  return "Saved card";
}

function gatherProactiveCustodyInput(session) {
  const defaultId = getDefaultVouchProfileId();
  const wallet = loadWallet();
  const defaultEntry = defaultId
    ? wallet.find((entry) => entry.profile_id === defaultId)
    : null;
  const activeProfileId = session?.profile_id ?? null;
  const signLock = activeProfileId ? getSignLock(activeProfileId) : null;
  const walletEntriesWithKeys = wallet.filter((entry) => entry.owner_private_key_b58).length;

  return {
    defaultVouchProfileId: defaultId,
    defaultVouchLabel: defaultEntry ? walletEntryLabel(defaultEntry) : null,
    vouchAutoActivate: isVouchAutoActivateEnabled(),
    signLockMode: signLock?.mode ?? null,
    signLockLabel:
      activeProfileId && signLock
        ? session?.handle
          ? `@${session.handle}`
          : session?.wallet_label || `${String(activeProfileId).slice(0, 12)}…`
        : null,
    walletEntriesWithKeys,
  };
}

function scrollHubToSavedCards() {
  document.getElementById("device-hub-saved-group")?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });
}

function walletEntryForVouchHere(primaryProfileId) {
  const defaultId = getDefaultVouchProfileId();
  if (defaultId) {
    const preferred = walletEntryForProfile(defaultId);
    if (preferred?.owner_private_key_b58) return preferred;
  }
  return walletEntryForProfile(primaryProfileId);
}

function rowIconTone(row) {
  if (row.kind === "this_tab_unsaved" || row.kind === "orphan" || row.kind === "sign_lock") {
    return "amber";
  }
  if (row.kind === "this_tab_active" || row.kind === "vouch_default") return "green";
  if (row.kind === "cross_tab_summary") return "blue";
  return "blue";
}

function rowActionsHtml(row) {
  if (row.kind === "this_tab_unsaved") {
    return `<button type="button" class="device-hub-keys-custody-action" data-hub-custody-save>Save on this device</button>`;
  }
  if (row.kind === "sign_lock") {
    return `<button type="button" class="device-hub-keys-custody-action" data-hub-custody-open-card>Open card</button>`;
  }
  if (row.kind === "vouch_default") {
    return `
      <button type="button" class="device-hub-keys-custody-action device-hub-keys-custody-action--secondary" data-hub-custody-clear-default>Clear default</button>
      <button type="button" class="device-hub-keys-custody-action" data-hub-custody-saved-cards>Saved cards</button>`;
  }
  if (row.kind === "vouch_nudge") {
    return `<button type="button" class="device-hub-keys-custody-action" data-hub-custody-saved-cards>Choose on saved cards</button>`;
  }
  if (row.kind === "cross_tab" && row.entry) {
    const parts = [`<button type="button" class="device-hub-keys-custody-action" data-hub-custody-focus>Open tab</button>`];
    const walletEntry = walletEntryForVouchHere(row.entry.profile_id);
    if (walletEntry?.owner_private_key_b58) {
      parts.push(
        `<button type="button" class="device-hub-keys-custody-action device-hub-keys-custody-action--secondary" data-hub-custody-use-here>Open controls here</button>`
      );
    }
    return parts.join("");
  }
  if (row.kind === "orphan" && row.entry) {
    return `
      <button type="button" class="device-hub-keys-custody-action" data-hub-custody-orphan-focus>Open tab</button>
      <button type="button" class="device-hub-keys-custody-action device-hub-keys-custody-action--secondary" data-hub-custody-orphan-clear>Clear keys on this device</button>`;
  }
  return "";
}

function renderPanelHtml(state) {
  const rowItems = state.rows
    .map((row, index) => {
      const tone = rowIconTone(row);
      const actions = rowActionsHtml(row);
      const searchable = `${row.title} ${row.subtitle}`.toLowerCase();
      return `
        <li class="list-row device-hub-keys-custody-row device-hub-keys-custody-row--${row.kind}" data-hub-custody-row="${index}" data-hub-searchable="${escapeHtml(searchable)}">
          <div class="device-hub-keys-custody-row-inner">
            <span class="list-icon list-icon-tone-${tone}" aria-hidden="true">
              <span class="device-hub-keys-custody-dot"></span>
            </span>
            <span class="list-content">
              <span class="list-title">${escapeHtml(row.title)}</span>
              <span class="list-sub">${escapeHtml(row.subtitle)}</span>
            </span>
            ${actions ? `<span class="device-hub-keys-custody-actions">${actions}</span>` : ""}
          </div>
        </li>`;
    })
    .join("");

  const education = state.showEducation
    ? `<div class="device-hub-keys-custody-education" data-hub-searchable="keys custody private key browser">${keysCustodyHtml("hub")}</div>`
    : "";

  return `
    <p class="device-hub-group-label" id="device-hub-keys-custody-title">Keys custody</p>
    ${rowItems ? `<ul class="list list-compact device-hub-keys-custody-list">${rowItems}</ul>` : ""}
    ${education}`;
}

function bindPanelActions(panel, state) {
  for (const li of panel.querySelectorAll(".device-hub-keys-custody-row")) {
    const index = Number(li.getAttribute("data-hub-custody-row"));
    const row = state.rows[index];
    if (!row) continue;

    li.querySelector("[data-hub-custody-save]")?.addEventListener("click", (e) => {
      e.preventDefault();
      openSaveKeysForThisTab();
    });

    li.querySelector("[data-hub-custody-focus]")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (row.entry && !actOnOtherTabKeys(row.entry)) {
        renderHubKeysCustodyPanel();
      }
    });

    li.querySelector("[data-hub-custody-use-here]")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!row.entry) return;
      const walletEntry = walletEntryForVouchHere(row.entry.profile_id);
      if (!walletEntry?.owner_private_key_b58) return;
      window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
      openCardNowPage(walletEntry);
    });

    li.querySelector("[data-hub-custody-orphan-focus]")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (row.entry) actOnOrphanRemovedTabKeys(row.entry);
    });

    li.querySelector("[data-hub-custody-orphan-clear]")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (row.entry && clearOrphanKeysOnDevice(row.entry)) {
        renderHubKeysCustodyPanel();
      }
    });

    li.querySelector("[data-hub-custody-open-card]")?.addEventListener("click", (e) => {
      e.preventDefault();
      const session = getTabSession();
      const walletEntry = session?.profile_id
        ? walletEntryForProfile(session.profile_id)
        : null;
      if (!walletEntry?.owner_private_key_b58) return;
      window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
      openCardNowPage(walletEntry);
    });

    li.querySelector("[data-hub-custody-clear-default]")?.addEventListener("click", (e) => {
      e.preventDefault();
      setDefaultVouchProfile(null);
      renderHubKeysCustodyPanel();
    });

    li.querySelector("[data-hub-custody-saved-cards]")?.addEventListener("click", (e) => {
      e.preventDefault();
      scrollHubToSavedCards();
    });
  }

  panel.querySelector("[data-keys-custody-ack]")?.addEventListener("click", (e) => {
    e.preventDefault();
    dismissKeysCustodyNotice();
    renderHubKeysCustodyPanel();
  });
}

export function renderHubKeysCustodyPanel() {
  const panel = document.getElementById("device-hub-keys-custody");
  if (!panel) return false;

  const inbox = gatherInboxInput();
  const session = getTabSession();
  const state = buildHubKeysCustodyPanel({
    tabNoticeCount: inbox.tabNoticeCount,
    crossTabEntries: inbox.crossTabEntries,
    orphanRemovedEntries: inbox.orphanRemovedEntries,
    tabSessionLabel: inbox.tabSessionLabel,
    hasActiveKeys: Boolean(session?.owner_private_key_b58),
    educationDismissed: isKeysCustodyNoticeDismissed(),
    ...gatherProactiveCustodyInput(session),
  });

  if (!state.visible) {
    panel.hidden = true;
    panel.innerHTML = "";
    panel.classList.remove("device-hub-section");
    return true;
  }

  panel.hidden = false;
  panel.className = "device-hub-section device-hub-keys-custody-section";
  panel.setAttribute("aria-labelledby", "device-hub-keys-custody-title");
  panel.innerHTML = renderPanelHtml(state);
  bindPanelActions(panel, state);
  return true;
}

if (typeof document !== "undefined" && document.getElementById("device-hub-keys-custody")) {
  renderHubKeysCustodyPanel();
  window.addEventListener("hc-vouch-ready-changed", () => renderHubKeysCustodyPanel());
  window.addEventListener("hc-vouch-sign-lock-changed", () => renderHubKeysCustodyPanel());
  window.addEventListener("hc-device-hub-changed", () => renderHubKeysCustodyPanel());
}
