/**
 * WS-DOCKET-DG-v1 — signed dual-gate edit approvals (Ed25519).
 * Fixture steward keys only — never production custody.
 * Apply still does not rewrite published case JSON (human review).
 * @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § Dual-gate steward edits
 */

import * as ed from "@noble/ed25519";
import { sha256 } from "@noble/hashes/sha256";
import { base58 } from "@scure/base";

import {
  DOCKET_EDIT_DUAL_GATE_THRESHOLD,
  createDocketEditProposal,
  docketEditSignaturesMeetDualGate,
  docketStewardIdSet,
  normalizeDocketEditApprovals,
  normalizeDocketEditSignatures,
} from "./docket-edit-proposal-core.mjs";

export {
  docketEditSignaturesMeetDualGate,
  normalizeDocketEditSignatures,
  validateDocketEditProposalSignatures,
} from "./docket-edit-proposal-core.mjs";

export const DOCKET_DG_V1_PAYLOAD_TYPE = "hc.docket.edit_approval.v1";
export const DOCKET_DG_V1_FIXTURE_SEED_PREFIX = "hc-docket-dg-v1-fixture:";
export const DOCKET_DG_V1_KIT_REL = "site/dev/ws-docket-dg-v1-field-walk.html";

/**
 * Deterministic message bytes for an approval signature.
 * Fixed field order (not full JCS) — small, stable, testable.
 * @param {{
 *   caseId: string;
 *   proposalId: string;
 *   fieldPath: string;
 *   before: string;
 *   after: string;
 *   summary: string;
 *   stewardId: string;
 *   signedAt: string;
 * }} fields
 */
export function buildDocketEditApprovalMessage(fields) {
  return new TextEncoder().encode(
    [
      DOCKET_DG_V1_PAYLOAD_TYPE,
      String(fields.caseId ?? "").trim(),
      String(fields.proposalId ?? "").trim(),
      String(fields.fieldPath ?? "").trim(),
      String(fields.before ?? ""),
      String(fields.after ?? ""),
      String(fields.summary ?? "").trim(),
      String(fields.stewardId ?? "").trim(),
      String(fields.signedAt ?? "").trim(),
    ].join("\n")
  );
}

/**
 * Fixture-only keypair for a steward id (demo / kit / tests).
 * @param {string} stewardId
 */
export async function docketDgV1FixtureKeypair(stewardId) {
  const id = String(stewardId ?? "").trim();
  if (!id) throw new Error("stewardId required for fixture keypair");
  const privateKey = sha256(
    new TextEncoder().encode(`${DOCKET_DG_V1_FIXTURE_SEED_PREFIX}${id}`)
  );
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return {
    privateKey,
    publicKey,
    publicKeyBase58: base58.encode(publicKey),
  };
}

/**
 * @param {Record<string, unknown>} proposal
 * @param {string} caseId
 * @param {string} stewardId
 * @param {string} [signedAt]
 */
export async function signDocketEditApproval(
  proposal,
  caseId,
  stewardId,
  signedAt
) {
  const actor = String(stewardId ?? "").trim();
  const when = String(signedAt ?? new Date().toISOString());
  const keys = await docketDgV1FixtureKeypair(actor);
  const message = buildDocketEditApprovalMessage({
    caseId,
    proposalId: String(proposal.id ?? ""),
    fieldPath: String(proposal.field_path ?? ""),
    before: String(proposal.before ?? ""),
    after: String(proposal.after ?? ""),
    summary: String(proposal.summary ?? ""),
    stewardId: actor,
    signedAt: when,
  });
  const sig = await ed.signAsync(message, keys.privateKey);
  return {
    steward_id: actor,
    public_key_base58: keys.publicKeyBase58,
    signature_base58: base58.encode(sig),
    signed_at: when,
  };
}

/**
 * @param {Record<string, unknown>} proposal
 * @param {string} caseId
 * @param {Record<string, unknown>} signatureRow
 */
