/**
 * Participant L3 — brief (slice #2): "3 lines from last snapshot on open".
 * @see docs/LAYER3_PERSONAL_AGENCY.md § Smallest safe product surfaces → Participant (minimal) → 2. Brief
 *
 * Purely deterministic core — no DOM, no fetch. Renders up to 3 headline lines from a
 * followed season's public snapshot. Copy stays in the "checked on this device" register:
 * this is device-initiated WATCH (poll public snapshot for a NETWORK that YOU followed),
 * never scan analytics, never "scanned you", never "your progress".
 *
 * Data policy (LAYER3 § Watching without scan analytics):
 * - Allowed:   Poll season snapshot for followed networks (device-initiated).
 * - Forbidden: Log stranger scans; "Who scanned you"; streaks / "your progress";
 *              implying the operator tracks your opens.
 */
export const PARTICIPANT_BRIEF_MAX_LINES = 3;

/**
 * Fallback line when a followed network's snapshot returned no headlines this check.
 * Kept permissive ("check", "open the board") — never invents player-facing progress.
 */
export const PARTICIPANT_BRIEF_EMPTY_LINE =
  "No new headlines on the public board yet — open it to check current state.";

/**
 * @typedef {{
 *   season_id: string;
 *   title?: string | null;
 *   rules_path?: string | null;
 * }} BriefFollowRow
 */

/**
 * @typedef {{
 *   headlines?: unknown;
 *   generated_at?: string | null;
 * }} BriefSnapshot
 */

/**
 * @param {unknown} value
 */
function escapeBriefHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {string | null | undefined} iso
 * @returns {string | null}
 */
export function formatBriefCheckedLabel(iso, now = new Date()) {
  if (iso == null || !String(iso).trim()) return null;
  const ms = Date.parse(String(iso).trim());
  if (!Number.isFinite(ms)) return null;
  const diffMs = now.getTime() - ms;
  if (diffMs < 0) return "Checked on this device · just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Checked on this device · just now";
  if (minutes < 60) return `Checked on this device · ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Checked on this device · ${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `Checked on this device · ${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * @param {unknown} snapshot
 * @returns {string[]}
 */
function headlineLines(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return [];
  const raw = Array.isArray(snapshot.headlines) ? snapshot.headlines : [];
  const out = [];
  for (const line of raw) {
    if (out.length >= PARTICIPANT_BRIEF_MAX_LINES) break;
    const trimmed = String(line ?? "").trim();
    if (!trimmed) continue;
    out.push(trimmed);
  }
  return out;
}

/**
 * Build the brief line list for one followed network.
 * Guarantees at least one line (fallback honest copy when the snapshot has none).
 * @param {BriefFollowRow} row
 * @param {BriefSnapshot | null | undefined} snapshot
 * @returns {{ lines: string[]; checkedLabel: string | null }}
 */
export function buildFollowBrief(row, snapshot, now = new Date()) {
  const lines = headlineLines(snapshot);
  const checkedLabel = formatBriefCheckedLabel(snapshot?.generated_at, now);
  return { lines: lines.length ? lines : [PARTICIPANT_BRIEF_EMPTY_LINE], checkedLabel };
}

/**
 * Build the full brief block for a followed network.
 * @param {BriefFollowRow} row
 * @param {BriefSnapshot | null | undefined} snapshot
 * @param {Date} [now]
 * @returns {string}
 */
export function buildFollowBriefHtml(row, snapshot, now = new Date()) {
  const { lines, checkedLabel } = buildFollowBrief(row, snapshot, now);
  const title = escapeBriefHtml(row.title || row.season_id);
  const rulesPath =
    String(row.rules_path ?? "").trim() ||
    "/play/season/";
  const boardHref = escapeBriefHtml(rulesPath);

  const lineItems = lines
    .map((line) => `<li class="participant-brief-line">${escapeBriefHtml(line)}</li>`)
    .join("");

  const checkedLine = checkedLabel
    ? `<p class="participant-brief-checked">${escapeBriefHtml(checkedLabel)}</p>`
    : `<p class="participant-brief-checked">Checked on this device</p>`;

  return `<section class="participant-brief idea-section" aria-labelledby="participant-brief-${escapeBriefHtml(row.season_id)}">
  <h3 class="group-label" id="participant-brief-${escapeBriefHtml(row.season_id)}">${title}</h3>
  <ul class="participant-brief-list">${lineItems}</ul>
  ${checkedLine}
  <a class="participant-brief-open" href="${boardHref}">Open public board</a>
</section>`;
}

/**
 * Combine brief blocks for many followed seasons (order preserved).
 * @param {Array<{ row: BriefFollowRow; snapshot: BriefSnapshot | null }>} checks
 * @param {Date} [now]
 * @returns {string} "" when no checks.
 */
export function buildFollowBriefsHtml(checks, now = new Date()) {
  if (!Array.isArray(checks) || !checks.length) return "";
  return checks
    .map(({ row, snapshot }) => buildFollowBriefHtml(row, snapshot, now))
    .join("\n");
}