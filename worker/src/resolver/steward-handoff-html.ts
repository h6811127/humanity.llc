import { SCAN_PASS_CSS } from "./scan-pass-styles";
import { SCAN_PAGE_THEME_BOOTSTRAP } from "./scan-page-theme";
import {
  STEWARD_HANDOFF_INTERSTITIAL_CONTINUE,
  STEWARD_HANDOFF_INTERSTITIAL_COPY,
  STEWARD_HANDOFF_INTERSTITIAL_DETAIL,
  STEWARD_HANDOFF_INTERSTITIAL_EYEBROW,
  STEWARD_HANDOFF_INTERSTITIAL_TITLE,
} from "../../../site/js/device-ownership-copy-core.mjs";

export interface StewardHandoffInterstitialModel {
  origin: string;
  scanUrl: string;
  continueUrl: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderStewardHandoffInterstitialPage(
  model: StewardHandoffInterstitialModel
): string {
  const scanUrlJson = JSON.stringify(model.scanUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="color-scheme" content="light dark" />
  <meta name="robots" content="noindex" />
  <title>${escapeHtml(STEWARD_HANDOFF_INTERSTITIAL_TITLE)} · humanity.llc</title>
  <link rel="icon" href="${escapeHtml(model.origin)}/assets/red_qr_transparent_bg.png" type="image/png" />
  ${SCAN_PAGE_THEME_BOOTSTRAP}
  <style>${SCAN_PASS_CSS}</style>
</head>
<body>
  <div class="page scan-page">
    <main class="screen scan-screen">
      <article class="scan-status-panel scan-out-panel steward-handoff-panel" aria-labelledby="steward-handoff-title">
        <p class="scan-status-eyebrow">${escapeHtml(STEWARD_HANDOFF_INTERSTITIAL_EYEBROW)}</p>
        <h1 class="scan-status-title" id="steward-handoff-title">${escapeHtml(STEWARD_HANDOFF_INTERSTITIAL_TITLE)}</h1>
        <p class="scan-status-sub">${escapeHtml(STEWARD_HANDOFF_INTERSTITIAL_DETAIL)}</p>
        <p class="scan-out-target mono" id="steward-handoff-scan-url">${escapeHtml(model.scanUrl)}</p>
        <div class="scan-out-actions">
          <button type="button" class="dock-btn-secondary" id="steward-handoff-copy">${escapeHtml(STEWARD_HANDOFF_INTERSTITIAL_COPY)}</button>
          <a class="dock-btn-primary" href="${escapeHtml(model.continueUrl)}">${escapeHtml(STEWARD_HANDOFF_INTERSTITIAL_CONTINUE)}</a>
        </div>
        <p class="scan-status-foot">No automatic redirect. Copy the link or continue when ready.</p>
      </article>
    </main>
  </div>
  <script>
    (function () {
      var scanUrl = ${scanUrlJson};
      var btn = document.getElementById("steward-handoff-copy");
      var label = ${JSON.stringify(STEWARD_HANDOFF_INTERSTITIAL_COPY)};
      if (!btn) return;
      btn.addEventListener("click", function () {
        btn.disabled = true;
        var done = function (ok) {
          btn.textContent = ok ? "Link copied" : "Copy failed";
          window.setTimeout(function () {
            btn.disabled = false;
            btn.textContent = label;
          }, 2500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(scanUrl).then(function () { done(true); }).catch(function () { done(false); });
          return;
        }
        done(false);
      });
    })();
  </script>
</body>
</html>`;
}

export function renderStewardHandoffErrorPage(
  message: string,
  origin: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="color-scheme" content="light dark" />
  <meta name="robots" content="noindex" />
  <title>Invalid handoff link · humanity.llc</title>
  <link rel="icon" href="${escapeHtml(origin)}/assets/red_qr_transparent_bg.png" type="image/png" />
  ${SCAN_PAGE_THEME_BOOTSTRAP}
  <style>${SCAN_PASS_CSS}</style>
</head>
<body>
  <div class="page scan-page">
    <main class="screen scan-screen">
      <article class="scan-status-panel scan-out-panel">
        <p class="scan-status-eyebrow">Steward scan</p>
        <h1 class="scan-status-title">This handoff link is invalid</h1>
        <p class="scan-status-sub">${escapeHtml(message)}</p>
        <div class="scan-out-actions">
          <a class="dock-btn-primary" href="${escapeHtml(origin)}/">Go to humanity.llc</a>
        </div>
      </article>
    </main>
  </div>
</body>
</html>`;
}
