/**
 * Parse game_season block from GET /steward/entitlements (organizer / Phase E).
 * @see docs/HOSTED_TIER_ENTITLEMENTS_AND_METERING.md § City game season
 */

/**
 * @param {unknown} body Entitlements response JSON
 * @returns {{ seasonId: string, enabled: boolean, limits: Record<string, number>, usage: Record<string, unknown> } | null}
 */
export function gameSeasonBlockFromEntitlementsResponse(body) {
  if (!body || typeof body !== "object") return null;
  const block = /** @type {Record<string, unknown>} */ (body).game_season;
  if (!block || typeof block !== "object" || Array.isArray(block)) return null;
  if ("season_ids" in block) return null;

  const seasonId =
    typeof block.season_id === "string" && block.season_id.trim()
      ? block.season_id.trim()
      : null;
  if (!seasonId) return null;

  const limits =
    block.limits && typeof block.limits === "object" && !Array.isArray(block.limits)
      ? /** @type {Record<string, number>} */ (block.limits)
      : {};

  const usage =
    block.usage && typeof block.usage === "object" && !Array.isArray(block.usage)
      ? /** @type {Record<string, unknown>} */ (block.usage)
      : {};

  return {
    seasonId,
    enabled: block.enabled === true,
    limits,
    usage,
  };
}

/**
 * @param {unknown} body
 * @returns {{ seasonIds: string[], hint: string } | null}
 */
export function gameSeasonMultiSeasonHintFromBody(body) {
  if (!body || typeof body !== "object") return null;
  const block = /** @type {Record<string, unknown>} */ (body).game_season;
  if (!block || typeof block !== "object" || Array.isArray(block)) return null;
  if (!("season_ids" in block)) return null;
  const ids = Array.isArray(block.season_ids)
    ? block.season_ids.filter((id) => typeof id === "string" && id.trim())
    : [];
  const hint =
    typeof block.hint === "string" && block.hint.trim() ? block.hint.trim() : "";
  return { seasonIds: ids.map((id) => String(id).trim()), hint };
}

/**
 * @param {number} used
 * @param {number} limit
 */
export function gameSeasonUsageAtLimit(used, limit) {
  return limit > 0 && used >= limit;
}

/**
 * @param {Record<string, unknown>} usageBlock
 * @param {string} meterEvent
 * @returns {{ used: number, limit: number, remaining: number } | null}
 */
export function gameSeasonMeterUsage(usageBlock, meterEvent) {
  const counters =
    usageBlock.counters &&
    typeof usageBlock.counters === "object" &&
    !Array.isArray(usageBlock.counters)
      ? /** @type {Record<string, number>} */ (usageBlock.counters)
      : {};
  const limits =
    usageBlock.limits &&
    typeof usageBlock.limits === "object" &&
    !Array.isArray(usageBlock.limits)
      ? /** @type {Record<string, number>} */ (usageBlock.limits)
      : {};

  const used = typeof counters[meterEvent] === "number" ? Math.floor(counters[meterEvent]) : 0;
  const limit = typeof limits[meterEvent] === "number" ? Math.floor(limits[meterEvent]) : 0;
  if (!limit) return null;
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export function gameSeasonMeterRemaining(usageBlock, meterEvent) {
  const counters =
    usageBlock.counters &&
    typeof usageBlock.counters === "object" &&
    !Array.isArray(usageBlock.counters)
      ? /** @type {Record<string, number>} */ (usageBlock.counters)
      : {};
  const limits =
    usageBlock.limits &&
    typeof usageBlock.limits === "object" &&
    !Array.isArray(usageBlock.limits)
      ? /** @type {Record<string, number>} */ (usageBlock.limits)
      : {};

  const used = typeof counters[meterEvent] === "number" ? counters[meterEvent] : 0;
  const cap = typeof limits[meterEvent] === "number" ? limits[meterEvent] : 0;
  if (!cap) return null;
  return Math.max(0, cap - used);
}
