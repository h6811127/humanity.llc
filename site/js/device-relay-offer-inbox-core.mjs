/**
 * Pure relay-offer inbox copy and response parsing.
 * @see docs/DEVICE_INBOX.md
 */

/** @typedef {{
 *   profileId: string;
 *   objectId: string;
 *   publicLabel: string;
 *   pendingCount: number;
 * }} RelayOfferPendingItem */

/**
 * @param {number} n
 */
export function relayOfferInboxAggregateTitle(n) {
  if (n <= 0) return "";
  return n === 1 ? "1 finder message waiting" : `${n} finder messages waiting`;
}

/**
 * @param {string} label
 * @param {number} count
 */
export function relayOfferInboxRowSubtitle(label, count) {
  const safeLabel = label?.trim() || "Return relay";
  if (count > 1) return `${safeLabel} · ${count} messages`;
  return safeLabel;
}

/**
 * @param {unknown} body
 * @returns {{ totalPending: number, items: RelayOfferPendingItem[] } | null}
 */
export function parseRelayOfferProfileSummaryBody(body, profileId) {
  if (!body || typeof body !== "object") return null;
  const record = /** @type {Record<string, unknown>} */ (body);
  if (record.type !== "relay_offer_profile_summary") return null;

  const objects = Array.isArray(record.objects) ? record.objects : [];
  /** @type {RelayOfferPendingItem[]} */
  const items = [];
  for (const row of objects) {
    if (!row || typeof row !== "object") continue;
    const r = /** @type {Record<string, unknown>} */ (row);
    const objectId = typeof r.object_id === "string" ? r.object_id : "";
    const publicLabel = typeof r.public_label === "string" ? r.public_label : "";
    const pendingCount =
      typeof r.pending_count === "number" && Number.isFinite(r.pending_count)
        ? r.pending_count
        : 0;
    if (!objectId || pendingCount <= 0) continue;
    items.push({
      profileId,
      objectId,
      publicLabel,
      pendingCount,
    });
  }

  const totalFromBody =
    typeof record.total_pending === "number" && Number.isFinite(record.total_pending)
      ? record.total_pending
      : null;
  const totalPending =
    totalFromBody != null
      ? totalFromBody
      : items.reduce((sum, item) => sum + item.pendingCount, 0);

  return { totalPending, items };
}

/**
 * @param {RelayOfferPendingItem[]} prev
 * @param {RelayOfferPendingItem[]} next
 */
export function relayOfferInboxChanged(prev, next) {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i += 1) {
    const a = prev[i];
    const b = next[i];
    if (
      a.profileId !== b.profileId ||
      a.objectId !== b.objectId ||
      a.pendingCount !== b.pendingCount ||
      a.publicLabel !== b.publicLabel
    ) {
      return true;
    }
  }
  return false;
}
