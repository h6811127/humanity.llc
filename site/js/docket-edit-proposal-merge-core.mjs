/**
 * WS-DOCKET-DG-merge-v0 — human-gated merge preview / pack export.
 * Builds a PR-ready patch from signed applied proposals. Never writes published case JSON.
 * DG-store-v0 may also persist proposals on the Worker; merge remains human-gated.
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § Dual-gate steward edits
 */

import {
  DOCKET_EDIT_PROPOSAL_FIELD_PATHS,
} from "./docket-edit-proposal-core.mjs";

export const DOCKET_MERGE_PACK_VERSION = 1;
export const DOCKET_MERGE_PACK_KIND = "hc.docket.merge_pack.v0";
export const DOCKET_MERGE_KIT_REL = "site/dev/ws-docket-dg-merge-v0-field-walk.html";

/**
 * Read a supported dual-gate field from a case object.
 * @param {Record<string, unknown>} fullCase
 * @param {string} fieldPath
 */
export function readDocketCaseFieldPath(fullCase, fieldPath) {
  const path = String(fieldPath ?? "").trim();
  if (path === "note") {
    return fullCase.note == null ? "" : String(fullCase.note);
  }
  if (path === "status") {
    return String(fullCase.status ?? "");
  }
  if (path === "action.label") {
    const action =
      fullCase.action && typeof fullCase.action === "object"
        ? /** @type {Record<string, unknown>} */ (fullCase.action)
        : null;
    return action ? String(action.label ?? "") : "";
  }
  if (path === "counts[0].title" || path === "counts[0].body") {
    const counts = Array.isArray(fullCase.counts) ? fullCase.counts : [];
    const first =
      counts[0] && typeof counts[0] === "object"
        ? /** @type {Record<string, unknown>} */ (counts[0])
        : null;
    if (!first) return "";
    return path.endsWith(".title")
      ? String(first.title ?? "")
      : String(first.body ?? "");
  }
  throw new Error(`Unsupported field_path: ${path}`);
}

/**
 * Apply one proposal onto an in-memory case copy (human review aid only).
 * @param {Record<string, unknown>} fullCase
 * @param {Record<string, unknown>} proposal
 */
export function applyDocketEditProposalToCaseCopy(fullCase, proposal) {
  const path = String(proposal.field_path ?? "").trim();
  if (!DOCKET_EDIT_PROPOSAL_FIELD_PATHS.includes(path)) {
    throw new Error(`Unsupported field_path: ${path}`);
  }
  const after = String(proposal.after ?? "");
  /** @type {Record<string, unknown>} */
  const next = structuredClone
    ? structuredClone(fullCase)
    : JSON.parse(JSON.stringify(fullCase));

  if (path === "note") {
    next.note = after;
  } else if (path === "status") {
    next.status = after;
  } else if (path === "action.label") {
    const action =
      next.action && typeof next.action === "object"
        ? { .../** @type {Record<string, unknown>} */ (next.action) }
        : {};
    action.label = after;
    next.action = action;
  } else if (path === "counts[0].title" || path === "counts[0].body") {
    const counts = Array.isArray(next.counts)
      ? next.counts.map((row) =>
          row && typeof row === "object"
            ? { .../** @type {Record<string, unknown>} */ (row) }
            : row
        )
      : [];
    if (!counts[0] || typeof counts[0] !== "object") {
      throw new Error("counts[0] missing — cannot merge preview");
    }
    const first = /** @type {Record<string, unknown>} */ (counts[0]);
    if (path.endsWith(".title")) first.title = after;
    else first.body = after;
    next.counts = counts;
  }

  return next;
}

/**
 * Preview one applied/approved proposal against published case values.
 * @param {Record<string, unknown>} fullCase
 * @param {Record<string, unknown>} proposal
 */
export function buildDocketEditMergePreview(fullCase, proposal) {
  const fieldPath = String(proposal.field_path ?? "").trim();
  const publishedBefore = readDocketCaseFieldPath(fullCase, fieldPath);
  const proposedAfter = String(proposal.after ?? "");
  const merged = applyDocketEditProposalToCaseCopy(fullCase, proposal);
  const mergedValue = readDocketCaseFieldPath(merged, fieldPath);
  return {
    proposal_id: String(proposal.id ?? ""),
    field_path: fieldPath,
    summary: String(proposal.summary ?? ""),
    status: String(proposal.status ?? ""),
    published_before: publishedBefore,
    proposal_before: String(proposal.before ?? ""),
    proposal_after: proposedAfter,
    merged_value: mergedValue,
    signatures: Array.isArray(proposal.signatures) ? proposal.signatures : [],
    approvals: Array.isArray(proposal.approvals) ? proposal.approvals : [],
    human_gated: true,
    writes_published_json: false,
  };
}

