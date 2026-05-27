/** Required bearer copy (V1_PRODUCT_TRUST_MODEL.md Level 0). */
export const BEARER_WARNING =
  "This QR resolves to a Humanity Card. It does not prove the person holding this item is the card owner.";

/** When signed object_streams are present on the card document. */
export const OBJECT_STREAMS_LIMIT =
  "Extra object details are steward-signed public copy on this object — not verified facts, AI answers, or proof someone scanned.";

/** When a deterministic public_snapshot is assembled from manifesto + object_streams. */
export const OBJECT_PUBLIC_SNAPSHOT_LIMIT =
  "Signed snapshot repeats steward-published fields only — not verified facts, AI answers, or proof someone scanned.";
