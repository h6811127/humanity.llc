/**
 * WS-DOCKET-C-v3 — discovery opt-in for Public Docket casefiles.
 * Opt-in only: never default stranger pollution. Starter-four stay false.
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § WS-DOCKET-C
 */

import {
  DOCKET_EDIT_DUAL_GATE_THRESHOLD,
  docketStewardIdSet,
  normalizeDocketEditApprovals,
} from "./docket-edit-proposal-core.mjs";

export const DOCKET_CV3_SPEC_ANCHOR = "WS-DOCKET-C";
export const DOCKET_CV3_KIT_REL = "site/dev/ws-docket-c-v3-field-walk.html";

/** C-v3 engineering unlock — schema allows true when rules below are met. */
export const DOCKET_CV3_DISCOVERY_OPT_IN_UNLOCKED = true;

/** Mirror of starter roster — keep discovery_opt_in false on these ids. */
export const DOCKET_STARTER_CASE_IDS = Object.freeze([
  "netanyahu",
  "putin",
  "altman",
  "musk",
  "zuckerberg",
  "andreessen",
  "thiel",
]);

/**
 * @param {string | null | undefined} scanPath
 */
export function isDocketChildObjectScanPathForDiscovery(scanPath) {
  const scan = String(scanPath ?? "").trim();
  if (!scan.startsWith("/c/")) return false;
  const q = scan.indexOf("?q=");
  if (q < 0) return false;
  const profile = decodeURIComponent(scan.slice(3, q).trim());
  const qr = decodeURIComponent(scan.slice(q + 3).trim());
  return Boolean(profile && qr && !profile.includes("/") && !qr.includes("&"));
}

/**
 * @param {string} caseId
 */
export function docketDiscoveryOptInStorageKey(caseId) {
  return `hc_docket_discovery_opt_in_preview_v1_${String(caseId ?? "").trim()}`;
}

/**
 * Validate discovery_opt_in (+ optional discovery block) on a live_object.
 * @param {Record<string, unknown>} liveObject
 * @param {unknown} stewards
 * @param {string[]} errors
 * @param {{ requireStewardMembership?: boolean }} [opts]
 */
export function validateDocketDiscoveryOptInFields(
  liveObject,
  stewards,
  errors,
  opts = {}
) {
  const requireStewardMembership = opts.requireStewardMembership !== false;
  const lo = liveObject;
  if (typeof lo.discovery_opt_in !== "boolean") {
    errors.push("live_object.discovery_opt_in must be a boolean");
    return;
  }

  if (lo.discovery_opt_in === false) {
    if (lo.discovery != null) {
      errors.push(
        "live_object.discovery must be omitted or null when discovery_opt_in is false"
      );
    }
    return;
  }

  if (!DOCKET_CV3_DISCOVERY_OPT_IN_UNLOCKED) {
    errors.push(
      "live_object.discovery_opt_in must stay false until C-v3 (no default stranger discovery)"
    );
    return;
  }

  const status = String(lo.status ?? "").trim();
  if (status !== "bound") {
    errors.push("live_object.discovery_opt_in true requires status bound");
  }
  const scan = typeof lo.scan_path === "string" ? lo.scan_path.trim() : "";
  if (!isDocketChildObjectScanPathForDiscovery(scan)) {
    errors.push(
      "live_object.discovery_opt_in true requires child QR scan_path (/c/{profile}?q={qr})"
    );
  }

  const disc = lo.discovery;
  if (!disc || typeof disc !== "object" || Array.isArray(disc)) {
    errors.push(
      "live_object.discovery object is required when discovery_opt_in is true"
    );
    return;
  }
  const d = /** @type {Record<string, unknown>} */ (disc);
  const reason = typeof d.listed_reason === "string" ? d.listed_reason.trim() : "";
  if (!reason) {
    errors.push("live_object.discovery.listed_reason is required when opt-in is true");
  }
  const approvals = normalizeDocketEditApprovals(d.approvals);
  if (approvals.length < DOCKET_EDIT_DUAL_GATE_THRESHOLD) {
    errors.push(
      `live_object.discovery.approvals needs ≥${DOCKET_EDIT_DUAL_GATE_THRESHOLD} distinct steward ids`
    );
  }
  if (requireStewardMembership) {
    const stewardIds = docketStewardIdSet(stewards);
    for (const id of approvals) {
      if (!stewardIds.has(id)) {
        errors.push(
          `live_object.discovery.approvals id "${id}" is not in stewards[]`
        );
      }
    }
  }
  if (d.region_id != null && typeof d.region_id !== "string") {
    errors.push("live_object.discovery.region_id must be a string when present");
  }
}

/**
 * Build a valid discovery-opt-in live_object (fixture / preview).
 * @param {{
 *   caseId: string;
 *   profileId: string;
 *   qrId: string;
 *   listedReason: string;
 *   approvals: string[];
 *   regionId?: string | null;
 *   bindNotes?: string | null;
 * }} input
 */
