/**
 * WS-DOCKET chapter child-QR mint (QR-mint-v0).
 * Real Worker parent card + status_plate + issue-qr for non-starter chapter pins.
 * Never mints starter-four Most Wanted casefiles. Never writes production without explicit API_ORIGIN.
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § WS-DOCKET-C
 */

import {
  docketScanPathFromCardQr,
  isDocketChildObjectScanPath,
  parseDocketChildObjectScanPath,
} from "./docket-live-object-bind-core.mjs";
import { DOCKET_STARTER_CASE_IDS } from "./docket-discovery-opt-in-core.mjs";

export const DOCKET_CHAPTER_MINT_KIND = "hc.docket.chapter_mint_receipt.v0";
export const DOCKET_CHAPTER_MINT_VERSION = 1;
export const DOCKET_CHAPTER_MINT_KIT_REL =
  "site/dev/ws-docket-chapter-mint-v0-field-walk.html";
export const DOCKET_CHAPTER_MINT_STATUSES = Object.freeze(["fixture", "minted"]);

/** Base58 profile id (20–32) — mirrors Worker PROFILE_ID_REGEX. */
export const DOCKET_MINT_PROFILE_ID_RE =
  /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{20,32}$/;

/** Child QR id — mirrors Worker QR_ID_REGEX. */
export const DOCKET_MINT_QR_ID_RE =
  /^qr_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8,40}$/;

export const DOCKET_CHAPTER_MINT_OBJECT_TYPE = "status_plate";
export const DOCKET_CHAPTER_PRODUCTION_ORIGIN = "https://humanity.llc";

/**
 * Guard a chapter mint before generating keys or mutating a Worker.
 * Production replay is intentionally noisy and requires two explicit flags.
 * @param {{
 *   apiOrigin: string;
 *   scanOrigin: string;
 *   production?: boolean;
 *   confirmProduction?: boolean;
 *   replay?: boolean;
 *   currentMintStatus?: string;
 * }} input
 */
export function assessDocketChapterMintExecution(input) {
  const apiOrigin = String(input.apiOrigin ?? "").replace(/\/$/, "");
  const scanOrigin = String(input.scanOrigin ?? "").replace(/\/$/, "");
  const isLocal = (() => {
    try {
      const hostname = new URL(apiOrigin).hostname;
      return hostname === "localhost" || hostname === "127.0.0.1";
    } catch {
      return false;
    }
  })();
  const isProduction = apiOrigin === DOCKET_CHAPTER_PRODUCTION_ORIGIN;
  const errors = [];

  if (!isLocal && !isProduction) {
    errors.push(
      `API_ORIGIN must be local or ${DOCKET_CHAPTER_PRODUCTION_ORIGIN}`
    );
  }
  if (isProduction && input.production !== true) {
    errors.push("production mint requires --production");
  }
  if (isProduction && input.confirmProduction !== true) {
    errors.push("production mint requires --confirm-production-mint");
  }
  if (isProduction && scanOrigin !== DOCKET_CHAPTER_PRODUCTION_ORIGIN) {
    errors.push(
      `production SCAN_ORIGIN must be ${DOCKET_CHAPTER_PRODUCTION_ORIGIN}`
    );
  }
  if (!isProduction && input.production === true) {
    errors.push("--production requires API_ORIGIN=https://humanity.llc");
  }
  if (
    String(input.currentMintStatus ?? "fixture") === "minted" &&
    input.replay !== true
  ) {
    errors.push("minted registry entry requires explicit --replay");
  }

  return {
    ok: errors.length === 0,
    errors,
    isLocal,
    isProduction,
  };
}

/**
 * @returns {string[]}
 */
export function docketChapterMintV0Steps() {
  return [
    "Confirm starter-four stay discovery_opt_in: false (never mint Most Wanted into city discovery).",
    "Start local Worker: npm run worker:migrate:local && npm run worker:apply-child-object-qr-schema && npm run worker:dev",
    "Run: API_ORIGIN=http://127.0.0.1:8787 npm run ws-docket:chapter-mint -- --write-pins",
    "Confirm /docket/chapters/ shows mint_status minted + real /c/{profile}?q={qr} path.",
    "Keys stay in worker/.local/docket-chapter-mint.json (gitignored) — never commit.",
    "Production replay: API_ORIGIN=https://humanity.llc npm run ws-docket:chapter-mint -- --production --confirm-production-mint --replay --write-pins.",
  ];
}

