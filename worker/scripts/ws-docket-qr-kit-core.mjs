/**
 * WS-DOCKET-QR-v0 field kit HTML — interim case URL → child QR preview.
 */
export const DOCKET_QR_KIT_REL = "site/dev/ws-docket-qr-v0-field-walk.html";

/**
 * @param {{ origin?: string }} [opts]
 */
export function buildWsDocketQrKitHtml(opts = {}) {
  const origin = String(opts.origin ?? "http://127.0.0.1:8788").replace(/\/$/, "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WS-DOCKET-QR-v0 · child-object QR upgrade</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.45; }
    code { font-size: 0.9em; }
    .cta { display: inline-block; margin: 0.4rem 0.4rem 0.4rem 0; padding: 0.55rem 0.9rem; background: #111; color: #fff; text-decoration: none; border-radius: 6px; }
    .cta-secondary { background: #444; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.45rem 0.55rem; text-align: left; }
  </style>
</head>
<body>
  <h1>WS-DOCKET · QR upgrade (QR-v0)</h1>
  <p class="lead">
    Preview <code>/c/{profile}?q={qr}</code> on the steward shell. Session-local only —
    published case JSON stays on interim <code>/docket/{id}/</code> until you edit it by hand.
    Discovery stays off (C-v3). Canon: <code>PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md</code>.
  </p>
  <p>Origin: ${origin}</p>

  <h2>Field walk</h2>
  <a class="cta" href="${origin}/docket/netanyahu/steward/#qr-upgrade">1. Open Netanyahu steward · #qr-upgrade</a>
  <ol>
    <li>Confirm published scan path is interim <code>/docket/netanyahu/</code>.</li>
    <li>Under <strong>Preview child-object scan path</strong>, enter a profile id + QR id (from <code>/created/</code> issue-qr, or fixture placeholders).</li>
    <li>Save session preview — JSON shows <code>/c/…?q=…</code> with <code>discovery_opt_in: false</code>.</li>
    <li>Clear session preview — published case JSON still unchanged.</li>
  </ol>
  <a class="cta cta-secondary" href="${origin}/created/">/created/ (issue QR)</a>
  <a class="cta cta-secondary" href="${origin}/docket/goods/qr-field-kit/">QR field kit</a>
  <a class="cta cta-secondary" href="${origin}/dev/ws-docket-c-v2-field-walk.html">C-v2 kit</a>

  <h2>Scorecard</h2>
  <table>
    <thead><tr><th>Check</th><th>Pass?</th></tr></thead>
    <tbody>
      <tr><td>QR-1 — Steward shell shows #qr-upgrade</td><td>☐</td></tr>
      <tr><td>QR-2 — Session preview builds /c/{profile}?q={qr}</td><td>☐</td></tr>
      <tr><td>QR-3 — object_id stays obj_docket_casefile_{id}</td><td>☐</td></tr>
      <tr><td>QR-4 — discovery_opt_in false; published JSON untouched</td><td>☐</td></tr>
    </tbody>
  </table>

  <h2>Engineering</h2>
  <ol>
    <li><code>npm run ws-docket:qr-preflight -- --strict</code></li>
    <li><code>npm run worker:test -- worker/tests/docket-live-object-bind-core.test.ts</code></li>
    <li><code>npm run ws-docket:dg-preflight -- --strict</code> (DG still green)</li>
  </ol>
</body>
</html>`;
}

/**
 * @param {string} html
 */
export function validateWsDocketQrKitHtml(html) {
  for (const token of [
    "WS-DOCKET",
    "QR-v0",
    "qr-upgrade",
    "ws-docket:qr-preflight",
    "QR-1",
    "discovery_opt_in",
  ]) {
    if (!html.includes(token)) {
      throw new Error(`QR kit HTML missing: ${token}`);
    }
  }
}
