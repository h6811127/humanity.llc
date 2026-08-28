/**
 * WS-DOCKET-C-v2 — casefile live-object bind helpers.
 * Starter-four cases bind under the nonviolence charter (product assumption: legal + ethical).
 * Prefer child-object QR `/c/{profile}?q={qr}` when minted; interim casefile URL = `/docket/{id}/`.
 * Discovery opt-in stays false until C-v3 (branch must not pollute default stranger path).
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § WS-DOCKET-C
 */

import {
  DOCKET_CASE_IDS,
  DOCKET_LIVE_OBJECT_STATUSES,
  docketCasePagePath,
} from "./docket-case-core.mjs";
import { validateDocketDiscoveryOptInFields } from "./docket-discovery-opt-in-core.mjs";

/** Synthetic fixture ids — not a public Most Wanted slug. */
export const DOCKET_CASEFILE_FIXTURE_OBJECT_ID = "obj_docket_casefile_fixture_v1";
export const DOCKET_CASEFILE_FIXTURE_PROFILE_ID = "docketCasefileFix01";
export const DOCKET_CASEFILE_FIXTURE_QR_ID = "qr_docket_casefile_fix_v1";

export const DOCKET_CV2_KIT_REL = "site/dev/ws-docket-c-v2-field-walk.html";
export const DOCKET_CV2_SPEC_ANCHOR = "WS-DOCKET-C";

/**
 * Stable object_id for a public roster casefile.
 * @param {string} caseId
 */
export function docketCasefileObjectId(caseId) {
  const id = String(caseId ?? "")
    .trim()
    .toLowerCase();
  if (!id) return null;
  return `obj_docket_casefile_${id}`;
}

/**
 * Interim casefile scan path (case page) until a child-object QR is issued.
 * @param {string} caseId
 */
export function docketCasefileScanPath(caseId) {
  return docketCasePagePath(caseId);
}

/**
 * Site-relative scan path for a parent-card child-object QR.
 * @param {string} profileId
 * @param {string} qrId
 */
export function docketScanPathFromCardQr(profileId, qrId) {
  const profile = String(profileId ?? "").trim();
  const qr = String(qrId ?? "").trim();
  if (!profile || !qr) return null;
  return `/c/${encodeURIComponent(profile)}?q=${encodeURIComponent(qr)}`;
}

/** @typedef {"interim" | "child_qr" | "other" | "none"} DocketLiveObjectScanMode */

/**
 * @param {string | null | undefined} scanPath
 * @param {string | null | undefined} caseId
 * @returns {DocketLiveObjectScanMode}
 */
export function classifyDocketLiveObjectScanMode(scanPath, caseId) {
  const scan = String(scanPath ?? "").trim();
  if (!scan) return "none";
  const interim = docketCasefileScanPath(String(caseId ?? ""));
  if (interim && scan === interim) return "interim";
  if (isDocketChildObjectScanPath(scan)) return "child_qr";
  return "other";
}

/**
 * True when scan_path is a child-object QR shape: `/c/{profile}?q={qr}`.
 * @param {string | null | undefined} scanPath
 */
export function isDocketChildObjectScanPath(scanPath) {
  return Boolean(parseDocketChildObjectScanPath(scanPath));
}

/**
 * @param {string | null | undefined} scanPath
 * @returns {{ profileId: string; qrId: string } | null}
 */
export function parseDocketChildObjectScanPath(scanPath) {
  const scan = String(scanPath ?? "").trim();
  if (!scan.startsWith("/c/")) return null;
  const q = scan.indexOf("?q=");
  if (q < 0) return null;
  const profileId = decodeURIComponent(scan.slice(3, q).trim());
  const qrId = decodeURIComponent(scan.slice(q + 3).trim());
  if (!profileId || !qrId || profileId.includes("/") || qrId.includes("&")) {
    return null;
  }
  return { profileId, qrId };
}

/**
 * Upgrade an interim case-URL bind to a child-object QR scan path.
 * Keeps object_id = obj_docket_casefile_{id}; discovery_opt_in stays false.
 * @param {string} caseId
 * @param {{ profileId: string; qrId: string; bindNotes?: string | null }} input
 */
export function upgradePublicDocketCaseLiveObjectToChildQr(caseId, input) {
  const id = String(caseId ?? "")
    .trim()
    .toLowerCase();
  const objectId = docketCasefileObjectId(id);
  const scanPath = docketScanPathFromCardQr(input.profileId, input.qrId);
  if (!objectId || !scanPath) {
    throw new Error(`invalid upgrade input for case: ${caseId}`);
  }
  return buildDocketLiveObjectBound({
    objectId,
    scanPath,
    bindNotes:
      typeof input.bindNotes === "string"
        ? input.bindNotes
        : `WS-DOCKET-C-v2 QR upgrade: child-object scan for ${id}. discovery_opt_in stays false (C-v3).`,
  });
}

