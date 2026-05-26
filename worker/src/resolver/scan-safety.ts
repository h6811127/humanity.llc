import type { ScanContext } from "../db/scan";
import { PAYLOAD_TYPES, verifySignedDocument } from "../crypto";
import { parseManifestoDisplay } from "./manifesto-display";
import type { ScanViewModel, StatusTone } from "./scan-state";

/** Client sessionStorage prefix (docs/SCANNER_EXPERIENCE.md Phase B). */
export const SCAN_FIRST_SEEN_STORAGE_PREFIX = "hc_first_scan_";

export const SCAN_SAFETY_FIRST_SEEN_NEW =
  "First time you opened this object on this device";
export const SCAN_SAFETY_FIRST_SEEN_RETURN =
  "You opened this before on this device";
export const SCAN_SAFETY_RESOLVER_VERIFIED_COPY =
  "Signed object verified by resolver";

export interface ScanSafetyModel {
  objectSignatureVerified: boolean;
  stewardRegistered: boolean;
}

export const EMPTY_SCAN_SAFETY: ScanSafetyModel = {
  objectSignatureVerified: false,
  stewardRegistered: false,
};

export async function buildScanSafetyModel(
  ctx: ScanContext,
  vm: ScanViewModel
): Promise<ScanSafetyModel> {
  const stewardRegistered =
    vm.verificationState === "steward" ||
    ctx.verification?.state === "steward";

  let objectSignatureVerified = false;
  if (ctx.card && ctx.qr) {
    try {
      const cardDoc = JSON.parse(
        ctx.card.card_document_json
      ) as Record<string, unknown>;
      const qrDoc = JSON.parse(
        ctx.qr.credential_document_json
      ) as Record<string, unknown>;
      const cardVerify = await verifySignedDocument(cardDoc, {
        expectedType: PAYLOAD_TYPES.HUMANITY_CARD,
        expectedPublicKeyBase58: ctx.card.public_key,
      });
      const qrVerify = await verifySignedDocument(qrDoc, {
        expectedType: PAYLOAD_TYPES.QR_CREDENTIAL,
        expectedPublicKeyBase58: ctx.card.public_key,
      });
      objectSignatureVerified = cardVerify.ok && qrVerify.ok;
    } catch {
      objectSignatureVerified = false;
    }
  }

  return { objectSignatureVerified, stewardRegistered };
}

export interface SafetyStatusDisplay {
  label: string;
  tone: StatusTone;
  stripClass: string;
}

export function safetyStatusDisplay(vm: ScanViewModel): SafetyStatusDisplay {
  switch (vm.kind) {
    case "active":
      return {
        label: "Active",
        tone: "live",
        stripClass: "scan-safety-strip--live",
      };
    case "qr_revoked":
    case "card_revoked":
      return {
        label: "Revoked",
        tone: "bad",
        stripClass: "scan-safety-strip--bad",
      };
    case "qr_expired":
    case "card_expired":
      return {
        label: "Expired",
        tone: "warn",
        stripClass: "scan-safety-strip--warn",
      };
    case "card_suspended":
      return {
        label: "Suspended",
        tone: "warn",
        stripClass: "scan-safety-strip--warn",
      };
    case "qr_replaced":
      return {
        label: "Replaced",
        tone: "neutral",
        stripClass: "scan-safety-strip--neutral",
      };
    case "unknown_profile":
    case "unknown_qr":
      return {
        label: "Unknown",
        tone: "neutral",
        stripClass: "scan-safety-strip--neutral",
      };
    case "malformed":
    case "profile_qr_mismatch":
      return {
        label: "Invalid",
        tone: "bad",
        stripClass: "scan-safety-strip--bad",
      };
    default:
      return {
        label: vm.primaryBadge.label,
        tone: vm.primaryBadge.tone,
        stripClass: `scan-safety-strip--${vm.primaryBadge.tone}`,
      };
  }
}

