import { PRINT_ARTIFACT_NO_CALENDAR_EXPIRY_NOTE } from "./merch-qr-policy";
import type { ScanViewModel } from "./scan-state";
import {
  parseManifestoDisplay,
  scanHeroTemplate,
} from "./manifesto-display";
import { publicReasonLabel } from "./revocation-display";
import { scanListIcon, type ScanIconId } from "./scan-icons";
import { BEARER_WARNING } from "./trust-copy";
import { SCAN_PASS_CSS } from "./scan-pass-styles";
import {
  humanTrustDisplay,
  humanTrustListIcon,
} from "./verification-display";
import { governanceProcessUrls, originFromScanUrl } from "./scan-governance";
import { SCAN_OFFLINE_BANNER_TEXT } from "./scan-offline";
import {
  credentialCodeFromScanUrl,
  deriveCredentialCodeSync,
} from "../../../site/js/qr-credential-code.mjs";
import { renderScanQrMarkup } from "./scan-qr";
import {
  EMPTY_SCAN_SAFETY,
  renderHeroStatusStrip,
  renderSafetyChips,
  renderScanSafetyHeaderScript,
  SCAN_HERO_META_DETAILS_SUMMARY,
  SCAN_HERO_QR_DETAILS_SUMMARY,
  SCAN_SAFETY_RESOLVER_VERIFIED_COPY,
  type ScanSafetyModel,
} from "./scan-safety";
import { SCAN_PAGE_THEME_BOOTSTRAP } from "./scan-page-theme";
import {
  scanMalformedLead,
  scanMalformedPageTitle,
} from "./scan-malformed-hint";

/** Response header  -  confirms pass-card scan UI (not legacy .block layout). */
export const SCAN_UI_VERSION = "pass-v34";

/**
 * Public scan UI  -  flippable pass card (landing) + iOS grouped trust blocks below (spec §7).
 */
