/**
 * WS-DOCKET-DG-v0 — fixture dual-gate edit proposals (no Worker mint).
 * Two distinct steward ids must approve before a proposal can apply.
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § Dual-gate steward edits
 */

export const DOCKET_EDIT_PROPOSAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "applied",
];

export const DOCKET_EDIT_PROPOSAL_FIELD_PATHS = [
  "counts[0].body",
  "counts[0].title",
  "note",
  "action.label",
  "status",
];

/** Minimum distinct steward approvals to pass the dual gate. */
export const DOCKET_EDIT_DUAL_GATE_THRESHOLD = 2;

/**
 * @param {unknown} stewards
 * @returns {Set<string>}
 */
export function docketStewardIdSet(stewards) {
  /** @type {Set<string>} */
  const ids = new Set();
  if (!Array.isArray(stewards)) return ids;
  for (const row of stewards) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const id = String(/** @type {Record<string, unknown>} */ (row).id ?? "").trim();
    if (id) ids.add(id);
  }
  return ids;
}

/**
 * @param {unknown} approvals
 * @returns {string[]}
 */
export function normalizeDocketEditApprovals(approvals) {
  if (!Array.isArray(approvals)) return [];
  /** @type {string[]} */
  const out = [];
  const seen = new Set();
  for (const raw of approvals) {
    const id = String(raw ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * @param {string[]} approvals
 */
export function docketEditProposalMeetsDualGate(approvals) {
  return normalizeDocketEditApprovals(approvals).length >= DOCKET_EDIT_DUAL_GATE_THRESHOLD;
}

/**
 * Shape helpers for optional DG-v1 signatures[] (no crypto — safe for Pages ESM).
 * @param {unknown} signatures
 * @returns {Record<string, unknown>[]}
 */
export function normalizeDocketEditSignatures(signatures) {
  if (!Array.isArray(signatures)) return [];
  /** @type {Record<string, unknown>[]} */
  const out = [];
  const seen = new Set();
  for (const row of signatures) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = /** @type {Record<string, unknown>} */ (row);
    const sid = String(r.steward_id ?? "").trim();
    if (!sid || seen.has(sid)) continue;
    seen.add(sid);
    out.push({
      steward_id: sid,
      public_key_base58: String(r.public_key_base58 ?? "").trim(),
      signature_base58: String(r.signature_base58 ?? "").trim(),
      signed_at: String(r.signed_at ?? "").trim(),
    });
  }
  return out;
}

/**
 * @param {Record<string, unknown>[]} signatures
 */
export function docketEditSignaturesMeetDualGate(signatures) {
  return (
    normalizeDocketEditSignatures(signatures).length >=
    DOCKET_EDIT_DUAL_GATE_THRESHOLD
  );
}

/**
 * Optional signatures[] shape validation when present on edit_proposals.
 * Crypto verify stays in docket-edit-proposal-sign-*.mjs (not imported by roster).
 * @param {unknown} proposals
 * @param {unknown} stewards
 * @param {string[]} errors
 */
export function validateDocketEditProposalSignatures(proposals, stewards, errors) {
  if (proposals == null || !Array.isArray(proposals)) return;
  const stewardIds = docketStewardIdSet(stewards);
  for (let i = 0; i < proposals.length; i++) {
    const rowRaw = proposals[i];
    if (!rowRaw || typeof rowRaw !== "object" || Array.isArray(rowRaw)) continue;
    const row = /** @type {Record<string, unknown>} */ (rowRaw);
    if (row.signatures == null) continue;
    if (!Array.isArray(row.signatures)) {
      errors.push(`edit_proposals[${i}].signatures must be an array when present`);
      continue;
    }
    const sigs = normalizeDocketEditSignatures(row.signatures);
    for (let j = 0; j < sigs.length; j++) {
      const s = sigs[j];
      if (!s.steward_id) {
        errors.push(`edit_proposals[${i}].signatures[${j}].steward_id is required`);
      } else if (stewardIds.size && !stewardIds.has(String(s.steward_id))) {
        errors.push(
          `edit_proposals[${i}].signatures[${j}].steward_id must match stewards[]`
        );
      }
      if (!s.public_key_base58) {
        errors.push(
          `edit_proposals[${i}].signatures[${j}].public_key_base58 is required`
        );
      }
      if (!s.signature_base58) {
        errors.push(
          `edit_proposals[${i}].signatures[${j}].signature_base58 is required`
        );
      }
      if (!s.signed_at) {
        errors.push(`edit_proposals[${i}].signatures[${j}].signed_at is required`);
      }
    }
    const status = String(row.status ?? "");
    if (
      (status === "approved" || status === "applied") &&
      sigs.length > 0 &&
      !docketEditSignaturesMeetDualGate(sigs)
    ) {
      errors.push(
        `edit_proposals[${i}] status ${status} with signatures requires ${DOCKET_EDIT_DUAL_GATE_THRESHOLD} distinct signatures`
      );
    }
  }
}

/**
 * Validate optional edit_proposals[] against stewards on the case.
 * @param {unknown} proposals
 * @param {unknown} stewards
 * @param {string[]} errors
 */
export function validateDocketEditProposals(proposals, stewards, errors) {
  if (proposals == null) return;
  if (!Array.isArray(proposals)) {
    errors.push("edit_proposals must be an array when present");
    return;
  }
  const stewardIds = docketStewardIdSet(stewards);
  for (let i = 0; i < proposals.length; i++) {
    const rowRaw = proposals[i];
    if (!rowRaw || typeof rowRaw !== "object" || Array.isArray(rowRaw)) {
      errors.push(`edit_proposals[${i}] must be an object`);
      continue;
    }
    const row = /** @type {Record<string, unknown>} */ (rowRaw);
    const id = String(row.id ?? "").trim();
    if (!id) errors.push(`edit_proposals[${i}].id is required`);

    const status = String(row.status ?? "").trim();
    if (!DOCKET_EDIT_PROPOSAL_STATUSES.includes(status)) {
      errors.push(
        `edit_proposals[${i}].status must be one of: ${DOCKET_EDIT_PROPOSAL_STATUSES.join(", ")}`
      );
    }

    const fieldPath = String(row.field_path ?? "").trim();
    if (!fieldPath) {
      errors.push(`edit_proposals[${i}].field_path is required`);
    } else if (!DOCKET_EDIT_PROPOSAL_FIELD_PATHS.includes(fieldPath)) {
      errors.push(
        `edit_proposals[${i}].field_path must be one of: ${DOCKET_EDIT_PROPOSAL_FIELD_PATHS.join(", ")}`
      );
    }

    const summary = String(row.summary ?? "").trim();
    if (!summary) errors.push(`edit_proposals[${i}].summary is required`);

    if (typeof row.before !== "string") {
      errors.push(`edit_proposals[${i}].before must be a string`);
    }
    if (typeof row.after !== "string" || !String(row.after).trim()) {
      errors.push(`edit_proposals[${i}].after must be a non-empty string`);
    }

    const proposedBy = String(row.proposed_by ?? "").trim();
    if (!proposedBy) {
      errors.push(`edit_proposals[${i}].proposed_by is required`);
    } else if (stewardIds.size && !stewardIds.has(proposedBy)) {
      errors.push(`edit_proposals[${i}].proposed_by must match a stewards[].id`);
    }

    const approvals = normalizeDocketEditApprovals(row.approvals);
    if (!Array.isArray(row.approvals)) {
      errors.push(`edit_proposals[${i}].approvals must be an array`);
    } else {
      for (const aid of approvals) {
        if (stewardIds.size && !stewardIds.has(aid)) {
          errors.push(`edit_proposals[${i}].approvals contains unknown steward id: ${aid}`);
        }
      }
      if (proposedBy && !approvals.includes(proposedBy)) {
        errors.push(
          `edit_proposals[${i}].approvals must include proposed_by (proposer is first gate)`
        );
      }
    }

    const proposedAt = String(row.proposed_at ?? "").trim();
    if (!proposedAt) errors.push(`edit_proposals[${i}].proposed_at is required`);

    if (row.resolved_at != null && typeof row.resolved_at !== "string") {
      errors.push(`edit_proposals[${i}].resolved_at must be a string when present`);
    }

    if (status === "applied" || status === "approved") {
      if (!docketEditProposalMeetsDualGate(approvals)) {
        errors.push(
          `edit_proposals[${i}] status ${status} requires ${DOCKET_EDIT_DUAL_GATE_THRESHOLD} distinct steward approvals`
        );
      }
    }
    if (status === "applied" && !String(row.resolved_at ?? "").trim()) {
      errors.push(`edit_proposals[${i}].resolved_at is required when status is applied`);
    }
  }
}

/**
 * @param {{
 *   id: string;
 *   field_path: string;
 *   summary: string;
 *   before: string;
 *   after: string;
 *   proposed_by: string;
 *   proposed_at?: string;
 * }} input
 * @param {unknown} stewards
 */
export function createDocketEditProposal(input, stewards) {
  const stewardIds = docketStewardIdSet(stewards);
  const proposedBy = String(input.proposed_by ?? "").trim();
  if (!stewardIds.has(proposedBy)) {
    throw new Error("proposed_by must be a steward on this case");
  }
  if (stewardIds.size < DOCKET_EDIT_DUAL_GATE_THRESHOLD) {
    throw new Error(
      `Case needs at least ${DOCKET_EDIT_DUAL_GATE_THRESHOLD} stewards for dual-gate edits`
    );
  }
  const fieldPath = String(input.field_path ?? "").trim();
  if (!DOCKET_EDIT_PROPOSAL_FIELD_PATHS.includes(fieldPath)) {
    throw new Error("Unsupported field_path for dual-gate edit");
  }
  const after = String(input.after ?? "").trim();
  if (!after) throw new Error("after must be a non-empty string");

  return {
    id: String(input.id ?? "").trim() || `prop_${Date.now()}`,
    field_path: fieldPath,
    summary: String(input.summary ?? "").trim() || "Proposed case edit",
    before: String(input.before ?? ""),
    after,
    proposed_by: proposedBy,
    approvals: [proposedBy],
    status: "pending",
    proposed_at: String(input.proposed_at ?? new Date().toISOString().slice(0, 10)),
    resolved_at: null,
  };
}

/**
 * Second (or Nth) steward approval. Does not mutate input.
 * @param {Record<string, unknown>} proposal
 * @param {string} stewardId
 * @param {unknown} stewards
 */
export function approveDocketEditProposal(proposal, stewardId, stewards) {
  const stewardIds = docketStewardIdSet(stewards);
  const actor = String(stewardId ?? "").trim();
  if (!stewardIds.has(actor)) {
    throw new Error("Approver must be a steward on this case");
  }
  const status = String(proposal.status ?? "");
  if (status !== "pending" && status !== "approved") {
    throw new Error(`Cannot approve a proposal in status ${status || "(empty)"}`);
  }
  const approvals = normalizeDocketEditApprovals(proposal.approvals);
  if (approvals.includes(actor)) {
    throw new Error("This steward already approved");
  }
  const nextApprovals = [...approvals, actor];
  const meets = docketEditProposalMeetsDualGate(nextApprovals);
  return {
    ...proposal,
    approvals: nextApprovals,
    status: meets ? "approved" : "pending",
    resolved_at: proposal.resolved_at ?? null,
  };
}

/**
 * Apply an approved proposal: mark applied + append changelog line.
 * Returns { proposal, changelogEntry } — does not rewrite case field values in v0
 * (fixture apply is explicit; production case JSON stays human-reviewed).
 * @param {Record<string, unknown>} proposal
 * @param {string} [resolvedAt]
 */
export function applyDocketEditProposal(proposal, resolvedAt) {
  const status = String(proposal.status ?? "");
  const approvals = normalizeDocketEditApprovals(proposal.approvals);
  if (status !== "approved" && !(status === "pending" && docketEditProposalMeetsDualGate(approvals))) {
    throw new Error("Proposal must meet dual-gate approvals before apply");
  }
  if (!docketEditProposalMeetsDualGate(approvals)) {
    throw new Error(
      `Need ${DOCKET_EDIT_DUAL_GATE_THRESHOLD} distinct steward approvals before apply`
    );
  }
  const when = String(resolvedAt ?? new Date().toISOString().slice(0, 10));
  const summary = String(proposal.summary ?? "Dual-gate edit applied").trim();
  const fieldPath = String(proposal.field_path ?? "").trim();
  return {
    proposal: {
      ...proposal,
      status: "applied",
      approvals,
      resolved_at: when,
    },
    changelogEntry: {
      id: `log-dg-${String(proposal.id ?? "edit")}`,
      dated: when,
      summary: `Dual-gate applied (${fieldPath}): ${summary}`,
    },
  };
}

/**
 * @param {string} caseId
 */
export function docketEditProposalStorageKey(caseId) {
  return `hc_docket_edit_proposals_v0:${String(caseId ?? "").trim()}`;
}

/**
 * @param {Pick<Storage, "getItem">} storage
 * @param {string} caseId
 * @param {unknown[]} fallback
 */
export function readDocketEditProposalsFromStorage(storage, caseId, fallback) {
  try {
    const raw = storage.getItem(docketEditProposalStorageKey(caseId));
    if (!raw) return Array.isArray(fallback) ? fallback : [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : Array.isArray(fallback) ? fallback : [];
  } catch {
    return Array.isArray(fallback) ? fallback : [];
  }
}

/**
 * @param {Pick<Storage, "setItem">} storage
 * @param {string} caseId
 * @param {unknown[]} proposals
 */
export function writeDocketEditProposalsToStorage(storage, caseId, proposals) {
  storage.setItem(docketEditProposalStorageKey(caseId), JSON.stringify(proposals));
}
