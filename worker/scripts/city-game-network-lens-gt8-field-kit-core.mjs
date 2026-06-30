/**
 * SF-3 / GT-8 field walk kit — outdoor board scenarios + 10s orientation timer.
 * @see docs/CITY_GAME_MAP_DASHBOARD.md § Network lens · GT-8
 * @see docs/CITY_GAME_INSTALL_QA.md § Network board field scenarios
 */

import { seasonSlugFromRulesPath } from "../../site/js/city-game-season-path-shared.mjs";

export const LOCAL_DEV_GT8_FIELD_WALK_REL = "site/dev/city-game-gt8-field-walk.html";

/** Install QA B1–B7 scenarios (network lens field sign-off). */
export const GT8_BOARD_FIELD_SCENARIOS = [
  {
    id: "B1",
    title: "Fresh open (GT-8)",
    prompt: "Un coached — point to where you would go first within 10 seconds.",
    gate: "GT-8",
  },
  {
    id: "B2",
    title: "Outdoor / glare",
    prompt: "Pin labels and express spine readable without zoom in bright sun.",
    gate: null,
  },
  {
    id: "B3",
    title: "Tap a spine pin",
    prompt: "Selection shows world state (chips/effect), Scan + Maps — not a duplicate essay.",
    gate: null,
  },
  {
    id: "B4",
    title: "Tap a non-spine pin",
    prompt: "Same panel shape; state differs from personal progress.",
    gate: null,
  },
  {
    id: "B5",
    title: "After one scan",
    prompt: "Board refresh shows snapshot chips — not “you visited N times”.",
    gate: null,
  },
  {
    id: "B6",
    title: "All places list",
    prompt: "Full node list stays state-first rows; map remains visible.",
    gate: null,
  },
  {
    id: "B7",
    title: "Privacy probe (GT-7)",
    prompt: "Tester describes city knowledge — not GPS tracking or personal rank.",
    gate: "GT-7",
  },
];

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
 * @param {Record<string, unknown>} season
 * @param {string} [origin]
 */
export function productionBoardUrl(season, origin = "https://humanity.llc") {
  const rulesPath = String(season.rules_path ?? "/play/cedar-rapids/").trim() || "/play/cedar-rapids/";
  const base = `${origin.replace(/\/$/, "")}${rulesPath.startsWith("/") ? rulesPath : `/${rulesPath}`}`;
  return `${base.replace(/\/?$/, "/")}map/`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} [origin]
 */
export function productionGt8FieldWalkUrl(season, origin = "https://humanity.llc") {
  const slug = seasonSlugFromRulesPath(String(season.rules_path ?? "")) ?? "cedar-rapids";
  return `${origin.replace(/\/$/, "")}/play/${slug}/comprehension/gt8-field-walk.html`;
}

/**
 * @param {Record<string, unknown>} season
 */
export function resolveNetworkLensNextStop(season) {
  const lens = season.network_lens;
  const nextId =
    lens && typeof lens === "object" && !Array.isArray(lens)
      ? String(lens.next_node_id ?? "").trim()
      : "";
  const nodes = Array.isArray(season.nodes) ? season.nodes : [];
  const row = nodes.find((n) => n && typeof n === "object" && n.node_id === nextId);
  const label = row && typeof row === "object" ? String(row.label ?? row.public_label ?? nextId) : nextId;
  return { nodeId: nextId || "node_04", label: label || nextId || "first stop" };
}

/**
 * @param {{
 *   boardUrl: string;
 *   comprehensionUrl?: string | null;
 *   nextStop?: { nodeId: string; label: string };
 *   production?: boolean;
 * }} opts
 */
