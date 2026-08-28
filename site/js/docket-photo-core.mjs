/**
 * WS-DOCKET photos Phase 2 — licensed likeness render + gate helpers.
 * Fail open to monogram. Never mugshot / WANTED chrome.
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § Photographs
 */

export const DOCKET_PHOTO_CAPTION = "Public likeness · not a mugshot";
export const DOCKET_PHOTO_LICENSE_STATUSES = Object.freeze([
  "not_licensed",
  "licensed",
  "rejected",
]);
export const DOCKET_PHOTO_CHECKLIST_PATH = "/data/docket-photo-license-checklist.json";
export const DOCKET_PHOTO_KIT_REL = "site/dev/ws-docket-photo-v0-field-walk.html";

/** Starter roster — published likeness stays off until a real license pack. */
export const DOCKET_STARTER_CASE_IDS_FOR_PHOTOS = Object.freeze([
  "netanyahu",
  "putin",
  "altman",
  "musk",
]);

/**
 * @param {string | null | undefined} photoRef
 */
export function isDocketSitePhotoRef(photoRef) {
  const ref = String(photoRef ?? "").trim();
  if (!ref.startsWith("/")) return false;
  if (ref.startsWith("//")) return false;
  if (ref.includes("..")) return false;
  return (
    ref.startsWith("/assets/") ||
    ref.startsWith("/data/") ||
    ref.startsWith("/media/")
  );
}

/**
 * @param {{
 *   caseId?: string | null;
 *   photoRef?: string | null;
 *   licenseStatus?: string | null;
 *   checklistPhotoRef?: string | null;
 * }} input
 */
export function resolveDocketPhotoSlot(input) {
  const licenseStatus = String(input.licenseStatus ?? "not_licensed").trim();
  const caseRef = typeof input.photoRef === "string" ? input.photoRef.trim() : "";
  const checkRef =
    typeof input.checklistPhotoRef === "string"
      ? input.checklistPhotoRef.trim()
      : "";
  if (licenseStatus !== "licensed") {
    return { mode: /** @type {const} */ ("monogram"), photoRef: null, caption: null };
  }
  const ref = caseRef || checkRef;
  if (!isDocketSitePhotoRef(ref)) {
    return { mode: /** @type {const} */ ("monogram"), photoRef: null, caption: null };
  }
  if (caseRef && checkRef && caseRef !== checkRef) {
    return { mode: /** @type {const} */ ("monogram"), photoRef: null, caption: null };
  }
  return {
    mode: /** @type {const} */ ("photo"),
    photoRef: ref,
    caption: DOCKET_PHOTO_CAPTION,
  };
}

/**
 * HTML for monogram / photo slot (roster + case hero).
 * @param {{
 *   monogram: string;
 *   photoRef?: string | null;
 *   licenseStatus?: string | null;
 *   checklistPhotoRef?: string | null;
 *   size?: "sm" | "lg";
 *   showCaption?: boolean;
 * }} input
 */
export function renderDocketPhotoSlotHtml(input) {
  const mono = escapePhotoHtml(String(input.monogram ?? "").trim() || "?");
  const sizeClass = input.size === "lg" ? " docket-plate-mono-lg" : "";
  const resolved = resolveDocketPhotoSlot({
    photoRef: input.photoRef,
    licenseStatus: input.licenseStatus,
    checklistPhotoRef: input.checklistPhotoRef,
  });
  if (resolved.mode === "photo" && resolved.photoRef) {
    const caption =
      input.showCaption === false
        ? ""
        : `<p class="docket-photo-caption form-hint">${escapePhotoHtml(DOCKET_PHOTO_CAPTION)}</p>`;
    return `<span class="docket-plate-mono${sizeClass} docket-wanted-mono" data-docket-photo="1">
  <img src="${escapePhotoAttr(resolved.photoRef)}" alt="" width="72" height="96" loading="lazy" decoding="async" />
</span>${caption}`;
  }
  return `<span class="docket-plate-mono${sizeClass} docket-wanted-mono" aria-hidden="true"><span class="docket-plate-mono-text">${mono}</span></span>`;
}

/**
 * Starter-four must stay not_licensed in published checklist.
 * @param {unknown} checklistDoc
 */
