import { readChildObjectRows } from "./child-object-store-core.mjs";
import { refreshChildObjectsFromNetwork } from "./child-object-reconcile.mjs";
import { stewardPresentationExtras } from "./steward-active-room-core.mjs";
import { shouldOfferAddStatusPlateInDefaultUi } from "./steward-presentation-policy-core.mjs";
import {
  DELEGATED_CAPABILITY_OPERATION_OPTIONS,
  datetimeLocalValueToIsoUtc,
  defaultDelegatedExpiresAt,
  delegatedCapabilityRowSummary,
  delegatedExpiresAtToDatetimeLocalValue,
} from "./created-delegated-capability-core.mjs";
import {
  fetchDelegatedCapabilityList,
  postDelegatedCapabilityIssue,
  postDelegatedCapabilityRevoke,
  signDelegatedCapabilityIssue,
  signDelegatedCapabilityRevoke,
} from "./delegated-capability-sign.mjs";
import { generateKeypair } from "./hc-sign.mjs";
import { writeDelegatedCapabilitiesCache } from "./delegated-capability-store-core.mjs";

/**
 * @param {{
 *   profileId: string;
 *   getSession: () => Record<string, unknown> | null;
 *   showError: (message: string) => void;
 *   getSigningKeys: () => { privateKeyBase58: string; publicKeyBase58: string } | null;
 * }} opts
 */
