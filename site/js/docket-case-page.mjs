/**
 * Hydrate /docket/{id}/ case plate from JSON.
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md · WS-DOCKET-B
 */
import {
  DOCKET_PHOTO_CHECKLIST_PATH,
  docketCaseDataPath,
  renderDocketCasePageBodyHtml,
  validateDocketCase,
  validateDocketPhotoLicenseChecklist,
} from "./docket-case-core.mjs";
import { docketPhotoChecklistRowForCase } from "./docket-photo-core.mjs";

/**
 * @param {string} [pathname]
 */
export function docketCaseIdFromPath(pathname = "") {
  const m = String(pathname).match(
    /\/docket\/([a-z0-9_-]+)(?:\/steward)?\/?$/i
  );
  return m ? m[1].toLowerCase() : null;
}

/**
 * @param {HTMLElement} rootEl
 * @param {string} caseId
 */
export async function hydrateDocketCasePage(rootEl, caseId) {
  const path = docketCaseDataPath(caseId);
  if (!path) throw new Error("missing case id");
  const res = await fetch(path, { credentials: "omit" });
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  const raw = await res.json();
  const result = validateDocketCase(raw);
  if (!result.ok) throw new Error(result.errors.join("; "));

  /** @type {{ photoLicenseStatus?: string; checklistPhotoRef?: string | null }} */
  const photoOpts = { photoLicenseStatus: "not_licensed", checklistPhotoRef: null };
  try {
    const checklistRes = await fetch(DOCKET_PHOTO_CHECKLIST_PATH, {
      credentials: "omit",
    });
    if (checklistRes.ok) {
      const checklistRaw = await checklistRes.json();
      const checklistResult = validateDocketPhotoLicenseChecklist(checklistRaw);
      if (checklistResult.ok) {
        const row = docketPhotoChecklistRowForCase(checklistResult.doc, caseId);
        if (row) {
          photoOpts.photoLicenseStatus = String(row.license_status ?? "not_licensed");
          photoOpts.checklistPhotoRef =
            typeof row.photo_ref === "string" ? row.photo_ref : null;
        }
      }
    }
  } catch {
    /* fail open to monogram */
  }

  rootEl.innerHTML = renderDocketCasePageBodyHtml(result.case, photoOpts);
  return result.case;
}

async function boot() {
  const rootEl = document.getElementById("docket-case-root");
  const statusEl = document.getElementById("docket-case-status");
  if (!rootEl) return;
  const caseId =
    rootEl.getAttribute("data-docket-case-id") ||
    docketCaseIdFromPath(location.pathname);
  if (!caseId) {
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = "Unknown case.";
    }
    return;
  }
  try {
    await hydrateDocketCasePage(rootEl, caseId);
    if (statusEl) statusEl.hidden = true;
  } catch (err) {
    console.error(err);
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent =
        "Could not load this case. Return to the list, or try again later.";
    }
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void boot();
    });
  } else {
    void boot();
  }
}
