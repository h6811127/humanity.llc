/**
 * WS-LIVE LO-1 — printed status plate + lost-item relay field walk kit.
 * @see docs/STATUS_PLATE_PILOT.md · docs/LOST_ITEM_RELAY_PILOT.md
 */

export const LO1_KIT_REL = "site/dev/ws-live-lo1-comprehension.html";

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
 * @param {{
 *   origin: string;
 *   createDeployUrl: string;
 *   createStatusPlateUrl: string;
 *   createLostItemUrl: string;
 *   showcaseStatusPlateUrl?: string;
 *   showcaseLostItemUrl?: string;
 *   production?: boolean;
 * }} opts
 */
export function buildWsLiveLo1KitHtml(opts) {
  const origin = opts.origin.replace(/\/$/, "");
  const mode = opts.production ? "production" : "local";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="robots" content="noindex,nofollow" />
  <title>WS-LIVE LO-1 · printed live objects · ${escapeHtml(mode)}</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 0; padding: 16px; max-width: 44rem; line-height: 1.45; }
    h1 { font-size: 1.2rem; margin: 0 0 8px; }
    h2 { font-size: 1rem; margin: 24px 0 10px; }
    .lead { margin: 0 0 16px; color: #666; font-size: 0.95rem; }
    .cta {
      display: block; padding: 14px 16px; border-radius: 12px; margin: 0 0 10px;
      background: #db1b43; color: #fff; text-decoration: none; font-weight: 600; text-align: center;
    }
    .cta-secondary {
      background: rgba(60,60,67,.12); color: inherit; font-weight: 500;
    }
    .scorecard {
      margin: 0 0 20px; padding: 12px; border-radius: 10px;
      background: rgba(60,60,67,.08); font-size: 0.85rem;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-top: 8px; }
    th, td { border: 1px solid rgba(60,60,67,.2); padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: rgba(60,60,67,.06); }
    ol { margin: 8px 0 0; padding-left: 1.2rem; }
    code { font-size: 0.85em; }
  </style>
</head>
<body>
  <h1>WS-LIVE LO-1 · printed live objects</h1>
  <p class="lead">
    Layer <strong>1 object graph</strong> field sign-off — status plate + lost-item relay on
    <strong>real printed QRs</strong>. Same primitive as city game nodes. Canon:
    <code>STATUS_PLATE_PILOT.md</code> · <code>LOST_ITEM_RELAY_PILOT.md</code>.
  </p>
  <p class="lead">Origin: ${escapeHtml(origin)} · Use a second phone for stranger scans.</p>

  <h2>Path A — deploy wizard (current create)</h2>
  <p class="lead">Account → Endpoint → Scan link in one submit when no saved account exists.</p>
  <a class="cta" href="${escapeHtml(opts.createDeployUrl)}">1. Open deploy wizard</a>
  <ol>
    <li>Create a <strong>status plate</strong> (object name + status line) → save keys → download QR → print</li>
    <li>Second device scan — answer in &lt;30s: open or not? Does scan prove who owns the door?</li>
    <li>Update status line on Live — re-scan without reprinting</li>
    <li>Disable this plate — re-scan shows object unavailable</li>
    <li>On the same account: <strong>Add lost-item relay</strong> on <code>/created/</code> Live (or run deploy wizard again for lost-item fields)</li>
    <li>Repeat scan / update / disable for the relay; use <strong>Copy pilot summary</strong> for founder roll-up</li>
  </ol>

  <h2>Path B — legacy flat (regression only)</h2>
  <p class="lead">Pre-convergence QRs and field-kit regression — plate/relay <strong>is</strong> the account root. Scans and updates still work; not the front-door create path.</p>
  <a class="cta cta-secondary" href="${escapeHtml(opts.createStatusPlateUrl)}">Legacy status plate template</a>
  <a class="cta cta-secondary" href="${escapeHtml(opts.createLostItemUrl)}">Legacy lost-item template</a>

  ${
    opts.showcaseStatusPlateUrl
      ? `<h2>Showcase scans (reference)</h2>
  <a class="cta cta-secondary" href="${escapeHtml(opts.showcaseStatusPlateUrl)}">Showcase status plate scan</a>
  <a class="cta cta-secondary" href="${escapeHtml(opts.showcaseLostItemUrl ?? "#")}">Showcase lost-item scan</a>`
      : ""
  }

  <h2>LO-1 scorecard (check on paper)</h2>
  <div class="scorecard">
    <table>
      <thead><tr><th>Check</th><th>Pass?</th></tr></thead>
      <tbody>
        <tr><td>Stranger completes deploy wizard unassisted (Path A)</td><td>☐</td></tr>
        <tr><td>Returning steward adds endpoint on Live without new account</td><td>☐</td></tr>
        <tr><td>Legacy flat template still scans and updates after create (Path B)</td><td>☐</td></tr>
        <tr><td>Scan answers status / return path in &lt;30s</td><td>☐</td></tr>
        <tr><td>Stranger: scan does <strong>not</strong> prove holder owns object</td><td>☐</td></tr>
        <tr><td>Print + second-device scan + disable without founder</td><td>☐</td></tr>
        <tr><td>Status plate: ≥2 live updates on one plate</td><td>☐</td></tr>
        <tr><td>Lost item: disable after &quot;found&quot; shows unavailable state</td><td>☐</td></tr>
      </tbody>
    </table>
  </div>

  <h2>Five-layer reminder</h2>
  <div class="scorecard">
    <ol>
      <li><strong>L1</strong> — account → endpoint → scan link (this walk)</li>
      <li><strong>L2</strong> — read + request (live proof) + offer (lost-item finder message)</li>
      <li><strong>L3–L4</strong> — streams + time policy on /created/ editors</li>
      <li><strong>L5</strong> — Cedar Rapids game nodes (LO-2) — same resolver</li>
    </ol>
  </div>

  <p class="lead">Engineering gate: <code>npm run ws-live:preflight</code> · Belt: <code>npm run verify:live:fast</code></p>
</body>
</html>`;
}

/**
 * @param {{ production?: boolean; host?: string; apiOrigin?: string }} opts
 */
export function resolveWsLiveLo1KitUrls(opts = {}) {
  const production = Boolean(opts.production);
  const host = (opts.host ?? "127.0.0.1:8788").replace(/^https?:\/\//, "");
  const apiOrigin = (opts.apiOrigin ?? `http://${host.replace(/:\d+$/, "")}:8787`).replace(/\/$/, "");
  const origin = production ? "https://humanity.llc" : `http://${host}`;
  const pagesOrigin = production ? "https://humanity.llc" : `http://${host}`;

  return {
    origin: pagesOrigin,
    apiOrigin,
    createDeployUrl: `${pagesOrigin}/create/?intent=deploy`,
    createStatusPlateUrl: `${pagesOrigin}/create/?template=status_plate`,
    createLostItemUrl: `${pagesOrigin}/create/?template=lost_item_relay`,
    kitPageUrl: `${pagesOrigin}/dev/ws-live-lo1-comprehension.html`,
    showcaseStatusPlateUrl: production ? undefined : `${apiOrigin}/c/showcase_status_plate`,
    showcaseLostItemUrl: production ? undefined : `${apiOrigin}/c/showcase_lost_item`,
  };
}