/**
 * @param {{
 *   objectId: string;
 *   scanPath: string;
 *   bindNotes?: string | null;
 * }} input
 */
export function buildDocketLiveObjectBound(input) {
  const objectId = String(input.objectId ?? "").trim();
  const scanPath = String(input.scanPath ?? "").trim();
  return {
    status: "bound",
    object_id: objectId,
    scan_path: scanPath,
    discovery_opt_in: false,
    bind_notes:
      typeof input.bindNotes === "string"
        ? input.bindNotes
        : "WS-DOCKET-C-v2 bound casefile. discovery_opt_in stays false until C-v3.",
  };
}

/**
 * Bound live_object for a public roster case (interim: case page as scan_path).
 * @param {string} caseId
 */
export function buildPublicDocketCaseLiveObjectBound(caseId) {
  const id = String(caseId ?? "")
    .trim()
    .toLowerCase();
  const objectId = docketCasefileObjectId(id);
  const scanPath = docketCasefileScanPath(id);
  if (!objectId || !scanPath) {
    throw new Error(`invalid case id for bind: ${caseId}`);
  }
  return buildDocketLiveObjectBound({
    objectId,
    scanPath,
    bindNotes:
      "WS-DOCKET-C-v2: casefile bound to Public Docket case URL. Upgrade scan_path to /c/{profile}?q={qr} when a child-object QR is issued. discovery_opt_in stays false (C-v3).",
  });
}

/** Fixture bind record used by kit / preflight / tests. */
export function docketCasefileFixtureLiveObject() {
  const scanPath = docketScanPathFromCardQr(
    DOCKET_CASEFILE_FIXTURE_PROFILE_ID,
    DOCKET_CASEFILE_FIXTURE_QR_ID
  );
  return buildDocketLiveObjectBound({
    objectId: DOCKET_CASEFILE_FIXTURE_OBJECT_ID,
    scanPath: /** @type {string} */ (scanPath),
    bindNotes:
      "WS-DOCKET-C-v2 fixture bind (child-object QR shape). Not a public roster slug.",
  });
}

/**
 * Validate a live_object bind block (same rules as validateDocketCase live_object).
 * @param {unknown} raw
 * @returns {{ ok: true, live_object: Record<string, unknown> } | { ok: false, errors: string[] }}
 */
export function validateDocketLiveObjectBind(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["live_object must be an object"] };
  }
  const lo = /** @type {Record<string, unknown>} */ (raw);
  const loStatus = String(lo.status ?? "").trim();
  if (!DOCKET_LIVE_OBJECT_STATUSES.includes(loStatus)) {
    errors.push(
      `live_object.status must be one of: ${DOCKET_LIVE_OBJECT_STATUSES.join(", ")}`
    );
  }
  if (typeof lo.discovery_opt_in !== "boolean") {
    errors.push("live_object.discovery_opt_in must be a boolean");
  } else {
    validateDocketDiscoveryOptInFields(lo, null, errors, {
      requireStewardMembership: false,
    });
  }
  if (loStatus === "bound") {
    const oid = typeof lo.object_id === "string" ? lo.object_id.trim() : "";
    if (!oid) errors.push("live_object.object_id is required when status is bound");
    const scan = typeof lo.scan_path === "string" ? lo.scan_path.trim() : "";
    if (!scan) errors.push("live_object.scan_path is required when status is bound");
    else if (!scan.startsWith("/")) {
      errors.push("live_object.scan_path must be a site path starting with /");
    }
  } else {
    if (lo.object_id != null) {
      errors.push("live_object.object_id must be null unless status is bound");
    }
    if (lo.scan_path != null) {
      errors.push("live_object.scan_path must be null unless status is bound");
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, live_object: lo };
}

/**
 * Starter-four roster cases must be bound under the charter (product gate).
 * @param {Array<Record<string, unknown>>} cases
 */
