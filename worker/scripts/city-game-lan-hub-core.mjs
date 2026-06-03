/**
 * Phone-friendly LAN scan hub — pure helpers (Vitest-importable).
 */

/**
 * @param {import("node:os").NetworkInterfaceInfo[][] | Record<string, import("node:os").NetworkInterfaceInfo[] | undefined>} nets
 */
export function detectLanHostFromInterfaces(nets) {
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

/**
 * @param {string | null | undefined} host
 */
export function normalizeLanHost(host) {
  const trimmed = host?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^\[/, "").replace(/\]$/, "");
}

/**
 * @param {string} url
 * @param {string} lanHost
 */
export function rewriteScanUrlForLan(url, lanHost) {
  if (!url || !lanHost) return url;
  const host = normalizeLanHost(lanHost);
  if (!host) return url;
  return url
    .replace(/^http:\/\/127\.0\.0\.1:8787/i, `http://${host}:8787`)
    .replace(/^http:\/\/localhost:8787/i, `http://${host}:8787`);
}

/**
 * @param {string} profileId
 * @param {string} qrId
 * @param {string} lanHost
 */
export function buildLanScanUrl(profileId, qrId, lanHost) {
  const host = normalizeLanHost(lanHost);
  if (!host || !profileId || !qrId) return null;
  return `http://${host}:8787/c/${encodeURIComponent(profileId)}?q=${encodeURIComponent(qrId)}`;
}

/**
 * @param {{
 *   lanHost: string;
 *   profileId: string;
 *   nodes: Array<{ node_id: string; public_label?: string; qr_id?: string; local_scan_url?: string; scan_url?: string }>;
 *   siteCodes?: Record<string, { code?: string }>;
 *   sections?: Array<{ id: string; title: string; blurb?: string; nodeIds: string[] }>;
 * }} opts
 */
