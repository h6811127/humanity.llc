/**
 * WS-DOCKET-C-v2 field-walk kit HTML + URL helpers.
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § WS-DOCKET-C
 */

import {
  DOCKET_CASEFILE_FIXTURE_OBJECT_ID,
  DOCKET_CASEFILE_FIXTURE_PROFILE_ID,
  DOCKET_CASEFILE_FIXTURE_QR_ID,
  DOCKET_CV2_KIT_REL,
  docketCasefileFixtureLiveObject,
  docketCv2MintSteps,
  docketScanPathFromCardQr,
} from "../../site/js/docket-live-object-bind-core.mjs";

export { DOCKET_CV2_KIT_REL };

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
 * @param {{ production?: boolean; host?: string; apiOrigin?: string }} opts
 */
export function resolveDocketCv2KitUrls(opts = {}) {
  const production = Boolean(opts.production);
  const host = (opts.host ?? "127.0.0.1:8788").replace(/^https?:\/\//, "");
  const pagesOrigin = production ? "https://humanity.llc" : `http://${host}`;
  const apiOrigin = (
    opts.apiOrigin ?? `http://${host.replace(/:\d+$/, "")}:8787`
  ).replace(/\/$/, "");
  const scanPath = docketScanPathFromCardQr(
    DOCKET_CASEFILE_FIXTURE_PROFILE_ID,
    DOCKET_CASEFILE_FIXTURE_QR_ID
  );
  return {
    origin: pagesOrigin,
    apiOrigin,
    kitPageUrl: `${pagesOrigin}/dev/ws-docket-c-v2-field-walk.html`,
    docketUrl: `${pagesOrigin}/docket/`,
    stewardExampleUrl: `${pagesOrigin}/docket/netanyahu/steward/`,
    fixtureScanUrl: `${apiOrigin}${scanPath}`,
    fixtureScanPath: scanPath,
  };
}

/**
 * @param {{
 *   origin: string;
 *   apiOrigin: string;
 *   docketUrl: string;
 *   stewardExampleUrl: string;
 *   fixtureScanUrl: string;
 *   fixtureScanPath: string;
 *   production?: boolean;
 * }} urls
 */
export function buildDocketCv2KitHtml(urls) {
  const live = docketCasefileFixtureLiveObject();
  const steps = docketCv2MintSteps()
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("\n");
  const mode = urls.production ? "production reference" : "local field walk";
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WS-DOCKET-C-v2 · casefile mint plumbing</title>
    <meta name="robots" content="noindex" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body class="page">
    <div class="page">
      <header class="top">
        <a class="top-brand" href="/">humanity.llc</a>
        <span class="form-hint">WS-DOCKET-C-v2 · ${escapeHtml(mode)}</span>
      </header>
      <main class="screen">
        <h1>Casefile mint plumbing</h1>
        <p class="form-hint">
          Reuses child-object create + issue-qr for optional QR upgrade. Starter-four
          cases are <strong>bound</strong> to <code>/docket/{id}/</code> (interim) under the
          nonviolence charter. Upgrade to <code>/c/{profile}?q={qr}</code> when issued.
          Discovery opt-in stays false (C-v3).
        </p>

        <h2 class="group-label">Fixture bind preview</h2>
        <pre class="form-hint" style="white-space:pre-wrap;font-size:13px">${escapeHtml(
          JSON.stringify(live, null, 2)
        )}</pre>
        <p class="form-hint">
          object_id: <code>${escapeHtml(DOCKET_CASEFILE_FIXTURE_OBJECT_ID)}</code><br />
          scan_path: <code>${escapeHtml(urls.fixtureScanPath ?? "")}</code><br />
          Example scan (local Worker): <a href="${escapeHtml(urls.fixtureScanUrl)}">${escapeHtml(
            urls.fixtureScanUrl
          )}</a>
        </p>

        <h2 class="group-label">Mint steps (local)</h2>
        <ol class="list list-compact">
${steps}
        </ol>

        <h2 class="group-label">Surfaces</h2>
        <ul class="list list-compact">
          <li><a href="${escapeHtml(urls.docketUrl)}">/docket/</a> — roster (interim case URL binds)</li>
          <li><a href="${escapeHtml(urls.stewardExampleUrl)}">Steward shell example</a> — <code>#qr-upgrade</code></li>
          <li><a href="/created/">/created/</a> — create + issue QR with owner key</li>
          <li><a href="/docket/goods/qr-field-kit/">QR field kit</a> — print → case → action</li>
        </ul>

        <p class="form-hint">
          Engineering: <code>npm run ws-docket:c-v2-preflight -- --strict</code>
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
export function validateDocketCv2KitHtml(html) {
  if (!html.includes("Casefile mint plumbing")) {
    throw new Error("kit HTML missing title cue");
  }
  if (!html.includes(DOCKET_CASEFILE_FIXTURE_OBJECT_ID)) {
    throw new Error("kit HTML missing fixture object_id");
  }
  if (!html.includes("bound")) {
    throw new Error("kit HTML must describe bound starter cases");
  }
  return true;
}
