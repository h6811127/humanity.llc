/** Required bearer copy (V1_PRODUCT_TRUST_MODEL.md Level 0). */
export const BEARER_WARNING =
  "This QR resolves to a Humanity Card. It does not prove the person holding this item is the card owner.";

/** When signed object_streams are present on the card document. */
export const OBJECT_STREAMS_LIMIT =
  "Extra object details are steward-signed public copy on this object — not verified facts, outside summaries, or proof someone scanned.";

/** When a deterministic public_snapshot is assembled from manifesto + object_streams. */
export const OBJECT_PUBLIC_SNAPSHOT_LIMIT =
  "Signed snapshot repeats steward-published fields only — not verified facts, outside summaries, or proof someone scanned.";

/** When the opt-in L3 explain panel shows a model or deterministic summary. */
export const AI_EXPLAIN_LIMIT =
  "Plain-language summary — not signed network state. Only the signed snapshot above is steward-published resolver copy.";

/** When the steward authoring assistant shows a draft on /created/. */
export const AI_DRAFT_LIMIT =
  "AI draft — review and sign to publish. Nothing reaches the network until you submit Update.";
