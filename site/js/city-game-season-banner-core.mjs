/**
 * Phase-aware Cedar Rapids season banners on static Pages surfaces.
 * @see worker/src/city-game/season-window.ts (keep in sync)
 */

import { seasonBoardPath } from "./city-game-season-path-shared.mjs";

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * @param {string | null | undefined} raw
 */
function parseWindowInstant(raw) {
  if (raw == null || !String(raw).trim()) return null;
  const trimmed = String(raw).trim();
  if (!ISO_RE.test(trimmed)) return null;
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * @param {Date} [now]
 * @param {{ status?: string; window?: { starts_at?: string | null; ends_at?: string | null } }} [season]
 * @returns {"unset" | "before" | "open" | "after"}
 */
export function resolveSeasonWindowPhase(now = new Date(), season = {}) {
  if (season.status === "ended") return "after";

  const startsAt = season.window?.starts_at ?? null;
  const endsAt = season.window?.ends_at ?? null;
  if (!startsAt && !endsAt) return "unset";

  const startMs = parseWindowInstant(startsAt);
  const endMs = parseWindowInstant(endsAt);
  const nowMs = now.getTime();

  if (startMs != null && nowMs < startMs) return "before";
  if (endMs != null && nowMs > endMs) return "after";
  return "open";
}

/**
 * @param {{ window?: { starts_at?: string | null; ends_at?: string | null }; title?: string; season_id?: string }} season
 */
export function formatSeasonWindowLabel(season) {
  const start = season.window?.starts_at?.trim();
  const end = season.window?.ends_at?.trim();
  if (!start || !end) return null;
  const title = season.title?.trim() || season.season_id || "Season 1";
  return `${title} · ${start} → ${end}`;
}

/**
 * @param {"unset" | "before" | "open" | "after"} phase
 */
export function seasonBannerHeadline(phase) {
  if (phase === "before") return "Season opens soon.";
  if (phase === "after") return "Season ended.";
  if (phase === "open") return "Season live.";
  return "Season window";
}

/**
 * Short status for season lists (portal, index rows).
 * @param {"unset" | "before" | "open" | "after"} phase
 * @param {{ city?: string; window?: { starts_at?: string | null; ends_at?: string | null } }} season
 */
export function seasonListSubtitle(phase, season) {
  const city = String(season.city ?? "").trim();
  const headline = seasonBannerHeadline(phase).replace(/\.$/, "");
  return [city, headline].filter(Boolean).join(" · ");
}

/**
 * @param {"unset" | "before" | "open" | "after"} phase
 */
export function seasonBannerNoticeClass(phase) {
  return phase === "after" ? "hc-notice--warning" : "hc-notice--info";
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} [hash]
 */
function seasonRulesHref(season, hash = "") {
  const path = String(season.rules_path ?? "/play/cedar-rapids/").trim() || "/play/cedar-rapids/";
  const base = path.replace(/\/?$/, "/");
  return hash ? `${base}${hash.replace(/^#?/, "#")}` : base;
}

/**
 * @param {Record<string, unknown>} season
 */
function seasonBoardHref(season) {
  return (
    seasonBoardPath(String(season.rules_path ?? "")) ??
    seasonRulesHref(season, "#city-state")
  );
}

/**
 * @param {Record<string, unknown>} season
 */
function seasonCityLabel(season) {
  return String(season.city ?? "the city").trim() || "the city";
}

/**
 * @param {"unset" | "before" | "open" | "after"} phase
 * @param {"rules" | "research" | "hub"} variant
 * @param {Record<string, unknown>} [season]
 */
export function seasonBannerBodyHtml(phase, variant, season = {}) {
  const city = seasonCityLabel(season);
  const rulesHref = seasonRulesHref(season);
  const boardHref = seasonRulesHref(season, "#city-state");
  const seasonTitle = String(season.title ?? "Season 1").trim() || "Season 1";

  if (variant === "rules") {
    if (phase === "before") {
      return `${seasonTitle} opens on the date above. Scans work now, but game progression and contributions start when the window opens. Use the <a href="#city-state">place list below</a> to plan your weekend.`;
    }
    if (phase === "after") {
      return `${seasonTitle} has ended. Public object state remains readable on scans; game progression is paused. The <a href="#city-state">place list</a> and rules below stay available for reference.`;
    }
    return `Scan game stickers around ${city} to read public object state. No account required. Open the <a href="#city-state">weekend city state board</a> for districts, live chips, and unlock paths.`;
  }

  if (variant === "hub") {
    if (phase === "before") {
      return "Plan ahead with the rules and city board before the window opens.";
    }
    if (phase === "after") {
      return "Season ended — rules and city board remain for reference.";
    }
    return "Read the rules and city board before scanning game nodes.";
  }

  if (phase === "before") {
    return `<a href="${rulesHref}">Read the rules</a> and <a href="${boardHref}">open the place list</a> to plan ahead — scans work now, but play progression starts when the window opens.`;
  }
  if (phase === "after") {
    return `<a href="${rulesHref}">Rules</a> and the <a href="${boardHref}">city board</a> remain available. Resolver-backed play progression is paused.`;
  }
  return `<a href="${rulesHref}">Read the rules</a> and <a href="${boardHref}">open the city state board</a> before scanning game nodes. Resolver-backed play runs on live <code>/c/…</code> scan URLs — demo layouts on this page remain design reference.`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {"unset" | "before" | "open" | "after"} phase
 * @param {"rules" | "research" | "hub"} variant
 */
export function applySeasonBannerMount(mount, season, phase, variant) {
  const windowLabel = formatSeasonWindowLabel(season);
  const headline = seasonBannerHeadline(phase);
  const noticeClass = seasonBannerNoticeClass(phase);

  mount.classList.remove("hc-notice--info", "hc-notice--warning");
  if (mount.classList.contains("hc-notice")) {
    mount.classList.add(noticeClass);
  }

  const labelEl = mount.querySelector("[data-city-game-season-banner-label]");
  const datesEl = mount.querySelector("[data-city-game-season-banner-dates]");
  const bodyEl = mount.querySelector("[data-city-game-season-banner-body]");

  if (labelEl) labelEl.textContent = headline;
  if (datesEl) datesEl.textContent = windowLabel ? ` ${windowLabel}` : "";
  if (bodyEl) {
    if (variant === "hub") bodyEl.textContent = ` ${seasonBannerBodyHtml(phase, variant, season)}`;
    else bodyEl.innerHTML = seasonBannerBodyHtml(phase, variant, season);
  }
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} jsonUrl
 * @param {"rules" | "research" | "hub"} variant
 */
export function buildSeasonBannerBlock(season, jsonUrl, variant = "research") {
  const windowLabel = formatSeasonWindowLabel(season);
  if (!windowLabel) {
    throw new Error("Season window dates required for season banner.");
  }

  const rulesHref = seasonRulesHref(season);
  const boardHref = seasonRulesHref(season, "#city-state");
  const body = seasonBannerBodyHtml("open", variant, season);

  if (variant === "hub") {
    return `<p class="landing-vision-lead landing-vision-lead--dev" data-city-game-season-banner data-season-json="${escapeAttr(jsonUrl)}" data-banner-variant="${variant}">
  <strong data-city-game-season-banner-label>Season window</strong><span data-city-game-season-banner-dates> ${windowLabel}</span>
  <span data-city-game-season-banner-body> ${seasonBannerBodyHtml("open", variant, season)}</span>
  <a href="${rulesHref}">Read the rules</a>
  and the
  <a href="${boardHref}">city state board</a>
  before scanning game nodes. See the
  <a href="/what-can-a-qr-do/physical-world-multiplayer/">multiplayer walkthrough</a>
  and
  <a href="/what-can-a-qr-do/combining-ideas/cedar-rapids-city-game/">Cedar Rapids demo</a>
  for design reference.
</p>`;
  }

  return `<div class="research-live-banner hc-notice hc-notice--info" role="note" data-city-game-season-banner data-season-json="${escapeAttr(jsonUrl)}" data-banner-variant="${variant}">
  <p>
    <strong data-city-game-season-banner-label>Season window</strong><span data-city-game-season-banner-dates> ${windowLabel}</span>
  </p>
  <p data-city-game-season-banner-body>${body}</p>
</div>`;
}

/**
 * @param {string} value
 */
function escapeAttr(value) {
  return String(value).replace(/"/g, "&quot;");
}

/**
 * @param {Document | HTMLElement} root
 */
export async function bootCityGameSeasonBanners(root = document) {
  const mounts = root.querySelectorAll("[data-city-game-season-banner][data-season-json]");
  if (!mounts.length) return;

  /** @type {Map<string, Record<string, unknown>>} */
  const seasonCache = new Map();

  for (const mount of mounts) {
    if (!(mount instanceof HTMLElement)) continue;
    const jsonUrl = mount.dataset.seasonJson?.trim();
    const variant = mount.dataset.bannerVariant === "rules" ||
      mount.dataset.bannerVariant === "hub"
      ? mount.dataset.bannerVariant
      : "research";
    if (!jsonUrl) continue;

    try {
      if (!seasonCache.has(jsonUrl)) {
        const res = await fetch(jsonUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`season fetch ${res.status}`);
        seasonCache.set(jsonUrl, await res.json());
      }
      const season = seasonCache.get(jsonUrl);
      const phase = resolveSeasonWindowPhase(new Date(), season);
      applySeasonBannerMount(mount, season, phase, variant);
    } catch (err) {
      console.warn("[city-game-season-banner]", err);
    }
  }
}
