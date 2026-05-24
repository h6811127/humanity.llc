import type { ScanViewModel } from "./scan-state";
import { parseManifestoDisplay } from "./manifesto-display";
import { scanListIcon, type ScanIconId } from "./scan-icons";
import { BEARER_WARNING } from "./trust-copy";
import { SCAN_PASS_FLIP_JS } from "./scan-pass-flip";
import { SCAN_PASS_CSS } from "./scan-pass-styles";
import {
  humanTrustDisplay,
  humanTrustListIcon,
} from "./verification-display";
import { renderScanQrMarkup } from "./scan-qr";

/** Response header — confirms pass-card scan UI (not legacy .block layout). */
export const SCAN_UI_VERSION = "pass-v17";

/**
 * Public scan UI — flippable pass card (landing) + iOS grouped trust blocks below (spec §7).
 */
export async function renderScanPage(
  vm: ScanViewModel,
  origin: string
): Promise<string> {
  const title = pageTitle(vm);
  let qrMarkup = "";
  if (vm.scanUrl) {
    try {
      qrMarkup = await renderScanQrMarkup(vm.scanUrl);
    } catch {
      qrMarkup = "";
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="color-scheme" content="light" />
  <meta name="theme-color" content="#ffffff" />
  <title>${escapeHtml(title)} · humanity.llc</title>
  <meta name="description" content="${escapeHtml(scanLead(vm))}" />
  <link rel="icon" href="${escapeHtml(origin)}/assets/red_qr_transparent_bg.png" type="image/png" />
  <style>${SCAN_PASS_CSS}</style>
</head>
<body>
  <div class="page scan-page">
    ${renderTopHeader(origin)}
    <main class="screen scan-screen">
      <p class="section-kicker">Network status</p>
      ${renderPassSection(vm, origin, qrMarkup)}
      ${renderScanUrlControl(vm)}
      ${renderTrustGroups(vm, origin)}
      ${renderLimitsSettings(origin)}
      ${renderFooter(vm, origin)}
    </main>
  </div>
  <script>${SCAN_PASS_FLIP_JS}</script>
  ${renderLiveControlScript(vm, origin)}
  ${renderVouchIssuanceScript(vm, origin)}
  ${renderQrFallbackScript(origin, vm.scanUrl)}
</body>
</html>`;
}

/** Client fallback — same encoder as /created/ (`qr-render.mjs`). Never use brand PNG. */
function renderQrFallbackScript(
  origin: string,
  scanUrl: string | null
): string {
  if (!scanUrl) return "";
  const mod = JSON.stringify(`${origin}/js/qr-render.mjs?v=2`);
  return `<script type="module">
import { renderQrToImage } from ${mod};
var slot = document.getElementById("pass-qr-slot");
if (slot && !slot.querySelector("svg") && slot.dataset.scanUrl) {
  var img = document.createElement("img");
  img.width = 88;
  img.height = 88;
  img.alt = "QR code for this card scan link";
  slot.prepend(img);
  renderQrToImage(img, slot.dataset.scanUrl).catch(function () {});
}
</script>`;
}

/** M3.3 — one line above the card (full detail in limits settings below). */
function renderBearerLine(): string {
  return `<p class="scan-bearer-line" role="note">${escapeHtml(BEARER_WARNING)}</p>`;
}

function renderTopHeader(origin: string): string {
  return `<header class="top">
  <a class="top-brand" href="${escapeHtml(origin)}/">
    <span class="pass-dot" aria-hidden="true"></span>
    <span>humanity.llc</span>
  </a>
</header>`;
}

function renderPassSection(
  vm: ScanViewModel,
  origin: string,
  qrMarkup: string
): string {
  const badgeClass = `pass-badge badge-${vm.primaryBadge.tone}`;
  const frontBody = vm.minimalScan
    ? renderMinimalPassFront(vm, badgeClass)
    : renderPassFront(vm, badgeClass, qrMarkup);
  const backBody = renderPassBack(origin);
  const flipBtn = vm.minimalScan
    ? ""
    : `<button type="button" class="pass-flip-btn" id="pass-flip-btn" aria-label="Flip card">
      Tap to flip
    </button>`;
  const bearer = vm.minimalScan ? "" : renderBearerLine();
  const backFace = vm.minimalScan
    ? ""
    : `<div class="pass-face pass-back" aria-hidden="true">
            ${backBody}
          </div>`;

  return `${bearer}
<section class="pass" aria-label="Humanity Card at scan time">
  <div class="pass-scene" id="pass-scene">
    <div class="pass-tilt-wrap" id="pass-tilt-wrap">
      <div class="pass-flip" id="pass-flip">
        <div class="pass-inner">
          <div class="pass-face pass-front">
            <div class="pass-tilt-surface" id="pass-tilt-surface">
              ${frontBody}
            </div>
          </div>
          ${backFace}
        </div>
      </div>
    </div>
    ${flipBtn}
  </div>
</section>`;
}

function minimalScanHeadline(kind: ScanViewModel["kind"]): string {
  switch (kind) {
    case "qr_revoked":
      return "This QR is no longer valid";
    case "qr_expired":
      return "This QR has expired";
    case "card_revoked":
      return "This card has been disabled";
    default:
      return "Scan result";
  }
}

function renderMinimalPassFront(
  vm: ScanViewModel,
  badgeClass: string
): string {
  const headline = minimalScanHeadline(vm.kind);
  return `<div class="pass-head">
  <div class="pass-brand">
    <span class="pass-dot" aria-hidden="true"></span>
    <span>humanity.llc</span>
  </div>
  <span class="${badgeClass}">${escapeHtml(vm.primaryBadge.label)}</span>
</div>
<p class="pass-type">Scan result</p>
<h1 class="pass-name">${escapeHtml(headline)}</h1>
<p class="pass-manifesto">${escapeHtml(scanLead(vm))}</p>`;
}

function renderScanUrlControl(vm: ScanViewModel): string {
  if (!vm.scanUrl) return "";
  return `<details class="scan-show-link">
  <summary class="scan-show-link-summary">Show link</summary>
  <p class="pass-scan-url mono">${escapeHtml(vm.scanUrl)}</p>
</details>`;
}

function renderPassFront(
  vm: ScanViewModel,
  badgeClass: string,
  qrMarkup: string
): string {
  const isError =
    vm.kind !== "active" &&
    !vm.kind.startsWith("qr_") &&
    !vm.kind.startsWith("card_");

  if (isError) {
    return `<div class="pass-head">
  <div class="pass-brand">
    <span class="pass-dot" aria-hidden="true"></span>
    <span>humanity.llc</span>
  </div>
  <span class="${badgeClass}">${escapeHtml(vm.primaryBadge.label)}</span>
</div>
<p class="pass-type">Scan result</p>
<h1 class="pass-name">${escapeHtml(vm.primaryBadge.label)}</h1>
<p class="pass-manifesto">${escapeHtml(scanLead(vm))}</p>`;
  }

  const display = parseManifestoDisplay(vm.manifestoLine);
  const handleMuted = vm.handle
    ? `<p class="pass-handle-muted">@${escapeHtml(vm.handle)}</p>`
    : "";
  const qrSlotAttr = vm.scanUrl
    ? ` id="pass-qr-slot" data-scan-url="${escapeHtml(vm.scanUrl)}"`
    : "";
  const qrBlock = vm.scanUrl
    ? `<div class="pass-qr"${qrSlotAttr}>${qrMarkup}</div>`
    : "";

  if (display.kind === "status_plate") {
    const passFoot =
      "Scan shows current status for this place—not who owns the door.";
    return `<div class="pass-head">
  <div class="pass-brand">
    <span class="pass-dot" aria-hidden="true"></span>
    <span>humanity.llc</span>
  </div>
  <span class="${badgeClass}">${escapeHtml(vm.primaryBadge.label)}</span>
</div>
<div class="pass-body">
  <div class="pass-main">
    <p class="pass-type">Status plate</p>
    <h1 class="pass-name">${escapeHtml(display.objectLabel)}</h1>
    <p class="pass-manifesto pass-manifesto-status">${escapeHtml(display.statusLine)}</p>
    ${handleMuted}
    <ul class="pass-trust" aria-label="Status at a glance">
      ${renderTrustPills(vm)}
    </ul>
  </div>
  ${qrBlock}
</div>
<p class="pass-foot">${escapeHtml(passFoot)}</p>`;
  }

  if (display.kind === "lost_item_relay") {
    const passFoot =
      "This scan does not prove who holds the item. It only shows whether the return relay is active.";
    return `<div class="pass-head">
  <div class="pass-brand">
    <span class="pass-dot" aria-hidden="true"></span>
    <span>humanity.llc</span>
  </div>
  <span class="${badgeClass}">${escapeHtml(vm.primaryBadge.label)}</span>
</div>
<div class="pass-body">
  <div class="pass-main">
    <p class="pass-type">Lost item relay</p>
    <h1 class="pass-name">${escapeHtml(display.objectLabel)}</h1>
    <p class="pass-manifesto pass-manifesto-status">${escapeHtml(display.statusLine)}</p>
    ${handleMuted}
    <ul class="pass-trust" aria-label="Status at a glance">
      ${renderTrustPills(vm)}
    </ul>
  </div>
  ${qrBlock}
</div>
<p class="pass-foot">${escapeHtml(passFoot)}</p>`;
  }

  const passFoot =
    "Scan shows live state. Holding the object does not prove ownership.";

  const handle = vm.handle ? `@${escapeHtml(vm.handle)}` : "Unknown card";
  const manifesto = vm.manifestoLine
    ? `<p class="pass-manifesto">${escapeHtml(vm.manifestoLine)}</p>`
    : "";

  return `<div class="pass-head">
  <div class="pass-brand">
    <span class="pass-dot" aria-hidden="true"></span>
    <span>humanity.llc</span>
  </div>
  <span class="${badgeClass}">${escapeHtml(vm.primaryBadge.label)}</span>
</div>
<div class="pass-body">
  <div class="pass-main">
    <p class="pass-type">Live object</p>
    <h1 class="pass-name">${handle}</h1>
    ${manifesto}
    <ul class="pass-trust" aria-label="Status at a glance">
      ${renderTrustPills(vm)}
    </ul>
  </div>
  ${qrBlock}
</div>
<p class="pass-foot">${escapeHtml(passFoot)}</p>`;
}

/** Back — status hints only; limits live in settings row below the card. */
function renderPassBack(origin: string): string {
  return `<div class="pass-back-accent" aria-hidden="true"></div>
<div class="pass-back-inner">
  <div class="pass-head">
    <div class="pass-brand">
      <span class="pass-dot" aria-hidden="true"></span>
      <span>At scan time</span>
    </div>
    <span class="pass-badge badge-neutral">Flip</span>
  </div>
  <ul class="pass-back-grid" aria-label="Network facts">
    <li>
      <span class="pass-back-label">Live</span>
      <span class="pass-back-value">status from the operator, not a frozen page</span>
    </li>
    <li>
      <span class="pass-back-label">Revocable</span>
      <span class="pass-back-value">per card and per printed-item QR</span>
    </li>
  </ul>
  <p class="pass-foot pass-foot-muted">Limits: open “What this scan does not prove” below.</p>
</div>`;
}

/** Spec §7 / roadmap §7 — separate grouped blocks below the card. */
function renderTrustGroups(vm: ScanViewModel, origin: string): string {
  const sections: string[] = [];

  if (vm.showCardBlock) {
    sections.push(
      trustGroup(
        "Card status",
        cardGroupRows(vm),
        "card"
      )
    );
  }

  if (vm.showHumanTrustBlock) {
    sections.push(
      trustGroup(
        "Human trust",
        humanGroupRows(vm),
        "human"
      )
    );
  }

  if (vm.showArtifactBlock) {
    sections.push(
      trustGroup(
        "This QR",
        qrGroupRows(vm),
        "qr"
      )
    );
  }

  if (vm.showLiveControlBlock) {
    sections.push(
      trustGroup(
        "Live control",
        liveControlGroupRows(vm),
        "live"
      )
    );
  }

  if (vm.kind === "active" && vm.profileId && vm.showHumanTrustBlock) {
    sections.push(renderVouchSection(vm, origin));
  }

  return `<div class="scan-trust-groups" aria-label="Network status at scan time">
${sections.join("\n")}
</div>`;
}

function trustGroup(
  label: string,
  rows: string,
  mod: string
): string {
  return `<section class="group scan-group scan-group-${mod}">
  <h2 class="group-label">${escapeHtml(label)}</h2>
  <ul class="list">
    ${rows}
  </ul>
</section>`;
}

function listRow(
  icon: ScanIconId,
  tone: string,
  title: string,
  sub?: string
): string {
  const subHtml = sub
    ? `<span class="list-sub">${escapeHtml(sub)}</span>`
    : "";
  return `<li class="list-row">
  ${scanListIcon(tone, icon)}
  <span class="list-content">
    <span class="list-title">${escapeHtml(title)}</span>
    ${subHtml}
  </span>
</li>`;
}

function cardGroupRows(vm: ScanViewModel): string {
  const status = vm.cardStatus ? `Card ${vm.cardStatus}` : "Unknown";
  const rows = [
    listRow(
      "status",
      cardStatusIconTone(vm),
      status,
      vm.kind === "active"
        ? "Live public card fields at scan time"
        : scanLead(vm)
    ),
  ];
  if (vm.profileId) {
    rows.push(listRow("profile", "blue", "Profile ID", vm.profileId));
  }
  return rows.join("\n");
}

function humanGroupRows(vm: ScanViewModel): string {
  const display = humanTrustDisplay(vm);
  const icon = humanTrustListIcon(display);
  return `<li class="list-row" id="human-trust-row">
  ${scanListIcon(icon.tone, icon.id)}
  <span class="list-content">
    <span class="list-title" id="human-trust-row-title">${escapeHtml(display.label)}</span>
    <span class="list-sub" id="human-trust-row-sub">${escapeHtml(display.subtitle)}</span>
  </span>
</li>`;
}

function renderVouchSection(vm: ScanViewModel, origin: string): string {
  const walletUrl = `${origin.replace(/\/$/, "")}/wallet/`;
  const createUrl = `${origin.replace(/\/$/, "")}/create/`;
  return `<section class="group scan-group scan-group-vouch" aria-label="Vouch for this person">
  <h2 class="group-label">Vouch</h2>
  <div id="vouch-explainer" class="vouch-card vouch-card-hint">
    <div class="vouch-card-head">
      ${scanListIcon("slate", "key")}
      <div class="vouch-card-head-text">
        <span class="vouch-eyebrow">Your keys on this device</span>
        <span class="vouch-title">Vouch from a saved card</span>
      </div>
    </div>
    <p class="vouch-lead" id="vouch-explainer-copy">
      To attest for someone else, activate <strong>your</strong> card in
      <a href="${escapeHtml(walletUrl)}">Saved cards</a> (or
      <a href="${escapeHtml(createUrl)}">create one</a>), then return to this scan page.
      Your private key never uploads — only the signed vouch does.
    </p>
  </div>
  <ul class="list vouch-list">
    ${vouchIssuanceGroupRows(vm)}
  </ul>
</section>`;
}

function qrGroupRows(vm: ScanViewModel): string {
  const status = vm.qrStatus ? `QR ${formatQrStatus(vm.qrStatus)}` : "QR unknown";
  const scope =
    vm.qrScope === "print_artifact"
      ? "Printed item — revoke one artifact without killing the card"
      : "Card-scoped credential";
  const rows = [listRow("qr", qrStatusIconTone(vm), status, scope)];
  if (vm.qrId) {
    rows.push(listRow("profile", "blue", "Credential", vm.qrId));
  }
  return rows.join("\n");
}

function liveControlGroupRows(vm: ScanViewModel): string {
  if (vm.kind === "active" && vm.profileId && vm.qrId) {
    return liveControlInteractiveRow(vm.liveControlProvenAt ?? null);
  }
  return listRow(
    "key",
    "slate",
    "Not shown",
    "Optional in-person key proof (M7)"
  );
}

function vouchIssuanceGroupRows(vm: ScanViewModel): string {
  const profileId = vm.profileId ?? "";
  return `<li class="list-row vouch-row" id="vouch-row" hidden data-vouchee-profile-id="${escapeHtml(profileId)}">
  <span class="list-content vouch-card-wrap">
    <div class="vouch-card" id="vouch-interactive" hidden>
      <div class="vouch-card-head">
        ${scanListIcon("green", "people")}
        <div class="vouch-card-head-text">
          <span class="vouch-eyebrow">Human attestation</span>
          <span class="vouch-title">Vouch for this person</span>
        </div>
      </div>
      <p class="vouch-lead">
        Sign a public statement that this is a distinct human you know in person. This is not legal ID.
      </p>
      <label class="vouch-field-label" for="vouch-statement">Public statement</label>
      <textarea class="vouch-statement" id="vouch-statement" maxlength="280" rows="4"></textarea>
      <label class="vouch-confirm-label">
        <input type="checkbox" id="vouch-confirm" />
        <span>I understand this vouch is public, revocable, and does not prove legal identity.</span>
      </label>
      <button type="button" class="vouch-cta" id="vouch-submit">Submit vouch</button>
      <div class="vouch-status-panel">
        <p class="vouch-status" id="vouch-status" aria-live="polite"></p>
      </div>
    </div>
    <div class="vouch-card vouch-card-ineligible" id="vouch-ineligible" hidden>
      <div class="vouch-card-head">
        ${scanListIcon("orange", "warning")}
        <div class="vouch-card-head-text">
          <span class="vouch-eyebrow">Not available yet</span>
          <span class="vouch-title">Can't vouch from this device</span>
        </div>
      </div>
      <p class="vouch-lead" id="vouch-ineligible-copy"></p>
    </div>
    <div class="vouch-card vouch-card-success" id="vouch-success" hidden>
      <div class="vouch-card-head">
        ${scanListIcon("green", "people")}
        <div class="vouch-card-head-text">
          <span class="vouch-eyebrow">Vouch recorded</span>
          <span class="vouch-title">Thank you</span>
        </div>
      </div>
      <p class="vouch-lead" id="vouch-success-copy">Your vouch was accepted.</p>
    </div>
  </span>
</li>`;
}

function renderVouchIssuanceScript(vm: ScanViewModel, origin: string): string {
  if (vm.kind !== "active" || !vm.profileId) return "";
  const assetOrigin = pagesJsOrigin(origin);
  const mod = JSON.stringify(`${assetOrigin}/js/vouch-issue.mjs?v=2`);
  return `<script type="module" src=${mod}></script>`;
}

/** Local dev: scan HTML is on :8787, static JS on Pages :8788. */
function pagesJsOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    if (
      (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
      url.port === "8787"
    ) {
      url.port = "8788";
      return url.origin;
    }
  } catch {
    /* use scan origin */
  }
  return origin;
}

function liveControlInteractiveRow(provenAt: string | null): string {
  const isProven = !!provenAt;
  const interactiveHidden = isProven ? " hidden" : "";
  const rowClass = isProven ? " is-proven" : "";
  return `<li class="list-row live-control-row${rowClass}" id="live-control-row">
  <span class="list-content live-control-card-wrap">
    <div class="live-control-card" id="live-control-interactive"${interactiveHidden}>
      <div class="live-control-card-head">
        ${scanListIcon("red", "lock")}
        <div class="live-control-card-head-text">
          <span class="live-control-eyebrow">In-person check</span>
          <span class="live-control-title">Ask owner to prove control</span>
        </div>
      </div>
      <p class="live-control-lead">
        Ask the owner to prove they hold the signing key for this object — right now, on the spot.
      </p>
      <button type="button" class="live-control-cta" id="live-control-request">
        Ask for live proof
      </button>
      <div class="live-control-status-panel" id="live-control-status-panel">
        <p class="live-control-status" id="live-control-status" aria-live="polite">Ready when you are.</p>
      </div>
      <div class="live-control-owner-panel" id="live-control-owner-panel" hidden>
        <p class="live-control-owner-lead">
          Send this to the device that <strong>created the card</strong>. This page waits until they sign.
        </p>
        <div class="live-control-owner-actions">
          <a class="live-control-owner-btn" id="live-control-owner-link" href="#" target="_blank" rel="noopener noreferrer">
            Open on owner device
          </a>
          <button type="button" class="live-control-owner-btn live-control-owner-btn-muted" id="live-control-copy-owner-link">
            Copy owner link
          </button>
        </div>
      </div>
    </div>
    ${renderLiveControlSuccessPanel(provenAt ?? "", isProven)}
    ${renderLiveControlOwnerView()}
  </span>
</li>`;
}

function renderLiveControlOwnerView(): string {
  return `<div class="live-control-card live-control-card-owner" id="live-control-owner-view" hidden>
  <div class="live-control-card-head">
    ${scanListIcon("blue", "key")}
    <div class="live-control-card-head-text">
      <span class="live-control-eyebrow">Your device</span>
      <span class="live-control-title">Live control</span>
    </div>
  </div>
  <p class="live-control-lead" id="live-control-owner-copy">
    This section is for someone else scanning your QR. When they ask for live proof, open your card page to sign.
  </p>
  <a class="live-control-owner-btn" id="live-control-owner-created-link" href="#">Open your card</a>
</div>`;
}

function renderLiveControlSuccessPanel(provenAt: string, visible: boolean): string {
  const hiddenAttr = visible ? "" : " hidden";
  const provenIsoAttr = provenAt
    ? ` data-proven-at="${escapeHtml(provenAt)}"`
    : "";
  const provenLabel = provenAt
    ? `Proven ${formatScanTimestamp(provenAt)}`
    : "";
  const agoInitial = provenAt ? "Live control proven just now" : "";
  return `<div class="live-control-card live-control-card-proven" id="live-control-success"${hiddenAttr}${provenIsoAttr}>
  <div class="live-control-card-head">
    ${scanListIcon("green", "key")}
    <div class="live-control-card-head-text">
      <span class="live-control-eyebrow">Live control</span>
      <div class="live-control-title-row">
        <span class="live-control-title">Control proven</span>
        <span class="live-control-proven-ago" id="live-control-proven-ago"${provenIsoAttr}>${escapeHtml(agoInitial)}</span>
      </div>
    </div>
  </div>
  <p class="live-control-success-copy">
    The owner signed with their key. This does not prove legal identity or physical ownership.
  </p>
  <p class="live-control-proven-at" id="live-control-proven-at">${escapeHtml(provenLabel)}</p>
  <button type="button" class="live-control-cta-secondary" id="live-control-request-again">
    Ask again
  </button>
</div>`;
}

function formatScanTimestamp(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function renderLiveControlScript(vm: ScanViewModel, origin: string): string {
  if (vm.kind !== "active" || !vm.profileId || !vm.qrId) return "";
  const apiOrigin = liveControlApiOrigin(vm, origin);
  const challengeUrl = `${apiOrigin}/.well-known/hc/v1/cards/${encodeURIComponent(
    vm.profileId
  )}/live-control/challenges`;
  return `<script>
(function () {
  var PROOF_TTL_MS = 5 * 60 * 1000;
  var btn = document.getElementById("live-control-request");
  var status = document.getElementById("live-control-status");
  var ownerPanel = document.getElementById("live-control-owner-panel");
  var ownerLink = document.getElementById("live-control-owner-link");
  var copyOwnerLink = document.getElementById("live-control-copy-owner-link");
  var interactive = document.getElementById("live-control-interactive");
  var success = document.getElementById("live-control-success");
  var provenAtEl = document.getElementById("live-control-proven-at");
  var provenAgoEl = document.getElementById("live-control-proven-ago");
  var askAgainBtn = document.getElementById("live-control-request-again");
  var row = document.getElementById("live-control-row");
  var statusPanel = document.getElementById("live-control-status-panel");
  var ownerView = document.getElementById("live-control-owner-view");
  var ownerCopy = document.getElementById("live-control-owner-copy");
  var ownerCreatedLink = document.getElementById("live-control-owner-created-link");
  var profileId = ${JSON.stringify(vm.profileId)};
  var qrId = ${JSON.stringify(vm.qrId)};
  var pollTimer = null;
  var countdownTimer = null;
  var relativeTimer = null;
  function isOwnerBrowser() {
    try {
      var raw = sessionStorage.getItem("hc_created");
      if (!raw) return false;
      var session = JSON.parse(raw);
      if (!session || session.profile_id !== profileId || session.qr_id !== qrId) {
        return false;
      }
      return typeof session.owner_private_key_b58 === "string" ||
        typeof session.recovery_private_key_b58 === "string";
    } catch (e) {
      return false;
    }
  }
  function formatProvenAt(iso) {
    try {
      var d = new Date(iso);
      if (!Number.isFinite(d.getTime())) return "";
      return d.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "medium",
      });
    } catch (e) {
      return "";
    }
  }
  function formatProvenAgo(elapsedMs) {
    var sec = Math.max(0, Math.floor(elapsedMs / 1000));
    if (sec < 1) return "Live control proven just now";
    if (sec < 60) return "Live control proven " + sec + "s ago";
    var min = Math.floor(sec / 60);
    if (min < 60) return "Live control proven " + min + "m ago";
    var hr = Math.floor(min / 60);
    return "Live control proven " + hr + "h ago";
  }
  function stopRelativeTimer() {
    if (relativeTimer) window.clearInterval(relativeTimer);
    relativeTimer = null;
  }
  function startRelativeTimer(iso) {
    if (!provenAgoEl || !iso) return;
    stopRelativeTimer();
    provenAgoEl.setAttribute("data-proven-at", iso);
    if (success) success.setAttribute("data-proven-at", iso);
    function tick() {
      var elapsed = Date.now() - Date.parse(iso);
      if (!Number.isFinite(elapsed) || elapsed < 0) return;
      provenAgoEl.textContent = formatProvenAgo(elapsed);
      if (elapsed >= PROOF_TTL_MS) stopRelativeTimer();
    }
    tick();
    relativeTimer = window.setInterval(tick, 1000);
  }
  function getProvenIso() {
    if (success && success.getAttribute("data-proven-at")) {
      return success.getAttribute("data-proven-at");
    }
    if (provenAgoEl && provenAgoEl.getAttribute("data-proven-at")) {
      return provenAgoEl.getAttribute("data-proven-at");
    }
    return null;
  }
  function showProvenSuccess(provenAt) {
    stopPolling();
    stopCountdown();
    if (interactive) interactive.hidden = true;
    if (success) success.hidden = false;
    if (row) row.classList.add("is-proven");
    if (provenAtEl && provenAt) {
      provenAtEl.textContent = "Proven " + formatProvenAt(provenAt);
    }
    startRelativeTimer(provenAt);
  }
  function resetForNewRequest() {
    stopRelativeTimer();
    stopPolling();
    stopCountdown();
    if (interactive) interactive.hidden = false;
    if (success) success.hidden = true;
    if (row) row.classList.remove("is-proven");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Ask for live proof";
    }
    if (status) setStatus("Ready when you are.", false);
    if (ownerPanel) ownerPanel.hidden = true;
  }
  function wireAskAgain() {
    if (!askAgainBtn) return;
    askAgainBtn.addEventListener("click", function () {
      resetForNewRequest();
    });
  }
  function applyOwnerBrowserLiveControl() {
    if (!isOwnerBrowser()) return false;
    stopRelativeTimer();
    stopPolling();
    stopCountdown();
    if (interactive) interactive.hidden = true;
    if (success) success.hidden = true;
    if (ownerPanel) ownerPanel.hidden = true;
    if (row) row.classList.remove("is-proven");
    if (ownerView) ownerView.hidden = false;
    if (ownerCreatedLink && profileId && qrId) {
      ownerCreatedLink.href =
        location.origin + "/created/?profile_id=" +
        encodeURIComponent(profileId) + "&qr_id=" + encodeURIComponent(qrId);
    }
    if (ownerCopy) {
      var proven = getProvenIso();
      ownerCopy.textContent = proven
        ? "Control proven from this device. The scanner should see success on their screen — you do not need to ask again here."
        : "This section is for someone else scanning your QR. When they ask for live proof, open your card page to sign.";
    }
    return true;
  }
  function showOwnerPanel(url) {
    if (ownerPanel) ownerPanel.hidden = false;
    if (ownerLink) ownerLink.href = url;
    if (copyOwnerLink) {
      copyOwnerLink.onclick = function () {
        navigator.clipboard.writeText(url).then(function () {
          copyOwnerLink.textContent = "Copied";
          window.setTimeout(function () {
            copyOwnerLink.textContent = "Copy owner link";
          }, 2000);
        }).catch(function () {
          copyOwnerLink.textContent = "Copy failed — use Open link";
        });
      };
    }
  }
  function setStatus(text, waiting) {
    if (!status) return;
    status.textContent = text;
    if (statusPanel) {
      statusPanel.classList.toggle("is-waiting", !!waiting);
    }
  }
  function stopPolling() {
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = null;
  }
  function stopCountdown() {
    if (countdownTimer) window.clearInterval(countdownTimer);
    countdownTimer = null;
  }
  function formatRemaining(ms) {
    var total = Math.max(0, Math.ceil(ms / 1000));
    var minutes = Math.floor(total / 60);
    var seconds = String(total % 60).padStart(2, "0");
    return minutes + ":" + seconds;
  }
  function startCountdown(expiresAt, prefix) {
    stopCountdown();
    function tick() {
      var remaining = Date.parse(expiresAt) - Date.now();
      if (!Number.isFinite(remaining) || remaining <= 0) {
        stopCountdown();
        setStatus("Control was not proven. The request expired.", false);
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Ask for live proof";
        }
        return;
      }
      setStatus(prefix + " Expires in " + formatRemaining(remaining) + ".", true);
    }
    tick();
    countdownTimer = window.setInterval(tick, 1000);
  }
  function poll(url) {
    stopPolling();
    pollTimer = window.setInterval(function () {
      fetch(url, { cache: "no-store" })
        .then(function (res) { return res.json(); })
        .then(function (body) {
          if (body.status === "proven") {
            showProvenSuccess(body.proven_at);
          } else if (body.status === "expired") {
            stopPolling();
            stopCountdown();
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Ask for live proof";
            }
            setStatus("Control was not proven. The request expired.", false);
          }
        })
        .catch(function () {});
    }, 2000);
  }
  function statusUrlForChallenge(id) {
    return ${JSON.stringify(apiOrigin)} + "/.well-known/hc/v1/cards/" +
      encodeURIComponent(${JSON.stringify(vm.profileId)}) +
      "/live-control/challenges/" + encodeURIComponent(id);
  }
  function checkExistingProof() {
    var params = new URLSearchParams(location.search);
    var id = params.get("live_challenge");
    if (!id) return;
    setStatus("Checking live proof…", true);
    fetch(statusUrlForChallenge(id), { cache: "no-store" })
      .then(function (res) { return res.json(); })
      .then(function (body) {
        if (body.status === "proven") {
          showProvenSuccess(body.proven_at);
        } else if (body.status === "expired") {
          if (btn) btn.textContent = "Ask for live proof";
          setStatus("Control was not proven. The request expired.", false);
        } else {
          if (body.expires_at) {
            startCountdown(body.expires_at, "Waiting for the owner to sign…");
          } else {
            setStatus("Waiting for the owner to sign…", true);
          }
          if (body.owner_url) showOwnerPanel(body.owner_url);
          poll(statusUrlForChallenge(id));
        }
      })
      .catch(function () {
        setStatus("Could not check live proof.", false);
      });
  }
  if (applyOwnerBrowserLiveControl()) return;
  wireAskAgain();
  var initialProven = getProvenIso();
  if (success && !success.hidden && initialProven) {
    startRelativeTimer(initialProven);
  }
  if (!btn || !status) return;
  btn.addEventListener("click", function () {
    btn.disabled = true;
    btn.textContent = "Waiting…";
    setStatus("Creating a live proof request…", true);
    fetch(${JSON.stringify(challengeUrl)}, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qr_id: ${JSON.stringify(vm.qrId)},
        client_origin: location.origin
      })
    })
      .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
      .then(function (result) {
        if (!result.ok) throw new Error(result.body.message || result.body.error || "Could not create live proof request.");
        if (result.body.owner_url) {
          showOwnerPanel(result.body.owner_url);
        }
        startCountdown(
          result.body.expires_at,
          "Waiting for the owner to tap Prove control on their key-holding device. If nothing happens, ask them to refresh this tab."
        );
        poll(result.body.status_url);
      })
      .catch(function (err) {
        stopCountdown();
        btn.disabled = false;
        btn.textContent = "Ask for live proof";
        setStatus(err.message || "Could not create live proof request.", false);
      });
  });
  checkExistingProof();
})();
</script>`;
}

function liveControlApiOrigin(vm: ScanViewModel, fallback: string): string {
  if (vm.scanUrl) {
    try {
      const url = new URL(vm.scanUrl);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        return url.origin;
      }
    } catch {
      /* Use fallback below. */
    }
  }
  return fallback;
}

/** iOS-style settings row — all “does not prove” copy in one place. */
function renderLimitsSettings(origin: string): string {
  const policy = `${origin}/data-policy.html`;
  const architecture = `${origin}/architecture.html`;
  return `<details class="scan-limits-settings">
  <summary class="scan-limits-summary">
    ${scanListIcon("orange", "shield")}
    <span class="scan-limits-summary-text">
      <span class="scan-limits-summary-title">What this scan does not prove</span>
      <span class="scan-limits-summary-sub">Tap for ownership, ID, KYC, employment, and age</span>
    </span>
    <span class="list-chevron" aria-hidden="true">›</span>
  </summary>
  <div class="scan-limits-panel">
    <ul class="scan-limits-list">
      <li>Legal identity, government ID, KYC, or background checks</li>
      <li>Employment eligibility, age verification, or a hidden trust score</li>
      <li>That social vouches were honest or complete</li>
      <li>Permanent ownership of a physical item (lifecycle transitions can change state)</li>
      <li>Who scanned, when, or where — this page returns object state, not a people trail</li>
    </ul>
    <p class="scan-limits-meta">No scan analytics on this page. <a href="${escapeHtml(policy)}">Operator data policy</a> · <a href="${escapeHtml(architecture)}">Architecture</a></p>
  </div>
