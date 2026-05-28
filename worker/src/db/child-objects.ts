import type { ChildObjectRow, ChildObjectStatus } from "./types";

export interface ChildObjectParentRow {
  public_key: string;
  recovery_public_key: string | null;
  status: string;
}

export interface ChildObjectWrite {
  objectId: string;
  parentProfileId: string;
  objectType: string;
  publicLabel: string;
  publicState: string;
  status: ChildObjectStatus;
  documentJson: string;
  createdAt: string;
  updatedAt: string;
}

export async function getChildObjectParent(
  db: D1Database,
  profileId: string
): Promise<ChildObjectParentRow | null> {
  return db
    .prepare(
      `SELECT public_key, recovery_public_key, status
       FROM cards WHERE profile_id = ?`
    )
    .bind(profileId)
    .first<ChildObjectParentRow>();
}

export async function getChildObject(
  db: D1Database,
  objectId: string
): Promise<ChildObjectRow | null> {
  return db
    .prepare(
      `SELECT object_id, parent_profile_id, object_type, public_label, public_state,
              status, child_object_document_json, created_at, updated_at
       FROM child_objects WHERE object_id = ?`
    )
    .bind(objectId)
    .first<ChildObjectRow>();
}

export async function insertChildObject(
  db: D1Database,
  input: ChildObjectWrite
): Promise<void> {
  const result = await db
    .prepare(
      `INSERT INTO child_objects (
         object_id, parent_profile_id, object_type, public_label, public_state,
         status, child_object_document_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.objectId,
      input.parentProfileId,
      input.objectType,
      input.publicLabel,
      input.publicState,
      input.status,
      input.documentJson,
      input.createdAt,
      input.updatedAt
    )
    .run();

  if (!result.success || result.meta.changes === 0) {
    throw new Error("Child object insert failed.");
  }
}

export async function updateChildObject(
  db: D1Database,
  input: ChildObjectWrite
): Promise<void> {
  const result = await db
    .prepare(
      `UPDATE child_objects
       SET object_type = ?, public_label = ?, public_state = ?, status = ?,
           child_object_document_json = ?, updated_at = ?
       WHERE object_id = ? AND parent_profile_id = ?`
    )
    .bind(
      input.objectType,
      input.publicLabel,
      input.publicState,
      input.status,
      input.documentJson,
      input.updatedAt,
      input.objectId,
      input.parentProfileId
    )
    .run();

  if (!result.success || result.meta.changes === 0) {
    throw new Error("Child object update failed.");
  }
}

