/**
 * WS-DOCKET — non-starter chapter discovery pins (C-v3 publish).
 * Branch surface only — does not pollute city game discovery or homepage.
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § WS-DOCKET-C
 */

import {
  DOCKET_STARTER_CASE_IDS,
  validateDocketDiscoveryOptInFields,
} from "./docket-discovery-opt-in-core.mjs";
import {
  DOCKET_CHAPTER_MINT_STATUSES,
  isFixtureDocketChildScanPath,
  isMintedDocketChildScanPath,
} from "./docket-chapter-mint-core.mjs";

export const DOCKET_CHAPTER_PINS_PATH = "/data/docket-chapter-discovery-pins.json";
export const DOCKET_CHAPTER_PINS_PAGE_PATH = "/docket/chapters/";
export const DOCKET_CHAPTER_PINS_KIND = "hc.docket.chapter_discovery_pins.v0";
export const DOCKET_CHAPTER_PINS_KIT_REL =
  "site/dev/ws-docket-chapter-pins-v0-field-walk.html";

/** Field-walk steps for kit HTML. */
export function docketChapterPinsV0Steps() {
  return [
    "Confirm starter-four case JSON still has discovery_opt_in: false.",
    "Open /docket/chapters/ — one or more non-starter chapter pins load.",
    "Confirm pin href is a docket commons path (research kit / chapter), not a Most Wanted case.",
    "Confirm scan_path is /c/…?q=… (child QR). After QR-mint-v0: mint_status minted + Base58 ids.",
    "Confirm site/data/discovery-cedar-rapids-iowa.json has no chapter pin ids.",
    "Run npm run ws-docket:chapter-pins-preflight -- --strict.",
    "Optional: npm run ws-docket:chapter-mint -- --write-pins (local Worker).",
  ];
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, doc: Record<string, unknown> } | { ok: false, errors: string[] }}
 */
export function validateDocketChapterDiscoveryPins(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["chapter pins doc must be an object"] };
  }
  const doc = /** @type {Record<string, unknown>} */ (raw);
  if (doc.kind !== DOCKET_CHAPTER_PINS_KIND) {
    errors.push(`kind must be ${DOCKET_CHAPTER_PINS_KIND}`);
  }
  if (doc.pollutes_city_discovery !== false) {
    errors.push("pollutes_city_discovery must be false (branch fence)");
  }
  const pins = Array.isArray(doc.pins) ? doc.pins : null;
  if (!pins || pins.length < 1) {
    errors.push("pins must be a non-empty array");
  } else {
    const seen = new Set();
    for (let i = 0; i < pins.length; i++) {
      const rowRaw = pins[i];
      if (!rowRaw || typeof rowRaw !== "object" || Array.isArray(rowRaw)) {
        errors.push(`pins[${i}] must be an object`);
        continue;
      }
      const row = /** @type {Record<string, unknown>} */ (rowRaw);
      const id = String(row.id ?? "").trim();
      if (!id) {
        errors.push(`pins[${i}].id is required`);
      } else {
        if (seen.has(id)) errors.push(`duplicate pin id: ${id}`);
        seen.add(id);
        if (DOCKET_STARTER_CASE_IDS.includes(id)) {
          errors.push(
            `pins[${i}].id "${id}" is a starter-four Most Wanted slug — forbidden`
          );
        }
        if (String(row.case_ref ?? "").trim()) {
          const cref = String(row.case_ref).trim();
          if (DOCKET_STARTER_CASE_IDS.includes(cref)) {
            errors.push(
              `pins[${i}].case_ref must not be a starter-four id (got ${cref})`
            );
          }
        }
      }
      if (typeof row.display_label !== "string" || !row.display_label.trim()) {
        errors.push(`pins[${i}].display_label is required`);
      }
      if (typeof row.href !== "string" || !row.href.startsWith("/")) {
        errors.push(`pins[${i}].href must be a site path starting with /`);
      }
      if (typeof row.region_id !== "string" || !row.region_id.trim()) {
        errors.push(`pins[${i}].region_id is required`);
      }
      if (row.case_ref != null && typeof row.case_ref !== "string") {
        errors.push(`pins[${i}].case_ref must be null or a string`);
      }
      const mintStatus = String(row.mint_status ?? "fixture").trim();
      if (!DOCKET_CHAPTER_MINT_STATUSES.includes(mintStatus)) {
        errors.push(
          `pins[${i}].mint_status must be one of: ${DOCKET_CHAPTER_MINT_STATUSES.join(", ")}`
        );
      }
      const stewards = row.stewards;
      if (!Array.isArray(stewards) || stewards.length < 2) {
        errors.push(`pins[${i}].stewards must include ≥2 maintainers`);
      }
      const live = row.live_object;
      if (!live || typeof live !== "object" || Array.isArray(live)) {
        errors.push(`pins[${i}].live_object is required`);
      } else {
        validateDocketDiscoveryOptInFields(
          /** @type {Record<string, unknown>} */ (live),
          stewards,
          errors,
          { requireStewardMembership: true }
        );
        if (
          /** @type {Record<string, unknown>} */ (live).discovery_opt_in !== true
        ) {
          errors.push(
            `pins[${i}].live_object.discovery_opt_in must be true for published chapter pins`
          );
        }
        const scanPath = String(
          /** @type {Record<string, unknown>} */ (live).scan_path ?? ""
        );
        if (mintStatus === "minted") {
          if (!isMintedDocketChildScanPath(scanPath)) {
            errors.push(
              `pins[${i}] mint_status minted requires Base58 /c/{profile}?q=qr_… scan_path`
            );
          }
        } else if (mintStatus === "fixture" && scanPath) {
          if (
            !isFixtureDocketChildScanPath(scanPath) &&
            !isMintedDocketChildScanPath(scanPath)
          ) {
            errors.push(
              `pins[${i}] fixture scan_path must be child QR shape /c/…?q=…`
            );
          }
        }
      }
      if (row.geo != null) {
        if (typeof row.geo !== "object" || Array.isArray(row.geo)) {
          errors.push(`pins[${i}].geo must be an object when present`);
        } else {
          const g = /** @type {Record<string, unknown>} */ (row.geo);
          if (typeof g.latitude !== "number" || typeof g.longitude !== "number") {
            errors.push(`pins[${i}].geo requires numeric latitude/longitude`);
          }
          const precision = String(g.precision ?? "");
          if (!["district", "block", "entrance", "exact"].includes(precision)) {
            errors.push(
              `pins[${i}].geo.precision must be district|block|entrance|exact`
            );
          }
        }
      }
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, doc };
}

