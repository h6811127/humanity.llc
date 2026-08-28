/**
 * WS-DOCKET DG-store-v0 — GET/PUT signed edit proposals for a docket case.
 * Fixture-key verification only; never writes published case JSON.
 */

import { jsonResponse } from "../http/resolver";
import {
  getDocketEditProposalStore,
  upsertDocketEditProposalStore,
} from "../db/docket-edit-proposals";
import {
  validateDocketEditProposals,
  validateDocketEditProposalSignatures,
  normalizeDocketEditSignatures,
  DOCKET_EDIT_DUAL_GATE_THRESHOLD,
} from "../../../site/js/docket-edit-proposal-core.mjs";
import { verifyDocketEditApproval } from "../../../site/js/docket-edit-proposal-sign-core.mjs";
import {
  buildDocketEditProposalStoreDocument,
  isValidDocketStoreCaseId,
  validateDocketEditProposalStoreDocument,
} from "../../../site/js/docket-edit-proposal-store-core.mjs";

async function verifyProposalSignatures(
  caseId: string,
  proposals: unknown[]
): Promise<string[]> {
  const errors: string[] = [];
  for (let i = 0; i < proposals.length; i++) {
    const rowRaw = proposals[i];
    if (!rowRaw || typeof rowRaw !== "object" || Array.isArray(rowRaw)) continue;
    const row = rowRaw as Record<string, unknown>;
    const sigs = normalizeDocketEditSignatures(row.signatures);
    if (!sigs.length) {
      errors.push(`edit_proposals[${i}] requires at least one DG-v1 signature for Worker store`);
      continue;
    }
    for (const sig of sigs) {
      const ok = await verifyDocketEditApproval(row, caseId, sig);
      if (!ok) {
        errors.push(
          `edit_proposals[${i}] invalid signature for steward ${String(sig.steward_id ?? "")}`
        );
      }
    }
    const status = String(row.status ?? "");
    if (
      (status === "approved" || status === "applied") &&
      sigs.length < DOCKET_EDIT_DUAL_GATE_THRESHOLD
    ) {
      errors.push(
        `edit_proposals[${i}] status ${status} requires ${DOCKET_EDIT_DUAL_GATE_THRESHOLD} verified signatures`
      );
    }
  }
  return errors;
}

export async function handleGetDocketEditProposals(
  _request: Request,
  db: D1Database,
  caseIdRaw: string
): Promise<Response> {
  const caseId = String(caseIdRaw ?? "").trim();
  if (!isValidDocketStoreCaseId(caseId)) {
    return jsonResponse({ error: "invalid_case_id" }, 400);
  }
  const row = await getDocketEditProposalStore(db, caseId);
  if (!row) {
    const empty = buildDocketEditProposalStoreDocument({
      caseId,
      proposals: [],
      updatedAt: new Date(0).toISOString(),
    });
    return jsonResponse({ ...empty, empty: true }, 200);
  }
  let proposals: unknown[] = [];
  try {
    const parsed = JSON.parse(row.proposals_json);
    proposals = Array.isArray(parsed) ? parsed : [];
  } catch {
    return jsonResponse({ error: "corrupt_store" }, 500);
  }
  const doc = buildDocketEditProposalStoreDocument({
    caseId,
    proposals,
    updatedAt: row.updated_at,
  });
  return jsonResponse(doc, 200);
}

export async function handlePutDocketEditProposals(
  request: Request,
  db: D1Database,
  caseIdRaw: string
): Promise<Response> {
  const caseId = String(caseIdRaw ?? "").trim();
  if (!isValidDocketStoreCaseId(caseId)) {
    return jsonResponse({ error: "invalid_case_id" }, 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse({ error: "invalid_body" }, 400);
  }
  const payload = body as Record<string, unknown>;
  const proposals = Array.isArray(payload.proposals) ? payload.proposals : null;
  if (!proposals) {
    return jsonResponse({ error: "proposals_required" }, 400);
  }

  const shapeErrors: string[] = [];
  validateDocketEditProposals(proposals, [], shapeErrors);
  validateDocketEditProposalSignatures(proposals, [], shapeErrors);
  if (shapeErrors.length) {
    return jsonResponse(
      { error: "invalid_proposals", details: shapeErrors.slice(0, 12) },
      400
    );
  }

  const sigErrors = await verifyProposalSignatures(caseId, proposals);
  if (sigErrors.length) {
    return jsonResponse(
      { error: "invalid_signatures", details: sigErrors.slice(0, 12) },
      400
    );
  }

  const now = new Date().toISOString();
  const existing = await getDocketEditProposalStore(db, caseId);
  await upsertDocketEditProposalStore(db, {
    case_id: caseId,
    proposals_json: JSON.stringify(proposals),
    updated_at: now,
    created_at: existing?.created_at ?? now,
  });

  const doc = buildDocketEditProposalStoreDocument({
    caseId,
    proposals,
    updatedAt: now,
  });
  const check = validateDocketEditProposalStoreDocument(doc);
  if (!check.ok) {
    return jsonResponse({ error: "store_build_failed", details: check.errors }, 500);
  }
  return jsonResponse(doc, 200);
}
