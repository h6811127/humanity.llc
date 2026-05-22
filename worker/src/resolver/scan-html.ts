import type { ScanPageKind, ScanViewModel, StatusTone } from "./scan-state";

const RED = "#db1b43";

export function renderScanPage(vm: ScanViewModel, origin: string): string {
  const title = pageTitle(vm);
  const lead = pageLead(vm);
  const badgeClass = `badge badge-${vm.primaryBadge.tone}`;

  const cardBlock = vm.showCardBlock ? renderCardBlock(vm) : "";
  const humanBlock = vm.showHumanTrustBlock ? renderHumanTrustBlock(vm) : "";
  const qrBlock = vm.showQrBlock ? renderQrBlock(vm) : "";
  const limitsBlock = renderLimitsBlock(vm, origin);
  const footer = renderFooter(vm, origin);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="color-scheme" content="light" />
  <meta name="theme-color" content="#ffffff" />
  <title>${escapeHtml(title)} · humanity.llc</title>
  <meta name="description" content="${escapeHtml(lead)}" />
  <style>${SCAN_CSS}</style>
</head>
<body>
  <main class="scan">
    <header class="scan-head">
      <div class="scan-brand">
        <span class="scan-dot" aria-hidden="true"></span>
        <span>humanity.llc</span>
      </div>
      <span class="${badgeClass}">${escapeHtml(vm.primaryBadge.label)}</span>
    </header>

    <p class="scan-lead">${escapeHtml(lead)}</p>

    ${cardBlock}
    ${humanBlock}
    ${qrBlock}
    ${limitsBlock}
    ${footer}
  </main>
</body>
</html>`;
}

function pageTitle(vm: ScanViewModel): string {
  if (vm.kind === "active" && vm.handle) return `@${vm.handle}`;
  if (vm.kind === "unknown_profile") return "Card not found";
  if (vm.kind === "unknown_qr") return "QR not found";
  if (vm.kind === "malformed") return "Invalid scan link";
  return vm.primaryBadge.label;
}

function pageLead(vm: ScanViewModel): string {
  switch (vm.kind) {
    case "active":
      return "Live resolver status at scan time. Not legal ID. Not proof the holder owns this item.";
    case "unknown_profile":
      return "No Humanity Card is registered for this link.";
    case "unknown_qr":
      return "This QR credential is not recognized for this card.";
    case "profile_qr_mismatch":
      return "This QR does not belong to the profile in the URL.";
    case "malformed":
      return "This scan link is missing or has an invalid profile or QR id.";
    case "card_revoked":
      return "This card was revoked by the owner. Printed QRs may still exist physically.";
    case "card_suspended":
      return "This card is suspended under published operator rules.";
    case "card_expired":
      return "This card has expired.";
    case "qr_revoked":
      return "This QR credential was revoked. Other QRs on the same card may still be active.";
    case "qr_expired":
      return "This QR credential has expired.";
    case "qr_replaced":
      return "This QR was replaced by a newer credential on the same card.";
    default:
      return "Resolver status at scan time.";
  }
}

function renderCardBlock(vm: ScanViewModel): string {
  const handle = vm.handle ? `@${escapeHtml(vm.handle)}` : "—";
  const manifesto = vm.manifestoLine
    ? `<p class="block-manifesto">${escapeHtml(vm.manifestoLine)}</p>`
    : "";
  const statusLine = vm.cardStatus
    ? `<p class="block-meta">Card: <strong>${escapeHtml(vm.cardStatus)}</strong></p>`
    : "";

  return `<section class="block" aria-labelledby="card-heading">
  <h2 id="card-heading" class="block-label">Card</h2>
  <div class="block-card">
    <p class="block-handle">${handle}</p>
    ${manifesto}
    ${statusLine}
  </div>
</section>`;
}

function renderHumanTrustBlock(vm: ScanViewModel): string {
  return `<section class="block" aria-labelledby="human-heading">
  <h2 id="human-heading" class="block-label">Human trust</h2>
  <ul class="trust-rows">
    <li class="trust-on">${escapeHtml(vm.verificationLabel)}</li>
    <li>No hidden trust score</li>
  </ul>
</section>`;
}

function renderQrBlock(vm: ScanViewModel): string {
  const qrStatus = vm.qrStatus ? escapeHtml(vm.qrStatus) : "unknown";
  const scope = vm.qrScope ? escapeHtml(vm.qrScope.replace("_", " ")) : "—";
  const qrId = vm.qrId
    ? `<p class="block-meta mono">QR: ${escapeHtml(vm.qrId)}</p>`
    : "";

  return `<section class="block" aria-labelledby="qr-heading">
  <h2 id="qr-heading" class="block-label">QR credential</h2>
  <ul class="trust-rows">
    <li>Status: <strong>${qrStatus}</strong></li>
    <li>Scope: ${scope}</li>
  </ul>
  ${qrId}
</section>`;
}

function renderLimitsBlock(vm: ScanViewModel, origin: string): string {
  const bearer = vm.showBearerWarning
    ? `<p class="limit-warn"><strong>Bearer warning.</strong> This QR resolves to a Humanity Card. It does not prove the person holding this item is the card owner.</p>`
    : "";

  return `<section class="block block-limits" aria-labelledby="limits-heading">
  <h2 id="limits-heading" class="block-label">Limits</h2>
  ${bearer}
  <ul class="limit-list">
    <li>Not government ID, KYC, or employment verification</li>
    <li>No scan analytics on this page (reference operator default)</li>
  </ul>
  <p class="limit-link"><a href="${escapeHtml(origin)}/data-policy.html">Operator data policy</a></p>
</section>`;
}

function renderFooter(vm: ScanViewModel, origin: string): string {
  const jsonLink =
    vm.profileId && vm.kind === "active"
      ? `<a class="footer-link" href="${escapeHtml(origin)}/.well-known/hc/v1/cards/${escapeHtml(vm.profileId)}">Public card JSON</a>`
      : "";
  const createCta =
    vm.kind === "unknown_profile" || vm.kind === "malformed"
      ? `<a class="footer-cta" href="${escapeHtml(origin)}/create/">Create a live object</a>`
      : `<a class="footer-cta secondary" href="${escapeHtml(origin)}/">About humanity.llc</a>`;

  return `<footer class="scan-foot">
  ${createCta}
  ${jsonLink}
</footer>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SCAN_CSS = `
:root {
  --red: ${RED};
  --black: #000;
  --white: #fff;
  --grey: #8e8e93;
  --bg: #f5f5f7;
  --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--black);
  line-height: 1.45;
  min-height: 100dvh;
}
.scan {
  max-width: 420px;
  margin: 0 auto;
  padding: 20px 18px 32px;
}
.scan-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.scan-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.scan-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--red);
  flex-shrink: 0;
}
.badge {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 5px 11px;
  border-radius: 100px;
  border: 1px solid rgba(0,0,0,0.12);
  white-space: nowrap;
}
.badge-live {
  background: var(--red);
  border-color: var(--red);
  color: var(--white);
}
.badge-warn {
  background: #fff8e6;
  border-color: #e6c200;
  color: #6b5a00;
}
.badge-bad {
  background: #fde8ec;
  border-color: #f5c2cb;
  color: #8b1530;
}
.badge-neutral {
  background: var(--white);
  color: var(--grey);
}
.scan-lead {
  font-size: 14px;
  color: var(--grey);
  margin-bottom: 18px;
  line-height: 1.5;
}
.block {
  background: var(--white);
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 18px;
  padding: 14px 16px 16px;
  margin-bottom: 12px;
}
.block-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--grey);
  margin-bottom: 10px;
}
.block-handle {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin-bottom: 6px;
}
.block-manifesto {
  font-size: 15px;
  line-height: 1.45;
  margin-bottom: 8px;
}
.block-meta {
  font-size: 13px;
  color: var(--grey);
}
.block-meta strong { color: var(--black); font-weight: 600; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 11px; word-break: break-all; }
.trust-rows {
  list-style: none;
  font-size: 15px;
}
.trust-rows li {
  padding: 6px 0;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.trust-rows li:last-child { border-bottom: none; }
.trust-on { color: var(--red); font-weight: 600; }
.block-limits { background: #fafafa; }
.limit-warn {
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 10px;
  padding: 10px 12px;
  border-left: 3px solid var(--red);
  background: rgba(219,27,67,0.05);
  border-radius: 0 10px 10px 0;
}
.limit-list {
  list-style: disc;
  padding-left: 18px;
  font-size: 13px;
  color: var(--grey);
}
.limit-list li { margin-bottom: 4px; }
.limit-link { margin-top: 10px; font-size: 13px; }
.limit-link a { color: var(--red); font-weight: 600; text-decoration: none; }
.scan-foot {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}
.footer-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 12px 18px;
  border-radius: 100px;
  background: var(--red);
  color: var(--white);
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  letter-spacing: -0.02em;
}
.footer-cta.secondary {
  background: var(--white);
  color: var(--black);
  border: 1px solid rgba(0,0,0,0.14);
}
.footer-link {
  text-align: center;
  font-size: 13px;
  color: var(--grey);
  text-decoration: none;
}
.footer-link:hover { color: var(--red); }
`;
