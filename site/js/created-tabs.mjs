/**
 * Segmented tabs for /created/ (Tasks · Advanced).
 */

const TAB_IDS = ["now", "advanced"];

/** Hash → panel id on /created/ (hub deep-links). */
const CREATED_PANEL_FOCUS = {
  "update-status": "manifesto-update-panel",
  revoke: "revoke-details",
  "rotate-qr": "qr-rotate-panel",
  "extend-qr": "qr-extend-panel",
  "live-proof": "live-control-proof",
  manage: "manifesto-update-panel",
};

/**
 * @param {(tabId: string) => void} select
 * @param {string} focusKey
 */
function focusCreatedPanel(select, focusKey) {
  const panelId = CREATED_PANEL_FOCUS[focusKey] || focusKey;
  if (panelId === "live-control-proof") {
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
