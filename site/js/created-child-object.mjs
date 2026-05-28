import {
  appendChildObjectRow,
  readChildObjectRows,
} from "./child-object-store-core.mjs";
import {
  CHILD_OBJECT_TYPE_STATUS_PLATE,
  parseStatusPlateChildFields,
  shouldOfferAddStatusPlate,
} from "./created-child-object-core.mjs";
import {
  postChildObjectCreate,
  signChildObjectCreate,
} from "./child-object-update.mjs";

/**
 * @param {string} profileId
 * @param {ReturnType<typeof readChildObjectRows>} rows
 */
function renderStatusPlateList(profileId, rows) {
  const listEl = document.getElementById("child-object-status-plate-list");
  if (!listEl) return;
  const plates = rows.filter((row) => row.object_type === CHILD_OBJECT_TYPE_STATUS_PLATE);
  if (!plates.length) {
    listEl.hidden = true;
    listEl.replaceChildren();
    return;
  }
  listEl.hidden = false;
  listEl.replaceChildren(
    ...plates.map((row) => {
      const li = document.createElement("li");
      li.className = "list-row";
      const content = document.createElement("span");
      content.className = "list-content";
      const title = document.createElement("span");
      title.className = "list-title";
      title.textContent = row.public_label;
      const sub = document.createElement("span");
      sub.className = "list-sub";
      sub.textContent = row.public_state;
      content.append(title, sub);
      li.append(content);
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
  if (!panel || !form) return null;

  function refreshVisibility() {
    const show = shouldOfferAddStatusPlate(ctx.getSession());
    panel.hidden = !show;
    if (show) {
      renderStatusPlateList(ctx.profileId, readChildObjectRows(localStorage, ctx.profileId));
    }
  }

  refreshVisibility();

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
    if (submitBtn) submitBtn.disabled = true;
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = "Signing and registering status plate…";
    }
    try {
      const { publicLabel, publicState } = parseStatusPlateChildFields(
        labelInput instanceof HTMLInputElement ? labelInput.value : "",
        stateInput instanceof HTMLInputElement ? stateInput.value : ""
      );
      const signed = await signChildObjectCreate({
        parentProfileId: ctx.profileId,
        objectType: CHILD_OBJECT_TYPE_STATUS_PLATE,
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
        object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
        public_label: publicLabel,
        public_state: publicState,
        created_at: createdAt,
      });
      if (labelInput instanceof HTMLInputElement) labelInput.value = "";
      if (stateInput instanceof HTMLInputElement) stateInput.value = "";
      renderStatusPlateList(ctx.profileId, readChildObjectRows(localStorage, ctx.profileId));
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent =
          "Status plate registered on the network. Child-object scan QR is a later slice — update public state here when wired.";
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = message;
      }
      ctx.showError(message);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  return { refresh: refreshVisibility };
}
