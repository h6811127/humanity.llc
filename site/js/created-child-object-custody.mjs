import { custodyFormDefaults } from "./child-object-custody-core.mjs";

/**
 * @param {Record<string, unknown>} row
 */
export function renderChildObjectCustodySection(row) {
  const defaults = custodyFormDefaults(row);
  const details = document.createElement("details");
  details.className = "child-object-custody";
  details.open = defaults.enabled;

  const summary = document.createElement("summary");
  summary.className = "child-object-custody-summary";
  summary.textContent = defaults.enabled
    ? "Published custody assignment"
    : "Add custody assignment";
  details.append(summary);

  const form = document.createElement("form");
  form.className = "compact-form child-object-custody-form";
  form.noValidate = true;

  const intro = document.createElement("p");
  intro.className = "form-hint";
  intro.textContent =
    "Optional. Tell scanners who currently holds this object. Possession is not ownership proof.";
  form.append(intro);

  const enableLabel = document.createElement("label");
  enableLabel.className = "form-label child-object-custody-enable";
  const enableInput = document.createElement("input");
  enableInput.type = "checkbox";
  enableInput.name = "custody_enabled";
  enableInput.value = "1";
  enableInput.checked = defaults.enabled;
  enableLabel.append(enableInput, document.createTextNode(" Publish custody on this object"));
  form.append(enableLabel);

  const holderLabel = document.createElement("label");
  holderLabel.className = "form-label";
  holderLabel.textContent = "Held by";
  const holderInput = document.createElement("input");
  holderInput.className = "form-input";
  holderInput.type = "text";
  holderInput.name = "custody_holder_label";
  holderInput.maxLength = 80;
  holderInput.placeholder = "River gallery · @volunteer · Tool library desk";
  holderInput.value = defaults.holder_label;
  form.append(holderLabel, holderInput);

  const untilLabel = document.createElement("label");
  untilLabel.className = "form-label";
  untilLabel.textContent = "Until (local time, optional)";
  const untilInput = document.createElement("input");
  untilInput.className = "form-input";
  untilInput.type = "datetime-local";
  untilInput.name = "custody_until";
  untilInput.value = defaults.until;
  form.append(untilLabel, untilInput);

  const noteLabel = document.createElement("label");
  noteLabel.className = "form-label";
  noteLabel.textContent = "Note for scanners (optional)";
  const noteInput = document.createElement("input");
  noteInput.className = "form-input";
  noteInput.type = "text";
  noteInput.name = "custody_note";
  noteInput.maxLength = 120;
  noteInput.placeholder = "On loan for June show";
  noteInput.value = defaults.note;
  form.append(noteLabel, noteInput);

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn-secondary";
  submit.textContent = defaults.enabled ? "Publish custody" : "Save custody";
  form.append(submit);

  const status = document.createElement("p");
  status.className = "form-hint child-object-custody-status";
  status.hidden = true;
  status.setAttribute("role", "status");
  form.append(status);

  details.append(form);
  return details;
}
