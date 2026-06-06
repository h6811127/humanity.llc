/**
 * /created/ Live tab Attached QRs collection (Phase 1.5 + Phase 2A manage panel).
 * @see docs/CREATED_TAGS_COLLECTION_PHASE1.md
 */

import { buildCreatedTagsCollectionRowElement } from "./hub-child-object-row-render.mjs";
import { stewardPresentationExtras } from "./steward-active-room-core.mjs";
import {
  CREATED_TAGS_COLLECTION_SYNC_EVENT,
  CREATED_TAGS_COLLECTION_ADD_LABEL,
  CREATED_TAGS_COLLECTION_EMPTY_LABEL,
  createdTagsCollectionCountLabel,
  createdTagsCollectionLeadLabel,
  listCreatedTagsCollectionRows,
  shouldMountCreatedTagsCollection,
} from "./created-tags-collection-core.mjs";
import { shouldShowChildObjectAddHubForRoot } from "./steward-child-object-list-policy-core.mjs";
import {
  isCreatedTagsCollectionFlagEnabled,
  syncCreatedTagsCollectionFlagDataset,
} from "./created-tags-collection-flag-core.mjs";
import { initCreatedTagsManagePanel } from "./created-tags-manage-panel.mjs";

/**
 * @param {{
 *   profileId: string;
 *   getSession: () => Record<string, unknown> | null;
 *   showError?: (msg: string) => void;
 * }} ctx
 */
export function initCreatedTagsCollection(ctx) {
  const section = document.getElementById("created-tags-collection");
  const countEl = document.getElementById("created-tags-count");
  const leadEl = document.getElementById("created-tags-lead");
  const listEl = document.getElementById("created-tags-list");
  const emptyEl = document.getElementById("created-tags-empty");
  const addBtn = document.getElementById("created-tags-add-btn");
  if (!section) return null;

  const managePanel = initCreatedTagsManagePanel({ showError: ctx.showError });

  function flagEnabled() {
    const enabled = isCreatedTagsCollectionFlagEnabled(
      new URLSearchParams(location.search),
      localStorage
    );
    syncCreatedTagsCollectionFlagDataset(document, enabled);
    return enabled;
  }

  function openAddHub() {
    const hub = document.getElementById("child-object-add-hub");
    if (hub instanceof HTMLDetailsElement) {
      hub.hidden = false;
      hub.open = true;
    } else if (hub instanceof HTMLElement) {
      hub.hidden = false;
    }
    hub?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /**
   * @param {string} objectId
   * @param {string | null | undefined} handle
   */
  function openManagePanel(objectId, handle) {
    const row = listCreatedTagsCollectionRows(localStorage, ctx.profileId).find(
      (entry) => entry.object_id === objectId
    );
    if (!row || !managePanel) return;
    managePanel.open(row, handle);
  }

  function sync() {
    flagEnabled();
    const session = ctx.getSession();
    const extras = stewardPresentationExtras(ctx.profileId);
    const show = shouldMountCreatedTagsCollection(
      new URLSearchParams(location.search),
      localStorage,
      session,
      ctx.profileId,
      extras
    );
    section.hidden = !show;
    if (!show) {
      managePanel?.close();
      return;
    }

    const rows = listCreatedTagsCollectionRows(localStorage, ctx.profileId);
    const handle = typeof session?.handle === "string" ? session.handle : null;
    if (countEl) countEl.textContent = createdTagsCollectionCountLabel(rows.length);
    if (leadEl) leadEl.textContent = createdTagsCollectionLeadLabel(handle);
    if (emptyEl) emptyEl.textContent = CREATED_TAGS_COLLECTION_EMPTY_LABEL;
    if (addBtn) addBtn.textContent = CREATED_TAGS_COLLECTION_ADD_LABEL;

    if (listEl) {
      listEl.replaceChildren(
        ...rows.map((row) =>
          buildCreatedTagsCollectionRowElement(row, {
            rootHandle: handle,
            interactive: true,
          })
        )
      );
      listEl.hidden = rows.length === 0;
    }
    if (emptyEl) emptyEl.hidden = rows.length > 0;

    const showAdd = shouldShowChildObjectAddHubForRoot(
      session,
      ctx.profileId,
      localStorage,
      extras
    );
    if (addBtn) addBtn.hidden = !showAdd;
  }

  addBtn?.addEventListener("click", openAddHub);
  listEl?.addEventListener("click", (event) => {
    if (!flagEnabled()) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const row = target.closest(".created-tags-collection-row--interactive");
    if (!(row instanceof HTMLElement)) return;
    const objectId = row.dataset.objectId?.trim();
    if (!objectId) return;
    const session = ctx.getSession();
    const handle = typeof session?.handle === "string" ? session.handle : null;
    openManagePanel(objectId, handle);
  });
  listEl?.addEventListener("keydown", (event) => {
    if (!flagEnabled()) return;
    if (!(event.target instanceof HTMLElement)) return;
    if (!event.target.classList.contains("created-tags-collection-row--interactive")) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const objectId = event.target.dataset.objectId?.trim();
    if (!objectId) return;
    const session = ctx.getSession();
    const handle = typeof session?.handle === "string" ? session.handle : null;
    openManagePanel(objectId, handle);
  });
  window.addEventListener(CREATED_TAGS_COLLECTION_SYNC_EVENT, sync);
  sync();

  return { sync, refresh: sync };
}
