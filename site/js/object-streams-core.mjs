/** Shared object-scoped public stream validation (worker + browser). */

export const OBJECT_STREAM_MAX_COUNT = 4;
export const OBJECT_STREAM_ID_RE = /^[a-z][a-z0-9_-]{0,23}$/;
export const OBJECT_STREAM_CLASSES = ["place", "care", "narrative", "route"];
export const OBJECT_STREAM_LABEL_MAX = 40;
export const OBJECT_STREAM_VALUE_MAX = 120;

/** @typedef {{ id: string; class: string; label: string; value: string }} ObjectPublicStream */

const HTML_TAG = /<[^>]+>/;

/**
 * @param {unknown} doc
 * @returns {Array<{ id: string; class: string; label: string; value: string }>}
 */
export function parseObjectStreamsFromDocument(doc) {
  if (!doc || typeof doc !== "object") return [];
  return normalizeObjectStreams(/** @type {Record<string, unknown>} */ (doc).object_streams, {
    allowAbsent: true,
  });
}

/**
 * @param {unknown} raw
 * @param {{ allowAbsent?: boolean }} [opts]
 */
export function normalizeObjectStreams(raw, opts = {}) {
  const { allowAbsent = false } = opts;
  if (raw === undefined || raw === null) {
    if (allowAbsent) return [];
    throw new Error("object_streams must be an array.");
  }
  if (!Array.isArray(raw)) {
    throw new Error("object_streams must be an array.");
  }
  if (raw.length > OBJECT_STREAM_MAX_COUNT) {
    throw new Error(
      `object_streams may include at most ${OBJECT_STREAM_MAX_COUNT} entries.`
    );
  }

  const seen = new Set();
  /** @type {Array<{ id: string; class: string; label: string; value: string }>} */
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      throw new Error("Each object_streams entry must be an object.");
    }
    const row = /** @type {Record<string, unknown>} */ (item);
    const id = validateStreamId(row.id, "object_streams[].id");
    if (seen.has(id)) {
      throw new Error(`Duplicate object_streams id: ${id}`);
    }
    seen.add(id);

    const streamClass = validateStreamClass(row.class);
    const label = validatePlainField(row.label, "label", OBJECT_STREAM_LABEL_MAX);
    const value = validatePlainField(row.value, "value", OBJECT_STREAM_VALUE_MAX);
    out.push({ id, class: streamClass, label, value });
  }
  return out;
}

/**
 * Build signed-card streams from optional owner form rows (empty rows omitted).
 * @param {Array<{ id?: string; label?: string; value?: string; class?: string }>} rows
 */
export function buildObjectStreamsFromFormRows(rows) {
  if (!rows?.length) return [];
  const built = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const label = row?.label?.trim() ?? "";
    const value = row?.value?.trim() ?? "";
    if (!label && !value) continue;
    if (!label || !value) {
      throw new Error("Each detail row needs both a label and a value, or leave both blank.");
    }
    const id = row.id?.trim() || slugStreamId(label, i);
    built.push({
      id,
      class: row.class?.trim() || "place",
      label,
      value,
    });
  }
  return normalizeObjectStreams(built);
}

/**
 * @param {unknown} id
 * @param {string} field
 */
function validateStreamId(id, field) {
  if (typeof id !== "string" || !OBJECT_STREAM_ID_RE.test(id)) {
    throw new Error(
      `${field} must be 1–24 lowercase letters, digits, underscores, or hyphens (start with a letter).`
    );
  }
  return id;
}

/**
 * @param {unknown} value
 */
function validateStreamClass(value) {
  if (value === undefined || value === null || value === "") return "place";
  if (typeof value !== "string" || !OBJECT_STREAM_CLASSES.includes(value)) {
    throw new Error(
      `object_streams[].class must be one of: ${OBJECT_STREAM_CLASSES.join(", ")}.`
    );
  }
  return value;
}

/**
 * @param {unknown} raw
 * @param {string} name
 * @param {number} maxLen
 */
function validatePlainField(raw, name, maxLen) {
  if (typeof raw !== "string") {
    throw new Error(`object_streams[].${name} must be a string.`);
  }
  const text = raw.trim();
  if (text.length < 1 || text.length > maxLen) {
    throw new Error(`object_streams[].${name} must be 1–${maxLen} characters.`);
  }
  if (HTML_TAG.test(text)) {
    throw new Error(`object_streams[].${name} must be plain text without HTML.`);
  }
  return text;
}

/**
 * @param {string} label
 * @param {number} index
 */
function slugStreamId(label, index) {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  let candidate = base || `detail_${index + 1}`;
  if (!/^[a-z]/.test(candidate)) {
    candidate = `d_${candidate}`.slice(0, 24);
  }
  return validateStreamId(candidate, "object_streams[].id");
}
