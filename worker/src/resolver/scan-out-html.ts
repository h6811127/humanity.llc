import { SCAN_PASS_CSS } from "./scan-pass-styles";
import type { ScanViewModel } from "./scan-state";

export interface ScanOutInterstitialModel {
  domain: string;
  targetUrl: string;
  known: boolean;
  stayUrl: string;
  continueUrl: string;
  vm: ScanViewModel;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function qrStatusLabel(vm: ScanViewModel): string {
  if (vm.kind === "active") return "Active";
  if (vm.kind === "qr_revoked" || vm.kind === "card_revoked") return "Revoked";
  if (vm.kind === "qr_expired" || vm.kind === "card_expired") return "Expired";
  if (vm.kind === "card_suspended") return "Suspended";
  return vm.primaryBadge?.label ?? "Unknown";
}

export function renderScanOutInterstitialPage(
  model: ScanOutInterstitialModel,
  origin: string
): string {
  const handle = model.vm.handle ? `@${model.vm.handle}` : "unknown steward";
  const warning = model.known
    ? ""
    : `<p class="scan-out-warning" role="alert">This domain is not on Humanity’s familiar list. Only continue if you trust the steward and the destination.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="color-scheme" content="light" />
  <meta name="robots" content="noindex" />
  <title>Leave humanity.llc? · ${escapeHtml(model.domain)}</title>
  <link rel="icon" href="${escapeHtml(origin)}/assets/red_qr_transparent_bg.png" type="image/png" />
  <style>${SCAN_PASS_CSS}</style>
</head>
<body>
  <div class="page scan-page">
    <main class="screen scan-screen">
      <article class="scan-status-panel scan-out-panel" aria-labelledby="scan-out-title">
        <p class="scan-status-eyebrow">External link</p>
        <h1 class="scan-status-title" id="scan-out-title">This object wants to open <span class="scan-out-domain">${escapeHtml(model.domain)}</span></h1>
        <p class="scan-status-sub">Steward: ${escapeHtml(handle)} · QR ${escapeHtml(qrStatusLabel(model.vm))} · Not proof of identity</p>
        ${warning}
        <p class="scan-out-target mono">${escapeHtml(model.targetUrl)}</p>
        <div class="scan-out-actions">
          <a class="dock-btn-secondary" href="${escapeHtml(model.stayUrl)}">Stay on Humanity</a>
          <a class="dock-btn-primary" href="${escapeHtml(model.continueUrl)}">Continue to ${escapeHtml(model.domain)}</a>
        </div>
        <p class="scan-status-foot">No automatic redirect. You must tap Continue.</p>
      </article>
    </main>
  </div>
</body>
</html>`;
}

export function renderScanOutErrorPage(
  message: string,
  stayUrl: string,
  origin: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Link unavailable · humanity.llc</title>
  <link rel="icon" href="${escapeHtml(origin)}/assets/red_qr_transparent_bg.png" type="image/png" />
  <style>${SCAN_PASS_CSS}</style>
</head>
<body>
  <div class="page scan-page">
    <main class="screen scan-screen">
      <article class="scan-status-panel scan-out-panel">
        <h1 class="scan-status-title">Link unavailable</h1>
        <p class="scan-status-sub">${escapeHtml(message)}</p>
        <p class="scan-out-actions"><a class="dock-btn-primary" href="${escapeHtml(stayUrl)}">Back to scan</a></p>
      </article>
    </main>
  </div>
</body>
</html>`;
}
