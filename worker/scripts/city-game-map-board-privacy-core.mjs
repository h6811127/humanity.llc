/**
 * B13 privacy engineering — snapshot JSON shape + map surface copy audit.
 * @see docs/CITY_GAME_MAP_DASHBOARD.md § Risks and gates · B13
 */

/** Keys that must never appear in public season snapshot JSON (any depth). */
export const FORBIDDEN_SNAPSHOT_KEYS = new Set([
  "player_id",
  "user_id",
  "visitor_id",
  "device_id",
  "session_id",
  "scan_count",
  "visit_count",
  "visits",
  "last_scanner",
  "last_visitor",
  "heatmap",
  "geolocation",
  "latitude",
  "longitude",
  "gps",
  "profile_id",
]);

/**
 * @param {string} html
 * @returns {boolean}
 */
export function hasAffirmativeSurveillanceCopy(html) {
  const lower = html.toLowerCase();
  const phrases = [
    "your progress",
    "you visited",
    "players nearby",
    "player dossier",
    "streak count",
    "showing your visits",
    "track your visits",
  ];
  for (const phrase of phrases) {
    let start = 0;
    while (start < lower.length) {
      const idx = lower.indexOf(phrase, start);
      if (idx === -1) break;
      const windowStart = Math.max(0, idx - 96);
      const window = lower.slice(windowStart, idx);
      const negated = /\b(no|not|without|never)\b[^.!?]*$/i.test(window);
      if (!negated) return true;
      start = idx + phrase.length;
    }
  }
  return false;
}

/** Forbidden phrases anywhere in serialized public snapshot JSON. */
export const FORBIDDEN_SNAPSHOT_COPY =
  /\b(profile_id|leaderboard|heatmap|geolocation|your progress|you visited|players nearby|player dossier)\b/i;

/**
 * @param {unknown} value
 * @param {string} path
 * @param {string[]} issues
 */
function walkForForbiddenKeys(value, path, issues) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkForForbiddenKeys(item, `${path}[${index}]`, issues));
    return;
  }
  if (typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    const keyPath = path ? `${path}.${key}` : key;
    if (FORBIDDEN_SNAPSHOT_KEYS.has(key.toLowerCase())) {
      issues.push(`forbidden key "${key}" at ${keyPath}`);
    }
    walkForForbiddenKeys(nested, keyPath, issues);
  }
}

/**
 * @param {unknown} snapshot
 */
export function auditSeasonSnapshotPrivacy(snapshot) {
  /** @type {string[]} */
  const issues = [];
  if (!snapshot || typeof snapshot !== "object") {
    issues.push("snapshot must be an object");
    return { ok: false, issues };
  }
  walkForForbiddenKeys(snapshot, "", issues);
  const serialized = JSON.stringify(snapshot);
  if (FORBIDDEN_SNAPSHOT_COPY.test(serialized)) {
    issues.push("serialized snapshot matches forbidden surveillance copy pattern");
  }
  return { ok: issues.length === 0, issues };
}

/**
 * @param {string} html
 * @param {string} label
 */
export function auditMapBoardSurfaceCopy(html, label) {
  /** @type {string[]} */
  const issues = [];
  if (!html || typeof html !== "string") {
    issues.push(`${label}: missing HTML`);
    return { ok: false, issues };
  }
  if (hasAffirmativeSurveillanceCopy(html)) {
    issues.push(`${label}: forbidden surveillance copy`);
  }
  return { ok: issues.length === 0, issues };
}

/**
 * @param {{
 *   snapshot?: unknown;
 *   rulesHtml?: string;
 *   boardHtml?: string;
 *   comprehensionHtml?: string | null;
 * }} input
 */
export function auditMapBoardPrivacyEngineering(input) {
  /** @type {string[]} */
  const issues = [];
  if (input.snapshot !== undefined) {
    const snap = auditSeasonSnapshotPrivacy(input.snapshot);
    if (!snap.ok) issues.push(...snap.issues.map((i) => `snapshot — ${i}`));
  }
  for (const [html, label] of [
    [input.rulesHtml, "rules page"],
    [input.boardHtml, "map board"],
    [input.comprehensionHtml, "comprehension kit"],
  ]) {
    if (typeof html !== "string" || !html.trim()) continue;
    const surface = auditMapBoardSurfaceCopy(html, label);
    if (!surface.ok) issues.push(...surface.issues);
  }
  return { ok: issues.length === 0, issues };
}

/**
 * @param {{ ok: boolean; issues: string[] }} audit
 * @returns {string}
 */
export function formatMapBoardPrivacyPreflightReport(audit) {
  const lines = ["Cedar Rapids · map board privacy engineering (B13)", ""];
  lines.push(`  Privacy audit: ${audit.ok ? "☑" : "☐"} snapshot shape + public surfaces`);
  if (audit.issues.length) {
    lines.push("");
    lines.push("Blockers:");
    for (const issue of audit.issues) lines.push(`  ✗ ${issue}`);
  }
  lines.push("");
  lines.push("Human still required:");
  lines.push("  GT-7 — 5/5 testers in comprehension runbook");
  lines.push("  GT-8 — 4/5 testers (npm run city-game:network-lens-preflight)");
  lines.push("  Privacy review row — npm run city-game:map-board-b13-sign-off -- --pass --apply");
  return lines.join("\n");
}
