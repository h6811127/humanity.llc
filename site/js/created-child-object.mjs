import {
  appendChildObjectRow,
  readChildObjectRows,
  updateChildObjectRow,
} from "./child-object-store-core.mjs";
import { refreshChildObjectsFromNetwork } from "./child-object-reconcile.mjs";
import {
  CHILD_OBJECT_STATUS_DISABLED,
  CHILD_OBJECT_TYPE_STATUS_PLATE,
  isActiveStatusPlateRow,
  parseStatusPlateChildFields,
  parseStatusPlateChildState,
  shouldOfferAddStatusPlate,
} from "./created-child-object-core.mjs";
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
import { renderChildObjectTimePolicySection } from "./created-child-object-time-policy.mjs";
import { renderChildObjectCustodySection } from "./created-child-object-custody.mjs";
import { runChildObjectCustodyFormSubmit } from "./child-object-custody-publish.mjs";
import { runChildObjectTimePolicyFormSubmit } from "./child-object-time-policy-publish.mjs";

/**
 * @param {string} profileId
 * @param {ReturnType<typeof readChildObjectRows>} rows
 */
function renderStatusPlateList(profileId, rows) {
  const listEl = document.getElementById("child-object-status-plate-list");
  if (!listEl) return;
  const plates = rows.filter(isActiveStatusPlateRow);
  if (!plates.length) {
    listEl.hidden = true;
    listEl.replaceChildren();
    return;
  }
  listEl.hidden = false;
  listEl.replaceChildren(
    ...plates.map((row) => {
      const li = document.createElement("li");
      li.className = "list-row child-object-plate-row";
      li.dataset.objectId = row.object_id;

      const content = document.createElement("span");
      content.className = "list-content";
      const title = document.createElement("span");
      title.className = "list-title";
      title.textContent = row.public_label;
      const sub = document.createElement("span");
      sub.className = "list-sub child-object-plate-current-state";
      sub.textContent = row.public_state;
      content.append(title, sub);
      li.append(content);

      const scanWrap = document.createElement("div");
      scanWrap.className = "child-object-plate-scan";
      const scanStatus = document.createElement("p");
      scanStatus.className = "form-hint child-object-plate-scan-status";
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
        copyBtn.className = "btn-secondary child-object-plate-copy-scan";
        copyBtn.dataset.scanUrl = row.scan_url;
        copyBtn.textContent = "Copy scan link";
        scanWrap.append(link, copyBtn);
      } else {
        const issueBtn = document.createElement("button");
        issueBtn.type = "button";
        issueBtn.className = "btn-secondary child-object-plate-issue-qr";
        issueBtn.dataset.objectId = row.object_id;
        issueBtn.textContent = "Issue scan link";
        scanWrap.append(issueBtn);
      }
      scanWrap.append(scanStatus);

      const form = document.createElement("form");
      form.className = "compact-form child-object-plate-update-form";
      form.noValidate = true;

      const label = document.createElement("label");
      label.className = "form-label";
      label.textContent = "Update status line";
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
      rowStatus.className = "form-hint child-object-plate-update-status";
      rowStatus.hidden = true;
      rowStatus.setAttribute("role", "status");

      li.append(
        scanWrap,
        form,
        renderChildObjectCustodySection(row),
        renderChildObjectTimePolicySection(row),
        rowStatus
      );

      const disableBtn = document.createElement("button");
      disableBtn.type = "button";
      disableBtn.className = "btn-text child-object-plate-disable";
      disableBtn.dataset.objectId = row.object_id;
      disableBtn.textContent = "Disable this plate";

      li.append(disableBtn);
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
export function initCreatedChildObject(ctx) {
  const panel = document.getElementById("child-object-add-status-plate");
  const form = document.getElementById("child-object-status-plate-form");
  const statusEl = document.getElementById("child-object-status-plate-status");
  const listEl = document.getElementById("child-object-status-plate-list");
  if (!panel || !form) return null;

  async function refreshList() {
    await refreshChildObjectsFromNetwork(localStorage, ctx.profileId);
    renderStatusPlateList(ctx.profileId, readChildObjectRows(localStorage, ctx.profileId));
    syncChildObjectBackupGateUi({
      profileId: ctx.profileId,
      getSession: ctx.getSession,
      noticeId: "child-object-status-plate-backup-gate",
      submitId: "child-object-status-plate-submit",
    });
  }

  function refreshVisibility() {
    const show = shouldOfferAddStatusPlate(ctx.getSession());
    panel.hidden = !show;
    if (show) void refreshList();
    else {
      syncChildObjectBackupGateUi({
        profileId: ctx.profileId,
        getSession: ctx.getSession,
        noticeId: "child-object-status-plate-backup-gate",
        submitId: "child-object-status-plate-submit",
      });
    }
  }

  refreshVisibility();

  listEl?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.classList.contains("child-object-plate-copy-scan")) {
      const url = target.dataset.scanUrl;
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        const status = target
          .closest(".child-object-plate-scan")
          ?.querySelector(".child-object-plate-scan-status");
        if (status instanceof HTMLElement) {
          status.hidden = false;
          status.textContent = "Scan link copied.";
        }
      } catch {
        ctx.showError("Could not copy scan link.");
      }
      return;
    }

    if (!target.classList.contains("child-object-plate-issue-qr")) {
      if (!target.classList.contains("child-object-plate-disable")) return;
      const objectId = target.dataset.objectId;
      if (!objectId) return;

      const keys = ctx.getSigningKeys();
      const rowEl = target.closest(".child-object-plate-row");
      const rowStatus = rowEl?.querySelector(".child-object-plate-update-status");
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
          "Disable this status plate on the network? Scanners will see the object as unavailable."
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
          objectType: CHILD_OBJECT_TYPE_STATUS_PLATE,
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
          statusEl.textContent = "Status plate disabled on the network.";
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
      .closest(".child-object-plate-scan")
      ?.querySelector(".child-object-plate-scan-status");
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
        statusEl.textContent = "Scan link ready — print or share the URL on the status plate.";
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
      const rowEl = target.closest(".child-object-plate-row");
      try {
        await runChildObjectCustodyFormSubmit({
          form: target,
          rowEl: rowEl instanceof HTMLElement ? rowEl : null,
          profileId: ctx.profileId,
          objectType: CHILD_OBJECT_TYPE_STATUS_PLATE,
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
      const rowEl = target.closest(".child-object-plate-row");
      try {
        await runChildObjectTimePolicyFormSubmit({
          form: target,
          rowEl: rowEl instanceof HTMLElement ? rowEl : null,
          profileId: ctx.profileId,
          objectType: CHILD_OBJECT_TYPE_STATUS_PLATE,
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

    if (!target.classList.contains("child-object-plate-update-form")) {
      return;
    }
    event.preventDefault();
    const rowEl = target.closest(".child-object-plate-row");
    const objectId = rowEl instanceof HTMLElement ? rowEl.dataset.objectId : "";
    if (!objectId) return;

    const keys = ctx.getSigningKeys();
    const rowStatus = rowEl?.querySelector(".child-object-plate-update-status");
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
      const { publicState } = parseStatusPlateChildState(
        stateInput instanceof HTMLInputElement ? stateInput.value : ""
      );
      const signed = await signChildObjectUpdate({
        objectId,
        parentProfileId: ctx.profileId,
        objectType: CHILD_OBJECT_TYPE_STATUS_PLATE,
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
        statusEl.textContent = "Unlock owner or recovery key before adding a status plate.";
      }
      return;
    }
    const labelInput = document.getElementById("child-object-plate-label");
    const stateInput = document.getElementById("child-object-plate-state");
    const submitBtn = document.getElementById("child-object-status-plate-submit");
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = childObjectRegisterProgressLabel(CHILD_OBJECT_TYPE_STATUS_PLATE);
    }
    try {
      assertChildObjectBackupGateAllowsCreate({
        profileId: ctx.profileId,
        getSession: ctx.getSession,
      });
      const { publicLabel, publicState } = parseStatusPlateChildFields(
        labelInput instanceof HTMLInputElement ? labelInput.value : "",
        stateInput instanceof HTMLInputElement ? stateInput.value : ""
      );
      const result = await registerChildObjectAndIssueScanLink({
        profileId: ctx.profileId,
        objectType: CHILD_OBJECT_TYPE_STATUS_PLATE,
        publicLabel,
        publicState,
        privateKeyBase58: keys.privateKeyBase58,
        publicKeyBase58: keys.publicKeyBase58,
      });
      appendChildObjectRow(localStorage, ctx.profileId, {
        object_id: result.objectId,
        object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
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
          objectType: CHILD_OBJECT_TYPE_STATUS_PLATE,
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
