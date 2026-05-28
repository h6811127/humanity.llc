/**
 * Segmented tabs for /created/ (Live · Manage; ids remain now/advanced).
 */

import {
  childObjectHubFocusHash,
  childObjectIdFromHubFocusHash,
} from "./hub-child-object-row-core.mjs";

const TAB_IDS = ["now", "advanced"];

/** Hash → panel id on /created/ (hub deep-links). */
export const CREATED_PANEL_FOCUS = {
  "update-status": "created-live-scanners-see",
  revoke: "revoke-details",
  "rotate-qr": "qr-rotate-panel",
  "extend-qr": "qr-extend-panel",
  "live-proof": "live-control-proof",
  manage: "created-live-scanners-see",
  /** Landing Continue (Phase 2) when setup is done but card not pinned. */
  "deploy-print": "created-deploy-print",
};

/** @param {string} [hash] location.hash or bare key */
export function stewardFocusKeyFromHash(hash = location.hash) {
  const key = hash.replace(/^#/, "");
  return Object.prototype.hasOwnProperty.call(CREATED_PANEL_FOCUS, key)
    ? key
    : null;
}

/**
 * @param {(tabId: string) => void} select
 * @param {string} focusKey
 */
function focusCreatedPanel(select, focusKey) {
  const panelId = CREATED_PANEL_FOCUS[focusKey] || focusKey;
  if (panelId === "live-control-proof" || panelId === "created-live-scanners-see") {
    select("now");
  } else if (CREATED_PANEL_FOCUS[focusKey] || document.getElementById(panelId)) {
    select("advanced");
  } else {
    return;
  }
  requestAnimationFrame(() => {
    const el = document.getElementById(panelId);
    if (!el) return;
    if (el.tagName === "DETAILS") {
      el.removeAttribute("hidden");
      el.setAttribute("open", "");
    }
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

/**
 * @param {(tabId: string) => void} select
 * @param {string} objectId
 */
function focusChildObjectRow(select, objectId) {
  if (!objectId) return;
  select("now");
  history.replaceState(
    null,
    "",
    `${location.pathname}${location.search}#${childObjectHubFocusHash(objectId)}`
  );
  requestAnimationFrame(() => {
    const row = document.querySelector(`[data-object-id="${CSS.escape(objectId)}"]`);
    if (!row) return;
    if (row.tagName === "DETAILS") {
      row.removeAttribute("hidden");
      row.setAttribute("open", "");
    }
    row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

/**
 * @returns {{ select: (tabId: string) => void, focusPanel: (focusKey: string) => void }}
 */
export function initCreatedTabs() {
  const tablist = document.querySelector(".created-tabs");
  const tabs = tablist
    ? [...tablist.querySelectorAll("[data-created-tab]")]
    : [];
  const panels = [...document.querySelectorAll("[data-created-panel]")];

  function select(tabId) {
    if (!TAB_IDS.includes(tabId)) tabId = "now";
    tabs.forEach((btn) => {
      const on = btn.dataset.createdTab === tabId;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.createdPanel !== tabId;
    });
    const url = new URL(location.href);
    if (tabId === "now") {
      url.hash = "";
    } else {
      url.hash = tabId;
    }
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.createdTab) select(btn.dataset.createdTab);
    });
  });

  const hash = location.hash.replace(/^#/, "");
  if (hash === "revoke-rules") {
    select("advanced");
    requestAnimationFrame(() => {
      document.getElementById("revoke-rules")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  } else if (hash && CREATED_PANEL_FOCUS[hash]) {
    focusCreatedPanel(select, hash);
  } else if (childObjectIdFromHubFocusHash(hash)) {
    focusChildObjectRow(select, childObjectIdFromHubFocusHash(hash));
  } else {
    // Keep old #manage links working.
    const normalized = hash === "manage" ? "advanced" : hash;
    select(TAB_IDS.includes(normalized) ? normalized : "now");
  }

  return {
    select,
    focusPanel: (focusKey) => focusCreatedPanel(select, focusKey),
  };
}
