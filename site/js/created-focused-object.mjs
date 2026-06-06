/**
 * /created/ Focused Object front (PR 1 commit 3).
 */

import { updateChildObjectRow } from "./child-object-store-core.mjs";
import { preserveChildDocumentFields } from "./child-object-time-policy-core.mjs";
import {
  postChildObjectUpdate,
  signChildObjectUpdate,
} from "./child-object-update.mjs";
import { postCardUpdate, signCardUpdate } from "./created-update.mjs";
import { getCardJsonUrl } from "./hc-sign.mjs";
import { isCreatedCollectionFlagEnabled } from "./created-collection-flag-core.mjs";
import {
  createdCollectionHomeUrl,
  resolveCreatedPagePresentation,
} from "./created-collection-landing-core.mjs";
import { CREATED_VIEW_FOCUSED_OBJECT } from "./created-collection-route-core.mjs";
import {
  FOCUSED_OBJECT_BACK_LABEL,
  FOCUSED_OBJECT_COPY_SCAN_LABEL,
  FOCUSED_OBJECT_OPEN_SCAN_LABEL,
  FOCUSED_OBJECT_PUBLISH_LABEL,
  FOCUSED_OBJECT_STALE_MESSAGE,
  focusedObjectFieldsForRow,
  focusedObjectPublishPayload,
  focusedObjectRootFields,
  focusedObjectScanUrl,
  resolveFocusedObjectTarget,
} from "./created-focused-object-core.mjs";
import { writeCreatedFocusObjectId } from "./created-collection-route-core.mjs";
import { applyStewardScanLinkElement } from "./pwa-scan-handoff-core.mjs";
import { buildStewardScanPreviewHrefFromWindow, openStewardScanPreviewFromWindow } from "./pwa-scan-handoff.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";
import { getBoundStewardActiveRoom } from "./steward-active-room-core.mjs";

/**
 * @param {{
 *   profileId: string;
 *   getSession: () => Record<string, unknown> | null;
 *   setSession: (next: Record<string, unknown>) => void;
 *   getSigningKeys: () => { privateKeyBase58: string; publicKeyBase58: string } | null;
 *   showError: (msg: string) => void;
 *   isViewOnly?: () => boolean;
 *   onPublished?: () => void;
 * }} ctx
 */