export async function verifyDocketEditApproval(proposal, caseId, signatureRow) {
  const stewardId = String(signatureRow.steward_id ?? "").trim();
  const publicKeyBase58 = String(signatureRow.public_key_base58 ?? "").trim();
  const signatureBase58 = String(signatureRow.signature_base58 ?? "").trim();
  const signedAt = String(signatureRow.signed_at ?? "").trim();
  if (!stewardId || !publicKeyBase58 || !signatureBase58 || !signedAt) {
    return false;
  }
  const message = buildDocketEditApprovalMessage({
    caseId,
    proposalId: String(proposal.id ?? ""),
    fieldPath: String(proposal.field_path ?? ""),
    before: String(proposal.before ?? ""),
    after: String(proposal.after ?? ""),
    summary: String(proposal.summary ?? ""),
    stewardId,
    signedAt,
  });
  try {
    const publicKey = base58.decode(publicKeyBase58);
    const signature = base58.decode(signatureBase58);
    return await ed.verifyAsync(signature, message, publicKey);
  } catch {
    return false;
  }
}

/**
 * Approve + attach Ed25519 fixture signature (DG-v1).
 * If the steward already approved (DG-v0 id-only) but has not signed, attaches signature only.
 * @param {Record<string, unknown>} proposal
 * @param {string} caseId
 * @param {string} stewardId
 * @param {unknown} stewards
 */
export async function approveDocketEditProposalSigned(
  proposal,
  caseId,
  stewardId,
  stewards
) {
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
  const signatures = normalizeDocketEditSignatures(proposal.signatures);
  if (signatures.some((s) => String(s.steward_id) === actor)) {
    throw new Error("This steward already signed");
  }
  const signature = await signDocketEditApproval(proposal, caseId, actor);
  const nextApprovals = approvals.includes(actor)
    ? approvals
    : [...approvals, actor];
  const nextSignatures = [...signatures, signature];
  const meets =
    nextApprovals.length >= DOCKET_EDIT_DUAL_GATE_THRESHOLD &&
    nextSignatures.length >= DOCKET_EDIT_DUAL_GATE_THRESHOLD;
  return {
    ...proposal,
    approvals: nextApprovals,
    signatures: nextSignatures,
    status: meets ? "approved" : "pending",
    resolved_at: proposal.resolved_at ?? null,
  };
}

/**
 * Create proposal with proposer's signed first gate.
 * @param {{
 *   id: string;
 *   field_path: string;
 *   summary: string;
 *   before: string;
 *   after: string;
 *   proposed_by: string;
 *   proposed_at?: string;
 * }} input
 * @param {string} caseId
 * @param {unknown} stewards
 */
export async function createDocketEditProposalSigned(input, caseId, stewards) {
  const base = createDocketEditProposal(input, stewards);
  const signature = await signDocketEditApproval(
    base,
    caseId,
    String(input.proposed_by ?? "")
  );
  return {
    ...base,
    signatures: [signature],
  };
}

/**
 * @param {Record<string, unknown>} proposal
 * @param {string} caseId
 * @param {string} [resolvedAt]
 */
export async function applyDocketEditProposalSigned(
  proposal,
  caseId,
  resolvedAt
) {
  const approvals = normalizeDocketEditApprovals(proposal.approvals);
  const signatures = normalizeDocketEditSignatures(proposal.signatures);
  if (!docketEditSignaturesMeetDualGate(signatures)) {
    throw new Error(
      `Need ${DOCKET_EDIT_DUAL_GATE_THRESHOLD} distinct steward signatures before apply (DG-v1)`
    );
  }
  if (approvals.length < DOCKET_EDIT_DUAL_GATE_THRESHOLD) {
    throw new Error(
      `Need ${DOCKET_EDIT_DUAL_GATE_THRESHOLD} distinct steward approvals before apply`
    );
  }
  for (const row of signatures) {
    const ok = await verifyDocketEditApproval(proposal, caseId, row);
    if (!ok) {
      throw new Error(
        `Invalid DG-v1 signature for steward ${String(row.steward_id ?? "")}`
      );
    }
    if (!approvals.includes(String(row.steward_id))) {
      throw new Error(
        `Signature steward ${String(row.steward_id)} missing from approvals`
      );
    }
  }
  const when = String(resolvedAt ?? new Date().toISOString().slice(0, 10));
  const summary = String(proposal.summary ?? "Dual-gate edit applied").trim();
  const fieldPath = String(proposal.field_path ?? "").trim();
  return {
    proposal: {
      ...proposal,
      status: "applied",
      approvals,
      signatures,
      resolved_at: when,
    },
    changelogEntry: {
      id: `log-dg-v1-${String(proposal.id ?? "edit")}`,
      dated: when,
      summary: `DG-v1 signed dual-gate applied (${fieldPath}): ${summary}`,
    },
  };
}
