/**
 * Wear track chooser — BYOP vs fulfilled garment (Step 20 slice 6 · Q2).
 * @see docs/STEWARD_UX_PRESENTATION_TARGET.md § Room 2 · MERCH_QR_LIFECYCLE_POLICY.md
 */

export const WEAR_TRACK_BYOP = "byop";
export const WEAR_TRACK_FULFILLED = "fulfilled";
export const WEAR_TRACK_STORAGE_KEY = "hc_wear_track_choice:v1";

export const WEAR_TRACK_FULFILLED_HREF = "/shop/customize/?product=glitch_hoodie_v1";

/** @typedef {typeof WEAR_TRACK_BYOP | typeof WEAR_TRACK_FULFILLED} WearTrackId */

export const WEAR_TRACK_OPTIONS = [
  {
    id: WEAR_TRACK_BYOP,
    title: "Print your own (BYOP)",
    body:
      "You print the QR on your own garment. It may expire (for example 90 days). You can extend, rotate, or replace.",
  },
  {
    id: WEAR_TRACK_FULFILLED,
    title: "Fulfilled garment",
    body:
      "This QR is tied to the hoodie we print. It does not expire on a calendar. Revoking ends this garment's link.",
    href: WEAR_TRACK_FULFILLED_HREF,
  },
];

/**
 * @param {URLSearchParams} searchParams
 */
export function readWearTrackFromQuery(searchParams) {
  const raw = searchParams.get("wear_track")?.trim();
  if (raw === WEAR_TRACK_BYOP || raw === WEAR_TRACK_FULFILLED) return raw;
  return null;
}

/**
 * @param {Pick<Storage, "getItem" | "setItem"> | null | undefined} storage
 */
export function readPersistedWearTrack(storage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(WEAR_TRACK_STORAGE_KEY)?.trim();
    if (raw === WEAR_TRACK_BYOP || raw === WEAR_TRACK_FULFILLED) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * @param {Pick<Storage, "setItem"> | null | undefined} storage
 * @param {WearTrackId} trackId
 */
export function writePersistedWearTrack(storage, trackId) {
  if (!storage || !trackId) return;
  try {
    storage.setItem(WEAR_TRACK_STORAGE_KEY, trackId);
  } catch {
    /* ignore */
  }
}

/**
 * @param {{
 *   searchParams: URLSearchParams;
 *   storage?: Pick<Storage, "getItem" | "setItem"> | null;
 * }} input
 */
export function resolveWearTrackChoice(input) {
  return readWearTrackFromQuery(input.searchParams) ?? readPersistedWearTrack(input.storage ?? null);
}

/**
 * @param {WearTrackId | null | undefined} track
 */
export function wearTrackRequiresCreateForm(track) {
  return track === WEAR_TRACK_BYOP;
}