/**
 * Build a downloadable merge pack for human PR / JSON review.
 * @param {{
 *   caseId: string;
 *   fullCase: Record<string, unknown>;
 *   proposals: unknown[];
 *   generatedAt?: string;
 * }} input
 */
export function buildDocketMergePack(input) {
  const caseId = String(input.caseId ?? "").trim();
  if (!caseId) throw new Error("caseId required");
  const proposals = Array.isArray(input.proposals) ? input.proposals : [];
  const applied = proposals.filter(
    (row) =>
      row &&
      typeof row === "object" &&
      String(/** @type {Record<string, unknown>} */ (row).status ?? "") === "applied"
  );
  const previews = applied.map((row) =>
    buildDocketEditMergePreview(
      input.fullCase,
      /** @type {Record<string, unknown>} */ (row)
    )
  );

  let mergedCase = input.fullCase;
  for (const row of applied) {
    mergedCase = applyDocketEditProposalToCaseCopy(
      mergedCase,
      /** @type {Record<string, unknown>} */ (row)
    );
  }

  return {
    version: DOCKET_MERGE_PACK_VERSION,
    kind: DOCKET_MERGE_PACK_KIND,
    case_id: caseId,
    generated_at: String(input.generatedAt ?? new Date().toISOString()),
    human_gated: true,
    writes_published_json: false,
    worker_store: true,
    instructions: [
      "Review each preview against primary sources and the nonviolence charter.",
      "Hand-edit site/data/docket-case-{id}.json only after dual-gate + human approval.",
      "Append a changelog line when merging; do not auto-deploy unsigned packs.",
      "Signed proposals may also live in Worker DG-store-v0 (GET/PUT …/docket/{id}/edit-proposals).",
      "Worker store never auto-writes published case JSON.",
    ],
    previews,
    case_after_merge: mergedCase,
  };
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true } | { ok: false; errors: string[] }}
 */
export function validateDocketMergePack(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["merge pack must be an object"] };
  }
  const doc = /** @type {Record<string, unknown>} */ (raw);
  if (doc.kind !== DOCKET_MERGE_PACK_KIND) {
    errors.push(`kind must be ${DOCKET_MERGE_PACK_KIND}`);
  }
  if (doc.version !== DOCKET_MERGE_PACK_VERSION) {
    errors.push(`version must be ${DOCKET_MERGE_PACK_VERSION}`);
  }
  if (doc.writes_published_json !== false) {
    errors.push("writes_published_json must be false (human-gated)");
  }
  if (doc.human_gated !== true) {
    errors.push("human_gated must be true");
  }
  if (doc.worker_store !== true) {
    errors.push("worker_store must be true (DG-store-v0 available; merge still human-gated)");
  }
  if (typeof doc.case_id !== "string" || !doc.case_id.trim()) {
    errors.push("case_id required");
  }
  if (!Array.isArray(doc.previews)) {
    errors.push("previews must be an array");
  }
  if (!doc.case_after_merge || typeof doc.case_after_merge !== "object") {
    errors.push("case_after_merge required");
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true };
}

/**
 * Filename for browser download.
 * @param {string} caseId
 * @param {string} [when]
 */
export function docketMergePackFilename(caseId, when) {
  const id = String(caseId ?? "case").trim() || "case";
  const stamp = String(when ?? new Date().toISOString())
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  return `docket-merge-pack-${id}-${stamp}.json`;
}

/**
 * @returns {string[]}
 */
export function docketMergeV0Steps() {
  return [
    "Propose + dual-sign (DG-v1 fixture keys) on the steward shell.",
    "Persist to Worker store (DG-store-v0) and/or keep session cache.",
    "Apply — marks proposal applied; published case JSON unchanged.",
    "Download the merge pack (human-gated preview + case_after_merge).",
    "Human reviews sources + charter, then hand-edits site/data/docket-case-{id}.json.",
  ];
}
