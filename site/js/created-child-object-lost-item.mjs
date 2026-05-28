import {
  appendChildObjectRow,
  readChildObjectRows,
  updateChildObjectRow,
} from "./child-object-store-core.mjs";
import {
  CHILD_OBJECT_STATUS_DISABLED,
  CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
  isActiveLostItemRelayRow,
  parseLostItemRelayChildFields,
  parseLostItemRelayChildState,
  shouldOfferAddLostItemRelay,
} from "./created-child-object-core.mjs";
import {
  postChildObjectCreate,
  postChildObjectUpdate,
  signChildObjectCreate,
  signChildObjectRevoke,
  signChildObjectUpdate,
  postChildObjectRevoke,
} from "./child-object-update.mjs";
import { postChildObjectIssueQr, signChildObjectIssueQr } from "./child-object-qr.mjs";

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
        link.href = row.scan_url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
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

      li.append(scanWrap, form, rowStatus, disableBtn);
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

  function refreshList() {
    renderLostItemRelayList(ctx.profileId, readChildObjectRows(localStorage, ctx.profileId));
  }

  function refreshVisibility() {
    const show = shouldOfferAddLostItemRelay(ctx.getSession());
    panel.hidden = !show;
    if (show) refreshList();
  }

  refreshVisibility();

  listEl?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

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
      const signed = await signChildObjectIssueQr({
        profileId: ctx.profileId,
        objectId,
        privateKeyBase58: keys.privateKeyBase58,
        publicKeyBase58: keys.publicKeyBase58,
      });
      const result = await postChildObjectIssueQr(
        ctx.profileId,
        objectId,
        signed.qr_credential
      );
      const scanUrl =
        typeof result.scan_url === "string" ? result.scan_url : signed.scanUrl;
      const qrId = typeof result.qr_id === "string" ? result.qr_id : signed.qrId;
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
    if (
      !(target instanceof HTMLFormElement) ||
      !target.classList.contains("child-object-relay-update-form")
    ) {
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
      statusEl.textContent = "Signing and registering lost-item relay…";
    }
    try {
      const { publicLabel, publicState } = parseLostItemRelayChildFields(
        labelInput instanceof HTMLInputElement ? labelInput.value : "",
        stateInput instanceof HTMLInputElement ? stateInput.value : ""
      );
      const signed = await signChildObjectCreate({
        parentProfileId: ctx.profileId,
        objectType: CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
        publicLabel,
        publicState,
        privateKeyBase58: keys.privateKeyBase58,
        publicKeyBase58: keys.publicKeyBase58,
      });
      const result = await postChildObjectCreate(ctx.profileId, signed);
      const createdAt =
        typeof signed.created_at === "string" ? signed.created_at : new Date().toISOString();
      appendChildObjectRow(localStorage, ctx.profileId, {
        object_id: String(result.object_id || signed.object_id),
        object_type: CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
        public_label: publicLabel,
        public_state: publicState,
        created_at: createdAt,
      });
      if (labelInput instanceof HTMLInputElement) labelInput.value = "";
      if (stateInput instanceof HTMLInputElement) stateInput.value = "";
      refreshList();
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent =
          "Lost-item relay registered. Issue a scan link below, then publish return-message updates as needed.";
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
