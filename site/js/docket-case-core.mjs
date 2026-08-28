/**
 * Public Docket case data — load, validate, render hooks for WS-DOCKET-B.
 * Visual plate CSS is owned by WS-DOCKET-A (.docket-* classes).
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md
 */

import { validateDocketEditProposals, validateDocketEditProposalSignatures } from "./docket-edit-proposal-core.mjs";
import { validateDocketDiscoveryOptInFields } from "./docket-discovery-opt-in-core.mjs";
import {
  DOCKET_PHOTO_CHECKLIST_PATH,
  isDocketSitePhotoRef,
  renderDocketPhotoSlotHtml,
} from "./docket-photo-core.mjs";

export { DOCKET_PHOTO_CHECKLIST_PATH };

export const DOCKET_CASE_IDS = Object.freeze([
  "netanyahu",
  "putin",
  "altman",
  "musk",
]);

export const DOCKET_BADGE_KINDS = Object.freeze(["icc_warrant", "docket_counts"]);
export const DOCKET_COUNT_KINDS = Object.freeze(["icc_allegation", "docket_count"]);
export const DOCKET_STATUSES = Object.freeze(["open", "monitoring", "closed"]);
/** Counter-docket slot status — strength, not weakness. */
export const DOCKET_COUNTER_STATUSES = Object.freeze([
  "open_for_submissions",
  "has_reply",
  "closed",
]);
/** WS-DOCKET-C live-object bind status. */
export const DOCKET_LIVE_OBJECT_STATUSES = Object.freeze([
  "unbound",
  "bound",
  "paused",
]);
/** Legal civic actions only — charter allowlist. */
export const DOCKET_ACTION_KINDS = Object.freeze([
  "read_source",
  "share_sources",
  "petition",
  "boycott",
  "shareholder_vote",
  "foia",
  "peaceful_protest_info",
  "contact_rep",
  "donate",
  "teach_in",
]);
/** Region tags for geo-aware kits (label only in v1; no auto geo-filter yet). */
export const DOCKET_ACTION_REGIONS = Object.freeze([
  "global",
  "us",
  "eu",
  "uk",
  "other",
]);
export const DOCKET_ACTIONS_MIN = 3;
export const DOCKET_ACTIONS_MAX = 5;

/**
 * Allowed reasons a case may move to status `closed`.
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § Closed-case criteria
 */
export const DOCKET_CLOSED_KINDS = Object.freeze([
  "outcome_logged",
  "migrated_institution",
  "retracted",
  "integrity_hold",
  "superseded",
]);

/** Published exit criteria — single source for /docket/#closed-criteria. */
export const DOCKET_CLOSED_CRITERIA = Object.freeze([
  {
    kind: "outcome_logged",
    label: "Outcome logged",
    summary:
      "A citeable civic or institutional result is published with receipts (policy change, court process milestone, divestment target met, election result, audit, or equivalent). Closing celebrates the receipt — never harm to a person.",
  },
  {
    kind: "migrated_institution",
    label: "Migrated to institution",
    summary:
      "The named person left the relevant role. Pressure moves to the office, company, ministry, or successor case. The person plate may close; the method continues.",
  },
  {
    kind: "retracted",
    label: "Retracted / corrected",
    summary:
      "A primary count fails the evidence bar or is materially falsified. Publish a correction, then close or rewrite. Honesty is a win.",
  },
  {
    kind: "integrity_hold",
    label: "Integrity hold",
    summary:
      "Stewards pause or close because the case is being weaponized, captured, or creates unacceptable legal/safety risk to the project. This is not a victory lap.",
  },
  {
    kind: "superseded",
    label: "Superseded",
    summary:
      "Replaced by a better-scoped case (clearer institution, stronger sources, or merged roster entry). Link the successor in closed_reason.",
  },
]);

/** Never valid as a close justification (moderation + copy ban). */
export const DOCKET_CLOSED_NEVER = Object.freeze([
  "Death, injury, disappearance, or private harm to a person",
  "Vigilante “success,” threats carried out, or doxxing outcomes",
  "Vague vibes (“enough hate,” “ratio’d”) without a public receipt",
  "Deleting history to hide a correction — closed cases stay listed, muted",
]);

export const DOCKET_CASES_INDEX_PATH = "/data/docket-cases-index.json";
export const DOCKET_NETWORK_GOODS_PATH = "/data/docket-network-goods.json";
/** @deprecated Prefer DOCKET_PHOTO_CHECKLIST_PATH from docket-photo-core */
export const DOCKET_PHOTO_LICENSE_CHECKLIST_PATH = DOCKET_PHOTO_CHECKLIST_PATH;

/** Campaign-one network good (locked URL). */
export const DOCKET_RESEARCH_KIT_PATH = "/docket/goods/research-kit/";
export const DOCKET_QR_FIELD_KIT_PATH = "/docket/goods/qr-field-kit/";
export const DOCKET_ACCOUNTABILITY_DAY_PATH = "/docket/accountability-day/";
export const DOCKET_CHAPTER_PINS_PAGE_PATH = "/docket/chapters/";

/**
 * @param {string} kind
 */
export function docketClosedKindLabel(kind) {
  const row = DOCKET_CLOSED_CRITERIA.find((c) => c.kind === kind);
  return row ? row.label : "";
}

/**
 * HTML for /docket/#closed-criteria (and tests).
 */
export function renderDocketClosedCriteriaHtml() {
  const items = DOCKET_CLOSED_CRITERIA.map(
    (c) =>
      `<li data-docket-closed-kind="${escapeDocketHtml(c.kind)}"><strong>${escapeDocketHtml(c.label)}</strong> — ${escapeDocketHtml(c.summary)}</li>`
  ).join("\n");
  const never = DOCKET_CLOSED_NEVER.map(
    (line) => `<li>${escapeDocketHtml(line)}</li>`
  ).join("\n");
  return `<p class="docket-closed-criteria-lead form-hint">A case stays on the list when closed (muted). History over deletion. Status changes are steward-signed.</p>
<ul class="docket-closed-criteria-list docket-charter-compact">
${items}
</ul>
<p class="docket-closed-criteria-subhead"><strong>Never a valid close reason</strong></p>
<ul class="docket-closed-never-list docket-charter-compact">
${never}
</ul>
<p class="docket-closed-criteria-reopen form-hint"><strong>Reopen</strong> only with a new primary source, a material role change, or a successor-scope fix — plus a public note. Contact:
  <a href="mailto:info@humanity.llc?subject=Public%20Docket%20reopen">info@humanity.llc</a>.
</p>`;
}

/**
 * HTML for roster #network-good / case pages (campaign-one commons).
 */