export function buildDocketDiscoveryOptInLiveObject(input) {
  const caseId = String(input.caseId ?? "")
    .trim()
    .toLowerCase();
  const profile = String(input.profileId ?? "").trim();
  const qr = String(input.qrId ?? "").trim();
  if (!caseId || !profile || !qr) {
    throw new Error(`invalid discovery opt-in input for case: ${input.caseId}`);
  }
  const scanPath = `/c/${encodeURIComponent(profile)}?q=${encodeURIComponent(qr)}`;
  const approvals = normalizeDocketEditApprovals(input.approvals);
  /** @type {Record<string, unknown>} */
  const discovery = {
    listed_reason: String(input.listedReason ?? "").trim(),
    approvals,
  };
  const region = input.regionId == null ? null : String(input.regionId).trim();
  if (region) discovery.region_id = region;

  return {
    status: "bound",
    object_id: `obj_docket_casefile_${caseId}`,
    scan_path: scanPath,
    discovery_opt_in: true,
    discovery,
    bind_notes:
      typeof input.bindNotes === "string"
        ? input.bindNotes
        : `WS-DOCKET-C-v3: discovery opt-in for ${caseId}. Branch pin only — not homepage default.`,
  };
}

/**
 * Starter-four must never opt into discovery (branch pollution gate).
 * @param {Array<Record<string, unknown>>} cases
 */
export function assertStarterFourDiscoveryOptInOff(cases) {
  const errors = [];
  if (!Array.isArray(cases)) {
    return { ok: false, errors: ["cases must be an array"] };
  }
  for (const id of DOCKET_STARTER_CASE_IDS) {
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
    if (lo.discovery_opt_in !== false) {
      errors.push(
        `${id}: discovery_opt_in must stay false on starter-four (C-v3 branch gate)`
      );
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true };
}

/**
 * @param {Storage | null | undefined} storage
 * @param {string} caseId
 */
export function readDocketDiscoveryOptInPreview(storage, caseId) {
  if (!storage || typeof storage.getItem !== "function") return null;
  const raw = storage.getItem(docketDiscoveryOptInStorageKey(caseId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return /** @type {Record<string, unknown>} */ (parsed);
  } catch {
    return null;
  }
}

/**
 * @param {Storage | null | undefined} storage
 * @param {string} caseId
 * @param {Record<string, unknown> | null} liveObject
 */
export function writeDocketDiscoveryOptInPreview(storage, caseId, liveObject) {
  if (!storage || typeof storage.setItem !== "function") return;
  const key = docketDiscoveryOptInStorageKey(caseId);
  if (!liveObject) {
    storage.removeItem(key);
    return;
  }
  storage.setItem(key, JSON.stringify(liveObject));
}

/**
 * @returns {string[]}
 */
export function docketCv3OptInSteps() {
  return [
    "Casefile must be bound with a child-object QR (/c/{profile}?q={qr}) — not an interim HTML-only path.",
    "Two distinct stewards approve discovery.approvals (same dual-gate threshold as DG-v0).",
    "Write live_object.discovery.listed_reason (why this pin exists; chapter / teach-in / venue).",
    "Set discovery_opt_in: true only after approvals; never default true on create.",
    "Starter-four public roster cases stay discovery_opt_in: false — branch must not pollute stranger discovery.",
    "Discovery pins project browse indexes only; they do not change scan proof or homepage front door.",
  ];
}

/**
 * Steward shell `#discovery-opt-in` panel HTML.
 * @param {Record<string, unknown>} liveObject
 * @param {string} caseId
 */
export function renderDocketDiscoveryOptInHtml(liveObject, caseId) {
  const lo =
    liveObject && typeof liveObject === "object"
      ? /** @type {Record<string, unknown>} */ (liveObject)
      : {};
  const opted = lo.discovery_opt_in === true;
  const status = opted ? "opted in" : "off (default)";
  const id = String(caseId ?? "").trim();
  const isStarter = DOCKET_STARTER_CASE_IDS.includes(id);
  const steps = docketCv3OptInSteps()
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("");
  const gateNote = isStarter
    ? `<p class="form-hint"><strong>Starter-four gate:</strong> this case must stay <code>discovery_opt_in: false</code> in published JSON. Session preview below is for rehearsal only.</p>`
    : `<p class="form-hint">Non-roster fixtures may publish opt-in when child QR + dual approvals + listed_reason are present.</p>`;

  return `<div class="docket-discovery-opt-in" data-docket-discovery-opt-in="${opted ? "true" : "false"}" data-docket-starter-four="${isStarter ? "true" : "false"}">
  <p class="docket-live-object-status"><span class="docket-status">${escapeHtml(status)}</span></p>
  ${gateNote}
  <p class="form-hint">C-v3 unlocks optional discovery pins. Never homepage default. Never mugshot / WANTED chrome.</p>
  <ol class="docket-wanted-counts">${steps}</ol>
  <p class="form-hint"><a href="/dev/ws-docket-c-v3-field-walk.html">C-v3 field walk</a> · <a href="/docket/goods/qr-field-kit/">QR field kit</a></p>
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
