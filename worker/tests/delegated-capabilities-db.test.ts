import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DELEGATION_SPEC_VERSION,
  type DelegatedCapabilityDocument,
} from "../src/live-object/delegation-spec";
import {
  delegatedCapabilityDocumentFromRow,
  delegatedCapabilityWriteFromDocument,
  getActiveDelegatedCapability,
  insertDelegatedCapability,
  listDelegatedCapabilitiesForParent,
  revokeDelegatedCapability,
} from "../src/db/delegated-capabilities";
import type { DelegatedCapabilityRow } from "../src/db/types";

const PARENT = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const DELEGATED_PK = "delegated-pk-base58";

function volunteerDoc(
  overrides: Partial<DelegatedCapabilityDocument> = {}
): DelegatedCapabilityDocument {
  return {
    version: DELEGATION_SPEC_VERSION,
    capability_id: "cap_volunteer_01",
    parent_profile_id: PARENT,
    delegated_public_key: DELEGATED_PK,
    operations: ["child_object.update"],
    scope: { object_ids: ["obj_door_1"], print_artifact_ids: [] },
    label: "Volunteer — front door sign",
    expires_at: "2026-06-01T06:00:00Z",
    status: "active",
    created_at: "2026-05-28T18:00:00Z",
    ...overrides,
  };
}

type StoredCapability = DelegatedCapabilityRow;

class DelegatedCapabilityDb {
  rows = new Map<string, StoredCapability>();

  prepare(sql: string) {
    const db = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("WHERE capability_id = ?") && !sql.includes("status = 'active'")) {
              return (db.rows.get(String(args[0])) ?? null) as T | null;
            }
            if (sql.includes("status = 'active'")) {
              const parentId = String(args[0]);
              const signer = String(args[1]);
              const match = Array.from(db.rows.values()).find(
                (row) =>
                  row.parent_profile_id === parentId &&
                  row.delegated_public_key === signer &&
                  row.status === "active"
              );
              return (match ?? null) as T | null;
            }
            return null as T | null;
          },
          async all<T>() {
            if (sql.includes("WHERE parent_profile_id = ?")) {
              const parentId = String(args[0]);
              const rows = Array.from(db.rows.values())
                .filter((row) => row.parent_profile_id === parentId)
                .sort(
                  (a, b) =>
                    b.created_at.localeCompare(a.created_at) ||
                    a.capability_id.localeCompare(b.capability_id)
                );
              return { results: rows as T[] };
            }
            return { results: [] as T[] };
          },
          async run() {
            if (sql.startsWith("INSERT INTO delegated_capabilities")) {
              const row: StoredCapability = {
                capability_id: String(args[0]),
                parent_profile_id: String(args[1]),
                delegated_public_key: String(args[2]),
                operations_json: String(args[3]),
                scope_json: String(args[4]),
                label: String(args[5]),
                expires_at: String(args[6]),
                status: args[7] as StoredCapability["status"],
                capability_document_json: String(args[8]),
                created_at: String(args[9]),
                updated_at: String(args[10]),
              };
              db.rows.set(row.capability_id, row);
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.startsWith("UPDATE delegated_capabilities")) {
              const capabilityId = String(args[6]);
              const parentId = String(args[7]);
              const existing = db.rows.get(capabilityId);
              if (!existing || existing.parent_profile_id !== parentId) {
                return { success: true, meta: { changes: 0 } };
              }
              db.rows.set(capabilityId, {
                ...existing,
                operations_json: String(args[0]),
                scope_json: String(args[1]),
                label: String(args[2]),
                expires_at: String(args[3]),
                status: "revoked",
                capability_document_json: String(args[4]),
                updated_at: String(args[5]),
              });
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

describe("delegated capabilities D1 layer (step 17 schema)", () => {
  it("migration 0034 defines delegated_capabilities table", () => {
    const sql = readFileSync(
      join(process.cwd(), "worker/migrations/0034_delegated_capabilities.sql"),
      "utf8"
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS delegated_capabilities");
    expect(sql).toContain("idx_delegated_capabilities_one_active_signer");
  });

  it("inserts and loads active capability by signer", async () => {
    const db = new DelegatedCapabilityDb() as unknown as D1Database;
    const doc = volunteerDoc();
    const json = JSON.stringify(doc);
    const write = delegatedCapabilityWriteFromDocument(doc, json);
    write.updatedAt = write.createdAt;

    expect(await insertDelegatedCapability(db, write)).toEqual({ ok: true });

    const active = await getActiveDelegatedCapability(db, PARENT, DELEGATED_PK);
    expect(active?.capability_id).toBe("cap_volunteer_01");
    expect(delegatedCapabilityDocumentFromRow(active!)).toEqual(doc);
  });

  it("lists capabilities for parent", async () => {
    const db = new DelegatedCapabilityDb() as unknown as D1Database;
    const doc = volunteerDoc();
    const json = JSON.stringify(doc);
    const write = delegatedCapabilityWriteFromDocument(doc, json);
    write.updatedAt = write.createdAt;
    await insertDelegatedCapability(db, write);

    const rows = await listDelegatedCapabilitiesForParent(db, PARENT);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.capability_id).toBe("cap_volunteer_01");
  });

  it("revokes capability and clears active lookup", async () => {
    const db = new DelegatedCapabilityDb() as unknown as D1Database;
    const doc = volunteerDoc();
    const json = JSON.stringify(doc);
    const write = delegatedCapabilityWriteFromDocument(doc, json);
    write.updatedAt = write.createdAt;
    await insertDelegatedCapability(db, write);

    const revokedDoc = volunteerDoc({ status: "revoked" });
    const revokeResult = await revokeDelegatedCapability(db, {
      capabilityId: revokedDoc.capability_id,
      parentProfileId: PARENT,
      capabilityDocumentJson: JSON.stringify(revokedDoc),
      updatedAt: "2026-05-29T12:00:00.000Z",
    });
    expect(revokeResult).toEqual({ ok: true, changes: 1 });

    const active = await getActiveDelegatedCapability(db, PARENT, DELEGATED_PK);
    expect(active).toBeNull();
  });

  it("rejects insert when document fields disagree with row columns", async () => {
    const db = new DelegatedCapabilityDb() as unknown as D1Database;
    const doc = volunteerDoc();
    const json = JSON.stringify(doc);
    const write = delegatedCapabilityWriteFromDocument(doc, json);
    write.updatedAt = write.createdAt;
    write.capabilityId = "cap_other";

    const result = await insertDelegatedCapability(db, write);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.includes("capability_id"))).toBe(true);
    }
  });
});