export function renderDocketNetworkGoodHtml() {
  return `<div class="docket-network-good-card">
  <p class="docket-network-good-kicker">Network goods · campaign one</p>
  <p class="docket-network-good-title"><a href="${DOCKET_RESEARCH_KIT_PATH}">Public Docket research kit</a></p>
  <p class="docket-network-good-body form-hint">Label hygiene, primary sources, FOIA entry, corrections — build the commons while you campaign.</p>
  <p class="docket-network-good-title"><a href="${DOCKET_QR_FIELD_KIT_PATH}">QR field kit</a></p>
  <p class="docket-network-good-body form-hint">Print and place: sticker → case → one legal action. Public Docket naming · charter on materials.</p>
  <p class="docket-network-good-title"><a href="${DOCKET_CHAPTER_PINS_PAGE_PATH}">Chapter discovery pins</a></p>
  <p class="docket-network-good-body form-hint">Non-starter teach-in fixtures (C-v3) — branch only · not city discovery · starter-four stay off.</p>
  <p class="form-hint"><a href="${DOCKET_ACCOUNTABILITY_DAY_PATH}">Accountability Day outline</a></p>
</div>`;
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, doc: Record<string, unknown> } | { ok: false, errors: string[] }}
 */
export function validateDocketNetworkGoods(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["network goods doc must be an object"] };
  }
  const doc = /** @type {Record<string, unknown>} */ (raw);
  const goods = Array.isArray(doc.goods) ? doc.goods : null;
  if (!goods || goods.length < 1) {
    errors.push("goods must be a non-empty array");
  } else {
    for (let i = 0; i < goods.length; i++) {
      const row = goods[i];
      if (!row || typeof row !== "object") {
        errors.push(`goods[${i}] must be an object`);
        continue;
      }
      const g = /** @type {Record<string, unknown>} */ (row);
      requireNonEmptyString(g.id, `goods[${i}].id`, errors);
      requireNonEmptyString(g.label, `goods[${i}].label`, errors);
      requireNonEmptyString(g.href, `goods[${i}].href`, errors);
    }
    const hasKit = goods.some(
      (g) =>
        g &&
        typeof g === "object" &&
        String(/** @type {Record<string, unknown>} */ (g).href ?? "") ===
          DOCKET_RESEARCH_KIT_PATH
    );
    if (!hasKit) {
      errors.push(`goods must include campaign-one kit at ${DOCKET_RESEARCH_KIT_PATH}`);
    }
    const hasFieldKit = goods.some(
      (g) =>
        g &&
        typeof g === "object" &&
        String(/** @type {Record<string, unknown>} */ (g).href ?? "") ===
          DOCKET_QR_FIELD_KIT_PATH
    );
    if (!hasFieldKit) {
      errors.push(`goods must include QR field kit at ${DOCKET_QR_FIELD_KIT_PATH}`);
    }
  }
  const ritual = doc.ritual;
  if (!ritual || typeof ritual !== "object" || Array.isArray(ritual)) {
    errors.push("ritual is required");
  } else {
    const r = /** @type {Record<string, unknown>} */ (ritual);
    requireNonEmptyString(r.id, "ritual.id", errors);
    requireNonEmptyString(r.label, "ritual.label", errors);
    const href = requireNonEmptyString(r.href, "ritual.href", errors);
    if (href && href !== DOCKET_ACCOUNTABILITY_DAY_PATH) {
      errors.push(`ritual.href must be ${DOCKET_ACCOUNTABILITY_DAY_PATH}`);
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, doc };
}

/**
 * Phase 2 photo gate — all faces stay monogram until license_status is licensed.
 * @param {unknown} raw
 * @returns {{ ok: true, doc: Record<string, unknown> } | { ok: false, errors: string[] }}
 */
export function validateDocketPhotoLicenseChecklist(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["photo checklist must be an object"] };
  }
  const doc = /** @type {Record<string, unknown>} */ (raw);
  const cases = Array.isArray(doc.cases) ? doc.cases : null;
  if (!cases || cases.length < 1) {
    errors.push("cases must be a non-empty array");
  } else {
    const seen = new Set();
    for (let i = 0; i < cases.length; i++) {
      const rowRaw = cases[i];
      if (!rowRaw || typeof rowRaw !== "object") {
        errors.push(`cases[${i}] must be an object`);
        continue;
      }
      const row = /** @type {Record<string, unknown>} */ (rowRaw);
      const id = requireNonEmptyString(row.id, `cases[${i}].id`, errors);
      if (id) {
        const known = DOCKET_CASE_IDS.includes(id);
        const rehearsal = id.startsWith("rehearsal-");
        if (!known && !rehearsal) {
          errors.push(
            `cases[${i}].id must be a known Most Wanted slug or rehearsal-* subject`
          );
        }
        if (seen.has(id)) errors.push(`duplicate checklist id: ${id}`);
        seen.add(id);
      }
      const status = String(row.license_status ?? "").trim();
      if (!["not_licensed", "licensed", "rejected"].includes(status)) {
        errors.push(
          `cases[${i}].license_status must be not_licensed | licensed | rejected`
        );
      }
      if (status === "licensed") {
        const pref = typeof row.photo_ref === "string" ? row.photo_ref.trim() : "";
        if (!pref) {
          errors.push(`cases[${i}].photo_ref required when license_status is licensed`);
        }
      } else if (row.photo_ref != null) {
        errors.push(
          `cases[${i}].photo_ref must be null unless license_status is licensed`
        );
      }
    }
    for (const id of DOCKET_CASE_IDS) {
      if (!seen.has(id)) errors.push(`missing checklist row for ${id}`);
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, doc };
}

/**
 * @param {string} id
 */
export function docketCaseDataPath(id) {
  const slug = String(id ?? "")
    .trim()
    .toLowerCase();
  if (!slug) return null;
  return `/data/docket-case-${slug}.json`;
}

/**
 * @param {string} id
 */
export function docketCasePagePath(id) {
  const slug = String(id ?? "")
    .trim()
    .toLowerCase();
  if (!slug) return null;
  return `/docket/${slug}/`;
}

/**
 * @param {string} id
 */
export function docketCaseStewardPath(id) {
  const slug = String(id ?? "")
    .trim()
    .toLowerCase();
  if (!slug) return null;
  return `/docket/${slug}/steward/`;
}

/**
 * @param {unknown} kind
 */
export function defaultCountsHeading(kind) {
  if (kind === "icc_warrant") return "Alleged crimes against humanity";
  if (kind === "docket_counts") return "Counts against humanity (docket)";
  return "Counts";
}

/**
 * @param {number} rank
 */