export function initCreatedDelegatedCapability(opts) {
  const panel = document.getElementById("delegated-capability-manage");
  if (!panel) return null;

  const objectSelect = document.getElementById("delegated-capability-object-id");
  const labelInput = document.getElementById("delegated-capability-label");
  const expiresInput = document.getElementById("delegated-capability-expires");
  const opsFieldset = document.getElementById("delegated-capability-operations");
  const generateKeysBtn = document.getElementById("delegated-capability-generate-keys");
  const publicKeyHint = document.getElementById("delegated-capability-public-key-hint");
  const privateKeyHandoff = document.getElementById("delegated-capability-private-key-handoff");
  const issueForm = document.getElementById("delegated-capability-issue-form");
  const issueStatus = document.getElementById("delegated-capability-issue-status");
  const activeList = document.getElementById("delegated-capability-active-list");

  /** @type {{ publicKeyBase58: string; privateKeyBase58: string } | null} */
  let delegatedKeypair = null;

  function setIssueStatus(message, tone = "hint") {
    if (!issueStatus) return;
    if (!message) {
      issueStatus.hidden = true;
      issueStatus.textContent = "";
      issueStatus.className = "form-hint";
      return;
    }
    issueStatus.hidden = false;
    issueStatus.textContent = message;
    issueStatus.className =
      tone === "error" ? "form-hint form-hint--error" : "form-hint form-hint--success";
  }

  function syncVisibility() {
    const session = opts.getSession();
    const keys = opts.getSigningKeys();
    const show = Boolean(
      opts.profileId &&
        keys?.privateKeyBase58 &&
        keys?.publicKeyBase58 &&
        shouldOfferAddStatusPlateInDefaultUi(session, stewardPresentationExtras(opts.profileId))
    );
    panel.hidden = !show;
  }

  function renderOperationCheckboxes() {
    if (!opsFieldset) return;
    opsFieldset.replaceChildren();
    const legend = document.createElement("legend");
    legend.textContent = "Allowed operations";
    opsFieldset.append(legend);
    for (const op of DELEGATED_CAPABILITY_OPERATION_OPTIONS) {
      const label = document.createElement("label");
      label.className = "checkbox-label";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "delegated-capability-operation";
      input.value = op.id;
      input.checked = op.id === "child_object.update";
      label.append(input, document.createTextNode(` ${op.label}`));
      opsFieldset.append(label);
    }
  }

  /**
   * @param {ReturnType<typeof readChildObjectRows>} rows
   */
  function populateObjectSelect(rows) {
    if (!objectSelect) return;
    const active = rows.filter((row) => row.status !== "disabled" && row.status !== "revoked");
    objectSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = active.length ? "Select object…" : "No active child objects";
    objectSelect.append(placeholder);
    for (const row of active) {
      const option = document.createElement("option");
      option.value = row.object_id;
      option.textContent = `${row.public_label} (${row.object_type})`;
      objectSelect.append(option);
    }
    objectSelect.disabled = !active.length;
  }

  function selectedOperations() {
    if (!opsFieldset) return [];
    return [...opsFieldset.querySelectorAll('input[name="delegated-capability-operation"]:checked')].map(
      (el) => /** @type {HTMLInputElement} */ (el).value
    );
  }

  async function refreshList() {
    if (!activeList) return;
    try {
      const data = await fetchDelegatedCapabilityList(opts.profileId);
      const capabilities = Array.isArray(data?.capabilities) ? data.capabilities : [];
      writeDelegatedCapabilitiesCache(sessionStorage, opts.profileId, capabilities);
      const active = capabilities.filter((row) => row.status === "active");
      if (!active.length) {
        activeList.replaceChildren();
        const empty = document.createElement("p");
        empty.className = "form-hint";
        empty.textContent = "No active delegated signers.";
        activeList.append(empty);
        return;
      }
      activeList.replaceChildren(
        ...active.map((row) => {
          const li = document.createElement("li");
          li.className = "list-row delegated-capability-row";
          const content = document.createElement("span");
          content.className = "list-content";
          const title = document.createElement("span");
          title.className = "list-title";
          title.textContent = row.label || row.capability_id;
          const sub = document.createElement("span");
          sub.className = "list-sub";
          sub.textContent = delegatedCapabilityRowSummary(row);
          const scopeIds = Array.isArray(row.scope?.object_ids) ? row.scope.object_ids.join(", ") : "";
          const ops = Array.isArray(row.operations) ? row.operations.join(", ") : "";
          const detail = document.createElement("span");
          detail.className = "list-sub";
          detail.textContent = `${scopeIds} · ${ops}`;
          content.append(title, sub, detail);
          li.append(content);

          const revokeBtn = document.createElement("button");
          revokeBtn.type = "button";
          revokeBtn.className = "btn-text";
          revokeBtn.textContent = "Revoke";
          revokeBtn.addEventListener("click", () => void revokeRow(row, revokeBtn));
          li.append(revokeBtn);
          return li;
        })
      );
    } catch (e) {
      writeDelegatedCapabilitiesCache(sessionStorage, opts.profileId, []);
      activeList.replaceChildren();
      const err = document.createElement("p");
      err.className = "form-hint form-hint--error";
      err.textContent = e instanceof Error ? e.message : "Could not load delegated signers.";
      activeList.append(err);
    }
  }

  /**
   * @param {Record<string, unknown>} row
   * @param {HTMLButtonElement} button
   */
  async function revokeRow(row, button) {
    const keys = opts.getSigningKeys();
    if (!keys) {
      opts.showError("Load ownership keys before revoking delegation.");
      return;
    }
    button.disabled = true;
    setIssueStatus("Revoking delegated access…");
    try {
      const signed = await signDelegatedCapabilityRevoke(
        row,
        opts.profileId,
        keys.privateKeyBase58,
        keys.publicKeyBase58
      );
      await postDelegatedCapabilityRevoke(
        opts.profileId,
        String(row.capability_id),
        signed
      );
      setIssueStatus("Delegated access revoked.", "success");
      await refreshList();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Revoke failed.";
      setIssueStatus(msg, "error");
      opts.showError(msg);
    } finally {
      button.disabled = false;
    }
  }

  async function refresh() {
    syncVisibility();
    if (panel.hidden) return;
    renderOperationCheckboxes();
    if (expiresInput && !expiresInput.value) {
      expiresInput.value = delegatedExpiresAtToDatetimeLocalValue(defaultDelegatedExpiresAt());
    }
    try {
      await refreshChildObjectsFromNetwork(sessionStorage, opts.profileId);
    } catch {
      /* local index fallback */
    }
    populateObjectSelect(readChildObjectRows(sessionStorage, opts.profileId));
    await refreshList();
  }

  generateKeysBtn?.addEventListener("click", async () => {
    delegatedKeypair = await generateKeypair();
    if (publicKeyHint) {
      publicKeyHint.hidden = false;
      publicKeyHint.textContent = `Limited signer public key: ${delegatedKeypair.publicKeyBase58}`;
    }
    if (privateKeyHandoff) {
      privateKeyHandoff.hidden = false;
      privateKeyHandoff.value = delegatedKeypair.privateKeyBase58;
    }
    setIssueStatus(
      "Copy the private key once for the volunteer. It is not stored on this device or the resolver.",
      "hint"
    );
  });

  issueForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const keys = opts.getSigningKeys();
    if (!keys) {
      opts.showError("Load ownership keys before issuing delegation.");
      return;
    }
    if (!delegatedKeypair?.publicKeyBase58) {
      setIssueStatus("Generate limited signer keys first.", "error");
      return;
    }
    const objectId = objectSelect?.value?.trim() ?? "";
    const label = labelInput?.value?.trim() ?? "";
    const expiresAt = datetimeLocalValueToIsoUtc(expiresInput?.value ?? "");
    const operations = selectedOperations();
    if (!objectId) {
      setIssueStatus("Select a child object.", "error");
      return;
    }
    if (!label) {
      setIssueStatus("Add a steward-facing label.", "error");
      return;
    }
    if (!expiresAt) {
      setIssueStatus("Choose an expiry time.", "error");
      return;
    }
    if (!operations.length) {
      setIssueStatus("Select at least one allowed operation.", "error");
      return;
    }

    setIssueStatus("Issuing delegated access…");
    try {
      const signed = await signDelegatedCapabilityIssue(
        {
          parentProfileId: opts.profileId,
          delegatedPublicKey: delegatedKeypair.publicKeyBase58,
          objectId,
          operations,
          label,
          expiresAt,
        },
        keys.privateKeyBase58,
        keys.publicKeyBase58
      );
      await postDelegatedCapabilityIssue(opts.profileId, signed);
      setIssueStatus("Delegated access issued.", "success");
      delegatedKeypair = null;
      if (publicKeyHint) publicKeyHint.hidden = true;
      if (privateKeyHandoff) {
        privateKeyHandoff.hidden = true;
        privateKeyHandoff.value = "";
      }
      await refreshList();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Issue failed.";
      setIssueStatus(msg, "error");
      opts.showError(msg);
    }
  });

  void refresh();

  return { refresh };
}
