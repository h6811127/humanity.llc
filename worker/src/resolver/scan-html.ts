import type { ScanViewModel } from "./scan-state";
import { scanListIcon, type ScanIconId } from "./scan-icons";
import { BEARER_WARNING } from "./trust-copy";
import { SCAN_PASS_FLIP_JS } from "./scan-pass-flip";
import { SCAN_PASS_CSS } from "./scan-pass-styles";
import { renderScanQrMarkup } from "./scan-qr";

/** Response header — confirms pass-card scan UI (not legacy .block layout). */
export const SCAN_UI_VERSION = "pass-v4";

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
      <p class="section-kicker">Live resolver · scan time</p>
      ${renderBearerBanner()}
      ${renderPassSection(vm, origin, qrMarkup)}
      ${renderTrustGroups(vm, origin)}
      ${renderFooter(vm, origin)}
    </main>
  </div>
  <script>${SCAN_PASS_FLIP_JS}</script>
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

/** M3.3 — bearer warning above the fold before the pass card. */
function renderBearerBanner(): string {
  return `<aside class="scan-bearer-banner" role="note" aria-label="Scan limits">
  <p>${escapeHtml(BEARER_WARNING)}</p>
</aside>`;
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
  const frontBody = renderPassFront(vm, badgeClass, qrMarkup);
  const backBody = renderPassBack(origin);

  return `<section class="pass" aria-label="Humanity Card at scan time">
  <div class="pass-scene" id="pass-scene">
    <div class="pass-tilt-wrap" id="pass-tilt-wrap">
      <div class="pass-flip" id="pass-flip">
        <div class="pass-inner">
          <div class="pass-face pass-front">
            <div class="pass-tilt-surface" id="pass-tilt-surface">
              ${frontBody}
            </div>
          </div>
          <div class="pass-face pass-back" aria-hidden="true">
            ${backBody}
          </div>
        </div>
      </div>
    </div>
    <button type="button" class="pass-flip-btn" id="pass-flip-btn" aria-label="Flip card">
      Tap to flip
    </button>
  </div>
</section>`;
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
<p class="pass-manifesto">${escapeHtml(scanLead(vm))}</p>
<p class="pass-foot">${escapeHtml(bearerFoot())}</p>`;
  }

  const handle = vm.handle ? `@${escapeHtml(vm.handle)}` : "Unknown card";
  const manifesto = vm.manifestoLine
    ? `<p class="pass-manifesto">${escapeHtml(vm.manifestoLine)}</p>`
    : "";
  const qrSlotAttr = vm.scanUrl
    ? ` id="pass-qr-slot" data-scan-url="${escapeHtml(vm.scanUrl)}"`
    : "";
  const qrBlock = vm.scanUrl
    ? `<div class="pass-qr"${qrSlotAttr}>${qrMarkup}</div>`
    : "";
  const scanUrlLine = vm.scanUrl
    ? `<p class="pass-scan-url mono">${escapeHtml(vm.scanUrl)}</p>`
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
${scanUrlLine}
<p class="pass-foot">${escapeHtml(bearerFoot())}</p>`;
}