export function formatDocketRank(rank) {
  const n = Number(rank);
  if (!Number.isFinite(n) || n < 1) return "00";
  return String(Math.floor(n)).padStart(2, "0");
}

/**
 * @param {string} displayName
 */
export function docketMonogram(displayName) {
  const parts = String(displayName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/**
 * @param {string} text
 */
export function escapeDocketHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * @param {unknown} value
 * @param {string} label
 * @param {string[]} errors
 */
function requireNonEmptyString(value, label, errors) {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) {
    errors.push(`${label} is required`);
    return "";
  }
  return s;
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, case: Record<string, unknown> } | { ok: false, errors: string[] }}
 */
export function validateDocketCase(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["case must be an object"] };
  }
  /** @type {Record<string, unknown>} */
  const c = /** @type {Record<string, unknown>} */ (raw);

  const id = requireNonEmptyString(c.id, "id", errors);
  if (id && !DOCKET_CASE_IDS.includes(id)) {
    errors.push(`id must be one of: ${DOCKET_CASE_IDS.join(", ")}`);
  }

  requireNonEmptyString(c.display_name, "display_name", errors);
  requireNonEmptyString(c.role, "role", errors);

  const rank = Number(c.rank);
  if (!Number.isFinite(rank) || rank < 1) errors.push("rank must be a positive number");

  const badge = c.badge;
  if (!badge || typeof badge !== "object" || Array.isArray(badge)) {
    errors.push("badge is required");
  } else {
    const b = /** @type {Record<string, unknown>} */ (badge);
    const kind = String(b.kind ?? "").trim();
    if (!DOCKET_BADGE_KINDS.includes(kind)) {
      errors.push(`badge.kind must be one of: ${DOCKET_BADGE_KINDS.join(", ")}`);
    }
    requireNonEmptyString(b.label, "badge.label", errors);
  }

  const status = String(c.status ?? "").trim();
  if (!DOCKET_STATUSES.includes(status)) {
    errors.push(`status must be one of: ${DOCKET_STATUSES.join(", ")}`);
  }
  if (status === "closed") {
    const reason = typeof c.closed_reason === "string" ? c.closed_reason.trim() : "";
    if (!reason) errors.push("closed_reason is required when status is closed");
    const closedKind = String(c.closed_kind ?? "").trim();
    if (!DOCKET_CLOSED_KINDS.includes(closedKind)) {
      errors.push(
        `closed_kind is required when status is closed (one of: ${DOCKET_CLOSED_KINDS.join(", ")})`
      );
    }
  } else if (c.closed_kind != null && String(c.closed_kind).trim() !== "") {
    errors.push("closed_kind must be null unless status is closed");
  }

  const counter = c.counter_docket;
  if (!counter || typeof counter !== "object" || Array.isArray(counter)) {
    errors.push("counter_docket is required");
  } else {
    const cd = /** @type {Record<string, unknown>} */ (counter);
    const cdStatus = String(cd.status ?? "").trim();
    if (!DOCKET_COUNTER_STATUSES.includes(cdStatus)) {
      errors.push(
        `counter_docket.status must be one of: ${DOCKET_COUNTER_STATUSES.join(", ")}`
      );
    }
    if (cdStatus === "has_reply") {
      const summary = typeof cd.summary === "string" ? cd.summary.trim() : "";
      if (!summary) {
        errors.push("counter_docket.summary is required when status is has_reply");
      }
    } else if (cd.summary != null && typeof cd.summary !== "string") {
      errors.push("counter_docket.summary must be a string when present");
    }
  }

  const sources = Array.isArray(c.sources) ? c.sources : null;
  if (!sources) errors.push("sources must be an array");
  const sourceUrls = [];
  if (sources) {
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      if (!s || typeof s !== "object") {
        errors.push(`sources[${i}] must be an object`);
        continue;
      }
      const row = /** @type {Record<string, unknown>} */ (s);
      requireNonEmptyString(row.label, `sources[${i}].label`, errors);
      const url = requireNonEmptyString(row.url, `sources[${i}].url`, errors);
      if (url) sourceUrls.push(url);
    }
  }

  const counts = Array.isArray(c.counts) ? c.counts : null;
  if (!counts || counts.length === 0) errors.push("counts must be a non-empty array");
  let hasIccAllegation = false;
  if (counts) {
    for (let i = 0; i < counts.length; i++) {
      const rowRaw = counts[i];
      if (!rowRaw || typeof rowRaw !== "object") {
        errors.push(`counts[${i}] must be an object`);
        continue;
      }
      const row = /** @type {Record<string, unknown>} */ (rowRaw);
      requireNonEmptyString(row.id, `counts[${i}].id`, errors);
      requireNonEmptyString(row.title, `counts[${i}].title`, errors);
      const kind = String(row.kind ?? "").trim();
      if (!DOCKET_COUNT_KINDS.includes(kind)) {
        errors.push(`counts[${i}].kind must be one of: ${DOCKET_COUNT_KINDS.join(", ")}`);
      }
      if (kind === "icc_allegation") hasIccAllegation = true;
    }
  }

  if (hasIccAllegation) {
    const hasHttpSource = sourceUrls.some(
      (u) => u.startsWith("https://") || u.startsWith("http://")
    );
    if (!hasHttpSource) {
      errors.push("icc_allegation counts require at least one http(s) sources[].url");
    }
  }

  const action = c.action;
  if (!action || typeof action !== "object" || Array.isArray(action)) {
    errors.push("action is required (featured above-the-fold CTA)");
  } else {
    const a = /** @type {Record<string, unknown>} */ (action);
    requireNonEmptyString(a.label, "action.label", errors);
    requireNonEmptyString(a.href, "action.href", errors);
  }

  const actions = Array.isArray(c.actions) ? c.actions : null;
  if (!actions) {
    errors.push("actions must be an array (action kit)");
  } else if (actions.length < DOCKET_ACTIONS_MIN || actions.length > DOCKET_ACTIONS_MAX) {
    errors.push(
      `actions must have ${DOCKET_ACTIONS_MIN}–${DOCKET_ACTIONS_MAX} items (got ${actions.length})`
    );
  } else {
    const seenActionIds = new Set();
    for (let i = 0; i < actions.length; i++) {
      const rowRaw = actions[i];
      if (!rowRaw || typeof rowRaw !== "object" || Array.isArray(rowRaw)) {
        errors.push(`actions[${i}] must be an object`);
        continue;
      }
      const row = /** @type {Record<string, unknown>} */ (rowRaw);
      const aid = requireNonEmptyString(row.id, `actions[${i}].id`, errors);
      if (aid) {
        if (seenActionIds.has(aid)) errors.push(`duplicate actions[].id: ${aid}`);
        seenActionIds.add(aid);
      }
      const kind = String(row.kind ?? "").trim();
      if (!DOCKET_ACTION_KINDS.includes(kind)) {
        errors.push(
          `actions[${i}].kind must be one of: ${DOCKET_ACTION_KINDS.join(", ")}`
        );
      }
      requireNonEmptyString(row.label, `actions[${i}].label`, errors);
      requireNonEmptyString(row.href, `actions[${i}].href`, errors);
      if (row.body != null && typeof row.body !== "string") {
        errors.push(`actions[${i}].body must be a string when present`);
      }
      const regions = row.regions;
      if (regions != null) {
        if (!Array.isArray(regions) || regions.length === 0) {
          errors.push(`actions[${i}].regions must be a non-empty array when present`);
        } else {
          for (let r = 0; r < regions.length; r++) {
            const reg = String(regions[r] ?? "").trim();
            if (!DOCKET_ACTION_REGIONS.includes(reg)) {
              errors.push(
                `actions[${i}].regions[${r}] must be one of: ${DOCKET_ACTION_REGIONS.join(", ")}`
              );
            }
          }
        }
      }
    }
  }

  if (c.photo_ref != null) {
    if (typeof c.photo_ref !== "string") {
      errors.push("photo_ref must be null or a string");
    } else if (!isDocketSitePhotoRef(c.photo_ref)) {
      errors.push(
        "photo_ref must be a site path under /assets/, /media/, or /data/ when set"
      );
    }
  }

  const stewards = Array.isArray(c.stewards) ? c.stewards : null;
  if (!stewards || stewards.length < 2) {
    errors.push(
      "stewards must include at least 2 distinct maintainers (dual-gate edit policy)"
    );
  } else {
    const seenStewardIds = new Set();
    for (let i = 0; i < stewards.length; i++) {
      const rowRaw = stewards[i];
      if (!rowRaw || typeof rowRaw !== "object" || Array.isArray(rowRaw)) {
        errors.push(`stewards[${i}] must be an object`);
        continue;
      }
      const row = /** @type {Record<string, unknown>} */ (rowRaw);
      const sid = requireNonEmptyString(row.id, `stewards[${i}].id`, errors);
      if (sid) {
        if (seenStewardIds.has(sid)) {
          errors.push(`duplicate stewards[].id: ${sid}`);
        }
        seenStewardIds.add(sid);
      }
      requireNonEmptyString(row.display_name, `stewards[${i}].display_name`, errors);
      requireNonEmptyString(row.role_label, `stewards[${i}].role_label`, errors);
      if (row.mailto != null && typeof row.mailto !== "string") {
        errors.push(`stewards[${i}].mailto must be a string when present`);
      }
      if (row.room_ref != null && typeof row.room_ref !== "string") {
        errors.push(`stewards[${i}].room_ref must be a string when present`);
      }
    }
  }

  validateDocketEditProposals(c.edit_proposals, c.stewards, errors);
  validateDocketEditProposalSignatures(c.edit_proposals, c.stewards, errors);

  const changelog = Array.isArray(c.changelog) ? c.changelog : null;
  if (!changelog || changelog.length < 1) {
    errors.push("changelog must be a non-empty array (public maintenance log)");
  } else {
    for (let i = 0; i < changelog.length; i++) {
      const rowRaw = changelog[i];
      if (!rowRaw || typeof rowRaw !== "object" || Array.isArray(rowRaw)) {
        errors.push(`changelog[${i}] must be an object`);
        continue;
      }
      const row = /** @type {Record<string, unknown>} */ (rowRaw);
      requireNonEmptyString(row.id, `changelog[${i}].id`, errors);
      requireNonEmptyString(row.dated, `changelog[${i}].dated`, errors);
      requireNonEmptyString(row.summary, `changelog[${i}].summary`, errors);
    }
  }

  const live = c.live_object;
  if (!live || typeof live !== "object" || Array.isArray(live)) {
    errors.push("live_object is required (WS-DOCKET-C bind contract)");
  } else {
    const lo = /** @type {Record<string, unknown>} */ (live);
    const loStatus = String(lo.status ?? "").trim();
    if (!DOCKET_LIVE_OBJECT_STATUSES.includes(loStatus)) {
      errors.push(
        `live_object.status must be one of: ${DOCKET_LIVE_OBJECT_STATUSES.join(", ")}`
      );
    }
    if (typeof lo.discovery_opt_in !== "boolean") {
      errors.push("live_object.discovery_opt_in must be a boolean");
    } else {
      validateDocketDiscoveryOptInFields(lo, c.stewards, errors, {
        requireStewardMembership: true,
      });
    }
    if (loStatus === "bound") {
      requireNonEmptyString(lo.object_id, "live_object.object_id", errors);
      const scan = requireNonEmptyString(lo.scan_path, "live_object.scan_path", errors);
      if (scan && !scan.startsWith("/")) {
        errors.push("live_object.scan_path must be a site path starting with /");
      }
    } else {
      if (lo.object_id != null) {
        errors.push("live_object.object_id must be null unless status is bound");
      }
      if (lo.scan_path != null) {
        errors.push("live_object.scan_path must be null unless status is bound");
      }
    }
    if (lo.bind_notes != null && typeof lo.bind_notes !== "string") {
      errors.push("live_object.bind_notes must be a string when present");
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, case: c };
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, index: Record<string, unknown> } | { ok: false, errors: string[] }}
 */