export function initCreatedFocusedObject(ctx) {
  const root = document.getElementById("created-focused-object-root");
  const staleRoot = document.getElementById("created-focused-object-stale");
  const staleBackBtn = document.getElementById("created-focused-object-stale-back");
  const contentRoot = document.getElementById("created-focused-object-content");
  const backBtn = document.getElementById("created-focused-object-back");
  const typeBadgeEl = document.getElementById("created-focused-object-type-badge");
  const roomBadgeEl = document.getElementById("created-focused-object-room-badge");
  const titleEl = document.getElementById("created-focused-object-title");
  const statusEl = document.getElementById("created-focused-object-status");
  const recencyEl = document.getElementById("created-focused-object-recency");
  const fieldsEl = document.getElementById("created-focused-object-fields");
  const readOnlyNoteEl = document.getElementById("created-focused-object-readonly-note");
  const formEl = document.getElementById("created-focused-object-form");
  const publishBtn = document.getElementById("created-focused-object-publish");
  const publishStatusEl = document.getElementById("created-focused-object-publish-status");
  const openScanEl = document.getElementById("created-focused-object-open-scan");
  const copyScanBtn = document.getElementById("created-focused-object-copy-scan");
  const liveCockpit = document.querySelector(".created-live-cockpit");

  if (!root) return null;

  /** @type {{ mode: "child" | "root"; row?: Record<string, unknown>; pilot?: string } | null} */
  let activeTarget = null;

  function flagEnabled() {
    return isCreatedCollectionFlagEnabled(
      new URLSearchParams(location.search),
      localStorage
    );
  }

  function viewOnly() {
    return ctx.isViewOnly?.() === true || document.body.dataset.createdMode === "view";
  }

  function navigateToCollection() {
    const url = createdCollectionHomeUrl(
      ctx.profileId,
      new URLSearchParams(location.search)
    );
    location.assign(url);
  }

  function readFormValues() {
    /** @type {Record<string, string>} */
    const values = {};
    if (!fieldsEl) return values;
    for (const input of fieldsEl.querySelectorAll("[data-focused-field]")) {
      if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
        continue;
      }
      const name = input.dataset.focusedField;
      if (name) values[name] = input.value;
    }
    return values;
  }

  function renderFields(fields, readonly) {
    if (!fieldsEl) return;
    fieldsEl.replaceChildren();
    for (const field of fields) {
      const wrap = document.createElement("div");
      wrap.className = "created-focused-object-field";
      const label = document.createElement("label");
      label.className = "form-label";
      label.textContent = field.label;
      label.htmlFor = `created-focused-field-${field.name}`;
      wrap.append(label);
      let input;
      if (field.multiline) {
        input = document.createElement("textarea");
        input.className = "form-input";
        input.rows = 3;
      } else {
        input = document.createElement("input");
        input.className = "form-input";
        input.type = "text";
      }
      input.id = `created-focused-field-${field.name}`;
      input.dataset.focusedField = field.name;
      input.value = field.value;
      input.readOnly = readonly || field.readonly === true;
      input.disabled = readonly || field.readonly === true;
      wrap.append(input);
      fieldsEl.append(wrap);
    }
  }

  function syncScanActions(scanUrl, readonly) {
    const hasScan = typeof scanUrl === "string" && scanUrl.startsWith("http");
    if (openScanEl instanceof HTMLAnchorElement) {
      openScanEl.hidden = !hasScan;
      openScanEl.textContent = FOCUSED_OBJECT_OPEN_SCAN_LABEL;
      if (hasScan) {
        openScanEl.href = buildStewardScanPreviewHrefFromWindow(scanUrl);
        applyStewardScanLinkElement(openScanEl, readStandaloneModeFromWindow(window));
      }
    }
    if (copyScanBtn instanceof HTMLButtonElement) {
      copyScanBtn.hidden = !hasScan;
      copyScanBtn.textContent = FOCUSED_OBJECT_COPY_SCAN_LABEL;
      copyScanBtn.disabled = !hasScan;
      copyScanBtn.dataset.scanUrl = hasScan ? scanUrl : "";
    }
    if (publishBtn instanceof HTMLButtonElement) {
      publishBtn.hidden = readonly;
      publishBtn.disabled = readonly;
      publishBtn.textContent = FOCUSED_OBJECT_PUBLISH_LABEL;
    }
    if (formEl) formEl.hidden = readonly;
  }

  function sync() {
    const enabled = flagEnabled();
    const session = ctx.getSession();
    const { landing, childRows } = resolveCreatedPagePresentation({
      profileId: ctx.profileId,
      session,
      searchParams: new URLSearchParams(location.search),
      hash: location.hash,
      storage: localStorage,
    });
    const showFocused = enabled && landing.view === CREATED_VIEW_FOCUSED_OBJECT;
    const readonly = viewOnly();

    if (!enabled) {
      root.hidden = true;
      if (staleRoot) staleRoot.hidden = true;
      if (contentRoot) contentRoot.hidden = true;
      activeTarget = null;
      return;
    }

    if (!showFocused) {
      root.hidden = true;
      activeTarget = null;
      return;
    }

    root.hidden = false;
    const target = resolveFocusedObjectTarget({ landing, childRows, session });
    activeTarget = target;

    if (!target) {
      if (staleRoot) staleRoot.hidden = false;
      if (contentRoot) contentRoot.hidden = true;
      if (liveCockpit instanceof HTMLElement) liveCockpit.hidden = true;
      return;
    }

    if (staleRoot) staleRoot.hidden = true;
    if (contentRoot) contentRoot.hidden = false;
    if (liveCockpit instanceof HTMLElement) liveCockpit.hidden = true;

    const activeRoom = getBoundStewardActiveRoom(ctx.profileId);
    const presentation =
      target.mode === "child"
        ? focusedObjectFieldsForRow(target.row, activeRoom)
        : focusedObjectRootFields(session, target.pilot ?? "general");

    if (backBtn) backBtn.textContent = FOCUSED_OBJECT_BACK_LABEL;
    if (typeBadgeEl) typeBadgeEl.textContent = presentation.typeBadge;
    if (roomBadgeEl) {
      roomBadgeEl.textContent = presentation.roomBadge ?? "";
      roomBadgeEl.hidden = !presentation.roomBadge;
    }
    if (titleEl) titleEl.textContent = presentation.title;
    if (statusEl) {
      statusEl.textContent = presentation.statusLabel;
      statusEl.dataset.tone = presentation.statusTone;
    }
    if (recencyEl) {
      recencyEl.textContent = presentation.recency ?? "";
      recencyEl.hidden = !presentation.recency;
    }
    if (readOnlyNoteEl) {
      readOnlyNoteEl.textContent = presentation.readOnlyNote ?? "";
      readOnlyNoteEl.hidden = !presentation.readOnlyNote;
    }

    const disablePublish = readonly || !presentation.canPublish;
    renderFields(presentation.fields, disablePublish);
    syncScanActions(
      focusedObjectScanUrl(
        target.mode === "child" ? target.row : null,
        session,
        target.mode
      ),
      disablePublish
    );

    if (publishStatusEl) {
      const current = publishStatusEl.textContent?.trim() ?? "";
      const keepStatus =
        current.length > 0 && current !== "Signing and updating…";
      if (!keepStatus) {
        publishStatusEl.hidden = true;
        publishStatusEl.textContent = "";
      } else {
        publishStatusEl.hidden = false;
      }
    }

    if (landing.objectId) {
      writeCreatedFocusObjectId(sessionStorage, ctx.profileId, landing.objectId);
    }
  }

  async function resolveCreatedAt(sessionNow) {
    if (sessionNow?.created_at) return String(sessionNow.created_at);
    const res = await fetch(getCardJsonUrl(ctx.profileId), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Could not load card from network.");
    const card = await res.json();
    if (!card.created_at) throw new Error("Card missing created_at.");
    const next = { ...sessionNow, created_at: card.created_at };
    ctx.setSession(next);
    return String(card.created_at);
  }

  async function publish() {
    if (!activeTarget || viewOnly()) return;
    const keys = ctx.getSigningKeys();
    if (!keys) {
      if (publishStatusEl) {
        publishStatusEl.hidden = false;
        publishStatusEl.textContent = "Unlock owner or recovery key before updating.";
      }
      return;
    }

    const formValues = readFormValues();
    if (publishBtn instanceof HTMLButtonElement) publishBtn.disabled = true;
    if (publishStatusEl) {
      publishStatusEl.hidden = false;
      publishStatusEl.textContent = "Signing and updating…";
    }

    try {
      if (activeTarget.mode === "child" && activeTarget.row) {
        const row = activeTarget.row;
        const objectId = String(row.object_id ?? "");
        const payload = focusedObjectPublishPayload("child", formValues, {
          objectType: row.object_type,
        });
        if (payload.publishMode !== "child") throw new Error("Invalid publish payload.");
        if (typeof row.created_at !== "string") {
          throw new Error("Missing child object record on this device.");
        }
        const signed = await signChildObjectUpdate({
          objectId,
          parentProfileId: ctx.profileId,
          objectType: String(payload.objectType),
          publicLabel: payload.publicLabel,
          publicState: payload.publicState,
          createdAt: row.created_at,
          privateKeyBase58: keys.privateKeyBase58,
          publicKeyBase58: keys.publicKeyBase58,
          extraFields: preserveChildDocumentFields(row),
        });
        await postChildObjectUpdate(ctx.profileId, objectId, signed);
        updateChildObjectRow(localStorage, ctx.profileId, objectId, {
          public_label: payload.publicLabel,
          public_state: payload.publicState,
        });
      } else if (activeTarget.mode === "root") {
        const sessionNow = ctx.getSession();
        const handle = sessionNow?.handle;
        if (!handle) throw new Error("Missing handle in session.");
        const pilot = activeTarget.pilot ?? "general";
        const payload = focusedObjectPublishPayload("root", formValues, { pilot });
        if (payload.publishMode !== "root") throw new Error("Invalid publish payload.");
        const createdAt = await resolveCreatedAt(sessionNow);
        const signed = await signCardUpdate({
          profileId: ctx.profileId,
          handle: String(handle),
          createdAt,
          manifestoLine: payload.manifestoLine,
          privateKeyBase58: keys.privateKeyBase58,
          publicKeyBase58: keys.publicKeyBase58,
          cardExtras: {
            verification: sessionNow?.verification,
            badges: [],
            qr: { active_qr_id: sessionNow?.qr_id, epoch: 1 },
          },
        });
        await postCardUpdate(ctx.profileId, signed);
        ctx.setSession({ ...sessionNow, manifesto_line: payload.manifestoLine });
      }

      if (publishStatusEl) {
        publishStatusEl.textContent = "Updated on the network.";
      }
      ctx.onPublished?.();
      sync();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (publishStatusEl) publishStatusEl.textContent = message;
      ctx.showError(message);
    } finally {
      if (publishBtn instanceof HTMLButtonElement) publishBtn.disabled = viewOnly();
    }
  }

  backBtn?.addEventListener("click", navigateToCollection);
  staleBackBtn?.addEventListener("click", navigateToCollection);
  formEl?.addEventListener("submit", (event) => {
    event.preventDefault();
    void publish();
  });
  openScanEl?.addEventListener("click", (event) => {
    const href = openScanEl instanceof HTMLAnchorElement ? openScanEl.href : "";
    if (!href) return;
    event.preventDefault();
    if (!openStewardScanPreviewFromWindow(href, { setupWizard: false })) {
      window.open(href, readStandaloneModeFromWindow(window) ? "_self" : "_blank", "noopener,noreferrer");
    }
  });
  copyScanBtn?.addEventListener("click", async () => {
    const url = copyScanBtn instanceof HTMLButtonElement ? copyScanBtn.dataset.scanUrl : "";
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      if (publishStatusEl) {
        publishStatusEl.hidden = false;
        publishStatusEl.textContent = "Scan link copied.";
      }
    } catch {
      ctx.showError("Could not copy scan link.");
    }
  });

  sync();
  return { sync, refresh: sync };
}