/** Back matches landing preview — short limits only (details live below the card). */
function renderPassBack(origin: string): string {
  return `<div class="pass-back-accent" aria-hidden="true"></div>
<div class="pass-back-inner">
  <div class="pass-head">
    <div class="pass-brand">
      <span class="pass-dot" aria-hidden="true"></span>
      <span>Limits</span>
    </div>
    <span class="pass-badge badge-neutral">Optional</span>
  </div>
  <ul class="pass-back-grid" aria-label="Privacy posture">
    <li>
      <span class="pass-back-label">Bearer</span>
      <span class="pass-back-value">scan does not prove the holder owns this object</span>
    </li>
    <li>
      <span class="pass-back-label">Not ID</span>
      <span class="pass-back-value">not government ID, KYC, or employment verification</span>
    </li>
    <li>
      <span class="pass-back-label">Revocable</span>
      <span class="pass-back-value">per object and per printed-item QR</span>
    </li>
  </ul>
  <p class="pass-foot">
    <a href="${escapeHtml(origin)}/data-policy.html">Operator data policy</a>
  </p>
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

  sections.push(
    trustGroup(
      "Limitations",
      limitationsGroupRows(vm, origin),
      "limits"
    )
  );

  return `<div class="scan-trust-groups" aria-label="What this scan means">
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

function listActionRow(
  icon: ScanIconId,
  tone: string,
  href: string,
  title: string
): string {
  return `<li class="list-row list-action">
  <a href="${escapeHtml(href)}">
    ${scanListIcon(tone, icon)}
    <span class="list-content">
      <span class="list-title">${escapeHtml(title)}</span>
    </span>
    <span class="list-chevron" aria-hidden="true">›</span>
  </a>
</li>`;
}

function cardGroupRows(vm: ScanViewModel): string {
  const status = vm.cardStatus ? `Card ${vm.cardStatus}` : "Unknown";
  const rows = [
    listRow(
      "status",
      "green",
      status,
      vm.kind === "active"
        ? "Live public card fields at scan time"
        : scanLead(vm)
    ),
  ];
  if (vm.profileId) {
    rows.push(listRow("profile", "blue", "Profile ID", vm.profileId));
  }
  rows.push(
    listRow(
      "people",
      "orange",
      "Does not prove",
      "Legal identity or that the person holding this item owns the card"
    )
  );
  return rows.join("\n");
}

function humanGroupRows(vm: ScanViewModel): string {
  const rows = [listRow("people", "purple", vm.verificationLabel, humanSub(vm))];
  rows.push(
    listRow(
      "ban",
      "slate",
      "Does not prove",
      "Employment eligibility, KYC, age, or a hidden trust score"
    )
  );
  return rows.join("\n");
}

function humanSub(vm: ScanViewModel): string {
  if (vm.vouchCount > 0) {
    return `${vm.vouchCount} accepted vouch${vm.vouchCount === 1 ? "" : "es"} on this operator`;
  }
  return "Registered on this operator — baseline, not proof of humanity";
}

function qrGroupRows(vm: ScanViewModel): string {
  const status = vm.qrStatus ? `QR ${formatQrStatus(vm.qrStatus)}` : "QR unknown";
  const scope =
    vm.qrScope === "print_artifact"
      ? "Printed item — revoke one artifact without killing the card"
      : "Card-scoped credential";
  const rows = [listRow("qr", "green", status, scope)];
  if (vm.qrId) {
    rows.push(listRow("profile", "blue", "Credential", vm.qrId));
  }
  if (vm.scanUrl) {
    rows.push(listRow("link", "red", "Scan link", vm.scanUrl));
  }
  rows.push(
    listRow(
      "warning",
      "orange",
      "Bearer warning",
      "This QR resolves to a Humanity Card. It does not prove the person holding this item is the card owner."
    )
  );
  return rows.join("\n");
}

function liveControlGroupRows(vm: ScanViewModel): string {
  if (vm.liveControlAvailable) {
    return listRow(
      "key",
      "green",
      "Control proven recently",
      "Card key signed a fresh challenge — not shown on every scan"
    );
  }
  return (
    listRow("key", "slate", "Not shown", "Optional in-person key proof (M7)") +
    "\n" +
    listRow(
      "shield",
      "slate",
      "Does not prove",
      "Legal identity, permanent ownership, or that earlier vouches were honest"
    )
  );
}

function limitationsGroupRows(vm: ScanViewModel, origin: string): string {
  return (
    listRow(
      "ban",
      "orange",
      "Not government ID or KYC",
      "Scan shows resolver state only"
    ) +
    "\n" +
    listRow(
      "shield",
      "pink",
      "No scan analytics",
      "Reference operator default for this page"
    ) +
    "\n" +
    listActionRow(
      "database",
      "blue",
      `${origin}/data-policy.html`,
      "Operator data policy"
    )
  );
}

function renderTrustPills(vm: ScanViewModel): string {
  return [pillForCard(vm), pillForHuman(vm), pillForQr(vm)].join("\n");
}

function pillForCard(vm: ScanViewModel): string {
  const label = vm.cardStatus
    ? `Card ${formatCardStatus(vm.cardStatus)}`
    : "Card unknown";
  const on = vm.kind === "active" ? "trust-on" : "";
  return `<li class="${on}">${escapeHtml(label)}</li>`;
}

function pillForHuman(vm: ScanViewModel): string {
  const on =
    vm.kind === "active" && vm.verificationLabel === "Registered"
      ? "trust-on"
      : vm.vouchCount >= 3
        ? "trust-on"
        : "";
  return `<li class="${on}">${escapeHtml(vm.verificationLabel)}</li>`;
}

function pillForQr(vm: ScanViewModel): string {
  const label = vm.qrStatus
    ? `QR ${formatQrStatus(vm.qrStatus)}`
    : "QR unknown";
  const on =
    vm.kind === "active" && vm.qrStatus === "active" ? "trust-on" : "";
  return `<li class="${on}">${escapeHtml(label)}</li>`;
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

function bearerFoot(): string {
  return BEARER_WARNING;
}

function scanLead(vm: ScanViewModel): string {
  switch (vm.kind) {
    case "active":
      return "Resolver returned current status for this card and QR.";
    case "unknown_profile":
      return "No Humanity Card is registered for this link.";
    case "unknown_qr":
      return "This QR credential is not recognized for this card.";
    case "profile_qr_mismatch":
      return "This QR does not belong to the profile in the URL.";
    case "malformed":
      return "This scan link is missing a valid profile or QR id.";
    case "card_revoked":
      return "This card was revoked. Printed QRs may still exist.";
    case "card_suspended":
      return "This card is suspended under published rules.";
    case "card_expired":
      return "This card has expired.";
    case "qr_revoked":
      return "This QR credential was revoked.";
    case "qr_expired":
      return "This QR credential has expired.";
    case "qr_replaced":
      return "This QR was replaced by a newer credential.";
    default:
      return "Resolver status at scan time.";
  }
}

function pageTitle(vm: ScanViewModel): string {
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
