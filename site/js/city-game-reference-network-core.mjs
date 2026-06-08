/**
 * Reference network teaching copy — LO-4 / seven-surface Cedar Rapids package.
 * @see docs/LIVE_OBJECT_ARCHITECTURE.md · WS-CR reference network comprehension
 */
import { resolveComprehensionProbeNodes } from "./city-game-player-guide-core.mjs";
import { seasonBoardPath } from "./city-game-season-path-shared.mjs";

/** Minimum un coached strangers for LO-4 integrated comprehension (human gate). */
export const LO4_COMPREHENSION_MIN_STRANGERS = 3;

export const DEFAULT_NETWORK_CHARTER = {
  eyebrow: "Public network",
  title: "Wake the city",
  definition:
    "A public network is a shared board of real places whose current truth is signed and readable by anyone.",
  operator_line:
    "Operated by humanity.llc (reference operator) for Cedar Rapids Season 1.",
  board_intro:
    "Shared signed truth for everyone on this board — not personal progress or GPS tracking.",
  signers: [
    {
      stream: "Game",
      who: "Season operator",
      may_sign: "Bulletins, unlock progress, faction relay holds",
    },
    {
      stream: "Care",
      who: "Place stewards",
      may_sign: "Maintenance pause, safety notices",
    },
    {
      stream: "Place",
      who: "Venue stewards",
      may_sign: "Hours, door status, guestbook lines",
    },
    {
      stream: "Lifecycle",
      who: "Season operator",
      may_sign: "Season window, dormancy, archive sleep",
    },
  ],
  what_stays: [
    "Game overlays sleep (factions, unlocks, finale contests).",
    "Place canon stays (landmark names, guestbook lines, care history).",
    "Stickers keep resolving — scans still show signed state under published rules.",
  ],
};

export const LO4_SCORECARD_ROWS = [
  {
    id: "RN-1",
    prompt:
      'Can define "public network" in one sentence (shared board + signed truth, not a private feed)?',
  },
  {
    id: "RN-2",
    prompt: "Can name who operates the network and who may sign updates?",
  },
  {
    id: "RN-3",
    prompt: "Can explain what stays when the season window closes?",
  },
  {
    id: "RN-4",
    prompt:
      "After game node scan: truth read in under 30s — shared world, not personal rank?",
  },
  {
    id: "RN-5",
    prompt:
      "After status plate scan: scan shows place status, not who owns the door?",
  },
];

/**
 * @param {string} value
 */
export function escapeReferenceNetworkHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {Record<string, unknown>} season
 */
export function resolveNetworkCharter(season) {
  const raw =
    season.network_charter && typeof season.network_charter === "object"
      ? /** @type {Record<string, unknown>} */ (season.network_charter)
      : {};
  const city = String(season.city ?? "this city").trim() || "this city";
  const signersRaw = Array.isArray(raw.signers) ? raw.signers : DEFAULT_NETWORK_CHARTER.signers;
  const whatStaysRaw = Array.isArray(raw.what_stays)
    ? raw.what_stays
    : DEFAULT_NETWORK_CHARTER.what_stays;

  return {
    eyebrow:
      (typeof raw.eyebrow === "string" && raw.eyebrow.trim()) ||
      `${DEFAULT_NETWORK_CHARTER.eyebrow} · ${city.split(",")[0]?.trim() || city}`,
    title:
      (typeof raw.title === "string" && raw.title.trim()) ||
      String(season.title ?? DEFAULT_NETWORK_CHARTER.title).replace(/\s*·\s*Signal War.*/i, ""),
    definition:
      (typeof raw.definition === "string" && raw.definition.trim()) ||
      DEFAULT_NETWORK_CHARTER.definition,
    operator_line:
      (typeof raw.operator_line === "string" && raw.operator_line.trim()) ||
      DEFAULT_NETWORK_CHARTER.operator_line,
    board_intro:
      (typeof raw.board_intro === "string" && raw.board_intro.trim()) ||
      DEFAULT_NETWORK_CHARTER.board_intro,
    signers: signersRaw
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const r = /** @type {Record<string, unknown>} */ (row);
        const stream = String(r.stream ?? "").trim();
        const who = String(r.who ?? "").trim();
        const may_sign = String(r.may_sign ?? "").trim();
        if (!stream || !who || !may_sign) return null;
        return { stream, who, may_sign };
      })
      .filter(Boolean),
    what_stays: whatStaysRaw.map((line) => String(line ?? "").trim()).filter(Boolean),
    status_plate_scan_url:
      typeof raw.status_plate_scan_url === "string" ? raw.status_plate_scan_url.trim() : "",
    game_node_scan_url:
      typeof raw.game_node_scan_url === "string" ? raw.game_node_scan_url.trim() : "",
  };
}

