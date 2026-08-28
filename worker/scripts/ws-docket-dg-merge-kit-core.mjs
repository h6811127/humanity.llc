/**
 * WS-DOCKET-DG-merge-v0 field kit.
 */
import {
  DOCKET_MERGE_KIT_REL,
  buildDocketMergePack,
  docketMergeV0Steps,
  validateDocketMergePack,
} from "../../site/js/docket-edit-proposal-merge-core.mjs";

export { DOCKET_MERGE_KIT_REL };

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
export function buildWsDocketDgMergeKitHtml(opts = {}) {
  const origin = (opts.origin ?? "http://127.0.0.1:8788").replace(/\/$/, "");
  const steps = docketMergeV0Steps()
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("\n");
  const sampleCase = {
    id: "altman",
    status: "open",
    note: "Published note",
    action: { label: "Open case" },
    counts: [{ id: "c1", title: "Count", body: "Before body" }],
  };
  const sampleProposal = {
    id: "prop_demo",
    field_path: "counts[0].body",
    summary: "Clarify wording",
    before: "Before body",
    after: "After body (human-reviewed)",
    status: "applied",
    approvals: ["hc-founders", "hc-reviewer"],
    signatures: [],
  };
  const pack = buildDocketMergePack({
    caseId: "altman",
    fullCase: sampleCase,
    proposals: [sampleProposal],
    generatedAt: "2026-07-16T18:00:00.000Z",
  });
  validateDocketMergePack(pack);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WS-DOCKET · DG-merge-v0</title>
    <meta name="robots" content="noindex" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body class="page">
    <div class="page">
      <header class="top">
        <a class="top-brand" href="/">humanity.llc</a>
        <span class="form-hint">WS-DOCKET · human-gated merge pack</span>
      </header>
      <main class="screen">
        <h1>Human-gated merge pack (DG-merge-v0)</h1>
        <p class="form-hint">
          Export a PR-ready preview after DG-v1 signed apply. Never auto-writes published
          case JSON. Signed proposals may also live in Worker DG-store-v0.
        </p>
        <h2 class="group-label">Steps</h2>
        <ol class="list list-compact">
${steps}
        </ol>
        <h2 class="group-label">Sample pack preview</h2>
        <pre class="form-hint" style="white-space:pre-wrap;font-size:13px">${escapeHtml(
          JSON.stringify(
            {
              kind: pack.kind,
              case_id: pack.case_id,
              writes_published_json: pack.writes_published_json,
              previews: pack.previews,
            },
            null,
            2
          )
        )}</pre>
        <h2 class="group-label">Surfaces</h2>
        <ul class="list list-compact">
          <li><a href="${escapeHtml(origin)}/docket/altman/steward/#merge-pack">Steward #merge-pack</a></li>
          <li><a href="${escapeHtml(origin)}/dev/ws-docket-dg-v1-field-walk.html">DG-v1 field walk</a></li>
        </ul>
        <p class="form-hint">
          Engineering: <code>npm run ws-docket:dg-merge-preflight -- --strict</code>
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
export function validateWsDocketDgMergeKitHtml(html) {
  if (!html.includes("DG-merge-v0")) throw new Error("merge kit missing title");
  if (!html.includes("writes_published_json")) {
    throw new Error("merge kit must stress no published rewrite");
  }
  if (!html.includes("Worker store") && !html.includes("DG-store")) {
    throw new Error("merge kit must mention Worker store / DG-store");
  }
  return true;
}
