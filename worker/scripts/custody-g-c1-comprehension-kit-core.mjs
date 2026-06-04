/**
 * WS-CUSTODY G-C1 comprehension kit — device_unlock create + unlock + scan.
 * @see docs/CUSTODY_DEVICE_UNLOCK_COMPREHENSION_QA.md
 */

export const CUSTODY_G1_QA_REL = "docs/CUSTODY_DEVICE_UNLOCK_COMPREHENSION_QA.md";
export const LOCAL_DEV_G1_COMPREHENSION_REL = "site/dev/custody-g-c1-comprehension.html";

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
 *   createUrl: string;
 *   origin: string;
 *   production?: boolean;
 * }} opts
 */
export function buildCustodyG1KitHtml(opts) {
  const createUrl = opts.createUrl.trim();
  const origin = opts.origin.replace(/\/$/, "");
  const mode = opts.production ? "production" : "local";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Custody G-C1 · device_unlock comprehension · ${escapeHtml(mode)}</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 0; padding: 16px; max-width: 44rem; line-height: 1.45; }
    h1 { font-size: 1.2rem; margin: 0 0 8px; }
    h2 { font-size: 1rem; margin: 24px 0 10px; }
    .lead { margin: 0 0 16px; color: #666; font-size: 0.95rem; }
    .cta {
      display: block; padding: 14px 16px; border-radius: 12px; margin: 0 0 12px;
      background: #db1b43; color: #fff; text-decoration: none; font-weight: 600; text-align: center;
    }
    .scorecard, .funnel, .message {
      margin: 0 0 20px; padding: 12px; border-radius: 10px;
      background: rgba(60,60,67,.08); font-size: 0.85rem;
    }
    .message { white-space: pre-wrap; border: 1px solid rgba(60,60,67,.15); background: transparent; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th, td { border: 1px solid rgba(60,60,67,.2); padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: rgba(60,60,67,.06); }
    ol { margin: 8px 0 0; padding-left: 1.2rem; }
    code { font-size: 0.85em; }
  </style>
</head>
<body>
  <h1>device_unlock comprehension (G-C1)</h1>
  <p class="lead">WS-CUSTODY <strong>G-C1</strong> — ≥5 nontechnical testers. Canonical QA: <code>CUSTODY_DEVICE_UNLOCK_COMPREHENSION_QA.md</code>.</p>

  <a class="cta" href="${escapeHtml(createUrl)}">Start — Create with This device</a>
  <p class="lead">Origin: ${escapeHtml(origin)} · Choose <strong>This device</strong> at create (when offered). Complete setup through Protect.</p>

  <div class="message">Quick test (~15 min) on your phone:
1. Create — select This device when offered; save recovery when asked
2. Setup — use Scan with this app on Test your QR
3. Open your scan URL in this browser; tap Unlock to manage; cancel Face ID once
4. Answer:
   - If you lost this phone, how get control back?
   - Did canceling Face ID delete your object?
   - What does scanning prove about who holds the phone?
   - What does Unlock to manage mean?</div>

  <h2>Funnel log (per tester)</h2>
  <div class="funnel">
    <table>
      <thead>
        <tr><th>Step</th><th>Event</th><th>Drop?</th><th>Notes</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>Create — This device + recovery</td><td></td><td></td></tr>
        <tr><td>2</td><td>Save / auto-save wallet</td><td></td><td></td></tr>
        <tr><td>3</td><td>Test scan — in-app primary</td><td></td><td></td></tr>
        <tr><td>4</td><td>Protect — recovery saved</td><td></td><td></td></tr>
        <tr><td>5</td><td>Scan URL — Unlock to manage</td><td></td><td></td></tr>
        <tr><td>6</td><td>Cancel Face ID — read cancel copy</td><td></td><td></td></tr>
        <tr><td>7</td><td>Unlock succeeds — control in tab</td><td></td><td></td></tr>
      </tbody>
    </table>
  </div>

  <h2>Scorecard (per tester)</h2>
  <div class="scorecard">
    <ol>
      <li><strong>G1-A</strong> — Names recovery code or backup (not Apple/support alone)</li>
      <li><strong>G1-B</strong> — Face ID / iCloud ≠ replacement for recovery save</li>
      <li><strong>G1-C</strong> — Canceling Face ID did not delete the object</li>
      <li><strong>G1-D</strong> — Unlock to manage = this phone, not operator restore</li>
      <li><strong>G1-E</strong> — Scan shows status, not automatic phone ownership</li>
      <li><strong>G1-F</strong> — In-app scan or explains Camera-alone risk</li>
    </ol>
    <p><strong>Pass bar:</strong> G1-A + G1-C + G1-D required; ≤1 miss on G1-B/G1-E/G1-F. Need ≥5/5 testers.</p>
  </div>

  <h2>Regression (engineering)</h2>
  <p class="lead"><code>npm run custody:c1-preflight</code><br />
  <code>npm run worker:test:custody</code><br />
  <code>npm run e2e:custody-device-unlock</code></p>
</body>
</html>`;
}

/**
 * @param {{ production?: boolean; host?: string }} [opts]
 */
export function resolveCustodyG1KitUrls(opts = {}) {
  const production = opts.production === true;
  if (production) {
    const origin = "https://humanity.llc";
    return {
      origin,
      createUrl: `${origin}/create/`,
      kitPageUrl: `${origin}/dev/custody-g-c1-comprehension.html`,
    };
  }
  const host = opts.host?.trim() || "127.0.0.1:8788";
  const origin = host.startsWith("http")
    ? host.replace(/\/$/, "")
    : `http://${host.replace(/\/$/, "")}`;
  return {
    origin,
    createUrl: `${origin}/create/`,
    kitPageUrl: `${origin}/dev/custody-g-c1-comprehension.html`,
  };
}