/**
 * @param {string | null | undefined} profileId
 * @param {string | null | undefined} qrId
 */
export function isMintableDocketChildQrPair(profileId, qrId) {
  return (
    DOCKET_MINT_PROFILE_ID_RE.test(String(profileId ?? "").trim()) &&
    DOCKET_MINT_QR_ID_RE.test(String(qrId ?? "").trim())
  );
}

/**
 * @param {string | null | undefined} scanPath
 */
export function isMintedDocketChildScanPath(scanPath) {
  const parsed = parseDocketChildObjectScanPath(scanPath);
  if (!parsed) return false;
  return isMintableDocketChildQrPair(parsed.profileId, parsed.qrId);
}

/**
 * @param {string | null | undefined} scanPath
 */
export function isFixtureDocketChildScanPath(scanPath) {
  if (!isDocketChildObjectScanPath(scanPath)) return false;
  return !isMintedDocketChildScanPath(scanPath);
}

/**
 * Stable object_id for a chapter pin casefile.
 * @param {string} pinId
 */
export function docketChapterCasefileObjectId(pinId) {
  const id = String(pinId ?? "")
    .trim()
    .toLowerCase();
  if (!id) return null;
  if (DOCKET_STARTER_CASE_IDS.includes(id)) {
    throw new Error("Refusing starter-four pin id for chapter mint");
  }
  return `obj_docket_casefile_${id}`;
}

/**
 * Build public mint receipt (no private keys).
 * @param {{
 *   pinId: string;
 *   profileId: string;
 *   qrId: string;
 *   objectId: string;
 *   handle?: string;
 *   scanOrigin?: string;
 *   mintedAt?: string;
 *   apiOrigin?: string;
 * }} input
 */
export function buildDocketChapterMintReceipt(input) {
  const pinId = String(input.pinId ?? "").trim();
  const profileId = String(input.profileId ?? "").trim();
  const qrId = String(input.qrId ?? "").trim();
  const objectId =
    String(input.objectId ?? "").trim() ||
    docketChapterCasefileObjectId(pinId) ||
    "";
  if (!pinId) throw new Error("pinId required");
  if (DOCKET_STARTER_CASE_IDS.includes(pinId)) {
    throw new Error("Refusing to mint starter-four pin");
  }
  if (!isMintableDocketChildQrPair(profileId, qrId)) {
    throw new Error("profileId/qrId must be mintable Base58 Worker ids");
  }
  if (!objectId.startsWith("obj_")) {
    throw new Error("objectId must start with obj_");
  }
  const scanPath = docketScanPathFromCardQr(profileId, qrId);
  if (!scanPath) throw new Error("scan_path build failed");
  const scanOrigin = String(input.scanOrigin ?? "https://humanity.llc").replace(
    /\/$/,
    ""
  );
  return {
    version: DOCKET_CHAPTER_MINT_VERSION,
    kind: DOCKET_CHAPTER_MINT_KIND,
    pin_id: pinId,
    object_id: objectId,
    object_type: DOCKET_CHAPTER_MINT_OBJECT_TYPE,
    parent_profile_id: profileId,
    qr_id: qrId,
    scan_path: scanPath,
    scan_url: `${scanOrigin}${scanPath}`,
    handle: input.handle ? String(input.handle) : null,
    mint_status: "minted",
    minted_at: String(input.mintedAt ?? new Date().toISOString()),
    api_origin: input.apiOrigin ? String(input.apiOrigin) : null,
    writes_published_case_json: false,
    starter_four_safe: true,
  };
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true; receipt: Record<string, unknown> } | { ok: false; errors: string[] }}
 */
