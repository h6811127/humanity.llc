import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import type { ChildObjectStatus } from "../src/db/types";
import { handlePostChildObjectCreate } from "../src/resolver/child-objects";

const VICTIM = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const ATTACKER = "8Ym0nQ3oR5sU7wX9zA2bC4dE6";
const CATALOG_OBJECT_ID = "obj_cr_node_07_cabinet";
const CREATED = "2026-07-27T12:00:00.000Z";

type StoredObject = {
  object_id: string;
  parent_profile_id: string;
  object_type: string;
  public_label: string;
  public_state: string;
  status: ChildObjectStatus;
  child_object_document_json: string;
  created_at: string;
  updated_at: string;
};

function rowKey(parentId: string, objectId: string) {
  return `${parentId}\0${objectId}`;
}

class ParentScopedChildObjectDb {
  parents = new Map<string, { public_key: string; recovery_public_key: string | null; status: string }>();
  objects = new Map<string, StoredObject>();

  prepare(sql: string) {
    const db = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM cards")) {
              return (db.parents.get(String(args[0])) ?? null) as T | null;
            }
            if (sql.includes("FROM child_objects WHERE parent_profile_id = ? AND object_id = ?")) {
              const parentId = String(args[0]);
              const objectId = String(args[1]);
              return (db.objects.get(rowKey(parentId, objectId)) ?? null) as T | null;
            }
            return null as T | null;
          },
          async all<T>() {
            if (sql.includes("FROM child_objects") && sql.includes("parent_profile_id")) {
              const parentId = String(args[0]);
              const rows = Array.from(db.objects.values())
                .filter((row) => row.parent_profile_id === parentId)
                .sort(
                  (a, b) =>
                    a.created_at.localeCompare(b.created_at) ||
                    a.object_id.localeCompare(b.object_id)
                );
              return { results: rows as T[] };
            }
            return { results: [] as T[] };
          },
          async run() {
            if (sql.startsWith("INSERT INTO child_objects")) {
              const row: StoredObject = {
                object_id: String(args[0]),
                parent_profile_id: String(args[1]),
                object_type: String(args[2]),
                public_label: String(args[3]),
                public_state: String(args[4]),
                status: args[5] as ChildObjectStatus,
                child_object_document_json: String(args[6]),
                created_at: String(args[7]),
                updated_at: String(args[8]),
              };
              const key = rowKey(row.parent_profile_id, row.object_id);
              if (db.objects.has(key)) {
                return { success: false, meta: { changes: 0 } };
              }
              db.objects.set(key, row);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function requestFor(path: string, object: Record<string, unknown>) {
  return new Request(`https://humanity.llc${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ object }),
  });
}

async function signedChildObject(
  keypair: Awaited<ReturnType<typeof getTestKeypair>>,
  parentProfileId: string,
  overrides: Partial<Record<string, unknown>> = {}
) {
  return signDocument(
    withProtocolFields(
      {
        object_id: CATALOG_OBJECT_ID,
        parent_profile_id: parentProfileId,
        object_type: "status_plate",
        public_label: "Cabinet",
        public_state: "Locked",
        status: "active",
        created_at: CREATED,
        updated_at: CREATED,
        ...overrides,
      },
      PAYLOAD_TYPES.CHILD_OBJECT
    ),
    keypair
  );
}

describe("child_objects parent scope", () => {
  it("migration 0038 scopes primary key by parent_profile_id", () => {
    const sql = readFileSync(
      join(import.meta.dirname, "../migrations/0038_child_objects_parent_scope.sql"),
      "utf8"
    );
    expect(sql).toContain("PRIMARY KEY (parent_profile_id, object_id)");
    expect(sql).toContain("child_objects_v0038");
    expect(sql).not.toMatch(/object_id TEXT PRIMARY KEY/);
  });

  it("allows a season root to create a catalog object_id already held under another parent", async () => {
    const attackerKeys = await getTestKeypair();
    const victimKeys = await getTestKeypair();
    const db = new ParentScopedChildObjectDb();
    db.parents.set(ATTACKER, {
      public_key: attackerKeys.publicKeyBase58,
      recovery_public_key: null,
      status: "active",
    });
    db.parents.set(VICTIM, {
      public_key: victimKeys.publicKeyBase58,
      recovery_public_key: null,
      status: "active",
    });

    const attackerObject = await signedChildObject(attackerKeys, ATTACKER, {
      public_label: "Squatted cabinet",
    });
    const attackerRes = await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${ATTACKER}/objects`, attackerObject),
      db as unknown as D1Database,
      ATTACKER
    );
    expect(attackerRes.status).toBe(201);
    expect(db.objects.has(rowKey(ATTACKER, CATALOG_OBJECT_ID))).toBe(true);

    const victimObject = await signedChildObject(victimKeys, VICTIM, {
      public_label: "Czech Village cabinet",
    });
    const victimRes = await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${VICTIM}/objects`, victimObject),
      db as unknown as D1Database,
      VICTIM
    );

    expect(victimRes.status).toBe(201);
    expect(db.objects.get(rowKey(VICTIM, CATALOG_OBJECT_ID))?.public_label).toBe(
      "Czech Village cabinet"
    );
    expect(db.objects.get(rowKey(ATTACKER, CATALOG_OBJECT_ID))?.public_label).toBe(
      "Squatted cabinet"
    );
  });

  it("still rejects duplicate object_id under the same parent", async () => {
    const keys = await getTestKeypair();
    const db = new ParentScopedChildObjectDb();
    db.parents.set(VICTIM, {
      public_key: keys.publicKeyBase58,
      recovery_public_key: null,
      status: "active",
    });

    const first = await signedChildObject(keys, VICTIM);
    const firstRes = await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${VICTIM}/objects`, first),
      db as unknown as D1Database,
      VICTIM
    );
    expect(firstRes.status).toBe(201);

    const second = await signedChildObject(keys, VICTIM, {
      public_label: "Duplicate attempt",
    });
    const secondRes = await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${VICTIM}/objects`, second),
      db as unknown as D1Database,
      VICTIM
    );
    expect(secondRes.status).toBe(409);
    const body = (await secondRes.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("OBJECT_EXISTS");
  });
});