export async function renderScanPage(
  vm: ScanViewModel,
  origin: string,
  safety: ScanSafetyModel = EMPTY_SCAN_SAFETY
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
  <meta name="color-scheme" content="light dark" />
  <meta name="theme-color" content="#ffffff" />
  <title>${escapeHtml(title)} · humanity.llc</title>
  <meta name="description" content="${escapeHtml(scanLead(vm))}" />
  <link rel="icon" href="${escapeHtml(origin)}/assets/red_qr_transparent_bg.png" type="image/png" />
  ${SCAN_PAGE_THEME_BOOTSTRAP}
  <style>${SCAN_PASS_CSS}</style>
</head>
<body>
  <div class="page scan-page">
    ${renderScanPageChrome(origin)}
    <div class="scan-cross-tab-banner" id="scan-cross-tab-banner" role="status" hidden></div>
    <p class="scan-offline-banner" id="scan-offline-banner" role="status" hidden>${escapeHtml(SCAN_OFFLINE_BANNER_TEXT)}</p>
    <main class="screen scan-screen">
      ${renderScanHeroSection(vm, safety, origin, qrMarkup)}
      ${renderScanActorBand(vm, origin)}
      ${renderScanTrustModules(vm, safety)}
      ${renderLimitsSettings(vm, origin)}
      ${renderTrustGroups(vm, origin)}
      ${renderScanUrlControl(vm)}
      ${renderFooter(vm, origin)}
    </main>
  </div>
  ${renderLiveControlScript(vm, origin)}
  ${renderVouchIssuanceScript(vm, origin)}
  ${renderScanTabKeysScript(vm, origin)}
  ${renderQrFallbackScript(origin, vm.scanUrl)}
  ${renderScanOfflineBannerScript()}
  ${renderScanSafetyHeaderScript()}
  ${renderScanLiveCheckArriveScript(origin)}
  ${renderScanActorBandScript(vm, origin)}
</body>
</html>`;
}

/** Tag hero body blocks for staggered data-arriving reveal. */
function tagScanArriveItems(main: string): string {
  const hidden = "scan-arrive-item scan-arrive-item--hidden";
  return main
    .replace(/<h1 class="/g, `<h1 class="${hidden} `)
    .replace(/<p class="/g, `<p class="${hidden} `)
    .replace(/<ul class="/g, `<ul class="${hidden} `);
}

/** Flow 2 F2-2: disclose stale resolver HTML when the browser is offline. */
function renderScanOfflineBannerScript(): string {
  return `<script>
(function () {
  var el = document.getElementById("scan-offline-banner");
  if (!el) return;
  function apply() {
    el.hidden = navigator.onLine !== false;
  }
  apply();
  window.addEventListener("online", apply);
  window.addEventListener("offline", apply);
})();
</script>`;
}

/** Client fallback  -  same encoder as /created/ (`qr-render.mjs`). Never use brand PNG. */
function renderQrFallbackScript(
  origin: string,
  scanUrl: string | null
): string {
  if (!scanUrl) return "";
  const mod = JSON.stringify(`${origin}/js/qr-render.mjs?v=5`);
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

/**
 * In-card host label only (Phase 8.4) — brand dot lives in page chrome, not here.
 * @see docs/SCAN_PAGE_DEVICE_DOT.md Phase 4
 */
function renderScanHeroHost(): string {
  return `<p class="scan-hero-host scan-hero-wordmark" translate="no">humanity.llc</p>`;
}

/** Page chrome: status dot only (docs/M3_SCAN_PAGE_UI.md Phase 7; progressive dot Phase 8). */
function renderScanPageChrome(origin: string): string {
  const home = `${escapeHtml(origin)}/`;
  return `<div class="scan-page-chrome">
  <div class="scan-page-status-cluster">
    <a class="scan-page-dot" id="scan-page-dot-btn" href="${home}" aria-label="humanity.llc home">
      <span class="pass-dot" id="scan-page-dot" aria-hidden="true"></span>
    </a>
    <div class="scan-page-dot-glance" id="scan-page-dot-glance" role="dialog" aria-label="Your device on this scan" hidden>
      <div class="scan-page-dot-explainer" id="scan-page-dot-explainer" aria-live="polite"></div>
      <a class="scan-page-dot-home" id="scan-page-dot-home" href="${home}">humanity.llc home</a>
    </div>
  </div>
</div>`;
}

/** Live check hero — merges scanner safety + status panel (docs/M3_SCAN_PAGE_UI.md Phase 1). */
function renderScanHeroSection(
  vm: ScanViewModel,
  safety: ScanSafetyModel,
  origin: string,
  qrMarkup: string
): string {
  const { main: rawMain, foot } = buildScanHeroMain(vm, origin);
  const main = tagScanArriveItems(rawMain);
  const profileAttr = vm.profileId
    ? ` data-profile-id="${escapeHtml(vm.profileId)}"`
    : "";
  const qrAttr = vm.qrId ? ` data-qr-id="${escapeHtml(vm.qrId)}"` : "";
  const scanActiveAttr = vm.kind === "active" ? ` data-scan-active="1"` : "";
  const resolverRow = safety.objectSignatureVerified
    ? `<p class="scan-safety-resolver scan-arrive-item scan-arrive-item--hidden">${escapeHtml(SCAN_SAFETY_RESOLVER_VERIFIED_COPY)}</p>`
    : "";
  const chipsBlock = renderScanHeroMetaDetails(vm, safety);
  const footBlock = foot
    ? `<p class="scan-hero-foot">${escapeHtml(foot)}</p>`
    : "";
  const qrBlock = scanHeroQrBlock(vm, qrMarkup);
  const qrSection = qrBlock
    ? `<details class="scan-hero-qr-details">
  <summary class="scan-hero-qr-summary">${escapeHtml(SCAN_HERO_QR_DETAILS_SUMMARY)}</summary>
  ${qrBlock}
</details>`
    : "";

  return `<div class="scan-pass-layer">
<article class="scan-hero scan-status-panel scan-safety-header scan-live-check--pending" id="scan-safety-header" aria-label="Live check"${profileAttr}${qrAttr}${scanActiveAttr}>
  <header class="scan-hero-head">
    ${renderScanHeroHost()}
    ${renderHeroStatusStrip(vm)}
  </header>
  <div class="scan-hero-body">
    ${main}
  </div>
  ${resolverRow}
  <p class="scan-hero-limit scan-arrive-limits scan-arrive-limits--hidden" role="note">${escapeHtml(BEARER_WARNING)}</p>
  ${chipsBlock}
  <p class="scan-safety-first-seen" id="scan-safety-first-seen" hidden></p>
  ${footBlock}
  ${qrSection}
</article>
</div>`;
}

function renderScanHeroMetaDetails(
  vm: ScanViewModel,
  safety: ScanSafetyModel
): string {
  const chips = renderSafetyChips(vm, safety);
  if (!chips) return "";
  return `<details class="scan-hero-meta-details scan-arrive-item scan-arrive-item--hidden">
  <summary class="scan-hero-meta-summary">${escapeHtml(SCAN_HERO_META_DETAILS_SUMMARY)}</summary>
  ${chips}
</details>`;
}

function scanHeroQrBlock(vm: ScanViewModel, qrMarkup: string): string {
  if (!vm.scanUrl) return "";
  const qrSlotAttr = ` id="pass-qr-slot" data-scan-url="${escapeHtml(vm.scanUrl)}"`;
  const codeLine = renderCredentialCodeLine(credentialCodeForVm(vm));
  return `<div class="scan-hero-qr pass-qr scan-status-qr"${qrSlotAttr}>${qrMarkup}${codeLine}</div>`;
}

function credentialCodeForVm(vm: ScanViewModel): string | null {
  if (vm.scanUrl) {
    return credentialCodeFromScanUrl(vm.scanUrl);
  }
  if (vm.profileId && vm.qrId) {
    try {
      return deriveCredentialCodeSync(vm.profileId, vm.qrId);
    } catch {
      return null;
    }
  }
  return null;
}

function renderCredentialCodeLine(code: string | null): string {
  if (!code) return "";
  return `<p class="pass-credential-code mono" aria-label="Credential code for print verification">${escapeHtml(code)}</p>`;
}

function scanStatusMetaLine(vm: ScanViewModel): string {
  const parts: string[] = [];
  if (vm.handle) parts.push(`@${vm.handle}`);
  if (vm.profileId) parts.push(`${vm.profileId.slice(0, 14)}…`);
  return parts.join(" · ");
}

function formatQrExpiryLabel(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(t));
}

function renderStewardStrip(
  vm: ScanViewModel,
  opts: { omitHandle?: boolean } = {}
): string {
  const parts: string[] = [];
  if (vm.handle && !opts.omitHandle) {
    parts.push(`Controlled by @${vm.handle}`);
  }
  const expiry =
    vm.qrScope === "print_artifact"
      ? null
      : formatQrExpiryLabel(vm.qrExpiresAt);
  if (expiry && vm.kind === "active") {
    parts.push(`Valid until ${expiry}`);
  }
  if (!parts.length) return "";
  return `<p class="scan-hero-steward">${escapeHtml(parts.join(" · "))}</p>`;
}

function renderGovernanceProcessLinks(origin: string): string {
  const links = governanceProcessUrls(origin);
  return `<p class="scan-governance-links">Read the <a href="${escapeHtml(links.data_policy_url)}">operator data policy</a> and <a href="${escapeHtml(links.architecture_url)}">architecture overview</a> for published suspension rules and appeals.</p>`;
}

function buildScanHeroMain(
  vm: ScanViewModel,
  origin: string
): { main: string; foot: string } {
  if (vm.kind === "card_suspended") {
    const title = vm.handle
      ? `@${escapeHtml(vm.handle)}`
      : "Card suspended";
    return {
      main: `<p class="scan-hero-eyebrow">Scan result</p>
    <h1 class="scan-hero-title">${title}</h1>
    <p class="scan-hero-sub">${escapeHtml(scanLead(vm))}</p>
    ${renderGovernanceProcessLinks(origin)}`,
      foot: "Suspension is a network governance action under published rules.",
    };
  }

  if (vm.minimalScan) {
    const headline = minimalScanHeadline(vm.kind);
    return {
      main: `<p class="scan-hero-eyebrow">Scan result</p>
    <h1 class="scan-hero-title">${escapeHtml(headline)}</h1>
    <p class="scan-hero-sub">${escapeHtml(scanLead(vm))}</p>`,
      foot: "This is network state for a QR, not proof of who is holding it.",
    };
  }

  if (
    !vm.minimalScan &&
    (vm.kind === "qr_revoked" || vm.kind === "card_revoked")
  ) {
    const headline = minimalScanHeadline(vm.kind);
    const title = vm.handle
      ? `@${escapeHtml(vm.handle)}`
      : escapeHtml(headline);
    const statusLine = vm.handle
      ? `<p class="scan-hero-line">${escapeHtml(headline)}</p>`
      : "";
    const manifesto =
      vm.manifestoLine && vm.handle
        ? `<p class="scan-hero-sub">${escapeHtml(vm.manifestoLine)}</p>`
        : "";
    const meta = scanStatusMetaLine(vm);
    return {
      main: `<p class="scan-hero-eyebrow">Scan result</p>
    <h1 class="scan-hero-title">${title}</h1>
    ${statusLine}
    ${manifesto}
    ${meta ? `<p class="scan-hero-meta">${escapeHtml(meta)}</p>` : ""}
    <p class="scan-hero-sub">${escapeHtml(scanLead(vm))}</p>`,
      foot: "Holding a printed object does not prove ownership.",
    };
  }

  const isError =
    vm.kind !== "active" &&
    !vm.kind.startsWith("qr_") &&
    !vm.kind.startsWith("card_");

  if (isError) {
    return {
      main: `<p class="scan-hero-eyebrow">Scan result</p>
    <h1 class="scan-hero-title">${escapeHtml(vm.primaryBadge.label)}</h1>
    <p class="scan-hero-sub">${escapeHtml(scanLead(vm))}</p>`,
      foot: "This page shows resolver state only.",
    };
  }

  const display = parseManifestoDisplay(vm.manifestoLine);
  const template = scanHeroTemplate(display, vm.qrScope);

  if (template === "status_plate" && display.kind === "status_plate") {
    const steward = renderStewardStrip(vm);
    return {
      main: `<h1 class="scan-hero-title">${escapeHtml(display.objectLabel)}</h1>
    <p class="scan-hero-line">${escapeHtml(display.statusLine)}</p>
    ${steward}`,
      foot: "Scan shows current status for this place - not who owns the door.",
    };
  }

  if (template === "lost_item_relay" && display.kind === "lost_item_relay") {
    const meta = scanStatusMetaLine(vm);
    const steward = renderStewardStrip(vm);
    return {
      main: `<p class="scan-hero-eyebrow">Lost item relay</p>
    <h1 class="scan-hero-title">${escapeHtml(display.objectLabel)}</h1>
    <p class="scan-hero-line">${escapeHtml(display.statusLine)}</p>
    ${meta ? `<p class="scan-hero-meta">${escapeHtml(meta)}</p>` : ""}
    ${steward}`,
      foot: "This scan does not prove who holds the item.",
    };
  }

  if (template === "live_object") {
    const line =
      display.kind === "general" && display.line
        ? display.line
        : "Live on the network";
    const steward = renderStewardStrip(vm);
    return {
      main: `<h1 class="scan-hero-title">${escapeHtml(line)}</h1>
    ${steward}`,
      foot: "Scan shows live object state.",
    };
  }

  const title = vm.handle ? `@${escapeHtml(vm.handle)}` : "Unknown card";
  const manifesto =
    display.kind === "general" && display.line
      ? `<p class="scan-hero-line">${escapeHtml(display.line)}</p>`
      : "";
  const pills = renderTrustPills(vm);
  const pillsBlock = pills
    ? `<ul class="scan-hero-trust" aria-label="Status at a glance">${pills}</ul>`
    : "";
  const steward = renderStewardStrip(vm, { omitHandle: true });
  return {
    main: `<h1 class="scan-hero-title">${title}</h1>
    ${manifesto}
    ${pillsBlock}
    ${steward}`,
    foot: "Scan shows current card state at scan time.",
  };
}

/** Zone D below hero — what this scan shows (limits live in `renderLimitsSettings`). */
function renderScanTrustModules(
  vm: ScanViewModel,
  safety: ScanSafetyModel
): string {
  if (vm.kind !== "active" || vm.minimalScan) return "";
  const proves = renderScanProvesModule(vm, safety);
  if (!proves) return "";
  return `<div class="scan-trust-modules scan-trust-layer">${proves}</div>`;
}

function renderScanProvesModule(
  vm: ScanViewModel,
  safety: ScanSafetyModel
): string {
  const items: string[] = [];
  if (vm.kind === "active") {
    items.push("Live status returned from humanity.llc at scan time");
  }
  if (safety.objectSignatureVerified) {
    items.push(SCAN_SAFETY_RESOLVER_VERIFIED_COPY);
  }
  if (vm.profileId && vm.qrId) {
    items.push("Revocable per card and per printed-item QR on the network");
  }
  if (!items.length) return "";
  const rows = items
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  return `<section class="scan-proves" aria-label="What this scan shows">
  <h2 class="scan-module-label">What this scan shows</h2>
  <ul class="scan-proves-list">${rows}</ul>
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
  const codeLine = vm.credentialCode
    ? `<p class="scan-credential-code">Credential code on print: <strong class="mono">${escapeHtml(vm.credentialCode)}</strong> — compare with the sticker or status JSON.</p>`
    : "";
  return `<details class="scan-show-link">
  <summary class="scan-show-link-summary">Show link</summary>
  <p class="pass-scan-url mono">${escapeHtml(vm.scanUrl)}</p>
  ${codeLine}
</details>`;
}

function renderRevokedTombstoneFront(
  vm: ScanViewModel,
  badgeClass: string
): string {
  const headline = minimalScanHeadline(vm.kind);
  const handleLine = vm.handle
    ? `<h1 class="pass-name">@${escapeHtml(vm.handle)}</h1>`
    : `<h1 class="pass-name">${escapeHtml(headline)}</h1>`;
  const statusLine = vm.handle
    ? `<p class="pass-manifesto pass-manifesto-status">${escapeHtml(headline)}</p>`
    : "";
  const manifesto =
    vm.manifestoLine && vm.handle
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
    <p class="pass-type">Scan result</p>
    ${handleLine}
    ${statusLine}
    ${manifesto}
    <p class="pass-manifesto">${escapeHtml(scanLead(vm))}</p>
  </div>
</div>`;
}

function renderPassFront(
  vm: ScanViewModel,
  badgeClass: string,
  qrMarkup: string
): string {
  if (
    !vm.minimalScan &&
    (vm.kind === "qr_revoked" || vm.kind === "card_revoked")
  ) {
    return renderRevokedTombstoneFront(vm, badgeClass);
  }

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
      "Scan shows current status for this place - not who owns the door.";
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

/** Back  -  status hints only; limits live in settings row below the card. */
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

/** Spec §7 / roadmap §7  -  separate grouped blocks below the card. */
function renderTrustGroups(vm: ScanViewModel, origin: string): string {
  const sections: string[] = [];

  if (vm.showCardBlock) {
    pushTrustGroup(sections, "Card status", cardGroupRows(vm), "card", vm);
  }

  if (vm.showHumanTrustBlock) {
    pushTrustGroup(sections, "Human trust", humanGroupRows(vm), "human", vm);
  }

  if (vm.showArtifactBlock) {
    pushTrustGroup(sections, "This QR", qrGroupRows(vm), "qr", vm);
  }

  if (vm.showLiveControlBlock) {
    pushTrustGroup(sections, "Live control", liveControlGroupRows(vm), "live", vm);
  }

  if (vm.kind === "active" && vm.profileId && vm.showHumanTrustBlock) {
    const vouch = renderVouchSection(vm, origin);
    if (vouch.trim()) sections.push(vouch);
  }

  if (!sections.length) return "";

  return `<section class="scan-trust-tools" aria-labelledby="scan-trust-tools-heading">
  <header class="scan-trust-tools-head">
    <h2 id="scan-trust-tools-heading" class="scan-trust-tools-title">Check at scan time</h2>
    <p class="scan-trust-tools-lead">Open a row for card, human trust, this QR, or live control.</p>
  </header>
  <div class="scan-trust-stack" aria-label="Trust details at scan time">
${sections.join("\n")}
  </div>
</section>`;
}

function pushTrustGroup(
  sections: string[],
  label: string,
  rows: string,
  mod: string,
  vm: ScanViewModel
): void {
  if (!rows.trim()) return;
  const icon = trustGroupIcon(mod, vm);
  sections.push(
    trustGroup(label, rows, mod, trustGroupPeek(vm, mod), icon.tone, icon.id)
  );
}

function trustGroupIcon(
  mod: string,
  vm: ScanViewModel
): { id: ScanIconId; tone: string } {
  switch (mod) {
    case "card":
      return { id: "status", tone: cardStatusIconTone(vm) };
    case "human":
      return humanTrustListIcon(humanTrustDisplay(vm));
    case "qr":
      return { id: "qr", tone: qrStatusIconTone(vm) };
    case "live":
      return vm.liveControlProvenAt
        ? { id: "key", tone: "green" }
        : { id: "lock", tone: "red" };
    default:
      return { id: "shield", tone: "slate" };
  }
}

function trustGroupPeek(vm: ScanViewModel, mod: string): string {
  switch (mod) {
    case "card":
      return vm.cardStatus ? formatCardStatus(vm.cardStatus) : "Unknown";
    case "human":
      return humanTrustDisplay(vm).label;
    case "qr":
      return vm.qrStatus ? `QR ${formatQrStatus(vm.qrStatus)}` : "Credential";
    case "live":
      if (vm.liveControlProvenAt) return "Control proven";
      if (vm.kind === "active" && vm.profileId && vm.qrId) {
        return "In-person check available";
      }
      return "Not shown on this scan";
    default:
      return "";
  }
}

function trustGroup(
  label: string,
  rows: string,
  mod: string,
  peek: string,
  iconTone: string,
  iconId: ScanIconId
): string {
  return `<details class="group scan-group scan-group-${mod} scan-trust-layer scan-trust-details">
  <summary class="scan-group-summary">
    ${scanListIcon(iconTone, iconId)}
    <span class="scan-group-summary-text">
      <span class="scan-group-summary-title">${escapeHtml(label)}</span>
      <span class="scan-group-summary-peek">${escapeHtml(peek)}</span>
    </span>
    <span class="scan-group-chevron" aria-hidden="true">›</span>
  </summary>
  <ul class="list">
    ${rows}
  </ul>
</details>`;
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
  return `<section class="group scan-group scan-group-vouch scan-trust-layer" aria-label="Issue vouch">
  <h2 class="group-label">Vouch</h2>
  <div id="vouch-explainer" class="vouch-card vouch-card-hint">
    <div class="vouch-card-head">
      ${scanListIcon("slate", "key")}
      <div class="vouch-card-head-text">
        <span class="vouch-eyebrow">Device signing</span>
        <span class="vouch-title">Signing key in this tab</span>
      </div>
    </div>
    <p class="vouch-lead" id="vouch-explainer-copy">
      Checking this tab for your card’s signing key. Steward and Vouched Human are network checks—separate from signing.
      Use <strong>Sign as…</strong> or <a href="${escapeHtml(walletUrl)}">Saved cards</a>.
      Only the signed vouch is sent; your private key stays here.
    </p>
    <div id="vouch-explainer-actions" class="vouch-explainer-actions" hidden></div>
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
      ? "Printed item  -  revoke one artifact without killing the card"
      : "Card-scoped credential";
  const rows = [listRow("qr", qrStatusIconTone(vm), status, scope)];
  if (vm.qrScope === "print_artifact" && vm.kind === "active") {
    rows.push(
      listRow(
        "qr",
        "green",
        "No calendar expiry",
        "This object QR stays valid until the owner revokes or replaces it"
      )
    );
  }
  if (vm.qrId) {
    rows.push(listRow("profile", "blue", "Credential", vm.qrId));
  }
  const code = credentialCodeForVm(vm);
  if (code) {
    rows.push(
      listRow(
        "profile",
        "slate",
        code,
        "Compare with print sticker · not secret"
      )
    );
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
          <span class="vouch-eyebrow">Signed attestation</span>
          <span class="vouch-title">Issue vouch</span>
        </div>
      </div>
      <p class="vouch-lead">
        Publish a signed statement that you know this person as a distinct human. Not government ID; visible on this network and revocable by you.
      </p>
      <label class="vouch-field-label" for="vouch-statement">Statement (public, max 280)</label>
      <textarea class="vouch-statement" id="vouch-statement" maxlength="280" rows="4"></textarea>
      <label class="vouch-confirm-label">
        <input type="checkbox" id="vouch-confirm" />
        <span>I met them in person. This vouch is public, revocable, and not legal identity proof.</span>
      </label>
      <button type="button" class="vouch-cta" id="vouch-submit">Sign and submit</button>
      <div class="vouch-status-panel">
        <p class="vouch-status" id="vouch-status" aria-live="polite"></p>
      </div>
    </div>
    <div class="vouch-card vouch-card-ineligible" id="vouch-ineligible" hidden>
      <div class="vouch-card-head">
        ${scanListIcon("orange", "warning")}
        <div class="vouch-card-head-text">
          <span class="vouch-eyebrow">Unavailable</span>
          <span class="vouch-title">Cannot issue vouch</span>
        </div>
      </div>
      <p class="vouch-lead" id="vouch-ineligible-copy"></p>
    </div>
    <div class="vouch-card vouch-card-success" id="vouch-success" hidden>
      <div class="vouch-card-head">
        ${scanListIcon("green", "people")}
        <div class="vouch-card-head-text">
          <span class="vouch-eyebrow">Accepted</span>
          <span class="vouch-title">Vouch recorded</span>
        </div>
      </div>
      <p class="vouch-lead" id="vouch-success-copy">The signed vouch is on the network.</p>
    </div>
  </span>
</li>`;
}

function renderVouchIssuanceScript(vm: ScanViewModel, origin: string): string {
  if (vm.kind !== "active" || !vm.profileId) return "";
  const assetOrigin = pagesJsOrigin(origin);
  const mod = JSON.stringify(`${assetOrigin}/js/vouch-issue.mjs?v=12`);
  return `<script type="module" src=${mod}></script>`;
}

function renderScanTabKeysScript(vm: ScanViewModel, origin: string): string {
  if (vm.kind !== "active" || !vm.profileId) return "";
  const assetOrigin = pagesJsOrigin(origin);
  const mod = JSON.stringify(`${assetOrigin}/js/scan-tab-keys.mjs?v=6`);
  return `<script type="module" src=${mod}></script>`;
}

function renderScanLiveCheckArriveScript(origin: string): string {
  const assetOrigin = pagesJsOrigin(origin);
  const mod = JSON.stringify(`${assetOrigin}/js/scan-live-check-arrive.mjs?v=1`);
  return `<script type="module" src=${mod}></script>`;
}

/** L3 actor band — markup only on active scans (docs/SCAN_PAGE_TRUST_UI.md S3). */
function renderScanActorBand(vm: ScanViewModel, origin: string): string {
  if (vm.kind !== "active" || !vm.profileId || !vm.qrId) return "";
  const walletUrl = `${escapeHtml(origin)}/wallet/`;
  return `<section id="scan-actor-band" class="scan-actor-band scan-actor-band--hidden" hidden aria-label="Your device on this scan">
  <h2 class="scan-actor-band-title">Keys on this device</h2>
  <p class="scan-actor-band-lead">You can vouch or open your cards from here.</p>
  <div class="scan-actor-band-actions">
    <button type="button" class="scan-actor-band-primary" id="scan-actor-band-vouch">Go to vouch</button>
    <a class="scan-actor-band-secondary" href="${walletUrl}">My cards</a>
  </div>
</section>`;
}

function renderScanActorBandScript(vm: ScanViewModel, origin: string): string {
  if (vm.kind !== "active" || !vm.profileId) return "";
  const assetOrigin = pagesJsOrigin(origin);
  const mod = JSON.stringify(`${assetOrigin}/js/scan-actor-band.mjs?v=1`);
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
        Ask the owner to prove they hold the signing key for this object  -  right now, on the spot.
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
        ? "Control proven from this device. The scanner should see success on their screen  -  you do not need to ask again here."
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
          copyOwnerLink.textContent = "Copy failed  -  use Open link";
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

/** iOS-style settings row  -  all “does not prove” copy in one place. */
function renderLimitsSettings(vm: ScanViewModel, origin: string): string {
  const policy = `${origin}/data-policy.html`;
  const architecture = `${origin}/architecture.html`;
  const artifactExpiryNote =
    vm.qrScope === "print_artifact" && vm.kind === "active"
      ? `<li>${escapeHtml(PRINT_ARTIFACT_NO_CALENDAR_EXPIRY_NOTE)}</li>`
      : "";
  return `<details class="scan-limits-settings scan-trust-layer scan-limits-layer" id="scan-limits-settings">
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
      <li>Who scanned, when, or where  -  this page returns object state, not a people trail</li>
      ${artifactExpiryNote}
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
        return "Return instructions for this item  -  relay active or revoked at scan time.";
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
      return scanMalformedLead(vm.malformedReason ?? "invalid_profile_id");
    case "card_revoked": {
      const base =
        "Object state: card disabled. Printed QRs still exist; card details are hidden.";
      const reason = publicReasonLabel(vm.publicReason);
      return reason ? `${base} ${reason}.` : base;
    }
    case "card_suspended":
      return "This card is suspended under published rules. See the process links below.";
    case "card_expired":
      return "This card has expired.";
    case "qr_revoked": {
      const base =
        "Object state: this pointer is off. The sticker is unchanged; only live rules changed.";
      const reason = publicReasonLabel(vm.publicReason);
      return reason ? `${base} ${reason}.` : base;
    }
    case "qr_expired":
      return "Object state: validity ended. The card may still be active for other QRs.";
    case "qr_replaced":
      return "This QR was replaced by a newer credential.";
    default:
      return "Trust details at scan time.";
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
  if (vm.kind === "malformed") {
    return scanMalformedPageTitle(vm.malformedReason ?? "invalid_profile_id");
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