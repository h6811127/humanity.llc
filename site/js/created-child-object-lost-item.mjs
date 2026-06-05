import {
  appendChildObjectRow,
  readChildObjectRows,
  updateChildObjectRow,
} from "./child-object-store-core.mjs";
import { refreshChildObjectsFromNetwork } from "./child-object-reconcile.mjs";
import {
  CHILD_OBJECT_STATUS_DISABLED,
  CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
  isActiveLostItemRelayRow,
  parseLostItemRelayChildFields,
  parseLostItemRelayChildState,
} from "./created-child-object-core.mjs";
import { stewardPresentationExtras } from "./steward-active-room-core.mjs";
import {
  appendChildObjectListRoomBadge,
  syncChildObjectSectionChrome,
} from "./created-child-object-section-ui.mjs";
import {
  postChildObjectUpdate,
  signChildObjectRevoke,
  signChildObjectUpdate,
  postChildObjectRevoke,
} from "./child-object-update.mjs";
import { issueChildObjectScanLink, registerChildObjectAndIssueScanLink } from "./child-object-register-issue.mjs";
import {
  assertChildObjectBackupGateAllowsCreate,
  syncChildObjectBackupGateUi,
} from "./child-object-backup-gate.mjs";
import { applyStewardScanLinkElement } from "./pwa-scan-handoff-core.mjs";
import { buildStewardScanPreviewHrefFromWindow } from "./pwa-scan-handoff.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";
import {
  childObjectRegisterProgressLabel,
  childObjectRegisterSuccessMessage,
} from "./child-object-register-issue-core.mjs";
import { preserveChildDocumentFields } from "./child-object-time-policy-core.mjs";
import { renderChildObjectCustodySection } from "./created-child-object-custody.mjs";
import { renderChildObjectTimePolicySection } from "./created-child-object-time-policy.mjs";
import { runChildObjectCustodyFormSubmit } from "./child-object-custody-publish.mjs";
import { syncChildObjectAddSectionLabels } from "./created-display-labels.mjs";
import {
  dismissRelayOfferFromSection,
  refreshRelayOffersSection,
  renderChildObjectRelayOffersSection,
} from "./created-child-object-lost-item-offers.mjs";

/**
 * @param {string} profileId
 * @param {ReturnType<typeof readChildObjectRows>} rows
 */
function renderLostItemRelayList(profileId, rows) {
  const listEl = document.getElementById("child-object-lost-item-list");
  if (!listEl) return;
  const relays = rows.filter(isActiveLostItemRelayRow);
  if (!relays.length) {
    listEl.hidden = true;
    listEl.replaceChildren();
    return;
  }
  listEl.hidden = false;
  listEl.replaceChildren(
    ...relays.map((row) => {
      const li = document.createElement("li");
      li.className = "list-row child-object-relay-row";
      li.dataset.objectId = row.object_id;

      const content = document.createElement("span");
      content.className = "list-content";
      const title = document.createElement("span");
      title.className = "list-title";
      title.textContent = row.public_label;
      const sub = document.createElement("span");
      sub.className = "list-sub child-object-relay-current-state";
      sub.textContent = row.public_state;
      content.append(title, sub);
      appendChildObjectListRoomBadge(li, "lost_item_relay");
      li.append(content);

      const scanWrap = document.createElement("div");
      scanWrap.className = "child-object-relay-scan";
      const scanStatus = document.createElement("p");
      scanStatus.className = "form-hint child-object-relay-scan-status";
      scanStatus.hidden = true;
      scanStatus.setAttribute("role", "status");
      if (typeof row.scan_url === "string" && row.scan_url) {
        const link = document.createElement("a");
        link.className = "btn-text";
        link.href = buildStewardScanPreviewHrefFromWindow(row.scan_url);
        applyStewardScanLinkElement(link, readStandaloneModeFromWindow(window));
        link.textContent = "Open scan page";
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "btn-secondary child-object-relay-copy-scan";
        copyBtn.dataset.scanUrl = row.scan_url;
        copyBtn.textContent = "Copy scan link";
        scanWrap.append(link, copyBtn);
      } else {
        const issueBtn = document.createElement("button");
        issueBtn.type = "button";
        issueBtn.className = "btn-secondary child-object-relay-issue-qr";
        issueBtn.dataset.objectId = row.object_id;
        issueBtn.textContent = "Issue scan link";
        scanWrap.append(issueBtn);
      }
      scanWrap.append(scanStatus);

      const form = document.createElement("form");
      form.className = "compact-form child-object-relay-update-form";
      form.noValidate = true;

      const label = document.createElement("label");
      label.className = "form-label";
      label.textContent = "Update return message";
      form.append(label);

      const input = document.createElement("input");
      input.className = "form-input";
      input.type = "text";
      input.name = "public_state";
      input.maxLength = 280;
      input.autocomplete = "off";
      input.required = true;
      input.value = row.public_state;
      form.append(input);

      const button = document.createElement("button");
      button.type = "submit";
      button.className = "btn-secondary";
      button.textContent = "Publish update";
      form.append(button);

      const rowStatus = document.createElement("p");
      rowStatus.className = "form-hint child-object-relay-update-status";
      rowStatus.hidden = true;
      rowStatus.setAttribute("role", "status");

      const disableBtn = document.createElement("button");
      disableBtn.type = "button";
      disableBtn.className = "btn-text child-object-relay-disable";
      disableBtn.dataset.objectId = row.object_id;
      disableBtn.textContent = "Disable this relay";

      li.append(
        scanWrap,
        form,
        renderChildObjectCustodySection(row),
        renderChildObjectTimePolicySection(row),
        renderChildObjectRelayOffersSection(row),
        rowStatus,
        disableBtn
      );
      return li;
    })
  );
}

