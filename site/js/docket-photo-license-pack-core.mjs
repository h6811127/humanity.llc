/**
 * WS-DOCKET photo license packs (license-pack-v0).
 * Formal attribution + site-path gate before checklist flips to licensed.
 * Starter-four Most Wanted faces stay not_licensed until a real human license pack.
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § Photographs
 */

import {
  DOCKET_STARTER_CASE_IDS_FOR_PHOTOS,
  isDocketSitePhotoRef,
} from "./docket-photo-core.mjs";

export const DOCKET_PHOTO_LICENSE_PACKS_PATH =
  "/data/docket-photo-license-packs.json";
export const DOCKET_PHOTO_LICENSE_PACKS_KIND =
  "hc.docket.photo_license_packs.v0";
export const DOCKET_PHOTO_LICENSE_PACK_KIT_REL =
  "site/dev/ws-docket-license-pack-v0-field-walk.html";

export const DOCKET_PHOTO_LICENSE_PACK_STATUSES = Object.freeze([
  "draft",
  "awaiting_assets",
  "ready",
  "applied",
]);

export const DOCKET_PHOTO_LICENSE_TYPES = Object.freeze([
  "official",
  "press",
  "creative_commons",
  "owned",
  "rehearsal",
]);

/**
 * @returns {string[]}
 */
export function docketPhotoLicensePackV0Steps() {
  return [
    "Fill a pack row: subject_id · photo_ref · license.type · attribution · source_url · obtained_at.",
    "Store the likeness under /assets/docket/ (site path only — no hotlinks).",
    "Set pack status to ready only when the asset file exists and fields validate.",
    "Apply ready pack → checklist license_status=licensed + matching photo_ref.",
    "Starter-four Most Wanted packs stay draft/awaiting_assets — never auto-apply without a real license.",
    "Caption remains “Public likeness · not a mugshot”. Fail open to monogram otherwise.",
  ];
}

/**
 * @param {string | null | undefined} subjectId
 */
export function isDocketPhotoLicensePackStarterSubject(subjectId) {
  return DOCKET_STARTER_CASE_IDS_FOR_PHOTOS.includes(
    String(subjectId ?? "").trim()
  );
}

/**
 * @param {string | null | undefined} subjectId
 */
export function isDocketPhotoLicensePackRehearsalSubject(subjectId) {
  return String(subjectId ?? "")
    .trim()
    .startsWith("rehearsal-");
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, doc: Record<string, unknown> } | { ok: false, errors: string[] }}
 */