export function buildGt8FieldWalkKitHtml(opts) {
  const production = opts.production === true;
  const nextStop = opts.nextStop ?? { nodeId: "node_04", label: "River Lantern" };
  const comprehensionLine = opts.comprehensionUrl
    ? `<p class="lead">Full GT-1–GT-8 cohort kit: <a href="${escapeHtml(opts.comprehensionUrl)}">${escapeHtml(opts.comprehensionUrl)}</a></p>`
    : "";

  const scenarioRows = GT8_BOARD_FIELD_SCENARIOS.map(
    (row) => `<li>
  <strong>${escapeHtml(row.id)} · ${escapeHtml(row.title)}</strong>
  ${row.gate ? `<span class="gate">${escapeHtml(row.gate)}</span>` : ""}
  <p>${escapeHtml(row.prompt)}</p>
  <label class="check"><input type="checkbox" disabled /> Pass</label>
</li>`
  ).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="robots" content="noindex,nofollow" />
  <title>GT-8 field walk · network lens · Cedar Rapids</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 0; padding: 16px; max-width: 44rem; line-height: 1.45; }
    h1 { font-size: 1.2rem; margin: 0 0 8px; }
    h2 { font-size: 1rem; margin: 24px 0 10px; }
    .lead { margin: 0 0 12px; color: #666; font-size: 0.95rem; }
    .cta {
      display: block; padding: 14px 16px; border-radius: 12px; margin: 0 0 10px;
      background: #db1b43; color: #fff; text-decoration: none; font-weight: 600; text-align: center;
    }
    .timer {
      margin: 16px 0 20px; padding: 16px; border-radius: 12px;
      background: rgba(60,60,67,.08); text-align: center;
    }
    .timer-display { font-size: 2.4rem; font-weight: 700; font-variant-numeric: tabular-nums; margin: 8px 0; }
    .timer button {
      font: inherit; padding: 10px 18px; border-radius: 10px; border: none;
      background: #db1b43; color: #fff; font-weight: 600; margin: 0 6px;
    }
    .timer button.secondary { background: rgba(60,60,67,.18); color: inherit; }
    .scenarios { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
    .scenarios li {
      padding: 12px; border-radius: 10px; border: 1px solid rgba(60,60,67,.15);
      font-size: 0.9rem;
    }
    .scenarios p { margin: 6px 0 8px; color: #666; }
    .gate {
      display: inline-block; margin-left: 6px; padding: 2px 6px; border-radius: 6px;
      font-size: 0.7rem; font-weight: 700; background: rgba(0,122,255,.15); color: #007aff;
    }
    .check { font-size: 0.85rem; color: #666; }
    .note {
      margin: 16px 0; padding: 12px; border-radius: 10px;
      background: rgba(255,149,0,.12); font-size: 0.85rem;
    }
    code { font-size: 0.85em; }
  </style>
</head>
<body>
  <h1>GT-8 field walk · network lens</h1>
  <p class="lead">
    Run on <strong>≥2 phones</strong> (Safari + Chrome) at an <strong>outdoor</strong> venue or in bright sun — not only at a desk.
    Mode: ${production ? "production" : "local dev"}.
  </p>
  ${comprehensionLine}
  <a class="cta" href="${escapeHtml(opts.boardUrl)}" id="board-link">Open network lens (tester device)</a>
  <p class="lead">Expected first stop: <strong>${escapeHtml(nextStop.label)}</strong> (<code>${escapeHtml(nextStop.nodeId)}</code>) — Next pin / express line.</p>

  <div class="timer" aria-live="polite">
    <h2>GT-8 · 10 second orientation</h2>
    <p class="lead">Hand phone to tester. Say only: “Where would you go first?” Start timer when the map finishes loading.</p>
    <div class="timer-display" id="timer-display">10.0</div>
    <button type="button" id="timer-start">Start 10s</button>
    <button type="button" class="secondary" id="timer-reset">Reset</button>
  </div>

  <div class="note">
    <strong>Pass when:</strong> tester points to a plausible first stop on the map (Next pin, express callout, or spine row) before timer hits 0 — without reading paragraphs or coaching.
    Record ☑ in <code>CITY_GAME_COMPREHENSION_RUNBOOK.md</code> § Per-tester log. Need <strong>≥4/5</strong> for SF-3 sign-off.
  </div>

  <h2>Board field scenarios (B1–B7)</h2>
  <ul class="scenarios">${scenarioRows}</ul>

  <p class="lead">After ≥4/5 GT-8 + 5/5 GT-7: <code>npm run city-game:network-lens-sign-off -- --pass --apply</code></p>

  <script>
    (function () {
      var display = document.getElementById("timer-display");
      var startBtn = document.getElementById("timer-start");
      var resetBtn = document.getElementById("timer-reset");
      var remaining = 10;
      var handle = null;
      function render() {
        display.textContent = remaining.toFixed(1);
        display.style.color = remaining <= 3 ? "#db1b43" : "";
      }
      function clearTimer() {
        if (handle) { clearInterval(handle); handle = null; }
      }
      startBtn.addEventListener("click", function () {
        clearTimer();
        remaining = 10;
        render();
        handle = setInterval(function () {
          remaining = Math.max(0, remaining - 0.1);
          render();
          if (remaining <= 0) clearTimer();
        }, 100);
      });
      resetBtn.addEventListener("click", function () {
        clearTimer();
        remaining = 10;
        render();
      });
      render();
    })();
  </script>
</body>
</html>`;
}

/**
 * @param {{
 *   boardUrl: string;
 *   fieldWalkUrl: string;
 *   production?: boolean;
 * }} report
 */
export function formatGt8FieldWalkKitReport(report) {
  const lines = ["Cedar Rapids · GT-8 network lens field walk kit", ""];
  lines.push(`  Board URL: ${report.boardUrl}`);
  lines.push(`  Field walk: ${report.fieldWalkUrl}`);
  lines.push("");
  lines.push("Operator:");
  lines.push("  1. Open field walk on your phone — link tester to board CTA");
  lines.push("  2. Run B1 timer probe + B2–B7 spot checks outdoors");
  lines.push("  3. Log GT-7 + GT-8 ☑ in docs/CITY_GAME_COMPREHENSION_RUNBOOK.md");
  lines.push("  4. npm run city-game:network-lens-sign-off -- --pass --apply");
  return lines.join("\n");
}

/**
 * @param {string} html
 * @param {string} rel
 */
export function validateGt8FieldWalkKitHtml(html, rel) {
  /** @type {string[]} */
  const issues = [];
  if (!html.includes("GT-8 · 10 second orientation")) {
    issues.push(`${rel}: missing GT-8 timer section`);
  }
  for (const row of GT8_BOARD_FIELD_SCENARIOS) {
    if (!html.includes(`${row.id} · ${row.title}`)) {
      issues.push(`${rel}: missing scenario ${row.id}`);
    }
  }
  if (!html.includes("noindex,nofollow")) {
    issues.push(`${rel}: missing noindex`);
  }
  return { ok: issues.length === 0, issues };
}