export function buildLanHubHtml(opts) {
  const host = normalizeLanHost(opts.lanHost);
  if (!host) throw new Error("lanHost required");

  const nodeById = new Map(
    (opts.nodes ?? [])
      .filter((node) => node.node_id && node.qr_id)
      .map((node) => [node.node_id, node])
  );

  function scanHref(nodeId) {
    const node = nodeById.get(nodeId);
    if (!node) return null;
    const fromSeed =
      rewriteScanUrlForLan(node.local_scan_url ?? "", host) ||
      rewriteScanUrlForLan(node.scan_url ?? "", host);
    return fromSeed || buildLanScanUrl(opts.profileId, node.qr_id, host);
  }

  function siteCode(nodeId) {
    return opts.siteCodes?.[nodeId]?.code?.trim().toUpperCase() ?? null;
  }

  function renderLink(nodeId, extra = "") {
    const node = nodeById.get(nodeId);
    const href = scanHref(nodeId);
    if (!node || !href) {
      return `<li class="missing"><span>${escapeHtml(nodeId)}</span> — not in seed file</li>`;
    }
    const code = siteCode(nodeId);
    const codeLine = code
      ? `<span class="code">Site code: <strong>${escapeHtml(code)}</strong></span>`
      : "";
    return `<li>
  <a class="scan-link" href="${escapeHtml(href)}">
    <span class="node-id">${escapeHtml(nodeId)}</span>
    <span class="label">${escapeHtml(node.public_label ?? nodeId)}</span>
  </a>
  ${codeLine}
  ${extra ? `<p class="hint">${escapeHtml(extra)}</p>` : ""}
</li>`;
  }

  const defaultSections = [
    {
      id: "quorum",
      title: "Quorum → cabinet",
      blurb: "Phone A + B: contribute at River Lantern. Then open cabinet.",
      nodeIds: ["node_04", "node_07"],
    },
    {
      id: "witness",
      title: "Witness sunset pass",
      blurb: "One claim per device per UTC day. Use two phones to test the pool.",
      nodeIds: ["node_10"],
    },
    {
      id: "spine",
      title: "Fragment → finale",
      blurb: "Enter each site code in order, then spot-check the finale.",
      nodeIds: ["node_09", "node_11", "node_01", "node_13"],
    },
  ];

  const sections = opts.sections ?? defaultSections;
  const sectionHtml = sections
    .map(
      (section) => `<section class="block">
  <h2>${escapeHtml(section.title)}</h2>
  ${section.blurb ? `<p class="blurb">${escapeHtml(section.blurb)}</p>` : ""}
  <ul class="links">${section.nodeIds.map((id) => renderLink(id)).join("\n")}</ul>
</section>`
    )
    .join("\n");

  const allNodeIds = [...nodeById.keys()].sort();
  const allHtml = `<section class="block block--all">
  <h2>All ${allNodeIds.length} nodes</h2>
  <ul class="links links--compact">${allNodeIds.map((id) => renderLink(id)).join("\n")}</ul>
</section>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Cedar Rapids · local scan hub</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 0; padding: 16px; max-width: 42rem; line-height: 1.4; }
    h1 { font-size: 1.25rem; margin: 0 0 8px; }
    .lead { margin: 0 0 16px; color: #666; font-size: 0.95rem; }
    .setup { margin: 0 0 20px; padding: 12px; border-radius: 10px; background: rgba(60,60,67,.08); font-size: 0.85rem; }
    .setup code { font-size: 0.8rem; word-break: break-all; }
    h2 { font-size: 1rem; margin: 0 0 8px; }
    .blurb { margin: 0 0 10px; font-size: 0.9rem; color: #666; }
    .block { margin-bottom: 24px; }
    .links { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
    .scan-link {
      display: block; padding: 14px 16px; border-radius: 12px;
      background: #db1b43; color: #fff; text-decoration: none;
      box-shadow: 0 1px 3px rgba(0,0,0,.12);
    }
    .node-id { display: block; font-size: 0.75rem; opacity: 0.85; font-weight: 600; letter-spacing: 0.04em; }
    .label { display: block; font-size: 1rem; font-weight: 600; margin-top: 2px; }
    .code { display: block; margin-top: 6px; font-size: 0.85rem; color: #333; }
    html[data-theme="dark"] .code { color: #ddd; }
    .hint { margin: 4px 0 0; font-size: 0.8rem; color: #666; }
    .missing { padding: 10px; border-radius: 8px; background: rgba(255,59,48,.1); }
    .links--compact .scan-link { padding: 10px 12px; }
    .links--compact .label { font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Cedar Rapids · local scan hub</h1>
  <p class="lead">Tap a scan — no copy/paste. Resolver <strong>${escapeHtml(host)}:8787</strong> · Pages <strong>${escapeHtml(host)}:8788</strong></p>
  <div class="setup">
    Dev stack: <code>npm run city-game:dev</code> (patches <code>worker/.dev.vars</code>, starts worker + pages, opens this hub).
  </div>
  ${sectionHtml}
  ${allHtml}
</body>
</html>`;
}

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Patch or append SCAN_* lines in worker/.dev.vars text.
 * @param {string} text
 * @param {string} lanHost
 */
export function patchDevVarsScanOrigins(text, lanHost) {
  const host = normalizeLanHost(lanHost);
  if (!host) return text;
  const resolver = `SCAN_RESOLVER_ORIGIN=http://${host}:8787`;
  const pages = `SCAN_PAGES_JS_ORIGIN=http://${host}:8788`;
  let out = text ?? "";
  if (/^\s*SCAN_RESOLVER_ORIGIN=/m.test(out)) {
    out = out.replace(/^\s*SCAN_RESOLVER_ORIGIN=.*$/m, resolver);
  } else {
    out = out.trimEnd() + (out.endsWith("\n") || out.length === 0 ? "" : "\n") + resolver + "\n";
  }
  if (/^\s*SCAN_PAGES_JS_ORIGIN=/m.test(out)) {
    out = out.replace(/^\s*SCAN_PAGES_JS_ORIGIN=.*$/m, pages);
  } else {
    out = out.trimEnd() + (out.endsWith("\n") ? "" : "\n") + pages + "\n";
  }
  return out;
}
