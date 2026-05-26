/**
 * Segmented tabs for /created/ (Tasks · Advanced).
 */

const TAB_IDS = ["now", "manage"];

/**
 * @returns {{ select: (tabId: string) => void }}
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
    select("manage");
    requestAnimationFrame(() => {
      document.getElementById("revoke-rules")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  } else {
    select(TAB_IDS.includes(hash) ? hash : "now");
  }

  return { select };
}