</details>`;
}

function renderTrustPills(vm: ScanViewModel): string {
  return [pillForCard(vm), pillForHuman(vm), pillForQr(vm)].join("\n");
}

function pillForCard(vm: ScanViewModel): string {
  const label = vm.cardStatus
    ? `Card ${formatCardStatus(vm.cardStatus)}`
    : "Card unknown";
  const on = vm.cardStatus === "active" ? "trust-on" : "";
  return `<li class="${on}">${escapeHtml(label)}</li>`;
}

function pillForHuman(vm: ScanViewModel): string {
  const display = humanTrustDisplay(vm);
  const on = display.pillActive ? "trust-on" : "";
  return `<li class="${on}">${escapeHtml(display.label)}</li>`;
}

function pillForQr(vm: ScanViewModel): string {
  const label = vm.qrStatus
    ? `QR ${formatQrStatus(vm.qrStatus)}`
    : "QR unknown";
  const on = vm.qrStatus === "active" ? "trust-on" : "";
  return `<li class="${on}">${escapeHtml(label)}</li>`;
}

function cardStatusIconTone(vm: ScanViewModel): string {
  if (vm.cardStatus === "revoked" || vm.kind === "card_revoked") return "red";
  if (vm.cardStatus === "suspended" || vm.kind === "card_suspended") return "orange";
  if (vm.cardStatus === "expired" || vm.kind === "card_expired") return "orange";
  if (vm.cardStatus === "active") return "green";
  return "slate";
}

function qrStatusIconTone(vm: ScanViewModel): string {
  if (vm.qrStatus === "revoked" || vm.kind === "qr_revoked") return "red";
  if (vm.qrStatus === "expired" || vm.kind === "qr_expired") return "orange";
  if (vm.qrStatus === "replaced" || vm.kind === "qr_replaced") return "orange";
  if (vm.qrStatus === "active" && vm.kind === "active") return "green";
  return "slate";
}

function renderFooter(vm: ScanViewModel, origin: string): string {
  const jsonLink =
    vm.profileId && vm.kind === "active"
      ? `<a class="scan-footer-link" href="${escapeHtml(origin)}/.well-known/hc/v1/cards/${encodeURIComponent(vm.profileId)}">Public card JSON</a>`
      : "";
  const createCta =
    vm.kind === "unknown_profile" || vm.kind === "malformed"
      ? `<a class="dock-btn dock-btn-primary" href="${escapeHtml(origin)}/create/">Create a live object</a>`
      : `<a class="dock-btn dock-btn-secondary" href="${escapeHtml(origin)}/">About humanity.llc</a>`;

  return `<footer class="scan-footer">
  ${createCta}
  ${jsonLink}