export function validateDocketCasesIndex(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["index must be an object"] };
  }
  const doc = /** @type {Record<string, unknown>} */ (raw);
  const cases = Array.isArray(doc.cases) ? doc.cases : null;
  if (!cases || cases.length === 0) {
    return { ok: false, errors: ["cases must be a non-empty array"] };
  }

  const seen = new Set();
  for (let i = 0; i < cases.length; i++) {
    const rowRaw = cases[i];
    if (!rowRaw || typeof rowRaw !== "object") {
      errors.push(`cases[${i}] must be an object`);
      continue;
    }
    const row = /** @type {Record<string, unknown>} */ (rowRaw);
    const id = requireNonEmptyString(row.id, `cases[${i}].id`, errors);
    if (id) {
      if (!DOCKET_CASE_IDS.includes(id)) {
        errors.push(`cases[${i}].id must be a known slug`);
      }
      if (seen.has(id)) errors.push(`duplicate case id: ${id}`);
      seen.add(id);
    }
    requireNonEmptyString(row.display_name, `cases[${i}].display_name`, errors);
    requireNonEmptyString(row.role, `cases[${i}].role`, errors);
    requireNonEmptyString(row.count_preview, `cases[${i}].count_preview`, errors);
    const rank = Number(row.rank);
    if (!Number.isFinite(rank) || rank < 1) {
      errors.push(`cases[${i}].rank must be a positive number`);
    }
    const status = String(row.status ?? "").trim();
    if (!DOCKET_STATUSES.includes(status)) {
      errors.push(`cases[${i}].status invalid`);
    }
    const badge = row.badge;
    if (!badge || typeof badge !== "object") {
      errors.push(`cases[${i}].badge is required`);
    } else {
      const kind = String(/** @type {Record<string, unknown>} */ (badge).kind ?? "").trim();
      if (!DOCKET_BADGE_KINDS.includes(kind)) {
        errors.push(`cases[${i}].badge.kind invalid`);
      }
    }
  }

  for (const id of DOCKET_CASE_IDS) {
    if (!seen.has(id)) errors.push(`missing starter case in index: ${id}`);
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, index: doc };
}

