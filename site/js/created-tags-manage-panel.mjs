/**
 * Lightweight manage panel for Attached QRs rows (Phase 2A).
 * @see docs/CREATED_TAGS_COLLECTION_PHASE1.md
 */

import { applyStewardScanLinkElement } from "./pwa-scan-handoff-core.mjs";
import {
  buildStewardScanPreviewHrefFromWindow,
  openStewardScanPreviewFromWindow,
} from "./pwa-scan-handoff.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";
import {
  CREATED_TAGS_MANAGE_ADVANCED_CUE,
  CREATED_TAGS_MANAGE_OPEN_SCAN_LABEL,
  CREATED_TAGS_MANAGE_PANEL_TITLE,
  CREATED_TAGS_MANAGE_UPDATE_STATUS_LABEL,
  createdTagsManageInlineEditorTarget,
  createdTagsManagePanelPresentation,
} from "./created-tags-manage-panel-core.mjs";

/**
 * @param {{ showError?: (msg: string) => void }} [ctx]
 */
export function initCreatedTagsManagePanel(ctx = {}) {
  const root = document.getElementById("created-tags-manage-root");
  const backdrop = document.getElementById("created-tags-manage-backdrop");
  const panel = document.getElementById("created-tags-manage-panel");
  const closeBtn = document.getElementById("created-tags-manage-close");
  const titleEl = document.getElementById("created-tags-manage-title");
  const subtitleEl = document.getElementById("created-tags-manage-subtitle");
  const nameEl = document.getElementById("created-tags-manage-name");
  const statusEl = document.getElementById("created-tags-manage-status");
  const openScanEl = document.getElementById("created-tags-manage-open-scan");
  const updateStatusBtn = document.getElementById("created-tags-manage-update-status");
  const advancedEl = document.getElementById("created-tags-manage-advanced");

  if (!root || !panel) return null;

  /** @type {Record<string, unknown> | null} */
  let activeRow = null;

  function isOpen() {
    return !root.hidden;
  }

  function setOpen(open) {
    root.hidden = !open;
    panel.hidden = !open;
    if (backdrop instanceof HTMLElement) backdrop.hidden = !open;
    document.body.classList.toggle("created-tags-manage-open", open);
    if (open) {
      root.removeAttribute("inert");
      closeBtn?.focus();
    } else {
      root.setAttribute("inert", "");
      activeRow = null;
    }
  }

  function close() {
    if (!isOpen()) return;
    setOpen(false);
  }

  /**
   * @param {Record<string, unknown>} row
   * @param {string | null | undefined} handle
   */
  function open(row, handle) {
    activeRow = row;
    const presentation = createdTagsManagePanelPresentation(row, handle);

    if (titleEl) titleEl.textContent = CREATED_TAGS_MANAGE_PANEL_TITLE;
    if (subtitleEl) subtitleEl.textContent = presentation.subtitle;
    if (nameEl) nameEl.textContent = presentation.name;
    if (statusEl) {
      statusEl.textContent = presentation.statusLabel;
      statusEl.dataset.tone = presentation.statusTone;
    }
    if (advancedEl) advancedEl.textContent = CREATED_TAGS_MANAGE_ADVANCED_CUE;

    if (openScanEl instanceof HTMLAnchorElement) {
      openScanEl.hidden = !presentation.canOpenScan;
      openScanEl.textContent = CREATED_TAGS_MANAGE_OPEN_SCAN_LABEL;
      if (presentation.canOpenScan) {
        openScanEl.href = buildStewardScanPreviewHrefFromWindow(presentation.scanUrl);
        applyStewardScanLinkElement(openScanEl, readStandaloneModeFromWindow(window));
      }
    }

    if (updateStatusBtn instanceof HTMLButtonElement) {
      updateStatusBtn.hidden = !presentation.canUpdateStatus;
      updateStatusBtn.textContent = CREATED_TAGS_MANAGE_UPDATE_STATUS_LABEL;
    }

    setOpen(true);
  }

  function scrollToInlineEditor() {
    if (!activeRow) return;
    const objectId = typeof activeRow.object_id === "string" ? activeRow.object_id : "";
    const target = createdTagsManageInlineEditorTarget(activeRow.object_type);
    if (!target?.canFocusUpdate || !objectId) return;

    const hub = document.getElementById("child-object-add-hub");
    if (hub instanceof HTMLDetailsElement) {
      hub.hidden = false;
      hub.open = true;
    } else if (hub instanceof HTMLElement) {
      hub.hidden = false;
    }

    const section = document.getElementById(target.sectionId);
    if (section instanceof HTMLElement) section.hidden = false;

    const list = document.getElementById(target.listId);
    const rowEl = list?.querySelector(
      `${target.rowSelector}[data-object-id="${CSS.escape(objectId)}"]`
    );
    rowEl?.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const input =
      rowEl?.querySelector(target.inputSelector ?? "") ??
      rowEl?.querySelector("input[name=public_state]");
    if (input instanceof HTMLElement) {
      input.focus({ preventScroll: true });
    }

    close();
  }

  backdrop?.addEventListener("click", close);
  closeBtn?.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      event.preventDefault();
      close();
    }
  });

  openScanEl?.addEventListener("click", (event) => {
    const href = openScanEl instanceof HTMLAnchorElement ? openScanEl.href : "";
    if (!href) return;
    event.preventDefault();
    if (!openStewardScanPreviewFromWindow(href, { setupWizard: false })) {
      window.open(href, readStandaloneModeFromWindow(window) ? "_self" : "_blank", "noopener,noreferrer");
    }
  });

  updateStatusBtn?.addEventListener("click", scrollToInlineEditor);

  return { open, close, isOpen };
}
