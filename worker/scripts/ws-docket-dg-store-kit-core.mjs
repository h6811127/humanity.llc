/**
 * WS-DOCKET-DG-store-v0 field kit builder.
 */
import {
  DOCKET_DG_STORE_KIT_REL,
  DOCKET_EDIT_PROPOSAL_STORE_KIND,
  docketDgStoreV0Steps,
  docketEditProposalsStorePath,
} from "../../site/js/docket-edit-proposal-store-core.mjs";

export { DOCKET_DG_STORE_KIT_REL };

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
export function buildWsDocketDgStoreKitHtml(opts = {}) {
  const origin = (opts.origin ?? "http://127.0.0.1:8788").replace(/\/$/, "");
  const api = origin.includes(":8788")
    ? origin.replace(":8788", ":8787")
    : "https://humanity.llc";
  const path = docketEditProposalsStorePath("altman");
  const steps = docketDgStoreV0Steps()
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WS-DOCKET · DG-store-v0</title>
    <meta name="robots" content="noindex" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body class="page">
    <div class="page">
      <header class="top">
        <a class="top-brand" href="/">humanity.llc</a>
        <span class="form-hint">WS-DOCKET · Worker store for signed proposals</span>
      </header>
      <main class="screen">
        <h1>Worker store (DG-store-v0)</h1>
        <p class="form-hint">
          Persist DG-v1 signed dual-gate proposals in D1. Never auto-writes published
          case JSON (<code>writes_published_json: false</code>). Kind:
          <code>${escapeHtml(DOCKET_EDIT_PROPOSAL_STORE_KIND)}</code>
        </p>
        <h2 class="group-label">Steps</h2>
        <ol class="list list-compact">
${steps}
        </ol>
        <h2 class="group-label">API</h2>
        <ul class="list list-compact">
          <li>GET/PUT <code>${escapeHtml(api)}${escapeHtml(path)}</code></li>
        </ul>
        <h2 class="group-label">Surfaces</h2>
        <ul class="list list-compact">
          <li><a href="${escapeHtml(origin)}/docket/altman/steward/#dual-gate-edits">Steward #dual-gate-edits</a></li>
          <li><a href="${escapeHtml(origin)}/docket/altman/steward/#merge-pack">Steward #merge-pack</a></li>
        </ul>
        <p class="form-hint">
          Engineering: <code>npm run ws-docket:dg-store-preflight -- --strict</code>
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
export function validateWsDocketDgStoreKitHtml(html) {
  if (!html.includes("DG-store-v0")) throw new Error("store kit missing title");
  if (!html.includes("writes_published_json")) {
    throw new Error("store kit must stress no published rewrite");
  }
  if (!html.includes("edit-proposals")) {
    throw new Error("store kit must mention edit-proposals route");
  }
  return true;
}
