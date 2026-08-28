/**
 * WS-DOCKET-DG-store-v0 — Worker persistence for signed dual-gate proposals.
 * GET/PUT JSON; never rewrites published case JSON.
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § Dual-gate steward edits
 */

export const DOCKET_EDIT_PROPOSAL_STORE_VERSION = 1;
export const DOCKET_EDIT_PROPOSAL_STORE_KIND = "hc.docket.edit_proposals_store.v0";
export const DOCKET_DG_STORE_KIT_REL = "site/dev/ws-docket-dg-store-v0-field-walk.html";

/** Max proposals per case in Worker store. */
export const DOCKET_EDIT_PROPOSAL_STORE_MAX = 40;

/**
 * @param {string} caseId
 */
export function docketEditProposalsStorePath(caseId) {
  const id = String(caseId ?? "").trim();
  if (!id) throw new Error("caseId required");
  return `/.well-known/hc/v1/docket/${encodeURIComponent(id)}/edit-proposals`;
}

/**
 * @param {string} apiOrigin
 * @param {string} caseId
 */
export function docketEditProposalsStoreUrl(apiOrigin, caseId) {
  const origin = String(apiOrigin ?? "").replace(/\/$/, "");
  if (!origin) throw new Error("apiOrigin required");
  return new URL(docketEditProposalsStorePath(caseId), `${origin}/`).href;
}

/**
 * Loose case id guard (docket slug).
 * @param {string} caseId
 */
export function isValidDocketStoreCaseId(caseId) {
  const id = String(caseId ?? "").trim();
  return /^[a-z0-9][a-z0-9_-]{1,63}$/i.test(id);
}

/**
 * @param {{
 *   caseId: string;
 *   proposals: unknown[];
 *   updatedAt?: string;
 * }} input
 */
export function buildDocketEditProposalStoreDocument(input) {
  const caseId = String(input.caseId ?? "").trim();
  if (!isValidDocketStoreCaseId(caseId)) {
    throw new Error("Invalid case_id for docket proposal store");
  }
  const proposals = Array.isArray(input.proposals) ? input.proposals : [];
  if (proposals.length > DOCKET_EDIT_PROPOSAL_STORE_MAX) {
    throw new Error(
      `At most ${DOCKET_EDIT_PROPOSAL_STORE_MAX} proposals per case in Worker store`
    );
  }
  return {
    version: DOCKET_EDIT_PROPOSAL_STORE_VERSION,
    kind: DOCKET_EDIT_PROPOSAL_STORE_KIND,
    case_id: caseId,
    proposals,
    updated_at: String(input.updatedAt ?? new Date().toISOString()),
    writes_published_json: false,
    worker_store: true,
  };
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true; doc: Record<string, unknown> } | { ok: false; errors: string[] }}
 */
export function validateDocketEditProposalStoreDocument(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["store document must be an object"] };
  }
  const doc = /** @type {Record<string, unknown>} */ (raw);
  if (doc.kind !== DOCKET_EDIT_PROPOSAL_STORE_KIND) {
    errors.push(`kind must be ${DOCKET_EDIT_PROPOSAL_STORE_KIND}`);
  }
  if (doc.version !== DOCKET_EDIT_PROPOSAL_STORE_VERSION) {
    errors.push(`version must be ${DOCKET_EDIT_PROPOSAL_STORE_VERSION}`);
  }
  if (doc.writes_published_json !== false) {
    errors.push("writes_published_json must be false");
  }
  if (doc.worker_store !== true) {
    errors.push("worker_store must be true (DG-store-v0)");
  }
  if (typeof doc.case_id !== "string" || !isValidDocketStoreCaseId(doc.case_id)) {
    errors.push("case_id required (docket slug)");
  }
  if (!Array.isArray(doc.proposals)) {
    errors.push("proposals must be an array");
  } else if (doc.proposals.length > DOCKET_EDIT_PROPOSAL_STORE_MAX) {
    errors.push(`proposals length must be ≤ ${DOCKET_EDIT_PROPOSAL_STORE_MAX}`);
  }
  if (typeof doc.updated_at !== "string" || !doc.updated_at.trim()) {
    errors.push("updated_at required");
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, doc };
}

/**
 * @returns {string[]}
 */
export function docketDgStoreV0Steps() {
  return [
    "Propose + dual-sign (DG-v1 fixture keys) on the steward shell.",
    "Persist to Worker store (PUT) — session cache remains a fallback.",
    "Reload / second device: GET restores signed proposals from D1.",
    "Apply still does not rewrite published case JSON — download merge pack for human review.",
    "No production steward key custody yet — fixture keys only.",
  ];
}

/**
 * Fetch proposals from Worker store (empty array when unset).
 * @param {string} apiOrigin
 * @param {string} caseId
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchDocketEditProposalsFromStore(
  apiOrigin,
  caseId,
  fetchImpl = fetch
) {
  const url = docketEditProposalsStoreUrl(apiOrigin, caseId);
  const res = await fetchImpl(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Worker store GET failed (${res.status})`);
  }
  const body = await res.json();
  const check = validateDocketEditProposalStoreDocument(body);
  if (!check.ok) {
    throw new Error(check.errors.join("; "));
  }
  return {
    proposals: Array.isArray(body.proposals) ? body.proposals : [],
    updated_at: String(body.updated_at ?? ""),
    empty: body.empty === true,
  };
}

/**
 * Replace Worker store proposals for a case (must be DG-v1 signed).
 * @param {string} apiOrigin
 * @param {string} caseId
 * @param {unknown[]} proposals
 * @param {typeof fetch} [fetchImpl]
 */
export async function putDocketEditProposalsToStore(
  apiOrigin,
  caseId,
  proposals,
  fetchImpl = fetch
) {
  const url = docketEditProposalsStoreUrl(apiOrigin, caseId);
  const res = await fetchImpl(url, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ proposals }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(body.details)
      ? body.details.join("; ")
      : String(body.error ?? res.status);
    throw new Error(`Worker store PUT failed: ${detail}`);
  }
  const check = validateDocketEditProposalStoreDocument(body);
  if (!check.ok) {
    throw new Error(check.errors.join("; "));
  }
  return body;
}
