/**
 * Participant L3 — charter (slice #4): what this device remembers.
 * @see docs/LAYER3_PERSONAL_AGENCY.md § Smallest safe product surfaces → Participant (minimal) → 4. Charter
 *
 * Purely deterministic core. The charter is an honest inventory of the participant
 * device-local stores (follows + pins): counts, the key names, the promise that nothing
 * is uploaded, and how to clear it. It is a trust disclosure — never "your progress",
 * never "scanned you", never implied tracking.
 */
export const PARTICIPANT_CHARTER_COPY = {
  label: "What this device keeps",
  follows: "followed networks",
  pins: "pinned boards",
  disclosure:
    "All of it stays in this browser's local storage (hc_participant_follows, hc_participant_pins). Nothing is uploaded or shared. Clearing site data removes the networks you follow, the boards you pin, and this list.",
  clear_hint: "Clear site data to remove them.",
  none: "Nothing yet — nothing leaves this device.",
};

/**
 * @param {string | null | undefined} value
 */
function escapeCharterHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {number} count
 * @param {string} singular
 * @param {string} [plural]
 */
function pluralLabel(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

/**
 * Build the charter disclosure block.
 * @param {{ followsCount: number; pinsCount: number }} counts
 * @param {Record<string, string>} [copy]
 * @returns {string}
 */
export function buildParticipantCharterHtml(counts, copy = {}) {
  const c = { ...PARTICIPANT_CHARTER_COPY, ...copy };
  const followsCount = Number.isFinite(counts?.followsCount) ? Math.max(0, Math.floor(counts.followsCount)) : 0;
  const pinsCount = Number.isFinite(counts?.pinsCount) ? Math.max(0, Math.floor(counts.pinsCount)) : 0;
  const items = [];
  if (followsCount || pinsCount) {
    if (followsCount) items.push(`${followsCount} ${pluralLabel(followsCount, "followed network", c.follows)}`);
    if (pinsCount) items.push(`${pinsCount} ${pluralLabel(pinsCount, "pinned board", c.pins)}`);
    items.push(c.clear_hint);
  } else {
    items.push(c.none);
  }
  return `<details class="participant-charter idea-section">
  <summary class="participant-charter-summary">${escapeCharterHtml(c.label)}</summary>
  <p class="form-hint participant-charter-body">${escapeCharterHtml(c.disclosure)}</p>
  <ul class="participant-charter-list">
    ${items.map((item) => `<li>${escapeCharterHtml(item)}</li>`).join("")}
  </ul>
</details>`;
}