export function validateDocketPhotoLicensePacks(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["license packs doc must be an object"] };
  }
  const doc = /** @type {Record<string, unknown>} */ (raw);
  if (doc.kind !== DOCKET_PHOTO_LICENSE_PACKS_KIND) {
    errors.push(`kind must be ${DOCKET_PHOTO_LICENSE_PACKS_KIND}`);
  }
  if (doc.starter_four_faces_live !== false) {
    errors.push("starter_four_faces_live must be false (branch fence)");
  }
  const packs = Array.isArray(doc.packs) ? doc.packs : null;
  if (!packs || packs.length < 1) {
    errors.push("packs must be a non-empty array");
  } else {
    const seen = new Set();
    let hasRehearsalAppliedOrReady = false;
    for (let i = 0; i < packs.length; i++) {
      const rowRaw = packs[i];
      if (!rowRaw || typeof rowRaw !== "object" || Array.isArray(rowRaw)) {
        errors.push(`packs[${i}] must be an object`);
        continue;
      }
      const row = /** @type {Record<string, unknown>} */ (rowRaw);
      const id = String(row.id ?? "").trim();
      if (!id) {
        errors.push(`packs[${i}].id is required`);
      } else {
        if (seen.has(id)) errors.push(`duplicate pack id: ${id}`);
        seen.add(id);
      }
      const subjectId = String(row.subject_id ?? "").trim();
      if (!subjectId) {
        errors.push(`packs[${i}].subject_id is required`);
      } else if (
        !isDocketPhotoLicensePackStarterSubject(subjectId) &&
        !isDocketPhotoLicensePackRehearsalSubject(subjectId)
      ) {
        errors.push(
          `packs[${i}].subject_id must be starter-four or rehearsal-* (got ${subjectId})`
        );
      }
      const status = String(row.status ?? "").trim();
      if (!DOCKET_PHOTO_LICENSE_PACK_STATUSES.includes(status)) {
        errors.push(
          `packs[${i}].status must be ${DOCKET_PHOTO_LICENSE_PACK_STATUSES.join(" | ")}`
        );
      }
      const license =
        row.license && typeof row.license === "object" && !Array.isArray(row.license)
          ? /** @type {Record<string, unknown>} */ (row.license)
          : null;
      if (!license) {
        errors.push(`packs[${i}].license object is required`);
      } else {
        const type = String(license.type ?? "").trim();
        if (!DOCKET_PHOTO_LICENSE_TYPES.includes(type)) {
          errors.push(
            `packs[${i}].license.type must be ${DOCKET_PHOTO_LICENSE_TYPES.join(" | ")}`
          );
        }
        if (
          typeof license.attribution !== "string" ||
          !license.attribution.trim()
        ) {
          errors.push(`packs[${i}].license.attribution is required`);
        }
        if (typeof license.source_url !== "string" || !license.source_url.trim()) {
          errors.push(`packs[${i}].license.source_url is required`);
        }
        if (
          typeof license.obtained_at !== "string" ||
          !license.obtained_at.trim()
        ) {
          errors.push(`packs[${i}].license.obtained_at is required`);
        }
      }

      const isStarter = isDocketPhotoLicensePackStarterSubject(subjectId);
      const photoRef =
        row.photo_ref == null ? null : String(row.photo_ref).trim();

      if (status === "ready" || status === "applied") {
        if (!photoRef || !isDocketSitePhotoRef(photoRef)) {
          errors.push(
            `packs[${i}].photo_ref must be a site path when status is ${status}`
          );
        }
        if (isStarter) {
          errors.push(
            `packs[${i}]: starter-four packs cannot be ${status} until a real human license pack is cleared (keep draft/awaiting_assets)`
          );
        }
        if (isDocketPhotoLicensePackRehearsalSubject(subjectId)) {
          hasRehearsalAppliedOrReady = true;
          if (String(license?.type ?? "") !== "rehearsal") {
            errors.push(
              `packs[${i}].license.type must be rehearsal for rehearsal-* subjects`
            );
          }
        }
      } else if (photoRef != null && photoRef !== "") {
        if (!isDocketSitePhotoRef(photoRef)) {
          errors.push(`packs[${i}].photo_ref must be a site path when set`);
        }
      } else if (row.photo_ref != null && row.photo_ref !== null) {
        errors.push(`packs[${i}].photo_ref must be null or a site path string`);
      }
    }
    if (!hasRehearsalAppliedOrReady) {
      errors.push(
        "packs must include at least one ready|applied rehearsal-* pack (license-pack-v0 proof)"
      );
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, doc };
}

/**
 * @param {Record<string, unknown>} packsDoc
 * @param {string} subjectId
 */
export function docketPhotoLicensePackForSubject(packsDoc, subjectId) {
  const packs = Array.isArray(packsDoc.packs) ? packsDoc.packs : [];
  const id = String(subjectId ?? "").trim();
  const row = packs.find(
    (p) =>
      p &&
      typeof p === "object" &&
      String(/** @type {Record<string, unknown>} */ (p).subject_id ?? "") === id
  );
  return row && typeof row === "object"
    ? /** @type {Record<string, unknown>} */ (row)
    : null;
}

/**
 * Build a checklist row from a ready/applied pack (does not mutate starter-four).
 * @param {Record<string, unknown>} pack
 */
export function checklistRowFromDocketPhotoLicensePack(pack) {
  const subjectId = String(pack.subject_id ?? "").trim();
  const status = String(pack.status ?? "").trim();
  const photoRef =
    typeof pack.photo_ref === "string" ? pack.photo_ref.trim() : null;
  const license =
    pack.license && typeof pack.license === "object"
      ? /** @type {Record<string, unknown>} */ (pack.license)
      : {};
  const attribution = String(license.attribution ?? "").trim();
  if (status !== "ready" && status !== "applied") {
    return {
      id: subjectId,
      photo_ref: null,
      license_status: "not_licensed",
      notes: `Pack ${String(pack.id ?? "")} status=${status} — not applied`,
    };
  }
  if (isDocketPhotoLicensePackStarterSubject(subjectId)) {
    throw new Error(
      "Refusing to materialize starter-four checklist row from pack (license-pack-v0 fence)"
    );
  }
  return {
    id: subjectId,
    photo_ref: photoRef,
    license_status: "licensed",
    notes: attribution
      ? `License pack ${String(pack.id ?? "")}: ${attribution}`
      : `License pack ${String(pack.id ?? "")}`,
  };
}