</footer>`;
}

function scanLead(vm: ScanViewModel): string {
  switch (vm.kind) {
    case "active": {
      const display = parseManifestoDisplay(vm.manifestoLine);
      if (display.kind === "status_plate") {
        return "Current status for this place on the network.";
      }
      if (display.kind === "lost_item_relay") {
        return "Return instructions for this item — relay active or revoked at scan time.";
      }
      return "The network returned current status for this card and QR.";
    }
    case "unknown_profile":
      return "No Humanity Card is registered for this link.";
    case "unknown_qr":
      return "This QR credential is not recognized for this card.";
    case "profile_qr_mismatch":
      return "This QR does not belong to the profile in the URL.";
    case "malformed":
      return "This scan link is missing a valid profile or QR id.";
    case "card_revoked":
      return "Object state: card disabled. Printed QRs still exist; card details are hidden.";
    case "card_suspended":
      return "This card is suspended under published rules.";
    case "card_expired":
      return "This card has expired.";
    case "qr_revoked":
      return "Object state: this pointer is off. The sticker is unchanged; only live rules changed.";
    case "qr_expired":
      return "Object state: validity ended. The card may still be active for other QRs.";
    case "qr_replaced":
      return "This QR was replaced by a newer credential.";
    default:
      return "Network status at scan time.";
  }
}

function pageTitle(vm: ScanViewModel): string {
  if (vm.minimalScan) {
    switch (vm.kind) {
      case "qr_revoked":
        return "QR no longer valid";
      case "qr_expired":
        return "QR expired";
      case "card_revoked":
        return "Card disabled";
      default:
        return "Scan result";
    }
  }
  if (vm.handle) return `@${vm.handle}`;
  return vm.primaryBadge.label;
}

function formatCardStatus(s: string): string {
  return s;
}

function formatQrStatus(s: string): string {
  return s.replace("_", " ");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