export function assertStarterFourPhotosNotLicensed(checklistDoc) {
  const errors = [];
  if (!checklistDoc || typeof checklistDoc !== "object" || Array.isArray(checklistDoc)) {
    return { ok: false, errors: ["checklist must be an object"] };
  }
  const cases = Array.isArray(
    /** @type {Record<string, unknown>} */ (checklistDoc).cases
  )
    ? /** @type {Record<string, unknown>} */ (checklistDoc).cases
    : [];
  for (const id of DOCKET_STARTER_CASE_IDS_FOR_PHOTOS) {
    const row = cases.find(
      (c) => c && typeof c === "object" && String(/** @type {Record<string, unknown>} */ (c).id ?? "") === id
    );
    if (!row || typeof row !== "object") {
      errors.push(`${id}: missing checklist row`);
      continue;
    }
    const r = /** @type {Record<string, unknown>} */ (row);
    if (String(r.license_status ?? "") !== "not_licensed") {
      errors.push(`${id}: license_status must stay not_licensed until a real license pack`);
    }
    if (r.photo_ref != null) {
      errors.push(`${id}: photo_ref must stay null until licensed`);
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true };
}

/**
 * @param {unknown} checklistDoc
 * @param {string} caseId
 */
export function docketPhotoChecklistRowForCase(checklistDoc, caseId) {
  if (!checklistDoc || typeof checklistDoc !== "object") return null;
  const cases = Array.isArray(
    /** @type {Record<string, unknown>} */ (checklistDoc).cases
  )
    ? /** @type {Record<string, unknown>} */ (checklistDoc).cases
    : [];
  const id = String(caseId ?? "").trim();
  const row = cases.find(
    (c) => c && typeof c === "object" && String(/** @type {Record<string, unknown>} */ (c).id ?? "") === id
  );
  return row && typeof row === "object"
    ? /** @type {Record<string, unknown>} */ (row)
    : null;
}

/**
 * Steward `#photos` panel — license gate status (no unlicensed faces).
 * @param {Record<string, unknown> | null} checklistRow
 * @param {string} caseId
 * @param {string | null | undefined} casePhotoRef
 */
export function renderDocketPhotoStewardHtml(checklistRow, caseId, casePhotoRef) {
  const status = String(checklistRow?.license_status ?? "not_licensed").trim();
  const checkRef =
    typeof checklistRow?.photo_ref === "string" ? checklistRow.photo_ref : null;
  const notes =
    typeof checklistRow?.notes === "string" ? checklistRow.notes.trim() : "";
  const resolved = resolveDocketPhotoSlot({
    caseId,
    photoRef: casePhotoRef,
    licenseStatus: status,
    checklistPhotoRef: checkRef,
  });
  const steps = docketPhotoPhase2Steps()
    .map((s) => `<li>${escapePhotoHtml(s)}</li>`)
    .join("");
  return `<div class="docket-photo-steward" data-docket-photo-license="${escapePhotoAttr(status)}" data-docket-photo-mode="${resolved.mode}">
  <p class="docket-live-object-status"><span class="docket-status">${escapePhotoHtml(status)}</span> · render <span class="docket-status">${escapePhotoHtml(resolved.mode)}</span></p>
  <p class="form-hint">Case <code>photo_ref</code>: <code>${escapePhotoHtml(String(casePhotoRef ?? "null"))}</code>${
    checkRef ? ` · checklist <code>${escapePhotoHtml(checkRef)}</code>` : ""
  }</p>
  ${notes ? `<p class="form-hint">${escapePhotoHtml(notes)}</p>` : ""}
  <p class="form-hint">Faces go live only when checklist is <code>licensed</code> with a site path under <code>/assets/</code> (or <code>/media/</code>). Caption: <em>${escapePhotoHtml(DOCKET_PHOTO_CAPTION)}</em>.</p>
  <div id="docket-photo-license-pack-slot"></div>
  <ol class="docket-wanted-counts">${steps}</ol>
  <p class="form-hint"><a href="/dev/ws-docket-photo-v0-field-walk.html">Photo Phase 2 field walk</a> · <a href="/dev/ws-docket-license-pack-v0-field-walk.html">License-pack-v0 field walk</a></p>
</div>`;
}

/**
 * @returns {string[]}
 */
export function docketPhotoPhase2Steps() {
  return [
    "Obtain official / press / clearly licensed likeness (no scraped social, no private photos).",
    "Record a row in docket-photo-license-packs.json (attribution · source_url · obtained_at · license.type).",
    "Store under /assets/docket/ (or /media/) — site-relative path only.",
    "Set pack status ready → apply to checklist license_status=licensed + photo_ref.",
    "Set matching case JSON photo_ref; caption is always “Public likeness · not a mugshot”.",
    "Starter-four Most Wanted stay not_licensed until a real human license pack is cleared.",
    "Fail open: if license_status is not licensed, keep monogram.",
  ];
}

/**
 * @param {string} value
 */
function escapePhotoHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {string} value
 */
function escapePhotoAttr(value) {
  return escapePhotoHtml(value).replace(/'/g, "&#39;");
}