/**
 * @param {Record<string, unknown>} indexRow
 * @param {Record<string, unknown> | null} [fullCase]
 * @param {{
 *   stagger?: number;
 *   photoLicenseStatus?: string | null;
 *   checklistPhotoRef?: string | null;
 * }} [opts]
 */
export function renderDocketRosterCardHtml(indexRow, fullCase = null, opts = {}) {
  const id = String(indexRow.id ?? "");
  const href = docketCasePagePath(id) ?? "#";
  const rank = formatDocketRank(Number(indexRow.rank));
  const badge = /** @type {Record<string, unknown>} */ (indexRow.badge ?? {});
  const badgeKind = String(badge.kind ?? "");
  const badgeClass =
    badgeKind === "docket_counts"
      ? "docket-wanted-badge docket-wanted-badge-docket"
      : "docket-wanted-badge";
  const name = escapeDocketHtml(String(indexRow.display_name ?? ""));
  const role = escapeDocketHtml(String(indexRow.role ?? ""));
  const status = String(indexRow.status ?? "open");
  const statusEsc = escapeDocketHtml(status);
  const monoRaw = docketMonogram(String(indexRow.display_name ?? ""));
  const stagger = Number.isFinite(opts.stagger) ? Number(opts.stagger) : Math.max(0, Number(indexRow.rank) - 1);
  const countsHeading = escapeDocketHtml(
    fullCase && typeof fullCase.counts_heading === "string" && fullCase.counts_heading.trim()
      ? fullCase.counts_heading
      : defaultCountsHeading(badgeKind)
  );

  let countsHtml = "";
  if (fullCase && Array.isArray(fullCase.counts)) {
    const previewCounts = fullCase.counts.slice(0, 2);
    countsHtml = previewCounts
      .map((row) => {
        const c = /** @type {Record<string, unknown>} */ (row);
        const title = escapeDocketHtml(String(c.title ?? ""));
        const body = String(c.body ?? "").trim();
        const bodyHtml = body ? ` — ${escapeDocketHtml(body)}` : "";
        return `<li><strong>${title}</strong>${bodyHtml}</li>`;
      })
      .join("");
  } else {
    const preview = escapeDocketHtml(String(indexRow.count_preview ?? ""));
    countsHtml = `<li><strong>${preview}</strong></li>`;
  }

  const photoRef =
    fullCase && typeof fullCase.photo_ref === "string" ? fullCase.photo_ref : null;
  const photoSlot = renderDocketPhotoSlotHtml({
    monogram: monoRaw,
    photoRef,
    licenseStatus: opts.photoLicenseStatus ?? "not_licensed",
    checklistPhotoRef: opts.checklistPhotoRef ?? null,
    size: "sm",
    showCaption: false,
  });

  return `<li class="docket-wanted-card docket-plate" id="case-${escapeDocketHtml(id)}" data-docket-case="${escapeDocketHtml(id)}" data-docket-status="${statusEsc}" style="--docket-stagger: ${stagger}">
  <div class="docket-plate-row">
    ${photoSlot}
    <div class="docket-plate-body docket-wanted-identity-text">
      <div class="docket-wanted-card-meta">
        <span class="docket-wanted-rank" aria-hidden="true">${rank}</span>
      </div>
      <h2 class="docket-wanted-name"><a class="docket-plate-name-link" href="${escapeDocketHtml(href)}">${name}</a></h2>
      <p class="docket-wanted-role">${role}</p>
      <div class="docket-plate-tags">
        <span class="${badgeClass}">${escapeDocketHtml(String(badge.label ?? ""))}</span>
        <span class="docket-status docket-wanted-status" data-docket-status="${statusEsc}">${statusEsc}</span>
      </div>
    </div>
  </div>
  <h3 class="docket-wanted-counts-label">${countsHeading}</h3>
  <ul class="docket-wanted-counts docket-plate-counts-preview">${countsHtml}</ul>
  <a class="docket-plate-action docket-wanted-open docket-wanted-action" href="${escapeDocketHtml(href)}">Open case</a>
</li>`;
}

/**
 * @param {Record<string, unknown>} fullCase
 * @param {{
 *   photoLicenseStatus?: string | null;
 *   checklistPhotoRef?: string | null;
 * }} [opts]
 */
