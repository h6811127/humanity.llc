import { validateCreateHandle } from "./create-handle-validation-core.mjs";

/**
 * @param {string[]} labels
 */
export function formatCreateRequiredFieldsMessage(labels) {
  const unique = [...new Set(labels.filter(Boolean))];
  if (unique.length === 0) return "Required fields are missing.";
  if (unique.length === 1) return `${unique[0]} is required.`;
  if (unique.length === 2) return `${unique[0]} and ${unique[1]} are required.`;
  return `${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]} are required.`;
}

/**
 * @param {string} template
 * @param {{
 *   objectLabel?: string,
 *   statusLine?: string,
 *   relayItem?: string,
 *   relayMessage?: string,
 *   manifesto?: string,
 * }} fields
 * @returns {Array<{ id: string, label: string }>}
 */
export function listMissingCreatePilotFields(template, fields) {
  /** @type {Array<{ id: string, label: string }>} */
  const missing = [];
  const useDeployFieldIds = fields.useDeployFieldIds === true;
  if (template === "status_plate") {
    if (!String(fields.objectLabel || "").trim()) {
      missing.push({
        id: useDeployFieldIds ? "deploy-object-label" : "object-label",
        label: "Object name",
      });
    }
    if (!String(fields.statusLine || "").trim()) {
      missing.push({
        id: useDeployFieldIds ? "deploy-scanner-line" : "status-line",
        label: "Status line",
      });
    }
  } else if (template === "lost_item_relay") {
    if (!String(fields.relayItem || "").trim()) {
      missing.push({
        id: useDeployFieldIds ? "deploy-object-label" : "relay-item",
        label: "Item name",
      });
    }
    if (!String(fields.relayMessage || "").trim()) {
      missing.push({
        id: useDeployFieldIds ? "deploy-scanner-line" : "relay-message",
        label: "Return message",
      });
    }
  } else if (!String(fields.manifesto || "").trim()) {
    missing.push({ id: "manifesto", label: "Public statement" });
  }
  return missing;
}

/**
 * @param {string} template
 * @param {string} handleRaw
 * @param {Parameters<typeof listMissingCreatePilotFields>[1]} fields
 */
export function validateCreateFormFields(template, handleRaw, fields) {
  /** @type {Array<{ id: string, label: string }>} */
  const missing = [];
  const handleResult = validateCreateHandle(handleRaw);
  if (!handleResult.ok) {
    missing.push({ id: "handle", label: "Handle" });
  }
  missing.push(...listMissingCreatePilotFields(template, fields));
  if (missing.length > 0) {
    return {
      ok: false,
      message: formatCreateRequiredFieldsMessage(missing.map((m) => m.label)),
      missingFieldIds: missing.map((m) => m.id),
    };
  }
  return { ok: true, handle: handleResult.normalized };
}

/**
 * @param {string} template
 * @param {Parameters<typeof listMissingCreatePilotFields>[1]} fields
 */
export function buildPilotManifestoLine(template, fields) {
  if (template === "status_plate") {
    const objectLabel = String(fields.objectLabel || "").trim();
    const statusLine = String(fields.statusLine || "").trim();
    if (!objectLabel || !statusLine) {
      throw new Error("Object name and status line are required for a status plate.");
    }
    const combined = `${objectLabel}\n${statusLine}`;
    if (combined.length > 280) {
      throw new Error("Combined object name and status line must be 280 characters or fewer.");
    }
    return { manifesto: combined, pilotTemplate: "status_plate" };
  }
  if (template === "lost_item_relay") {
    const item = String(fields.relayItem || "").trim();
    const message = String(fields.relayMessage || "").trim();
    if (!item || !message) {
      throw new Error("Item name and return message are required for a lost item relay.");
    }
    const combined = `[relay] ${item}\n${message}`;
    if (combined.length > 280) {
      throw new Error("Combined item name and return message must be 280 characters or fewer.");
    }
    return { manifesto: combined, pilotTemplate: "lost_item_relay" };
  }
  const manifesto = String(fields.manifesto || "").trim();
  if (!manifesto) throw new Error("Handle and public statement are required.");
  return { manifesto, pilotTemplate: "general" };
}
