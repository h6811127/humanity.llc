/**
 * Hydrate /docket/ roster from case index (+ optional full cases for counts).
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md · WS-DOCKET-B
 */
import {
  DOCKET_CASES_INDEX_PATH,
  DOCKET_PHOTO_CHECKLIST_PATH,
  docketCaseDataPath,
  renderDocketClosedCriteriaHtml,
  renderDocketNetworkGoodHtml,
  renderDocketRosterCardHtml,
  validateDocketCase,
  validateDocketCasesIndex,
  validateDocketPhotoLicenseChecklist,
} from "./docket-case-core.mjs";
import { renderDocketChapterPinsTeaserHtml } from "./docket-chapter-discovery-core.mjs";
import { docketPhotoChecklistRowForCase } from "./docket-photo-core.mjs";

async function fetchJson(path) {
  const res = await fetch(path, { credentials: "omit" });
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}

/**
 * @param {HTMLElement} listEl
 */
export async function hydrateDocketRoster(listEl) {
  const indexRaw = await fetchJson(DOCKET_CASES_INDEX_PATH);
  const indexResult = validateDocketCasesIndex(indexRaw);
  if (!indexResult.ok) {
    throw new Error(indexResult.errors.join("; "));
  }
  const cases = /** @type {Record<string, unknown>[]} */ (
    /** @type {Record<string, unknown>} */ (indexResult.index).cases
  );

  let checklistDoc = null;
  try {
    const checklistRaw = await fetchJson(DOCKET_PHOTO_CHECKLIST_PATH);
    const checklistResult = validateDocketPhotoLicenseChecklist(checklistRaw);
    if (checklistResult.ok) checklistDoc = checklistResult.doc;
  } catch {
    checklistDoc = null;
  }

  const fullCases = await Promise.all(
    cases.map(async (row) => {
      const id = String(row.id ?? "");
      const path = docketCaseDataPath(id);
      if (!path) return null;
      try {
        const raw = await fetchJson(path);
        const result = validateDocketCase(raw);
        return result.ok ? result.case : null;
      } catch {
        return null;
      }
    })
  );

  const html = cases
    .map((row, i) => {
      const id = String(row.id ?? "");
      const checkRow = docketPhotoChecklistRowForCase(checklistDoc, id);
      return renderDocketRosterCardHtml(row, fullCases[i], {
        photoLicenseStatus:
          checkRow && typeof checkRow.license_status === "string"
            ? checkRow.license_status
            : "not_licensed",
        checklistPhotoRef:
          checkRow && typeof checkRow.photo_ref === "string"
            ? checkRow.photo_ref
            : null,
      });
    })
    .join("\n");
  listEl.innerHTML = html;
}

async function boot() {
  const listEl = document.getElementById("wanted");
  const statusEl = document.getElementById("docket-roster-status");
  const criteriaEl = document.getElementById("closed-criteria-body");
  if (criteriaEl && !criteriaEl.dataset.docketHydrated) {
    criteriaEl.innerHTML = renderDocketClosedCriteriaHtml();
    criteriaEl.dataset.docketHydrated = "1";
  }
  const goodsEl = document.getElementById("docket-network-good-body");
  if (goodsEl && !goodsEl.dataset.docketHydrated) {
    goodsEl.innerHTML =
      renderDocketNetworkGoodHtml() + renderDocketChapterPinsTeaserHtml();
    goodsEl.dataset.docketHydrated = "1";
  }
  if (!listEl) return;
  try {
    await hydrateDocketRoster(listEl);
    if (statusEl) statusEl.hidden = true;
  } catch (err) {
    console.error(err);
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent =
        "Could not load the Public Docket list. Refresh, or try again later.";
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