export function renderDocketCasePageBodyHtml(fullCase, opts = {}) {
  const id = String(fullCase.id ?? "");
  const rank = formatDocketRank(Number(fullCase.rank));
  const badge = /** @type {Record<string, unknown>} */ (fullCase.badge ?? {});
  const badgeKind = String(badge.kind ?? "");
  const badgeClass =
    badgeKind === "docket_counts"
      ? "docket-wanted-badge docket-wanted-badge-docket"
      : "docket-wanted-badge";
  const name = escapeDocketHtml(String(fullCase.display_name ?? ""));
  const role = escapeDocketHtml(String(fullCase.role ?? ""));
  const status = String(fullCase.status ?? "open");
  const statusEsc = escapeDocketHtml(status);
  const monoRaw = docketMonogram(String(fullCase.display_name ?? ""));
  const photoSlot = renderDocketPhotoSlotHtml({
    monogram: monoRaw,
    photoRef: typeof fullCase.photo_ref === "string" ? fullCase.photo_ref : null,
    licenseStatus: opts.photoLicenseStatus ?? "not_licensed",
    checklistPhotoRef: opts.checklistPhotoRef ?? null,
    size: "lg",
    showCaption: true,
  });
  const countsHeading = escapeDocketHtml(
    typeof fullCase.counts_heading === "string" && fullCase.counts_heading.trim()
      ? fullCase.counts_heading
      : defaultCountsHeading(badgeKind)
  );
  const action = /** @type {Record<string, unknown>} */ (fullCase.action ?? {});
  const counts = Array.isArray(fullCase.counts) ? fullCase.counts : [];
  const sources = Array.isArray(fullCase.sources) ? fullCase.sources : [];
  const first = counts[0] ? /** @type {Record<string, unknown>} */ (counts[0]) : null;
  const firstSource = sources[0]
    ? /** @type {Record<string, unknown>} */ (sources[0])
    : null;

  const strongest =
    first != null
      ? `<div class="docket-case-strongest docket-wanted-strongest" id="${escapeDocketHtml(String(first.id ?? "count-1"))}">
  <p class="docket-wanted-counts-label">${countsHeading}</p>
  <div class="docket-case-count-lead">
    <h2 class="docket-case-count-title">${escapeDocketHtml(String(first.title ?? ""))}</h2>
    ${
      String(first.body ?? "").trim()
        ? `<p class="docket-case-count-body">${escapeDocketHtml(String(first.body ?? ""))}</p>`
        : ""
    }
  </div>
</div>`
      : "";

  const primarySource =
    firstSource != null
      ? `<p class="docket-wanted-source docket-case-primary-source">Primary source:
  <a href="${escapeDocketHtml(String(firstSource.url ?? ""))}" rel="noopener noreferrer">${escapeDocketHtml(String(firstSource.label ?? ""))}</a>${
        firstSource.dated
          ? ` <span class="docket-case-source-dated">(${escapeDocketHtml(String(firstSource.dated))})</span>`
          : ""
      }
</p>`
      : "";

  const actionHtml =
    action.label && action.href
      ? `<a class="docket-plate-action docket-wanted-action" href="${escapeDocketHtml(String(action.href))}">${escapeDocketHtml(String(action.label))}</a>`
      : "";

  const closedKind = String(fullCase.closed_kind ?? "").trim();
  const closedKindLabel = docketClosedKindLabel(closedKind);
  const closed =
    status === "closed" && fullCase.closed_reason
      ? `<p class="docket-status-closed-reason docket-wanted-closed-reason">${
          closedKindLabel
            ? `<span class="docket-closed-kind">${escapeDocketHtml(closedKindLabel)}</span> — `
            : ""
        }${escapeDocketHtml(String(fullCase.closed_reason))}</p>`
      : "";

  const allCounts = counts
    .map((row) => {
      const c = /** @type {Record<string, unknown>} */ (row);
      const cid = escapeDocketHtml(String(c.id ?? ""));
      const title = escapeDocketHtml(String(c.title ?? ""));
      const body = String(c.body ?? "").trim();
      return `<li id="${cid}"><strong>${title}</strong>${body ? ` — ${escapeDocketHtml(body)}` : ""}</li>`;
    })
    .join("");

  const allSources = sources
    .map((row) => {
      const s = /** @type {Record<string, unknown>} */ (row);
      const note = String(s.note ?? "").trim();
      return `<li>
  <a href="${escapeDocketHtml(String(s.url ?? ""))}" rel="noopener noreferrer">${escapeDocketHtml(String(s.label ?? ""))}</a>${
        s.dated
          ? ` <span class="docket-case-source-dated">· ${escapeDocketHtml(String(s.dated))}</span>`
          : ""
      }${note ? `<br /><span class="docket-wanted-source-note">${escapeDocketHtml(note)}</span>` : ""}
</li>`;
    })
    .join("");

  const note =
    typeof fullCase.note === "string" && fullCase.note.trim()
      ? `<p class="docket-wanted-note">${escapeDocketHtml(fullCase.note)}</p>`
      : "";

  const actions = Array.isArray(fullCase.actions) ? fullCase.actions : [];
  const actionKitItems = actions
    .map((row) => {
      const a = /** @type {Record<string, unknown>} */ (row);
      const aid = escapeDocketHtml(String(a.id ?? ""));
      const kind = escapeDocketHtml(String(a.kind ?? ""));
      const label = escapeDocketHtml(String(a.label ?? ""));
      const href = escapeDocketHtml(String(a.href ?? ""));
      const body = String(a.body ?? "").trim();
      const regions = Array.isArray(a.regions)
        ? a.regions
            .map((r) => String(r ?? "").trim())
            .filter(Boolean)
            .map(
              (r) =>
                `<span class="docket-action-region">${escapeDocketHtml(r)}</span>`
            )
            .join("")
        : "";
      return `<li class="docket-action-item" id="${aid}" data-docket-action-kind="${kind}">
  <a class="docket-action-link" href="${href}" rel="noopener noreferrer">${label}</a>
  ${
    regions
      ? `<span class="docket-action-regions" aria-label="Regions">${regions}</span>`
      : ""
  }
  ${body ? `<p class="docket-action-body">${escapeDocketHtml(body)}</p>` : ""}
</li>`;
    })
    .join("");

  const actionKit =
    actionKitItems.length > 0
      ? `<h2 class="docket-case-section-title group-label" id="action-kit">Action kit</h2>
<p class="docket-action-kit-lead form-hint">Legal civic pressure only · pick what fits your jurisdiction · never violence, threats, or doxxing.</p>
<ol class="docket-action-kit">${actionKitItems}</ol>`
      : "";

  const correctionsHref = `mailto:info@humanity.llc?subject=${encodeURIComponent(`Docket correction ${String(fullCase.display_name ?? id)}`)}`;
  const counterHref = `mailto:info@humanity.llc?subject=${encodeURIComponent(`Counter-docket ${String(fullCase.display_name ?? id)}`)}`;
  const counterRaw =
    fullCase.counter_docket && typeof fullCase.counter_docket === "object"
      ? /** @type {Record<string, unknown>} */ (fullCase.counter_docket)
      : { status: "open_for_submissions" };
  const counterStatus = String(counterRaw.status ?? "open_for_submissions").trim();
  const counterSummary = String(counterRaw.summary ?? "").trim();
  const counterLabel =
    counterStatus === "has_reply"
      ? "Reply on record"
      : counterStatus === "closed"
        ? "Counter-docket closed"
        : "Open for submissions";
  const counterBody =
    counterSummary ||
    "Targets, counsel, or researchers may submit a sourced rebuttal or correction. Strength, not weakness — no threats, doxxing, or violence.";

  const stewards = Array.isArray(fullCase.stewards) ? fullCase.stewards : [];
  const stewardItems = stewards
    .map((row) => {
      const s = /** @type {Record<string, unknown>} */ (row);
      const sid = escapeDocketHtml(String(s.id ?? ""));
      const sName = escapeDocketHtml(String(s.display_name ?? ""));
      const sRole = escapeDocketHtml(String(s.role_label ?? ""));
      const mailtoRaw = String(s.mailto ?? "").trim();
      const mailtoHref = mailtoRaw
        ? mailtoRaw.startsWith("mailto:")
          ? mailtoRaw
          : `mailto:${mailtoRaw}`
        : "";
      const mailtoLabel = mailtoRaw.replace(/^mailto:/i, "");
      const roomRef = String(s.room_ref ?? "").trim();
      const contact = mailtoHref
        ? `<a href="${escapeDocketHtml(mailtoHref)}">${escapeDocketHtml(mailtoLabel)}</a>`
        : "";
      const roomNote = roomRef
        ? `<span class="docket-steward-room"><a href="${escapeDocketHtml(roomRef)}">Steward shell</a></span>`
        : `<span class="docket-steward-room form-hint">Steward shell not linked</span>`;
      return `<li class="docket-steward-item" id="steward-${sid}" data-docket-steward="${sid}">
  <strong class="docket-steward-name">${sName}</strong>
  <span class="docket-steward-role">${sRole}</span>
  ${contact ? `<span class="docket-steward-contact">${contact}</span>` : ""}
  ${roomNote}
</li>`;
    })
    .join("");
  const stewardsHtml =
    stewardItems.length > 0
      ? `<h2 class="docket-case-section-title group-label" id="stewards">Stewards</h2>
<p class="docket-stewards-lead form-hint">Visible maintainers — not anonymous mob energy. Dual-gate edits: propose on the steward shell; two steward ids must approve.</p>
<ul class="docket-stewards-list">${stewardItems}</ul>`
      : "";

  const changelog = Array.isArray(fullCase.changelog) ? fullCase.changelog : [];
  const changelogItems = changelog
    .map((row) => {
      const e = /** @type {Record<string, unknown>} */ (row);
      const eid = escapeDocketHtml(String(e.id ?? ""));
      const dated = escapeDocketHtml(String(e.dated ?? ""));
      const summary = escapeDocketHtml(String(e.summary ?? ""));
      return `<li class="docket-changelog-item" id="${eid}">
  <time class="docket-changelog-dated" datetime="${dated}">${dated}</time>
  <span class="docket-changelog-summary">${summary}</span>
</li>`;
    })
    .join("");
  const changelogHtml =
    changelogItems.length > 0
      ? `<h2 class="docket-case-section-title group-label" id="changelog">Changelog</h2>
<ol class="docket-changelog-list">${changelogItems}</ol>`
      : "";

  const liveRaw =
    fullCase.live_object && typeof fullCase.live_object === "object"
      ? /** @type {Record<string, unknown>} */ (fullCase.live_object)
      : { status: "unbound", discovery_opt_in: false };
  const liveStatus = String(liveRaw.status ?? "unbound").trim();
  const liveNotes = String(liveRaw.bind_notes ?? "").trim();
  const liveScan = String(liveRaw.scan_path ?? "").trim();
  const liveObjectId = String(liveRaw.object_id ?? "").trim();
  const stewardPath = docketCaseStewardPath(id) || "/docket/";
  const liveStatusLabel =
    liveStatus === "bound"
      ? "Bound"
      : liveStatus === "paused"
        ? "Paused"
        : "Unbound";
  const liveBody =
    liveNotes ||
    (liveStatus === "bound"
      ? "Casefile live object is attached. Stewards edit through the bound room."
      : "Casefile not bound yet — stewards can attach a live object from the steward shell.");
  const liveScanHtml =
    liveStatus === "bound" && liveScan
      ? `<p class="docket-live-object-scan form-hint">Scan path: <a href="${escapeDocketHtml(liveScan)}"><code>${escapeDocketHtml(liveScan)}</code></a>${
          liveObjectId
            ? ` · object <code>${escapeDocketHtml(liveObjectId)}</code>`
            : ""
        }${
          liveScan.startsWith("/c/") && liveScan.includes("?q=")
            ? ` · <span class="docket-status">child QR</span>`
            : ` · <span class="docket-status">interim</span>`
        }</p>`
      : "";
  const liveHtml = `<h2 class="docket-case-section-title group-label" id="live-object">Live object bind</h2>
<div class="docket-live-object-slot" data-docket-live-status="${escapeDocketHtml(liveStatus)}">
  <p class="docket-live-object-status"><span class="docket-status">${escapeDocketHtml(liveStatusLabel)}</span></p>
  <p class="docket-live-object-body">${escapeDocketHtml(liveBody)}</p>
  ${liveScanHtml}
  <a class="docket-plate-action" href="${escapeDocketHtml(stewardPath)}">Open steward shell</a>
</div>`;

  const trustHtml = `<h2 class="docket-case-section-title group-label" id="exit-criteria">Off the docket when</h2>
<p class="docket-exit-criteria form-hint">
  Cases close only under published criteria (outcome logged, migrated to institution, retracted, integrity hold, or superseded) — never harm to a person.
  <a href="/docket/#closed-criteria">Full exit criteria</a>
</p>
<h2 class="docket-case-section-title group-label" id="counter-docket">Counter-docket</h2>
<div class="docket-counter-slot" data-docket-counter-status="${escapeDocketHtml(counterStatus)}">
  <p class="docket-counter-status"><span class="docket-status">${escapeDocketHtml(counterLabel)}</span></p>
  <p class="docket-counter-body">${escapeDocketHtml(counterBody)}</p>
  <a class="docket-plate-action" href="${escapeDocketHtml(counterHref)}">Submit a sourced reply</a>
</div>
<h2 class="docket-case-section-title group-label" id="corrections">Corrections</h2>
<p class="docket-corrections form-hint">
  Factual errors, missing primary sources, or counsel submissions:
  <a href="${escapeDocketHtml(correctionsHref)}">info@humanity.llc</a>
</p>
${stewardsHtml}
${changelogHtml}
${liveHtml}
<h2 class="docket-case-section-title group-label" id="network-good">Build while you pressure</h2>
${renderDocketNetworkGoodHtml()}`;

  return `<article class="docket-wanted-card docket-plate docket-plate-case docket-case-plate docket-case-hero" data-docket-case="${escapeDocketHtml(id)}" data-docket-status="${statusEsc}">
  <p class="docket-kicker docket-case-eyebrow">Public Docket · Case ${rank}</p>
  <div class="docket-plate-row docket-case-hero-row">
    ${photoSlot}
    <div class="docket-plate-body">
      <div class="docket-wanted-card-meta">
        <span class="docket-wanted-rank" aria-hidden="true">${rank}</span>
      </div>
      <h1 class="docket-wanted-name docket-case-name">${name}</h1>
      <p class="docket-wanted-role">${role}</p>
      <div class="docket-plate-tags">
        <span class="${badgeClass}">${escapeDocketHtml(String(badge.label ?? ""))}</span>
        <span class="docket-status docket-wanted-status" data-docket-status="${statusEsc}">${statusEsc}</span>
      </div>
      ${closed}
    </div>
  </div>
  ${strongest}
  ${primarySource}
  ${actionHtml}
</article>
<section class="docket-case-below" aria-label="Full counts and sources">
  <h2 class="docket-case-section-title group-label">All counts</h2>
  <ul class="docket-wanted-counts">${allCounts}</ul>
  <h2 class="docket-case-section-title group-label">Sources</h2>
  <ul class="docket-case-sources docket-wanted-sources-list">${allSources}</ul>
  ${actionKit}
  ${trustHtml}
  ${note}
  <p class="docket-case-never form-hint">Nonviolent civic pressure only. Not a hit list. Not law enforcement.
    <a href="/docket/#charter">Charter</a>
    ·
    <a href="/docket/#closed-criteria">When a case closes</a>
    ·
    <a href="/docket/#tos">ToS</a>
  </p>
  <p class="form-hint docket-case-back">
    <a href="/docket/">← Most Wanted list</a>
    ·
    <a href="${escapeDocketHtml(correctionsHref)}">Contact / corrections</a>
  </p>
</section>`;
}