/**
 * @param {Record<string, unknown>} season
 */
export function resolveReferenceSpineRows(season) {
  const lessons =
    season.network_charter &&
    typeof season.network_charter === "object" &&
    season.network_charter.spine_lessons &&
    typeof season.network_charter.spine_lessons === "object"
      ? /** @type {Record<string, string>} */ (season.network_charter.spine_lessons)
      : {};
  const blurbs =
    season.comprehension_kit &&
    typeof season.comprehension_kit === "object" &&
    season.comprehension_kit.blurbs &&
    typeof season.comprehension_kit.blurbs === "object"
      ? /** @type {Record<string, string>} */ (season.comprehension_kit.blurbs)
      : {};
  const labelById = new Map(
    (Array.isArray(season.nodes) ? season.nodes : []).map((row) => [
      String(row.node_id ?? ""),
      String(row.label ?? row.node_id ?? ""),
    ])
  );

  return resolveComprehensionProbeNodes(season).map((probe) => {
    const lesson =
      lessons[probe.node_id]?.trim() ||
      blurbs[probe.node_id]?.replace(/^GT-\d+\s*[—–-]\s*/i, "").trim() ||
      probe.blurb?.replace(/^GT-\d+\s*[—–-]\s*/i, "").trim() ||
      "";
    return {
      node_id: probe.node_id,
      label: probe.label ?? labelById.get(probe.node_id) ?? probe.node_id,
      lesson,
    };
  });
}

/**
 * @param {Record<string, unknown>} season
 */
export function buildNetworkCharterSectionHtml(season) {
  const charter = resolveNetworkCharter(season);
  const rulesPath = String(season.rules_path ?? "/play/cedar-rapids/").trim();
  const boardPath = seasonBoardPath(rulesPath) ?? `${rulesPath.replace(/\/?$/, "/")}map/`;
  const signerRows = charter.signers
    .map(
      (row) =>
        `<tr><th scope="row">${escapeReferenceNetworkHtml(row.stream)}</th><td>${escapeReferenceNetworkHtml(row.who)}</td><td>${escapeReferenceNetworkHtml(row.may_sign)}</td></tr>`
    )
    .join("");
  const whatStaysItems = charter.what_stays
    .map((line) => `<li>${escapeReferenceNetworkHtml(line)}</li>`)
    .join("");

  return `<section class="idea-section city-game-network-charter" aria-labelledby="city-game-network-charter-title">
  <h2 class="group-label" id="city-game-network-charter-title">Network charter</h2>
  <p class="group-intro short city-game-network-operator">${escapeReferenceNetworkHtml(charter.operator_line)} · <a href="/data-policy.html">Data policy</a></p>
  <h3 class="city-game-network-subhead">Who may sign what</h3>
  <table class="city-game-signer-table">
    <thead><tr><th scope="col">Stream</th><th scope="col">Who</th><th scope="col">May sign</th></tr></thead>
    <tbody>${signerRows}</tbody>
  </table>
  <h3 class="city-game-network-subhead">What stays after the season</h3>
  <ul class="list list-compact city-game-what-stays">${whatStaysItems}</ul>
  <p class="idea-footnote"><a href="${escapeReferenceNetworkHtml(boardPath)}">Open public state board</a> · <a href="/play/cedar-rapids/debrief/">Season debrief</a> after close</p>
</section>`;
}

/**
 * @param {Record<string, unknown>} season
 */