/**
 * Project registry rows into DiscoveryPin-shaped browse cards (docket branch only).
 * @param {Record<string, unknown>} doc
 */
export function projectDocketChapterDiscoveryPins(doc) {
  const pins = Array.isArray(doc.pins) ? doc.pins : [];
  return pins.map((rowRaw) => {
    const row = /** @type {Record<string, unknown>} */ (rowRaw);
    const id = String(row.id ?? "");
    const live =
      row.live_object && typeof row.live_object === "object"
        ? /** @type {Record<string, unknown>} */ (row.live_object)
        : {};
    const disc =
      live.discovery && typeof live.discovery === "object"
        ? /** @type {Record<string, unknown>} */ (live.discovery)
        : {};
    const region = String(row.region_id ?? disc.region_id ?? "unknown");
    const objectId = String(live.object_id ?? `obj_docket_casefile_${id}`);
    const scanPath = String(live.scan_path ?? "");
    /** @type {Record<string, unknown>} */
    const pin = {
      pin_id: `pin_docket_chapter_${id}`,
      region,
      display_label: String(row.display_label ?? id),
      object_ids: [objectId],
      primary_object_id: objectId,
      network_ids: ["public-docket-chapter"],
      facets: {
        object_type: "docket_chapter",
        category: "docket_chapter",
        role: "chapter_pin",
      },
      listing: {
        listed: true,
        title: String(row.display_label ?? id),
        summary:
          typeof row.summary === "string"
            ? row.summary
            : String(disc.listed_reason ?? ""),
        category: "docket_chapter",
      },
      scan_url: scanPath || null,
      href: String(row.href ?? "/docket/"),
      index_version: "docket-chapter-pin-v0",
      branch: "public-docket",
      pollutes_city_discovery: false,
    };
    if (row.geo && typeof row.geo === "object") {
      pin.geo = row.geo;
    }
    return pin;
  });
}

/**
 * HTML list for /docket/chapters/.
 * @param {Record<string, unknown>} doc
 */
export function renderDocketChapterPinsPageHtml(doc) {
  const projected = projectDocketChapterDiscoveryPins(doc);
  const rawPins = Array.isArray(doc.pins) ? doc.pins : [];
  const items = projected
    .map((pin, index) => {
      const href = escapeHtml(String(pin.href ?? "/docket/"));
      const label = escapeHtml(String(pin.display_label ?? ""));
      const summary = escapeHtml(
        String(
          /** @type {Record<string, unknown>} */ (pin.listing ?? {}).summary ?? ""
        )
      );
      const region = escapeHtml(String(pin.region ?? ""));
      const mintStatus = String(
        /** @type {Record<string, unknown>} */ (rawPins[index] ?? {}).mint_status ??
          "fixture"
      );
      const mintLabel = mintStatus === "minted" ? "Minted child QR" : "Fixture scan path";
      const scan = pin.scan_url
        ? `<p class="form-hint">${escapeHtml(mintLabel)}: <code>${escapeHtml(String(pin.scan_url))}</code></p>`
        : "";
      return `<li class="docket-wanted-card docket-plate" data-docket-chapter-pin="${escapeHtml(String(pin.pin_id))}" data-mint-status="${escapeHtml(mintStatus)}">
  <p class="docket-kicker">Chapter pin · ${region} · ${escapeHtml(mintStatus)}</p>
  <h2 class="docket-wanted-name"><a class="docket-plate-name-link" href="${href}">${label}</a></h2>
  <p class="docket-wanted-role">${summary}</p>
  ${scan}
  <a class="docket-plate-action" href="${href}">Open</a>
</li>`;
    })
    .join("\n");

  return `<section class="docket-chapter-pins" id="chapter-pins">
  <p class="docket-list-lead">
    Opt-in chapter pins for Public Docket commons — not Most Wanted cases, not city-game
    discovery default. Run <code>ws-docket:chapter-mint</code> to replace fixture child QR paths
    with real Worker-issued <code>/c/…?q=…</code> ids.
  </p>
  <ul class="docket-wanted-list">${items}</ul>
  <p class="form-hint">
    Starter-four roster stays <code>discovery_opt_in: false</code>.
    City discovery index is not polluted (<code>pollutes_city_discovery: false</code>).
  </p>
</section>`;
}

/**
 * Compact roster blurb.
 */
export function renderDocketChapterPinsTeaserHtml() {
  return `<p class="form-hint">
  <a href="${DOCKET_CHAPTER_PINS_PAGE_PATH}">Chapter discovery pins</a>
  — non-starter teach-in fixtures (C-v3 publish · branch only).
</p>`;
}

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
