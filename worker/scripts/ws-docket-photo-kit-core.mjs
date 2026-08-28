/**
 * WS-DOCKET photo Phase 2 field kit.
 */
import {
  DOCKET_PHOTO_CAPTION,
  DOCKET_PHOTO_KIT_REL,
  docketPhotoPhase2Steps,
  renderDocketPhotoSlotHtml,
  resolveDocketPhotoSlot,
} from "../../site/js/docket-photo-core.mjs";

export { DOCKET_PHOTO_KIT_REL };

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

/**
 * @param {{ origin?: string }} [opts]
 */
export function buildWsDocketPhotoKitHtml(opts = {}) {
  const origin = (opts.origin ?? "http://127.0.0.1:8788").replace(/\/$/, "");
  const steps = docketPhotoPhase2Steps()
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("\n");
  const mono = renderDocketPhotoSlotHtml({
    monogram: "BN",
    licenseStatus: "not_licensed",
    size: "lg",
    showCaption: false,
  });
  const licensedDemo = renderDocketPhotoSlotHtml({
    monogram: "XX",
    photoRef: "/assets/red_qr_transparent_bg.png",
    licenseStatus: "licensed",
    checklistPhotoRef: "/assets/red_qr_transparent_bg.png",
    size: "lg",
    showCaption: true,
  });
  const resolved = resolveDocketPhotoSlot({
    photoRef: "/assets/red_qr_transparent_bg.png",
    licenseStatus: "licensed",
    checklistPhotoRef: "/assets/red_qr_transparent_bg.png",
  });
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WS-DOCKET · photos Phase 2</title>
    <meta name="robots" content="noindex" />
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/css/docket.css" />
  </head>
  <body class="page">
    <div class="page">
      <header class="top">
        <a class="top-brand" href="/">humanity.llc</a>
        <span class="form-hint">WS-DOCKET · photos Phase 2</span>
      </header>
      <main class="screen">
        <h1>Licensed likeness plumbing</h1>
        <p class="form-hint">
          Fail open to monogram. Caption: <em>${escapeHtml(DOCKET_PHOTO_CAPTION)}</em>.
          Starter-four stay <code>not_licensed</code> until a real license pack.
        </p>
        <h2 class="group-label">Steps</h2>
        <ol class="list list-compact">
${steps}
        </ol>
        <h2 class="group-label">Monogram (default)</h2>
        <div class="docket-plate-row">${mono}</div>
        <h2 class="group-label">Licensed slot demo (asset placeholder — not a person)</h2>
        <div class="docket-plate-row">${licensedDemo}</div>
        <p class="form-hint">resolve mode: <code>${escapeHtml(resolved.mode)}</code></p>
        <h2 class="group-label">Surfaces</h2>
        <ul class="list list-compact">
          <li><a href="${escapeHtml(origin)}/docket/netanyahu/steward/#photos">Steward #photos</a></li>
          <li><a href="${escapeHtml(origin)}/docket/">Roster</a></li>
          <li><a href="${escapeHtml(origin)}/data/docket-photo-license-checklist.json">Checklist JSON</a></li>
        </ul>
        <p class="form-hint">
          Engineering: <code>npm run ws-docket:photo-preflight -- --strict</code>
        </p>
      </main>
    </div>
  </body>
</html>
`;
}

/**
 * @param {string} html
 */
export function validateWsDocketPhotoKitHtml(html) {
  if (!html.includes("photos Phase 2")) throw new Error("photo kit missing title");
  if (!html.includes(DOCKET_PHOTO_CAPTION)) {
    throw new Error("photo kit must include caption");
  }
  if (!html.includes("not_licensed")) {
    throw new Error("photo kit must stress not_licensed default");
  }
  return true;
}