/**
 * Merge ready/applied non-starter packs into a checklist document.
 * Never flips starter-four to licensed.
 * @param {Record<string, unknown>} checklistDoc
 * @param {Record<string, unknown>} packsDoc
 */
export function applyReadyDocketPhotoLicensePacksToChecklist(
  checklistDoc,
  packsDoc
) {
  const baseCases = Array.isArray(checklistDoc.cases)
    ? checklistDoc.cases.map((c) =>
        c && typeof c === "object"
          ? { .../** @type {Record<string, unknown>} */ (c) }
          : c
      )
    : [];
  const byId = new Map();
  for (const row of baseCases) {
    if (row && typeof row === "object") {
      byId.set(String(/** @type {Record<string, unknown>} */ (row).id ?? ""), {
        .../** @type {Record<string, unknown>} */ (row),
      });
    }
  }
  // Harden starter-four gate.
  for (const id of DOCKET_STARTER_CASE_IDS_FOR_PHOTOS) {
    const existing = byId.get(id) ?? {
      id,
      photo_ref: null,
      license_status: "not_licensed",
      notes: "Monogram until license pack.",
    };
    byId.set(id, {
      ...existing,
      id,
      photo_ref: null,
      license_status: "not_licensed",
    });
  }

  const packs = Array.isArray(packsDoc.packs) ? packsDoc.packs : [];
  for (const packRaw of packs) {
    if (!packRaw || typeof packRaw !== "object") continue;
    const pack = /** @type {Record<string, unknown>} */ (packRaw);
    const status = String(pack.status ?? "").trim();
    if (status !== "ready" && status !== "applied") continue;
    const subjectId = String(pack.subject_id ?? "").trim();
    if (isDocketPhotoLicensePackStarterSubject(subjectId)) continue;
    const row = checklistRowFromDocketPhotoLicensePack(pack);
    byId.set(subjectId, row);
  }

  return {
    version: Number(checklistDoc.version ?? 1) || 1,
    phase: Number(checklistDoc.phase ?? 2) || 2,
    policy:
      typeof checklistDoc.policy === "string"
        ? checklistDoc.policy
        : "Licensed / press / official likeness only. Fail open to monogram.",
    cases: [...byId.values()],
  };
}

/**
 * Compact steward HTML for pack status on `#photos`.
 * @param {Record<string, unknown> | null} pack
 * @param {string} caseId
 */
export function renderDocketPhotoLicensePackStewardHtml(pack, caseId) {
  if (!pack) {
    return `<p class="form-hint">No license pack row for <code>${escapeHtml(caseId)}</code>. Add one in <code>docket-photo-license-packs.json</code>.</p>`;
  }
  const status = String(pack.status ?? "");
  const photoRef =
    typeof pack.photo_ref === "string" ? pack.photo_ref : "null";
  const license =
    pack.license && typeof pack.license === "object"
      ? /** @type {Record<string, unknown>} */ (pack.license)
      : {};
  const type = String(license.type ?? "");
  const attribution = String(license.attribution ?? "");
  const starter = isDocketPhotoLicensePackStarterSubject(caseId);
  const fence = starter
    ? `<p class="form-hint"><strong>Starter-four fence:</strong> pack stays draft/awaiting_assets until a real human likeness license is cleared. Published checklist stays <code>not_licensed</code>.</p>`
    : "";
  return `<div class="docket-photo-license-pack" data-docket-pack-id="${escapeAttr(String(pack.id ?? ""))}" data-docket-pack-status="${escapeAttr(status)}">
  <p class="docket-live-object-status">License pack <span class="docket-status">${escapeHtml(status)}</span> · type <span class="docket-status">${escapeHtml(type)}</span></p>
  <p class="form-hint">photo_ref: <code>${escapeHtml(photoRef)}</code></p>
  <p class="form-hint">${escapeHtml(attribution)}</p>
  ${fence}
  <p class="form-hint"><a href="/data/docket-photo-license-packs.json">Packs registry</a> · <a href="/dev/ws-docket-license-pack-v0-field-walk.html">License-pack-v0 field walk</a></p>
</div>`;
}

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {string} value
 */
function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
