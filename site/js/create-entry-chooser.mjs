/**
 * Create page steward chooser UI (account + deploy + wear carrier).
 */

import {
  CREATE_ENTRY_DOORS,
  createEntryDoorById,
} from "./create-entry-chooser-core.mjs";

/**
 * @param {"chooser" | "form" | "gate"} mode
 */
export function applyCreateEntryView(mode) {
  const chooserEl = document.getElementById("create-entry-chooser");
  const panelEl = document.getElementById("create-form-panel");
  const gateEl = document.getElementById("create-entry-gate");
  if (chooserEl) chooserEl.hidden = mode !== "chooser";
  if (panelEl) panelEl.hidden = mode === "chooser";
  if (gateEl) gateEl.hidden = mode !== "gate";
}

export function showCreateFormPanel() {
  applyCreateEntryView("form");
  const gateEl = document.getElementById("create-entry-gate");
  if (gateEl) gateEl.hidden = true;
}

export function showCreateEntryChooserPanel() {
  applyCreateEntryView("chooser");
}

/**
 * @param {{ onDeploySomething?: () => void; onOpenGeneralAccount?: () => void }} handlers
 */
export function initCreateEntryChooser(handlers = {}) {
  const listEl = document.getElementById("create-entry-chooser-list");
  if (!listEl) return;

  listEl.replaceChildren();
  for (const door of CREATE_ENTRY_DOORS) {
    const li = document.createElement("li");
    li.className = "list-row list-action";

    if (door.href) {
      const a = document.createElement("a");
      a.href = door.href;
      a.className = "create-entry-door-link";
      a.innerHTML = createEntryDoorInnerHtml(door);
      li.appendChild(a);
    } else {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "create-entry-door-btn";
      btn.dataset.createDoor = door.id;
      btn.innerHTML = createEntryDoorInnerHtml(door);
      btn.addEventListener("click", () => {
        if (door.id === "account") {
          handlers.onOpenGeneralAccount?.();
        } else if (door.id === "something") {
          handlers.onDeploySomething?.();
        }
      });
      li.appendChild(btn);
    }

    listEl.appendChild(li);
  }

  document.getElementById("create-entry-back")?.addEventListener("click", (ev) => {
    ev.preventDefault();
    const url = new URL(location.href);
    url.searchParams.delete("intent");
    url.searchParams.delete("template");
    history.replaceState(null, "", url.pathname);
    showCreateEntryChooserPanel();
  });
}

/**
 * @param {{ title: string; sub: string; id: string }} door
 */
function createEntryDoorInnerHtml(door) {
  const icon = doorIconMarkup(door.id);
  return `${icon}
    <span class="list-content">
      <span class="list-title">${door.title}</span>
      <span class="list-sub">${door.sub}</span>
    </span>
    <span class="list-chevron" aria-hidden="true">›</span>`;
}

/**
 * @param {string} doorId
 */
function doorIconMarkup(doorId) {
  if (doorId === "account") {
    return `<span class="list-icon list-icon-tone-blue" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    </span>`;
  }
  if (doorId === "something") {
    return `<span class="list-icon list-icon-tone-green" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
    </span>`;
  }
  if (doorId === "wear") {
    return `<span class="list-icon list-icon-tone-red" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/></svg>
    </span>`;
  }
  return `<span class="list-icon list-icon-tone-gold" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
  </span>`;
}

export { createEntryDoorById };
