/**
 * Guardrail: season_root_profile_id must exist on production D1 before launch.
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md · LO-4 RN-4
 */

export const DEFAULT_PRODUCTION_API = "https://humanity.llc";

/**
 * @param {Record<string, unknown> | null | undefined} season
 */
export function seasonProductionRootId(season) {
  return String(season?.season_root_profile_id ?? "").trim() || null;
}

/**
 * @param {{ status?: number; notFound?: boolean } | null | undefined} cardResponse
 * @param {string | null} profileId
 */
export function assessProductionRootCard(cardResponse, profileId) {
  if (!profileId) {
    return { ok: true, skipped: true, reason: "no season_root_profile_id" };
  }
  if (!cardResponse) {
    return { ok: false, reason: `${profileId}: fetch failed` };
  }
  if (cardResponse.notFound || cardResponse.status === 404) {
    return {
      ok: false,
      reason: `${profileId}: NOT_FOUND on production — local mint committed without prod replay?`,
    };
  }
  if (cardResponse.status !== 200) {
    return { ok: false, reason: `${profileId}: HTTP ${cardResponse.status ?? "unknown"}` };
  }
  return { ok: true, profileId };
}

/**
 * @param {string} apiOrigin
 * @param {string} profileId
 */
export async function fetchProductionCard(apiOrigin, profileId) {
  const url = `${apiOrigin.replace(/\/$/, "")}/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (!res) {
    return { status: 0, notFound: false, body: null };
  }
  /** @type {unknown} */
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const err =
    body && typeof body === "object" && "error" in body
      ? String(/** @type {{ error?: string }} */ (body).error ?? "")
      : "";
  const code =
    body && typeof body === "object" && "code" in body
      ? String(/** @type {{ code?: string }} */ (body).code ?? "")
      : "";
  const notFound = res.status === 404 || err === "NOT_FOUND" || code === "NOT_FOUND";
  return { status: res.status, notFound, body };
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} [apiOrigin]
 */
export async function verifyProductionRoot(season, apiOrigin = DEFAULT_PRODUCTION_API) {
  const profileId = seasonProductionRootId(season);
  if (!profileId) {
    return { ok: true, skipped: true, profileId: null, apiOrigin, reason: "no season_root_profile_id" };
  }
  const card = await fetchProductionCard(apiOrigin, profileId);
  const assessed = assessProductionRootCard(card, profileId);
  return { ...assessed, profileId, apiOrigin };
}

/**
 * @param {{ ok: boolean; skipped?: boolean; profileId?: string | null; reason?: string; apiOrigin?: string }} result
 */
export function formatProductionRootVerifyReport(result) {
  const lines = ["Cedar Rapids · production root verify", ""];
  if (result.skipped) {
    lines.push("Skipped — season JSON has no season_root_profile_id.");
    lines.push("");
    return lines.join("\n");
  }
  lines.push(`API: ${result.apiOrigin ?? DEFAULT_PRODUCTION_API}`);
  lines.push(`season_root_profile_id: ${result.profileId ?? "(missing)"}`);
  if (result.ok) {
    lines.push("Card JSON: ☑ 200 on production D1");
  } else {
    lines.push(`Card JSON: ☐ ${result.reason ?? "failed"}`);
    lines.push("");
    lines.push("Fix: align season JSON to prod seed (Option B) or replay local mint to prod D1 (Option A).");
  }
  lines.push("");
  return lines.join("\n");
}
