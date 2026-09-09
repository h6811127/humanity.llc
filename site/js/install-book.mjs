/**
 * Bind /install/ booking form → mailto with place, hours line, and contact.
 */
import { buildInstallBookMailto } from "./install-book-core.mjs";

function readInstallBookFields(form) {
  const data = new FormData(form);
  return {
    place: String(data.get("place") || ""),
    neighborhood: String(data.get("neighborhood") || ""),
    scannerLine: String(data.get("scannerLine") || ""),
    contact: String(data.get("contact") || ""),
    hosted: data.get("hosted") === "on",
  };
}

function showInstallBookError(form, result) {
  const errorEl = document.getElementById("install-book-error");
  if (errorEl) {
    errorEl.hidden = false;
    errorEl.textContent = result.message;
  }
  const firstId = result.missingFieldIds?.[0];
  if (firstId) {
    form.querySelector(`#${firstId}`)?.focus();
  }
}

function clearInstallBookError() {
  const errorEl = document.getElementById("install-book-error");
  if (errorEl) {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }
}

function bindInstallBookForm() {
  const form = document.getElementById("install-book-form");
  if (!form) return;
  form.addEventListener("input", clearInstallBookError);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = buildInstallBookMailto(readInstallBookFields(form));
    if (!result.ok) {
      showInstallBookError(form, result);
      return;
    }
    clearInstallBookError();
    window.location.href = result.href;
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindInstallBookForm);
  } else {
    bindInstallBookForm();
  }
}
