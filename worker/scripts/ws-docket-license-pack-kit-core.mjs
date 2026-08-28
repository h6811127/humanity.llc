/**
 * WS-DOCKET license-pack-v0 field kit.
 */
import {
  DOCKET_PHOTO_LICENSE_PACK_KIT_REL,
  docketPhotoLicensePackV0Steps,
} from "../../site/js/docket-photo-license-pack-core.mjs";

export { DOCKET_PHOTO_LICENSE_PACK_KIT_REL };

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
export function buildWsDocketLicensePackKitHtml(opts = {}) {
  const origin = (opts.origin ?? "http://127.0.0.1:8788").replace(/\/$/, "");
  const steps = docketPhotoLicensePackV0Steps()
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WS-DOCKET · License-pack-v0</title>
    <meta name="robots" content="noindex" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body class="page">
    <div class="page">
      <header class="top">
        <a class="top-brand" href="/">humanity.llc</a>
        <span class="form-hint">WS-DOCKET · photo license packs</span>
      </header>
      <main class="screen">
        <h1>Photo license packs (license-pack-v0)</h1>
        <p class="form-hint">
          Formal attribution gate before any face goes live. Starter-four Most Wanted
          stay <code>not_licensed</code>. Rehearsal pack proves the licensed render path
          with non-person artwork.
        </p>
        <h2 class="group-label">Steps</h2>
        <ol class="list list-compact">
${steps}
        </ol>
        <h2 class="group-label">Surfaces</h2>
        <ul class="list list-compact">
          <li><a href="${escapeHtml(origin)}/data/docket-photo-license-packs.json">Packs registry</a></li>
          <li><a href="${escapeHtml(origin)}/assets/docket/license-pack-rehearsal.svg">Rehearsal asset</a></li>
          <li><a href="${escapeHtml(origin)}/docket/altman/steward/#photos">Steward #photos (pack status)</a></li>
          <li><a href="${escapeHtml(origin)}/docket/">Most Wanted (starter-four monograms)</a></li>
        </ul>
        <p class="form-hint">
          Engineering: <code>npm run ws-docket:license-pack-preflight -- --strict</code>
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
export function validateWsDocketLicensePackKitHtml(html) {
  if (!html.includes("License-pack-v0") && !html.includes("license packs")) {
    throw new Error("license pack kit missing title");
  }
  if (!html.includes("Starter-four") && !html.includes("starter-four")) {
    throw new Error("license pack kit must fence starter-four");
  }
  if (!html.includes("rehearsal")) {
    throw new Error("license pack kit must mention rehearsal proof");
  }
  return true;
}