/**
 * @param {{
 *   profileId: string;
 *   getSession: () => Record<string, unknown> | null;
 *   showError: (msg: string) => void;
 *   getSigningKeys: () => { privateKeyBase58: string; publicKeyBase58: string } | null;
 * }} ctx
 */
export function initCreatedLostItemRelay(ctx) {
  const panel = document.getElementById("child-object-add-lost-item");
  const form = document.getElementById("child-object-lost-item-form");
  const statusEl = document.getElementById("child-object-lost-item-status");
  const listEl = document.getElementById("child-object-lost-item-list");
  if (!panel || !form) return null;

  async function refreshList() {
    await refreshChildObjectsFromNetwork(localStorage, ctx.profileId);
    renderLostItemRelayList(ctx.profileId, readChildObjectRows(localStorage, ctx.profileId));
    syncChildObjectBackupGateUi({
      profileId: ctx.profileId,
      getSession: ctx.getSession,
      noticeId: "child-object-lost-item-backup-gate",
      submitId: "child-object-lost-item-submit",
    });
  }

  function refreshVisibility() {
    const session = ctx.getSession();
    const extras = stewardPresentationExtras(ctx.profileId);
    const rows = readChildObjectRows(localStorage, ctx.profileId);
    const activeCount = rows.filter(isActiveLostItemRelayRow).length;
    const { showSection } = syncChildObjectSectionChrome(
      panel,
      "lost_item_relay",
      session,
      activeCount,
      extras
    );
    if (showSection) void refreshList();
    else {
      syncChildObjectBackupGateUi({
        profileId: ctx.profileId,
        getSession: ctx.getSession,
        noticeId: "child-object-lost-item-backup-gate",
        submitId: "child-object-lost-item-submit",
      });
    }
    syncChildObjectAddSectionLabels(ctx.profileId, localStorage);
  }

  refreshVisibility();

  listEl?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.classList.contains("child-object-relay-offers-refresh")) {
      const section = target.closest(".child-object-relay-offers");
      const rowEl = target.closest(".child-object-relay-row");
      const objectId = rowEl instanceof HTMLElement ? rowEl.dataset.objectId : "";
      if (!(section instanceof HTMLElement) || !objectId) return;
      try {
        await refreshRelayOffersSection({
          section,
          profileId: ctx.profileId,
          objectId,
          getSigningKeys: ctx.getSigningKeys,
          showError: ctx.showError,
        });
      } catch {
        // refreshRelayOffersSection reports via showError
      }
      return;
    }

    if (target.classList.contains("child-object-relay-offer-dismiss")) {
      const offerId = target.dataset.offerId;
      const section = target.closest(".child-object-relay-offers");
      const rowEl = target.closest(".child-object-relay-row");
      const objectId = rowEl instanceof HTMLElement ? rowEl.dataset.objectId : "";
      if (!offerId || !(section instanceof HTMLElement) || !objectId) return;
      if (target instanceof HTMLButtonElement) target.disabled = true;
      try {
        await dismissRelayOfferFromSection({
          section,
          profileId: ctx.profileId,
          objectId,
          offerId,
          getSigningKeys: ctx.getSigningKeys,
          showError: ctx.showError,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.showError(message);
      } finally {
        if (target instanceof HTMLButtonElement) target.disabled = false;
      }
      return;
    }

    if (target.classList.contains("child-object-relay-copy-scan")) {
      const url = target.dataset.scanUrl;
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        const status = target
          .closest(".child-object-relay-scan")
          ?.querySelector(".child-object-relay-scan-status");
        if (status instanceof HTMLElement) {
          status.hidden = false;
          status.textContent = "Scan link copied.";
        }
      } catch {
        ctx.showError("Could not copy scan link.");
      }
      return;
    }

    if (!target.classList.contains("child-object-relay-issue-qr")) {
      if (!target.classList.contains("child-object-relay-disable")) return;
      const objectId = target.dataset.objectId;
      if (!objectId) return;

      const keys = ctx.getSigningKeys();
      const rowEl = target.closest(".child-object-relay-row");
      const rowStatus = rowEl?.querySelector(".child-object-relay-update-status");
      if (!keys) {
        if (rowStatus instanceof HTMLElement) {
          rowStatus.hidden = false;
          rowStatus.textContent = "Unlock owner or recovery key before disabling.";
        }
        return;
      }

      const stored = readChildObjectRows(localStorage, ctx.profileId).find(
        (row) => row.object_id === objectId
      );
      if (!stored || typeof stored.created_at !== "string") {
        ctx.showError("Missing child object record on this device.");
        return;
      }

      if (
        !window.confirm(
          "Disable this lost-item relay on the network? Scanners will see the object as unavailable."
        )
      ) {
        return;
      }

      if (target instanceof HTMLButtonElement) target.disabled = true;
      if (rowStatus instanceof HTMLElement) {
        rowStatus.hidden = false;
        rowStatus.textContent = "Signing and disabling…";
      }

      try {
        const signed = await signChildObjectRevoke({
          objectId,
          parentProfileId: ctx.profileId,
          objectType: CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
          publicLabel: stored.public_label,
          publicState: stored.public_state,
          createdAt: stored.created_at,
          privateKeyBase58: keys.privateKeyBase58,
          publicKeyBase58: keys.publicKeyBase58,
          status: CHILD_OBJECT_STATUS_DISABLED,
        });
        await postChildObjectRevoke(ctx.profileId, objectId, signed);
        updateChildObjectRow(localStorage, ctx.profileId, objectId, {
          status: CHILD_OBJECT_STATUS_DISABLED,
        });
        refreshList();
        if (statusEl) {
          statusEl.hidden = false;
          statusEl.textContent = "Lost-item relay disabled on the network.";
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (rowStatus instanceof HTMLElement) rowStatus.textContent = message;
        ctx.showError(message);
      } finally {
        if (target instanceof HTMLButtonElement) target.disabled = false;
      }
      return;
    }

    const objectId = target.dataset.objectId;
    if (!objectId) return;

    const keys = ctx.getSigningKeys();
    const scanStatus = target
      .closest(".child-object-relay-scan")
      ?.querySelector(".child-object-relay-scan-status");
    if (!keys) {
      if (scanStatus instanceof HTMLElement) {
        scanStatus.hidden = false;
        scanStatus.textContent = "Unlock owner or recovery key before issuing a scan link.";
      }
      return;
    }

    if (target instanceof HTMLButtonElement) target.disabled = true;
    if (scanStatus instanceof HTMLElement) {
      scanStatus.hidden = false;
      scanStatus.textContent = "Signing and issuing scan link…";
    }

    try {
      const { scanUrl, qrId } = await issueChildObjectScanLink({
        profileId: ctx.profileId,
        objectId,
        privateKeyBase58: keys.privateKeyBase58,
        publicKeyBase58: keys.publicKeyBase58,
      });
      updateChildObjectRow(localStorage, ctx.profileId, objectId, {
        qr_id: qrId,
        scan_url: scanUrl,
      });
      refreshList();
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent =
          "Scan link ready — print or share the URL on the lost-item tag.";
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (scanStatus instanceof HTMLElement) scanStatus.textContent = message;
      ctx.showError(message);
    } finally {
      if (target instanceof HTMLButtonElement) target.disabled = false;
    }
  });

  listEl?.addEventListener("submit", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;

    if (target.classList.contains("child-object-custody-form")) {
      event.preventDefault();
      const rowEl = target.closest(".child-object-relay-row");
      try {
        await runChildObjectCustodyFormSubmit({
          form: target,
          rowEl: rowEl instanceof HTMLElement ? rowEl : null,
          profileId: ctx.profileId,
          objectType: CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
          getSigningKeys: ctx.getSigningKeys,
          showError: ctx.showError,
          storage: localStorage,
          readRows: readChildObjectRows,
          refreshList,
        });
      } catch {
        // runChildObjectCustodyFormSubmit reports via showError
      }
      return;
    }

    if (target.classList.contains("child-object-time-policy-form")) {
      event.preventDefault();
      const rowEl = target.closest(".child-object-relay-row");
      try {
        await runChildObjectTimePolicyFormSubmit({
          form: target,
          rowEl: rowEl instanceof HTMLElement ? rowEl : null,
          profileId: ctx.profileId,
          objectType: CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
          getSigningKeys: ctx.getSigningKeys,
          showError: ctx.showError,
          storage: localStorage,
          readRows: readChildObjectRows,
          refreshList,
        });
      } catch {
        // runChildObjectTimePolicyFormSubmit reports via showError
      }
      return;
    }

    if (!target.classList.contains("child-object-relay-update-form")) {
      return;
    }
    event.preventDefault();
    const rowEl = target.closest(".child-object-relay-row");
    const objectId = rowEl instanceof HTMLElement ? rowEl.dataset.objectId : "";
    if (!objectId) return;

    const keys = ctx.getSigningKeys();
    const rowStatus = rowEl?.querySelector(".child-object-relay-update-status");
    if (!keys) {
      if (rowStatus instanceof HTMLElement) {
        rowStatus.hidden = false;
        rowStatus.textContent = "Unlock owner or recovery key before updating.";
      }
      return;
    }

    const stored = readChildObjectRows(localStorage, ctx.profileId).find(
      (row) => row.object_id === objectId
    );
    if (!stored || typeof stored.created_at !== "string") {
      ctx.showError("Missing child object record on this device.");
      return;
    }

    const submitBtn = target.querySelector('button[type="submit"]');
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
    if (rowStatus instanceof HTMLElement) {
      rowStatus.hidden = false;
      rowStatus.textContent = "Signing and updating…";
    }

    try {
      const stateInput = target.querySelector('input[name="public_state"]');
      const { publicState } = parseLostItemRelayChildState(
        stateInput instanceof HTMLInputElement ? stateInput.value : ""
      );
      const signed = await signChildObjectUpdate({
        objectId,
        parentProfileId: ctx.profileId,
        objectType: CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
        publicLabel: stored.public_label,
        publicState,
        createdAt: stored.created_at,
        privateKeyBase58: keys.privateKeyBase58,
        publicKeyBase58: keys.publicKeyBase58,
        extraFields: preserveChildDocumentFields(stored),
      });
      await postChildObjectUpdate(ctx.profileId, objectId, signed);
      updateChildObjectRow(localStorage, ctx.profileId, objectId, { public_state: publicState });
      refreshList();
      if (rowStatus instanceof HTMLElement) {
        rowStatus.textContent = "Updated on the network.";
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (rowStatus instanceof HTMLElement) rowStatus.textContent = message;
      ctx.showError(message);
    } finally {
      if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const keys = ctx.getSigningKeys();
    if (!keys) {
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Unlock owner or recovery key before adding a lost-item relay.";
      }
      return;
    }
    const labelInput = document.getElementById("child-object-relay-item");
    const stateInput = document.getElementById("child-object-relay-message");
    const submitBtn = document.getElementById("child-object-lost-item-submit");
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = childObjectRegisterProgressLabel(CHILD_OBJECT_TYPE_LOST_ITEM_RELAY);
    }
    try {
      assertChildObjectBackupGateAllowsCreate({
        profileId: ctx.profileId,
        getSession: ctx.getSession,
      });
      const { publicLabel, publicState } = parseLostItemRelayChildFields(
        labelInput instanceof HTMLInputElement ? labelInput.value : "",
        stateInput instanceof HTMLInputElement ? stateInput.value : ""
      );
      const result = await registerChildObjectAndIssueScanLink({
        profileId: ctx.profileId,
        objectType: CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
        publicLabel,
        publicState,
        privateKeyBase58: keys.privateKeyBase58,
        publicKeyBase58: keys.publicKeyBase58,
      });
      appendChildObjectRow(localStorage, ctx.profileId, {
        object_id: result.objectId,
        object_type: CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
        public_label: publicLabel,
        public_state: publicState,
        created_at: result.createdAt,
        ...(result.scanUrl && result.qrId
          ? { qr_id: result.qrId, scan_url: result.scanUrl }
          : {}),
      });
      if (labelInput instanceof HTMLInputElement) labelInput.value = "";
      if (stateInput instanceof HTMLInputElement) stateInput.value = "";
      refreshList();
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = childObjectRegisterSuccessMessage({
          objectType: CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
          scanUrl: result.scanUrl,
          issueFailed: result.issueFailed,
        });
      }
      if (result.issueFailed && result.issueError) {
        ctx.showError(result.issueError);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = message;
      }
      ctx.showError(message);
    } finally {
      if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
    }
  });

  return { refresh: refreshVisibility };
}