/**
 * @param {string} displayName
 * @param {string} firstCountTitle
 */
export function docketCaseOgDescription(displayName, firstCountTitle) {
  const count = String(firstCountTitle ?? "").trim() || "Public accountability case";
  return `${count}. Nonviolent · sources linked · not law enforcement. (${displayName})`;
}

/**
 * Steward shell body for /docket/{id}/steward/ (WS-DOCKET-C v1).
 * @param {Record<string, unknown>} fullCase
 */
export function renderDocketStewardShellHtml(fullCase) {
  const id = String(fullCase.id ?? "");
  const name = escapeDocketHtml(String(fullCase.display_name ?? ""));
  const casePath = escapeDocketHtml(docketCasePagePath(id) || "/docket/");
  const liveRaw =
    fullCase.live_object && typeof fullCase.live_object === "object"
      ? /** @type {Record<string, unknown>} */ (fullCase.live_object)
      : { status: "unbound" };
  const liveStatus = escapeDocketHtml(String(liveRaw.status ?? "unbound"));
  const liveNotes = escapeDocketHtml(
    String(
      liveRaw.bind_notes ??
        "Casefile bind — interim case URL or child-object QR (C-v2)."
    )
  );
  const liveScan = escapeDocketHtml(String(liveRaw.scan_path ?? "").trim());
  const liveScanHtml = liveScan
    ? `<p class="docket-live-object-scan form-hint">Scan path: <a href="${liveScan}"><code>${liveScan}</code></a></p>`
    : "";
  const stewards = Array.isArray(fullCase.stewards) ? fullCase.stewards : [];
  const stewardList = stewards
    .map((row) => {
      const s = /** @type {Record<string, unknown>} */ (row);
      return `<li><strong>${escapeDocketHtml(String(s.display_name ?? ""))}</strong> — ${escapeDocketHtml(String(s.role_label ?? ""))}</li>`;
    })
    .join("");
  const changelog = Array.isArray(fullCase.changelog) ? fullCase.changelog : [];
  const logList = changelog
    .slice(0, 5)
    .map((row) => {
      const e = /** @type {Record<string, unknown>} */ (row);
      return `<li><time datetime="${escapeDocketHtml(String(e.dated ?? ""))}">${escapeDocketHtml(String(e.dated ?? ""))}</time> — ${escapeDocketHtml(String(e.summary ?? ""))}</li>`;
    })
    .join("");

  return `<article class="docket-plate docket-goods-plate docket-steward-shell" data-docket-case="${escapeDocketHtml(id)}" data-docket-live-status="${liveStatus}">
  <p class="docket-kicker">Public Docket · steward shell</p>
  <h1 class="docket-goods-title">${name}</h1>
  <p class="docket-list-lead">
    Maintenance surface for this case. Not a hit list. Not law enforcement.
    Dual-gate edits require two distinct steward approvals before apply (fixture v0 — no Worker mint).
  </p>

  <h2 class="docket-case-section-title" id="live-object">Live object bind</h2>
  <div class="docket-live-object-slot" data-docket-live-status="${liveStatus}">
    <p class="docket-live-object-status"><span class="docket-status">${liveStatus}</span></p>
    <p class="docket-live-object-body">${liveNotes}</p>
    ${liveScanHtml}
  </div>

  <h2 class="docket-case-section-title" id="qr-upgrade">QR upgrade (optional)</h2>
  <div id="docket-qr-upgrade-root" class="docket-qr-upgrade-root" data-docket-case-id="${escapeDocketHtml(id)}"></div>

  <h2 class="docket-case-section-title" id="discovery-opt-in">Discovery opt-in (C-v3)</h2>
  <p class="form-hint">
    Starter-four stay off. Published chapter fixtures live on
    <a href="${DOCKET_CHAPTER_PINS_PAGE_PATH}">/docket/chapters/</a>
    (branch only · not city discovery).
  </p>
  <div id="docket-discovery-opt-in-root" class="docket-discovery-opt-in-root" data-docket-case-id="${escapeDocketHtml(id)}"></div>

  <h2 class="docket-case-section-title" id="photos">Photos (Phase 2)</h2>
  <div id="docket-photos-root" class="docket-photos-root" data-docket-case-id="${escapeDocketHtml(id)}"></div>

  <h2 class="docket-case-section-title" id="stewards">Stewards</h2>
  <ul class="docket-wanted-counts">${stewardList}</ul>

  <h2 class="docket-case-section-title" id="dual-gate-edits">Dual-gate edit proposals</h2>
  <div id="docket-edit-proposals-root" class="docket-edit-proposals" data-docket-case-id="${escapeDocketHtml(id)}"></div>

  <h2 class="docket-case-section-title" id="changelog">Recent changelog</h2>
  <ul class="docket-wanted-counts">${logList}</ul>

  <h2 class="docket-case-section-title">Maintain</h2>
  <p class="form-hint">
    <a href="${casePath}">Open public case</a>
    ·
    <a href="${casePath}#corrections">Corrections</a>
    ·
    <a href="${casePath}#counter-docket">Counter-docket</a>
    ·
    <a href="/docket/#charter">Charter</a>
    ·
    <a href="/docket/#tos">ToS</a>
  </p>
  <a class="docket-plate-action" href="mailto:info@humanity.llc?subject=${encodeURIComponent(`Docket steward ${String(fullCase.display_name ?? id)}`)}">Contact stewards</a>
</article>`;
}