export function buildMapReferenceSpineHtml(season) {
  if (!isReferenceNetworkTeachingEnabled(season)) return "";
  const rows = resolveReferenceSpineRows(season);
  if (!rows.length) return "";

  const items = rows
    .map((row) => {
      return `<li class="city-game-map-spine-row" data-node-id="${escapeReferenceNetworkHtml(row.node_id)}">
  <span class="city-game-map-spine-label">${escapeReferenceNetworkHtml(row.label)}</span>
  <span class="city-game-map-spine-lesson">${escapeReferenceNetworkHtml(row.lesson)}</span>
  <span class="city-game-map-spine-scan" data-spine-scan-for="${escapeReferenceNetworkHtml(row.node_id)}">Scan for live state</span>
</li>`;
    })
    .join("");

  return `<section class="city-game-map-spine" id="city-game-map-spine" aria-labelledby="city-game-map-spine-title">
  <h2 class="group-label" id="city-game-map-spine-title">How this network works</h2>
  <p class="group-intro short">${escapeReferenceNetworkHtml(resolveNetworkCharter(season).board_intro)}</p>
  <ul class="city-game-map-spine-list">${items}</ul>
</section>`;
}

/**
 * @param {Record<string, unknown>} season
 */
export function isReferenceNetworkTeachingEnabled(season) {
  return Boolean(
    (season.network_charter && typeof season.network_charter === "object") ||
      (season.comprehension_kit && typeof season.comprehension_kit === "object")
  );
}

/**
 * @param {Record<string, unknown>} season
 * @param {{ rulesUrl?: string; boardUrl?: string; statusPlateUrl?: string; gameNodeUrl?: string; production?: boolean }} [opts]
 */
