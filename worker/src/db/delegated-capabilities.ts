import {
  validateDelegatedCapabilityShape,
  type DelegatedCapabilityDocument,
} from "../live-object/delegation-spec";
import type {
  DelegatedCapabilityRow,
  DelegatedCapabilityStatus,
} from "./types";

export interface DelegatedCapabilityWrite {
  capabilityId: string;
  parentProfileId: string;
  delegatedPublicKey: string;
  operationsJson: string;
  scopeJson: string;
  label: string;
  expiresAt: string;
  status: DelegatedCapabilityStatus;
  capabilityDocumentJson: string;
  createdAt: string;
  updatedAt: string;
}

export function delegatedCapabilityWriteFromDocument(
  doc: DelegatedCapabilityDocument,
  capabilityDocumentJson: string
): DelegatedCapabilityWrite {
  return {
    capabilityId: doc.capability_id,
    parentProfileId: doc.parent_profile_id,
    delegatedPublicKey: doc.delegated_public_key,
    operationsJson: JSON.stringify(doc.operations),
    scopeJson: JSON.stringify(doc.scope),
    label: doc.label,
    expiresAt: doc.expires_at,
    status: doc.status,
    capabilityDocumentJson,
    createdAt: doc.created_at,
    updatedAt: doc.created_at,
  };
}

export function delegatedCapabilityDocumentFromRow(
  row: DelegatedCapabilityRow
): DelegatedCapabilityDocument | null {
  try {
    const parsed = JSON.parse(row.capability_document_json) as unknown;
    const shape = validateDelegatedCapabilityShape(parsed);
    if (!shape.ok) return null;
    return parsed as DelegatedCapabilityDocument;
  } catch {
    return null;
  }
}

export async function getDelegatedCapabilityById(
  db: D1Database,
  capabilityId: string
): Promise<DelegatedCapabilityRow | null> {
  return db
    .prepare(
      `SELECT capability_id, parent_profile_id, delegated_public_key,
              operations_json, scope_json, label, expires_at, status,
              capability_document_json, created_at, updated_at
       FROM delegated_capabilities WHERE capability_id = ?`
    )
    .bind(capabilityId)
    .first<DelegatedCapabilityRow>();
}

export async function getActiveDelegatedCapability(
  db: D1Database,
  parentProfileId: string,
  delegatedPublicKey: string
): Promise<DelegatedCapabilityRow | null> {
  return db
    .prepare(
      `SELECT capability_id, parent_profile_id, delegated_public_key,
              operations_json, scope_json, label, expires_at, status,
              capability_document_json, created_at, updated_at
       FROM delegated_capabilities
       WHERE parent_profile_id = ? AND delegated_public_key = ? AND status = 'active'
       ORDER BY created_at DESC, capability_id ASC
       LIMIT 1`
    )
    .bind(parentProfileId, delegatedPublicKey)
    .first<DelegatedCapabilityRow>();
}

export async function listDelegatedCapabilitiesForParent(
  db: D1Database,
  parentProfileId: string
): Promise<DelegatedCapabilityRow[]> {
  const result = await db
    .prepare(
      `SELECT capability_id, parent_profile_id, delegated_public_key,
              operations_json, scope_json, label, expires_at, status,
              capability_document_json, created_at, updated_at
       FROM delegated_capabilities
       WHERE parent_profile_id = ?
       ORDER BY created_at DESC, capability_id ASC`
    )
    .bind(parentProfileId)
    .all<DelegatedCapabilityRow>();
  return result.results ?? [];
}

export function validateDelegatedCapabilityWrite(
  input: DelegatedCapabilityWrite
): { ok: true } | { ok: false; issues: string[] } {
  let doc: unknown;
  try {
    doc = JSON.parse(input.capabilityDocumentJson);
  } catch {
    return { ok: false, issues: ["capability_document_json must be valid JSON."] };
  }
  const shape = validateDelegatedCapabilityShape(doc);
  if (!shape.ok) return { ok: false, issues: shape.issues };
  const row = doc as DelegatedCapabilityDocument;
  const issues: string[] = [];
  if (row.capability_id !== input.capabilityId) {
    issues.push("capability_id must match capability_document_json.");
  }
  if (row.parent_profile_id !== input.parentProfileId) {
    issues.push("parent_profile_id must match capability_document_json.");
  }
  if (row.delegated_public_key !== input.delegatedPublicKey) {
    issues.push("delegated_public_key must match capability_document_json.");
  }
  if (row.status !== input.status) {
    issues.push("status must match capability_document_json.");
  }
  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

export async function insertDelegatedCapability(
  db: D1Database,
  input: DelegatedCapabilityWrite
): Promise<{ ok: true } | { ok: false; issues: string[] }> {
  const validation = validateDelegatedCapabilityWrite(input);
  if (!validation.ok) return validation;

  const result = await db
    .prepare(
      `INSERT INTO delegated_capabilities (
         capability_id, parent_profile_id, delegated_public_key,
         operations_json, scope_json, label, expires_at, status,
         capability_document_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.capabilityId,
      input.parentProfileId,
      input.delegatedPublicKey,
      input.operationsJson,
      input.scopeJson,
      input.label,
      input.expiresAt,
      input.status,
      input.capabilityDocumentJson,
      input.createdAt,
      input.updatedAt
    )
    .run();

  if (!result.success) {
    return { ok: false, issues: ["delegated capability insert failed."] };
  }
  return { ok: true };
}

export async function revokeDelegatedCapability(
  db: D1Database,
  input: {
    capabilityId: string;
    parentProfileId: string;
    capabilityDocumentJson: string;
    updatedAt: string;
  }
): Promise<{ ok: true; changes: number } | { ok: false; issues: string[] }> {
  let doc: unknown;
  try {
    doc = JSON.parse(input.capabilityDocumentJson);
  } catch {
    return { ok: false, issues: ["capability_document_json must be valid JSON."] };
  }
  const shape = validateDelegatedCapabilityShape(doc);
  if (!shape.ok) return { ok: false, issues: shape.issues };
  const row = doc as DelegatedCapabilityDocument;
  if (row.capability_id !== input.capabilityId) {
    return { ok: false, issues: ["capability_id must match capability_document_json."] };
  }
  if (row.parent_profile_id !== input.parentProfileId) {
    return { ok: false, issues: ["parent_profile_id must match capability_document_json."] };
  }
  if (row.status !== "revoked") {
    return { ok: false, issues: ['status must be "revoked" in capability_document_json.'] };
  }

  const write = delegatedCapabilityWriteFromDocument(row, input.capabilityDocumentJson);
  const result = await db
    .prepare(
      `UPDATE delegated_capabilities
       SET status = 'revoked',
           operations_json = ?,
           scope_json = ?,
           label = ?,
           expires_at = ?,
           capability_document_json = ?,
           updated_at = ?
       WHERE capability_id = ? AND parent_profile_id = ?`
    )
    .bind(
      write.operationsJson,
      write.scopeJson,
      write.label,
      write.expiresAt,
      input.capabilityDocumentJson,
      input.updatedAt,
      input.capabilityId,
      input.parentProfileId
    )
    .run();

  return { ok: true, changes: result.meta.changes ?? 0 };
}
