import type { ScanViewModel } from "./scan-state";

const STYLES_VERSION = "25";

/**
 * Public scan UI — same pass card + flip as landing; M3.2 trust rows on card back.
 */
export function renderScanPage(vm: ScanViewModel, origin: string): string {
  const title = pageTitle(vm);
  const cssUrl = `${origin}/styles.css?v=${STYLES_VERSION}`;
  const flipJs = `${origin}/js/pass-flip.js?v=1`;

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
  <link rel="stylesheet" href="${escapeHtml(cssUrl)}" />
</head>
<body>
  <div class="page scan-page">
    ${renderTopHeader(origin)}
    <main class="screen scan-screen">
      <p class="section-kicker">Live resolver · scan time</p>
      ${renderPassSection(vm, origin)}
      ${renderFooter(vm, origin)}
    </main>
  </div>
  <script src="${escapeHtml(flipJs)}" defer></script>
</body>
</html>`;
}

function renderTopHeader(origin: string): string {
  return `<header class="top">
  <a class="top-brand" href="${escapeHtml(origin)}/">
    <span class="pass-dot" aria-hidden="true"></span>
    <span>humanity.llc</span>
  </a>
</header>`;
}

function renderPassSection(vm: ScanViewModel, origin: string): string {
  const badgeClass = `pass-badge badge-${vm.primaryBadge.tone}`;
  const frontBody = renderPassFront(vm, origin, badgeClass);
  const backBody = renderPassBack(vm, origin);

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
  origin: string,
  badgeClass: string
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
  <div class="pass-qr">
    <img src="${escapeHtml(origin)}/assets/red_qr_transparent_bg.png" width="96" height="96" alt="" />
  </div>
</div>
<p class="pass-foot">${escapeHtml(bearerFoot())}</p>`;
}

function renderPassBack(vm: ScanViewModel, origin: string): string {
  const rows = buildBackGridRows(vm);

  return `<div class="pass-back-accent" aria-hidden="true"></div>
<div class="pass-back-inner">
  <div class="pass-head">
    <div class="pass-brand">
      <span class="pass-dot" aria-hidden="true"></span>
      <span>What this scan means</span>
    </div>
    <span class="pass-badge badge-neutral">Limits</span>
  </div>
  <ul class="pass-back-grid" aria-label="Trust details at scan time">
    ${rows.join("\n")}
  </ul>
  <p class="pass-foot">
    Not government ID or KYC. No scan analytics on this page by default.
    <a href="${escapeHtml(origin)}/data-policy.html">Operator data policy</a>
  </p>
</div>`;
}

function buildBackGridRows(vm: ScanViewModel): string[] {
  const rows: string[] = [];

  if (vm.showCardBlock) {
    rows.push(backRow("Card", cardBackValue(vm)));
  }
  if (vm.showHumanTrustBlock) {
    rows.push(backRow("Human trust", humanBackValue(vm)));
  }
  if (vm.showArtifactBlock) {
    rows.push(backRow("This QR", qrBackValue(vm)));
  }
  if (vm.showLiveControlBlock) {
    rows.push(
      backRow(
        "Live control",
        vm.liveControlAvailable
          ? "Proven recently (optional key proof in person)"
          : "Not shown on this scan"
      )
    );
  }

  rows.push(
    backRow(
      "Bearer",
      "Holding this object does not prove the holder owns the card"
    )
  );

  if (rows.length === 0) {
    rows.push(backRow("Scan", scanLead(vm)));
  }

  return rows;
}

function backRow(label: string, value: string): string {
  return `<li>
  <span class="pass-back-label">${escapeHtml(label)}</span>
  <span class="pass-back-value">${escapeHtml(value)}</span>
</li>`;
}

function cardBackValue(vm: ScanViewModel): string {
  const status = vm.cardStatus ? `Card ${vm.cardStatus}` : "Unknown";
  const id = vm.profileId ? ` · ${vm.profileId}` : "";
  if (vm.kind === "active") {
    return `${status}${id} — live public fields, not legal ID`;
  }
  return `${status}${id} — ${scanLead(vm)}`;
}

function humanBackValue(vm: ScanViewModel): string {
  const base = vm.verificationLabel;
  if (vm.vouchCount > 0) {
    return `${base} · ${vm.vouchCount} accepted vouch${vm.vouchCount === 1 ? "" : "es"}`;
  }
  return `${base} · no hidden trust score`;
}

function qrBackValue(vm: ScanViewModel): string {
  const status = vm.qrStatus ? formatQrStatus(vm.qrStatus) : "unknown";
  const scope = vm.qrScope ? formatScope(vm.qrScope) : "—";
  const scopeNote =
    vm.qrScope === "print_artifact"
      ? "printed item scope"
      : "card scope";
  const id = vm.qrId ? ` · ${vm.qrId}` : "";
  return `${status} · ${scopeNote}${id}`;
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
      ? `<a class="dock-btn" href="${escapeHtml(origin)}/create/">Create a live object</a>`
      : `<a class="dock-btn dock-btn-secondary" href="${escapeHtml(origin)}/">About humanity.llc</a>`;

  return `<footer class="scan-footer">
  ${createCta}
  ${jsonLink}
</footer>`;
}

function bearerFoot(): string {
  return "Scan shows live state. Holding the object does not prove ownership.";
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

function formatScope(scope: string): string {
  return scope === "print_artifact" ? "printed item" : "card";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