export function validateDocketChapterMintReceipt(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["receipt must be an object"] };
  }
  const doc = /** @type {Record<string, unknown>} */ (raw);
  if (doc.kind !== DOCKET_CHAPTER_MINT_KIND) {
    errors.push(`kind must be ${DOCKET_CHAPTER_MINT_KIND}`);
  }
  if (doc.version !== DOCKET_CHAPTER_MINT_VERSION) {
    errors.push(`version must be ${DOCKET_CHAPTER_MINT_VERSION}`);
  }
  if (doc.mint_status !== "minted") {
    errors.push("mint_status must be minted");
  }
  if (doc.writes_published_case_json !== false) {
    errors.push("writes_published_case_json must be false");
  }
  if (doc.starter_four_safe !== true) {
    errors.push("starter_four_safe must be true");
  }
  const pinId = String(doc.pin_id ?? "").trim();
  if (!pinId) errors.push("pin_id required");
  else if (DOCKET_STARTER_CASE_IDS.includes(pinId)) {
    errors.push("pin_id must not be a starter-four id");
  }
  if (!isMintableDocketChildQrPair(doc.parent_profile_id, doc.qr_id)) {
    errors.push("parent_profile_id + qr_id must be mintable Base58 ids");
  }
  if (!isMintedDocketChildScanPath(String(doc.scan_path ?? ""))) {
    errors.push("scan_path must be a minted /c/{profile}?q={qr} path");
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, receipt: doc };
}

/**
 * Apply a mint receipt onto one chapter pin row (immutable).
 * @param {Record<string, unknown>} pin
 * @param {Record<string, unknown>} receipt
 */
export function applyDocketChapterMintReceiptToPin(pin, receipt) {
  const check = validateDocketChapterMintReceipt(receipt);
  if (!check.ok) {
    throw new Error(check.errors.join("; "));
  }
  const pinId = String(pin.id ?? "").trim();
  if (pinId !== String(receipt.pin_id)) {
    throw new Error(
      `receipt pin_id ${receipt.pin_id} does not match pin ${pinId}`
    );
  }
  const live =
    pin.live_object && typeof pin.live_object === "object"
      ? { .../** @type {Record<string, unknown>} */ (pin.live_object) }
      : {};
  live.object_id = String(receipt.object_id);
  live.scan_path = String(receipt.scan_path);
  live.status = "bound";
  live.bind_notes = `WS-DOCKET chapter mint (QR-mint-v0): real child QR ${receipt.qr_id} on parent ${receipt.parent_profile_id}. discovery_opt_in stays chapter-only.`;
  return {
    ...pin,
    mint_status: "minted",
    live_object: live,
  };
}

/**
 * Apply receipt to full pins registry document.
 * @param {Record<string, unknown>} doc
 * @param {Record<string, unknown>} receipt
 */
export function applyDocketChapterMintReceiptToRegistry(doc, receipt) {
  const pins = Array.isArray(doc.pins) ? [...doc.pins] : [];
  const pinId = String(receipt.pin_id ?? "").trim();
  const idx = pins.findIndex(
    (row) =>
      row &&
      typeof row === "object" &&
      String(/** @type {Record<string, unknown>} */ (row).id ?? "") === pinId
  );
  if (idx < 0) {
    throw new Error(`pin ${pinId} not found in registry`);
  }
  const nextPins = [...pins];
  nextPins[idx] = applyDocketChapterMintReceiptToPin(
    /** @type {Record<string, unknown>} */ (pins[idx]),
    receipt
  );
  return { ...doc, pins: nextPins };
}

/**
 * Child-object fields for mint POST (unsigned shape).
 * @param {{
 *   pinId: string;
 *   profileId: string;
 *   displayLabel: string;
 *   publicState?: string;
 *   objectId?: string;
 *   createdAt?: string;
 * }} input
 */
export function buildDocketChapterChildObjectFields(input) {
  const pinId = String(input.pinId ?? "").trim();
  const objectId =
    String(input.objectId ?? "").trim() ||
    docketChapterCasefileObjectId(pinId) ||
    "";
  const createdAt = String(input.createdAt ?? new Date().toISOString());
  return {
    object_id: objectId,
    parent_profile_id: String(input.profileId ?? "").trim(),
    object_type: DOCKET_CHAPTER_MINT_OBJECT_TYPE,
    public_label: String(input.displayLabel ?? "").trim() || pinId,
    public_state:
      String(input.publicState ?? "").trim() ||
      "Chapter teach-in · Public Docket commons",
    status: "active",
    created_at: createdAt,
    updated_at: createdAt,
  };
}
