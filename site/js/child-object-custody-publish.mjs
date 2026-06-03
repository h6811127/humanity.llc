import { buildCustodyFromForm } from "./child-object-custody-core.mjs";
import { mergeChildObjectDocumentFields } from "./child-object-time-policy-core.mjs";
import { postChildObjectUpdate, signChildObjectUpdate } from "./child-object-update.mjs";
import { updateChildObjectRow } from "./child-object-store-core.mjs";

/**
 * @param {{
 *   form: HTMLFormElement;
 *   stored: Record<string, unknown>;
 *   objectId: string;
 *   profileId: string;
 *   objectType: string;
 *   keys: { privateKeyBase58: string; publicKeyBase58: string };
 *   storage: Pick<Storage, "getItem" | "setItem">;
 *   refreshList: () => Promise<void>;
 * }} input
 */
export async function publishCustodyFromForm(input) {
  const formData = new FormData(input.form);
  const enabled = formData.get("custody_enabled");
  const custody = enabled === "1" ? buildCustodyFromForm(formData) : null;
  const signed = await signChildObjectUpdate({
    objectId: input.objectId,
    parentProfileId: input.profileId,
    objectType: input.objectType,
    publicLabel: String(input.stored.public_label),
    publicState: String(input.stored.public_state),
    createdAt: String(input.stored.created_at),
    privateKeyBase58: input.keys.privateKeyBase58,
    publicKeyBase58: input.keys.publicKeyBase58,
    extraFields: mergeChildObjectDocumentFields(input.stored, { custody }),
  });
  await postChildObjectUpdate(input.profileId, input.objectId, signed);
  updateChildObjectRow(input.storage, input.profileId, input.objectId, {
    ...(custody ? { custody } : { custody: undefined }),
  });
  await input.refreshList();
  return custody;
}

/**
 * @param {{
 *   form: HTMLFormElement;
 *   rowEl: HTMLElement | null;
 *   profileId: string;
 *   objectType: string;
 *   getSigningKeys: () => { privateKeyBase58: string; publicKeyBase58: string } | null;
 *   showError: (msg: string) => void;
 *   storage: Pick<Storage, "getItem" | "setItem">;
 *   readRows: (storage: Pick<Storage, "getItem">, profileId: string) => Array<Record<string, unknown>>;
 *   refreshList: () => Promise<void>;
 *   statusEl?: HTMLElement | null;
 *   unlockMessage?: string;
 * }} input
 */
export async function runChildObjectCustodyFormSubmit(input) {
  const objectId = input.rowEl?.dataset.objectId;
  if (!objectId) return null;

  const keys = input.getSigningKeys();
  const rowStatus =
    input.statusEl ?? input.form.querySelector(".child-object-custody-status");
  if (!keys) {
    if (rowStatus instanceof HTMLElement) {
      rowStatus.hidden = false;
      rowStatus.textContent =
        input.unlockMessage ??
        "Unlock owner or recovery key before publishing custody.";
    }
    return null;
  }

  const stored = input.readRows(input.storage, input.profileId).find(
    (row) => row.object_id === objectId
  );
  if (!stored || typeof stored.created_at !== "string") {
    input.showError("Missing child object record on this device.");
    return null;
  }

  const submitBtn = input.form.querySelector('button[type="submit"]');
  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
  if (rowStatus instanceof HTMLElement) {
    rowStatus.hidden = false;
    rowStatus.textContent = "Signing and publishing custody…";
  }

  try {
    const custody = await publishCustodyFromForm({
      form: input.form,
      stored,
      objectId,
      profileId: input.profileId,
      objectType: input.objectType,
      keys,
      storage: input.storage,
      refreshList: input.refreshList,
    });
    if (rowStatus instanceof HTMLElement) {
      rowStatus.textContent = custody
        ? "Custody published on the network."
        : "Custody cleared on the network.";
    }
    return custody;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (rowStatus instanceof HTMLElement) rowStatus.textContent = message;
    input.showError(message);
    throw err;
  } finally {
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
  }
}