function formatIssuedChip(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(t));
  return `Issued ${formatted}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderSafetyChips(vm: ScanViewModel, safety: ScanSafetyModel): string {
  const chips: string[] = [];
  const display = parseManifestoDisplay(vm.manifestoLine);
  if (display.kind === "status_plate" && display.objectLabel) {
    chips.push(`Object · ${display.objectLabel}`);
  } else if (display.kind === "lost_item_relay" && display.objectLabel) {
    chips.push(`Item · ${display.objectLabel}`);
  }
  if (vm.profileId && vm.qrId) {
    chips.push("Revocable");
  }
  const issued = formatIssuedChip(vm.qrIssuedAt);
  if (issued) chips.push(issued);
  if (safety.stewardRegistered) {
    chips.push("Steward registered");
  } else if (vm.profileId) {
    chips.push("On Humanity network");
  }
  if (!chips.length) return "";
  return `<ul class="scan-safety-chips">${chips
    .map((c) => `<li>${escapeHtml(c)}</li>`)
    .join("")}</ul>`;
}

export function renderScannerSafetyHeader(
  vm: ScanViewModel,
  safety: ScanSafetyModel
): string {
  const status = safetyStatusDisplay(vm);
  const handlePart = vm.handle
    ? ` <span class="scan-safety-handle">@${escapeHtml(vm.handle)}</span>`
    : "";
  const profileAttr = vm.profileId
    ? ` data-profile-id="${escapeHtml(vm.profileId)}"`
    : "";
  const qrAttr = vm.qrId ? ` data-qr-id="${escapeHtml(vm.qrId)}"` : "";
  const resolverRow = safety.objectSignatureVerified
    ? `<p class="scan-safety-resolver">${escapeHtml(SCAN_SAFETY_RESOLVER_VERIFIED_COPY)}</p>`
    : "";
  const chips = renderSafetyChips(vm, safety);

  return `<section class="scan-safety-header" id="scan-safety-header" aria-label="Scanner safety"${profileAttr}${qrAttr}>
  <div class="scan-safety-top">
    <p class="scan-safety-badge"><span class="pass-dot" aria-hidden="true"></span><span>Humanity object</span>${handlePart}</p>
    <div class="scan-safety-strip ${status.stripClass}" role="status">
      <span class="scan-safety-strip-icon" aria-hidden="true"></span>
      <span class="scan-safety-strip-label">${escapeHtml(status.label)}</span>
    </div>
  </div>
  ${chips}
  ${resolverRow}
  <p class="scan-safety-first-seen" id="scan-safety-first-seen" hidden></p>
</section>`;
}

/** One status strip for the Live check hero (Path 2 data-arriving — docs/SCAN_PAGE_TRUST_UI.md). */
export function renderHeroStatusStrip(vm: ScanViewModel): string {
  const status = safetyStatusDisplay(vm);
  return `<div class="scan-safety-strip ${status.stripClass} scan-arrive-strip" role="status" data-arrive-label="${escapeHtml(status.label)}">
      <span class="scan-safety-strip-icon" aria-hidden="true"></span>
      <span class="scan-safety-strip-label scan-arrive-status-label">Checking live status…</span>
    </div>`;
}

/** Phase B: device-local first-open disclosure (border pulse → scan-live-check-arrive.mjs). */
export function renderScanSafetyHeaderScript(): string {
  return `<script>
(function () {
  var header = document.getElementById("scan-safety-header");
  if (!header) return;
  var pid = header.dataset.profileId;
  var qid = header.dataset.qrId;
  var firstEl = document.getElementById("scan-safety-first-seen");
  if (pid && qid && firstEl) {
    var key = ${JSON.stringify(SCAN_FIRST_SEEN_STORAGE_PREFIX)} + pid + "_" + qid;
    var seen = false;
    try { seen = sessionStorage.getItem(key) === "1"; } catch (e) {}
    firstEl.textContent = seen
      ? ${JSON.stringify(SCAN_SAFETY_FIRST_SEEN_RETURN)}
      : ${JSON.stringify(SCAN_SAFETY_FIRST_SEEN_NEW)};
    firstEl.hidden = false;
    if (!seen) {
      try { sessionStorage.setItem(key, "1"); } catch (e) {}
    }
  }
})();
</script>`;
}