export function buildReferenceNetworkTeachingKitHtml(season, opts = {}) {
  const charter = resolveNetworkCharter(season);
  const city = String(season.city ?? "Cedar Rapids").trim();
  const production = opts.production === true;
  const rulesUrl =
    opts.rulesUrl?.trim() ||
    `https://humanity.llc${String(season.rules_path ?? "/play/cedar-rapids/").trim()}`;
  const boardUrl =
    opts.boardUrl?.trim() || `${rulesUrl.replace(/\/?$/, "/")}map/`;
  const statusPlateUrl =
    opts.statusPlateUrl?.trim() ||
    charter.status_plate_scan_url ||
    "https://humanity.llc/c/r4YyNEWJvVwWNMETzXfGjFyL?q=qr_8w7zHCPHisXvTnar";
  const gameNodeUrl = opts.gameNodeUrl?.trim() || charter.game_node_scan_url || "[node_04 scan URL]";
  const scorecard = LO4_SCORECARD_ROWS.map(
    (row) => `<li><strong>${escapeReferenceNetworkHtml(row.id)}:</strong> ${escapeReferenceNetworkHtml(row.prompt)}</li>`
  ).join("\n      ");
  const spine = resolveReferenceSpineRows(season)
    .map(
      (row) =>
        `<li><strong>${escapeReferenceNetworkHtml(row.label)}</strong> (${escapeReferenceNetworkHtml(row.node_id)}) — ${escapeReferenceNetworkHtml(row.lesson)}</li>`
    )
    .join("\n      ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="robots" content="noindex,nofollow" />
  <title>LO-4 reference network · ${escapeReferenceNetworkHtml(city)}</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 0; padding: 16px; max-width: 42rem; line-height: 1.45; }
    h1 { font-size: 1.2rem; margin: 0 0 8px; }
    h2 { font-size: 1rem; margin: 24px 0 10px; }
    .lead { margin: 0 0 16px; color: #666; font-size: 0.95rem; }
    .scorecard { margin: 0 0 20px; padding: 12px; border-radius: 10px; background: rgba(60,60,67,.08); font-size: 0.85rem; }
    .scorecard ol, .scorecard ul { margin: 8px 0 0; padding-left: 1.2rem; }
    .cta { display: block; padding: 14px 16px; border-radius: 12px; margin: 0 0 10px; background: #db1b43; color: #fff; text-decoration: none; font-weight: 600; text-align: center; }
    .cta-secondary { background: rgba(60,60,67,.12); color: inherit; font-weight: 500; }
    .surfaces { font-size: 0.85rem; }
    .surfaces li { margin: 4px 0; }
    .human-gate { margin-top: 28px; padding-top: 16px; border-top: 1px solid rgba(60,60,67,.15); font-size: 0.85rem; }
    .human-gate ul { margin: 8px 0 0; padding-left: 1.2rem; }
  </style>
</head>
<body>
  <h1>LO-4 · Reference network comprehension</h1>
  <p class="lead">Integrated stranger walk — <strong>${LO4_COMPREHENSION_MIN_STRANGERS}+ un coached strangers</strong>. Same resolver primitive: game node + status plate. C2 engineering: seven teaching surfaces on rules + board + portal.</p>
  <p class="lead"><strong>Path:</strong> About this network → board spine → game scan → status plate scan.</p>

  <h2>Seven surfaces (engineering shipped)</h2>
  <ol class="surfaces">
    <li>Rules charter + operator (${escapeReferenceNetworkHtml(rulesUrl)})</li>
    <li>Signer table (who may sign)</li>
    <li>What stays (archive/canon while live)</li>
    <li>Prove / not prove + collapsed game mechanics</li>
    <li>Board intro + reference spine (${escapeReferenceNetworkHtml(boardUrl)})</li>
    <li>After-season debrief teaser on board</li>
    <li>Portal “About this network” nudge</li>
  </ol>

  <div class="scorecard">
    <strong>LO-4 scorecard (each stranger)</strong>
    <ul>
      ${scorecard}
    </ul>
  </div>

  <h2>Send strangers (copy-paste)</h2>
  <p class="lead">1) Read <a href="${escapeReferenceNetworkHtml(rulesUrl)}">${escapeReferenceNetworkHtml(rulesUrl)}</a> (charter + what stays).<br />
  2) Open board <a href="${escapeReferenceNetworkHtml(boardUrl)}">${escapeReferenceNetworkHtml(boardUrl)}</a> (reference spine).<br />
  3) Scan game node: <a href="${escapeReferenceNetworkHtml(gameNodeUrl)}">${escapeReferenceNetworkHtml(gameNodeUrl)}</a><br />
  4) Scan status plate: <a href="${escapeReferenceNetworkHtml(statusPlateUrl)}">${escapeReferenceNetworkHtml(statusPlateUrl)}</a></p>

  <h2>Reference spine probes</h2>
  <ul>${spine}</ul>

  <a class="cta" href="${escapeReferenceNetworkHtml(rulesUrl)}">1 · About this network</a>
  <a class="cta cta-secondary" href="${escapeReferenceNetworkHtml(boardUrl)}">2 · Public state board</a>
  <a class="cta cta-secondary" href="${escapeReferenceNetworkHtml(gameNodeUrl)}">3 · Game node scan</a>
  <a class="cta cta-secondary" href="${escapeReferenceNetworkHtml(statusPlateUrl)}">4 · Status plate scan</a>

  <footer class="human-gate">
    <h2>Human gate (LO-4 / C2)</h2>
    <p class="lead">Sign after <strong>${LO4_COMPREHENSION_MIN_STRANGERS}+ un coached strangers</strong> pass RN-1–RN-5 on the rules-first path above (About → board spine → game scan → status plate).</p>
    <ul>
      <li>☐ Each stranger reads rules page first — no coaching</li>
      <li>☐ RN-1–RN-5 pass per stranger (scorecard above)</li>
      <li>☐ Game node + status plate scans — same resolver primitive, &lt;30s trust read</li>
    </ul>
    <p class="lead"><strong>Sign-off:</strong> WS-CR operator records C2 / LO-4 in launch checklist when complete.</p>
  </footer>
</body>
</html>`;
}

/**
 * @param {Record<string, unknown>} season
 */
export function validateReferenceNetworkTeaching(season) {
  const issues = [];
  const charter = resolveNetworkCharter(season);
  if (!charter.definition) issues.push("network_charter.definition missing");
  if (!charter.signers.length) issues.push("network_charter.signers empty");
  if (!charter.what_stays.length) issues.push("network_charter.what_stays empty");
  if (!resolveReferenceSpineRows(season).length) {
    issues.push("comprehension_kit.probe_nodes missing for reference spine");
  }
  return { ok: issues.length === 0, issues };
}