export function assertPublicDocketCasesBound(cases) {
  const errors = [];
  if (!Array.isArray(cases)) {
    return { ok: false, errors: ["cases must be an array"] };
  }
  for (const id of DOCKET_CASE_IDS) {
    const row = cases.find((c) => String(c?.id ?? "") === id);
    if (!row) {
      errors.push(`${id}: missing from cases array`);
      continue;
    }
    const lo =
      row.live_object && typeof row.live_object === "object"
        ? /** @type {Record<string, unknown>} */ (row.live_object)
        : null;
    if (!lo) {
      errors.push(`${id}: missing live_object`);
      continue;
    }
    if (String(lo.status ?? "") !== "bound") {
      errors.push(`${id}: live_object.status must be bound (got ${lo.status})`);
    }
    if (lo.discovery_opt_in !== false) {
      errors.push(`${id}: discovery_opt_in must be false on starter-four (C-v3)`);
    }
    const expectedId = docketCasefileObjectId(id);
    if (String(lo.object_id ?? "") !== expectedId) {
      errors.push(`${id}: object_id should be ${expectedId}`);
    }
    const mode = classifyDocketLiveObjectScanMode(
      typeof lo.scan_path === "string" ? lo.scan_path : null,
      id
    );
    if (mode !== "interim" && mode !== "child_qr") {
      const expectedPath = docketCasefileScanPath(id);
      errors.push(
        `${id}: scan_path must be interim ${expectedPath} or child QR /c/{profile}?q={qr}`
      );
    }
    const bindCheck = validateDocketLiveObjectBind(lo);
    if (!bindCheck.ok) {
      errors.push(`${id}: ${bindCheck.errors.join("; ")}`);
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true };
}

/** @deprecated Use assertPublicDocketCasesBound — kept as alias during transition. */
export function assertPublicDocketCasesUnbound(cases) {
  return assertPublicDocketCasesBound(cases);
}

/**
 * Session storage key for QR upgrade preview (does not rewrite published case JSON).
 * @param {string} caseId
 */
export function docketQrUpgradeStorageKey(caseId) {
  return `hc_docket_qr_upgrade_v0:${String(caseId ?? "").trim()}`;
}

/**
 * @param {Storage | null | undefined} storage
 * @param {string} caseId
 * @returns {Record<string, unknown> | null}
 */
export function readDocketQrUpgradePreviewFromStorage(storage, caseId) {
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    const raw = storage.getItem(docketQrUpgradeStorageKey(caseId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const check = validateDocketLiveObjectBind(parsed);
    return check.ok ? check.live_object : null;
  } catch {
    return null;
  }
}

/**
 * @param {Storage | null | undefined} storage
 * @param {string} caseId
 * @param {Record<string, unknown> | null} liveObject
 */
export function writeDocketQrUpgradePreviewToStorage(storage, caseId, liveObject) {
  if (!storage || typeof storage.setItem !== "function") return;
  const key = docketQrUpgradeStorageKey(caseId);
  if (!liveObject) {
    storage.removeItem(key);
    return;
  }
  const check = validateDocketLiveObjectBind(liveObject);
  if (!check.ok) {
    throw new Error(check.errors.join("; "));
  }
  if (!isDocketChildObjectScanPath(String(check.live_object.scan_path ?? ""))) {
    throw new Error("QR upgrade preview must use /c/{profile}?q={qr} scan_path");
  }
  storage.setItem(key, JSON.stringify(check.live_object));
}

/**
 * HTML for steward shell `#qr-upgrade` checklist (interim → child QR).
 * @param {Record<string, unknown>} liveObject
 * @param {string} caseId
 */
export function renderDocketQrUpgradeHtml(liveObject, caseId) {
  const lo =
    liveObject && typeof liveObject === "object"
      ? /** @type {Record<string, unknown>} */ (liveObject)
      : {};
  const scan = String(lo.scan_path ?? "").trim();
  const mode = classifyDocketLiveObjectScanMode(scan, caseId);
  const modeLabel =
    mode === "child_qr"
      ? "child QR"
      : mode === "interim"
        ? "interim case URL"
        : mode === "none"
          ? "none"
          : "other";
  const steps = docketCv2MintSteps()
    .map((s) => `<li>${escapeBindHtml(s)}</li>`)
    .join("");
  const scanLine = scan
    ? `<p class="form-hint">Published scan path: <code>${escapeBindHtml(scan)}</code> · mode <span class="docket-status">${escapeBindHtml(modeLabel)}</span></p>`
    : `<p class="form-hint">No scan path yet.</p>`;
  return `<div class="docket-qr-upgrade" data-docket-scan-mode="${escapeBindHtml(mode)}">
  ${scanLine}
  <p class="form-hint">Optional upgrade: issue a child-object QR, then set <code>live_object.scan_path</code> to <code>/c/{profile}?q={qr}</code>. Discovery opt-in is a separate C-v3 step. Session preview below does not rewrite published case JSON.</p>
  <ol class="docket-wanted-counts">${steps}</ol>
  <p class="form-hint"><a href="/docket/goods/qr-field-kit/">QR field kit</a> · <a href="/dev/ws-docket-c-v2-field-walk.html">C-v2 field walk</a> · <a href="/dev/ws-docket-c-v3-field-walk.html">C-v3 field walk</a></p>
</div>`;
}

/**
 * @param {string} value
 */
function escapeBindHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Mint checklist: upgrade interim case URL binds to child-object QRs.
 */
export function docketCv2MintSteps() {
  return [
    "Starter-four cases are bound to /docket/{id}/ (interim casefile URL) under the nonviolence charter.",
    "Optional upgrade: unlock a steward parent card → create child_object → issue-qr.",
    "Then set scan_path to /c/{profile_id}?q={qr_id}; keep object_id = obj_docket_casefile_{id}.",
    "Preview the upgraded live_object on /docket/{id}/steward/ (#qr-upgrade) before editing published JSON.",
    "After child QR ships, optional C-v3 discovery opt-in requires dual steward approvals + listed_reason (starter-four stay off).",
  ];
}
