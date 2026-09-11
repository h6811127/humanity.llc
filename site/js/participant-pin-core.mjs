/**
 * Participant L3 — pin (slice #3): board URL, cap ~20, device-local.
 * @see docs/LAYER3_PERSONAL_AGENCY.md § Smallest safe product surfaces → Participant (minimal) → 3. Pin
 *
 * Purely deterministic core — no DOM, no fetch. Pins are bookmarks only: they never hold
 * signing material, never upload, and are not scan analytics. The disclosure copy states
 * exactly what the device remembers and that clearing site data removes it.
 *
 * Data policy (LAYER3 § Watching without scan analytics / Explicitly forbidden):
 * - Allowed:   RELATE — pin a public board URL (participant).
 * - Forbidden: streaks / "your progress" / player profiles implied from pins; upload.
 */
export const PARTICIPANT_PINS_STORAGE_KEY = "hc_participant_pins";
export const PARTICIPANT_PINS_MAX = 20;

export const PARTICIPANT_PINS_COPY = {
  heading: "Pinned boards",
  empty: "Pin a public board to open it from this device without an account.",
  disclosure:
    "Pins are bookmarks stored only in this browser (hc_participant_pins). Nothing is uploaded. Clearing site data removes this list.",
  button_pin: "Pin this board",
  button_pinned: "Pinned",
  button_unpin: "Unpin",
  aria_pin: "Pin this public board on this device",
  aria_unpin: "Unpin this public board from this device",
};

/**
 * @param {string | null | undefined} value
 */
function escapePinHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Strictly accept a site-relative path or an http(s) URL — never javascript:, data:, etc.
 * @param {string | null | undefined} value
 * @returns {boolean}
 */
export function isPinnableBoardUrl(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return false;
  if (trimmed.length > 500) return false;
  if (trimmed.startsWith("/")) {
    // Site-relative path — block obvious injection and protocol-relative weirdness.
    return !trimmed.startsWith("//") && !trimmed.startsWith("/\\");
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * @param {Storage | null | undefined} store
 * @returns {Array<{ season_id?: string; title?: string; board_url: string; pinned_at: string }>}
 */
export function loadPins(store = typeof localStorage !== "undefined" ? localStorage : null) {
  try {
    const raw = store?.getItem(PARTICIPANT_PINS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry) => entry && typeof entry === "object" && isPinnableBoardUrl(entry.board_url)
    );
  } catch {
    return [];
  }
}

/**
 * @param {Array<{ board_url: string }>} entries
 * @param {Storage | null | undefined} store
 */
export function savePins(entries, store = typeof localStorage !== "undefined" ? localStorage : null) {
  try {
    store?.setItem(PARTICIPANT_PINS_STORAGE_KEY, JSON.stringify(entries));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("hc-participant-pins-changed"));
    }
  } catch {
    /* storage unavailable — fail closed but non-fatal */
  }
}

/**
 * @param {string} boardUrl
 * @param {Array<{ board_url: string }>} [entries]
 */
export function isPinned(boardUrl, entries = loadPins()) {
  return entries.some((entry) => entry.board_url === boardUrl);
}

/**
 * Pin a public board URL (Tier B — the caller has already confirmed via an explicit click).
 * @param {{ board_url: string; title?: string; season_id?: string }} row
 * @param {Array<any>} [entries]
 * @param {Storage | null} [store]
 * @returns {{ ok: true; entries: Array<any> } | { ok: false; error: string }}
 */
export function pinBoard(row, entries = loadPins(), store) {
  const boardUrl = String(row?.board_url ?? "").trim();
  if (!isPinnableBoardUrl(boardUrl)) {
    return { ok: false, error: "Use a site-relative path or an http(s) board URL." };
  }
  if (entries.some((entry) => entry.board_url === boardUrl)) {
    return { ok: false, error: "This board is already pinned on this device." };
  }
  if (entries.length >= PARTICIPANT_PINS_MAX) {
    return { ok: false, error: `You can pin up to ${PARTICIPANT_PINS_MAX} boards on this device.` };
  }
  const entry = {
    season_id: String(row?.season_id ?? "").trim() || undefined,
    title: String(row?.title ?? "").trim() || boardUrl,
    board_url: boardUrl,
    pinned_at: new Date().toISOString(),
  };
  const next = [...entries, entry];
  savePins(next, store);
  return { ok: true, entries: next };
}

/**
 * Unpin a board (Tier B confirm, no sign).
 * @param {string} boardUrl
 * @param {Array<any>} [entries]
 * @param {Storage | null} [store]
 * @returns {{ ok: true; entries: Array<any> } | { ok: false; error: string }}
 */
export function unpinBoard(boardUrl, entries = loadPins(), store) {
  if (!boardUrl) return { ok: false, error: "Board URL is required." };
  if (!entries.some((entry) => entry.board_url === boardUrl)) {
    return { ok: false, error: "This board is not pinned on this device." };
  }
  const next = entries.filter((entry) => entry.board_url !== boardUrl);
  savePins(next, store);
  return { ok: true, entries: next };
}

/**
 * Build the "Pinned boards" list.
 * @param {Array<{ board_url: string; title?: string }>} entries
 * @param {Record<string, string>} [copy]
 * @returns {string}
 */
export function buildPinnedBoardsHtml(entries, copy = {}) {
  const c = { ...PARTICIPANT_PINS_COPY, ...copy };
  if (!Array.isArray(entries) || !entries.length) {
    return `<section class="participant-pins idea-section" aria-labelledby="participant-pins-heading" data-pins-shelf="empty">
  <h2 class="group-label" id="participant-pins-heading">${escapePinHtml(c.heading)}</h2>
  <p class="form-hint participant-pins-empty">${escapePinHtml(c.empty)}</p>
  <p class="idea-footnote participant-pins-disclosure">${escapePinHtml(c.disclosure)}</p>
</section>`;
  }
  const rows = entries
    .map((entry) => {
      const title = String(entry.title ?? "").trim() || entry.board_url;
      const href = escapePinHtml(entry.board_url);
      return `<li class="participant-pin-row">
  <a class="participant-pin-link" href="${href}">${escapePinHtml(title)}</a>
  <button type="button" class="participant-pin-btn" data-participant-unpin="${href}" aria-label="${escapePinHtml(c.aria_unpin)}">${escapePinHtml(c.button_unpin)}</button>
</li>`;
    })
    .join("");
  return `<section class="participant-pins idea-section" aria-labelledby="participant-pins-heading" data-pins-shelf="list">
  <h2 class="group-label" id="participant-pins-heading">${escapePinHtml(c.heading)}</h2>
  <ul class="participant-pins-list">${rows}</ul>
  <p class="idea-footnote participant-pins-disclosure">${escapePinHtml(c.disclosure)}</p>
</section>`;
}