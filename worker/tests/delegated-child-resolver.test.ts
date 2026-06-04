import { describe, expect, it } from "vitest";
import * as ed from "@noble/ed25519";

import {
  encodeBase58,
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import type { ChildObjectStatus } from "../src/db/types";
import {
  DELEGATION_SPEC_VERSION,
  type DelegatedCapabilityDocument,
} from "../src/live-object/delegation-spec";
import {
  delegatedCapabilityWriteFromDocument,
  insertDelegatedCapability,
} from "../src/db/delegated-capabilities";
import {
  handlePostChildObjectCreate,
  handlePostChildObjectUpdate,
} from "../src/resolver/child-objects";
import { mintChildObjectFromSignedCredential } from "../src/resolver/mint-child-object-qr";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const OBJECT_ID = "obj_door_1";
const CREATED = "2026-05-16T17:00:00.000Z";
const CHILD_QR = "qr_8Yk9nQ3oR5sU7wX9zA2bC3dE6fG";

async function randomKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKeyBase58: encodeBase58(publicKey) };
}

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

type StoredCapability = {
  capability_id: string;
  parent_profile_id: string;
  delegated_public_key: string;
  operations_json: string;
  scope_json: string;
  label: string;
  expires_at: string;
  status: "active" | "revoked";
  capability_document_json: string;
  created_at: string;
  updated_at: string;
};

class DelegatedChildResolverDb {
  parent = {
    public_key: "",
    recovery_public_key: null as string | null,
    status: "active",
  };
  objects = new Map<string, StoredObject>();
  capabilities = new Map<string, StoredCapability>();
  activeQrs = new Map<string, string>();

  prepare(sql: string) {
    const db = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM cards WHERE profile_id") && sql.includes("manifesto_line")) {
              return {
                public_key: db.parent.public_key,
                recovery_public_key: db.parent.recovery_public_key,
                handle: "river_example",
                handle_normalized: "river_example",
                manifesto_line: "Open studio",
                status: db.parent.status,
                card_document_json: "{}",
                created_at: CREATED,
                updated_at: CREATED,
              } as T;
            }
            if (sql.includes("FROM cards WHERE profile_id")) {
              return {
                public_key: db.parent.public_key,
                recovery_public_key: db.parent.recovery_public_key,
                status: db.parent.status,
              } as T;
            }
            if (sql.includes("FROM child_objects WHERE object_id")) {
              return (db.objects.get(String(args[0])) ?? null) as T | null;
            }
            if (sql.includes("FROM delegated_capabilities") && sql.includes("status = 'active'")) {
              const parentId = String(args[0]);
              const signer = String(args[1]);
              const match = Array.from(db.capabilities.values()).find(
                (row) =>
                  row.parent_profile_id === parentId &&
                  row.delegated_public_key === signer &&
                  row.status === "active"
              );
              return (match ?? null) as T | null;
            }
            if (sql.includes("object_id = ?") && sql.includes("scope = 'child_object'")) {
              const objectId = String(args[1]);
              const qrId = db.activeQrs.get(objectId);
              return qrId ? ({ qr_id: qrId, object_id: objectId } as T) : null;
            }
            if (sql.includes("issuer_public_key")) {
              return {
                public_key: db.parent.public_key,
                recovery_public_key: db.parent.recovery_public_key,
                issuer_public_key: null,
                status: db.parent.status,
              } as T;
            }
            return null as T | null;
          },
          async all<T>() {
            if (sql.includes("FROM child_objects") && sql.includes("parent_profile_id")) {
              const parentId = String(args[0]);
              const rows = Array.from(db.objects.values()).filter(
                (row) => row.parent_profile_id === parentId
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
              db.objects.set(row.object_id, row);
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.startsWith("UPDATE child_objects")) {
              const objectId = String(args[6]);
              const existing = db.objects.get(objectId);
              if (!existing) return { success: true, meta: { changes: 0 } };
              db.objects.set(objectId, {
                ...existing,
                object_type: String(args[0]),
                public_label: String(args[1]),
                public_state: String(args[2]),
                status: args[3] as ChildObjectStatus,
                child_object_document_json: String(args[4]),
                updated_at: String(args[5]),
              });
              return { success: true, meta: { changes: 1 } };
            }
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
              db.capabilities.set(row.capability_id, row);
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.startsWith("INSERT INTO qr_credentials")) {
              db.activeQrs.set(String(args[4]), String(args[0]));
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
  overrides: Partial<Record<string, unknown>> = {}
) {
  return signDocument(
    withProtocolFields(
      {
        object_id: OBJECT_ID,
        parent_profile_id: PROFILE,
        object_type: "status_plate",
        public_label: "Studio door",
        public_state: "Open",
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

function volunteerCapability(
  delegatedPublicKey: string,
  overrides: Partial<DelegatedCapabilityDocument> = {}
): DelegatedCapabilityDocument {
  return {
    version: DELEGATION_SPEC_VERSION,
    capability_id: "cap_volunteer_01",
    parent_profile_id: PROFILE,
    delegated_public_key: delegatedPublicKey,
    operations: ["child_object.update", "child_object.issue_qr"],
    scope: { object_ids: [OBJECT_ID], print_artifact_ids: [] },
    label: "Volunteer — front door sign",
    expires_at: "2027-06-01T06:00:00Z",
    status: "active",
    created_at: "2026-05-28T18:00:00Z",
    ...overrides,
  };
}

async function seedCapability(
  db: DelegatedChildResolverDb,
  owner: Awaited<ReturnType<typeof getTestKeypair>>,
  delegated: Awaited<ReturnType<typeof getTestKeypair>>,
  capabilityOverrides: Partial<DelegatedCapabilityDocument> = {}
) {
  db.parent.public_key = owner.publicKeyBase58;
  const doc = volunteerCapability(delegated.publicKeyBase58, capabilityOverrides);
  const json = JSON.stringify(doc);
  const write = delegatedCapabilityWriteFromDocument(doc, json);
  write.updatedAt = write.createdAt;
  await insertDelegatedCapability(db as unknown as D1Database, write);
}

describe("delegated child resolver (step 17)", () => {
  it("allows delegated signer to update a scoped child object", async () => {
    const owner = await getTestKeypair();
    const delegated = await randomKeypair();
    const db = new DelegatedChildResolverDb();
    await seedCapability(db, owner, delegated);

    const created = await signedChildObject(owner);
    await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, created),
      db as unknown as D1Database,
      PROFILE
    );

    const updated = await signedChildObject(delegated, {
      public_state: "Closed for lunch",
      updated_at: "2026-05-17T12:00:00.000Z",
    });
    const res = await handlePostChildObjectUpdate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects/${OBJECT_ID}/update`, updated),
      db as unknown as D1Database,
      PROFILE,
      OBJECT_ID
    );

    expect(res.status).toBe(200);
    expect(db.objects.get(OBJECT_ID)?.public_state).toBe("Closed for lunch");
  });

  it("rejects delegated signer on child object create", async () => {
    const owner = await getTestKeypair();
    const delegated = await randomKeypair();
    const db = new DelegatedChildResolverDb();
    await seedCapability(db, owner, delegated);

    const object = await signedChildObject(delegated, { object_id: "obj_new_plate_1" });
    const res = await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, object),
      db as unknown as D1Database,
      PROFILE
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("DELEGATION_OPERATION_DENIED");
  });

  it("rejects delegated update outside scope.object_ids", async () => {
    const owner = await getTestKeypair();
    const delegated = await randomKeypair();
    const db = new DelegatedChildResolverDb();
    await seedCapability(db, owner, delegated);

    const created = await signedChildObject(owner, { object_id: "obj_other_sign" });
    await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, created),
      db as unknown as D1Database,
      PROFILE
    );

    const updated = await signedChildObject(delegated, {
      object_id: "obj_other_sign",
      updated_at: "2026-05-17T12:00:00.000Z",
    });
    const res = await handlePostChildObjectUpdate(
      requestFor(
        `/.well-known/hc/v1/cards/${PROFILE}/objects/obj_other_sign/update`,
        updated
      ),
      db as unknown as D1Database,
      PROFILE,
      "obj_other_sign"
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("DELEGATION_OBJECT_DENIED");
  });

  it("rejects expired delegated capability", async () => {
    const owner = await getTestKeypair();
    const delegated = await randomKeypair();
    const db = new DelegatedChildResolverDb();
    await seedCapability(db, owner, delegated, {
      expires_at: "2026-05-20T06:00:00Z",
    });

    const created = await signedChildObject(owner);
    await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, created),
      db as unknown as D1Database,
      PROFILE
    );

    const updated = await signedChildObject(delegated, {
      public_state: "Too late",
      updated_at: "2026-05-21T12:00:00.000Z",
    });
    const res = await handlePostChildObjectUpdate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects/${OBJECT_ID}/update`, updated),
      db as unknown as D1Database,
      PROFILE,
      OBJECT_ID
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("DELEGATION_EXPIRED");
  });

  it("allows delegated signer to issue child_object QR", async () => {
    const owner = await getTestKeypair();
    const delegated = await randomKeypair();
    const db = new DelegatedChildResolverDb();
    await seedCapability(db, owner, delegated);

    const created = await signedChildObject(owner);
    await handlePostChildObjectCreate(
      requestFor(`/.well-known/hc/v1/cards/${PROFILE}/objects`, created),
      db as unknown as D1Database,
      PROFILE
    );

    const qrCredential = await signDocument(
      withProtocolFields(
        {
          qr_id: CHILD_QR,
          profile_id: PROFILE,
          object_id: OBJECT_ID,
          nonce: "nonce_childObj001",
          epoch: 1,
          scope: "child_object",
          resolver_hint: "https://humanity.llc",
          issued_at: "2026-05-18T10:00:00.000Z",
          expires_at: null,
          status: "active",
          payload: `https://humanity.llc/c/${PROFILE}?q=${CHILD_QR}`,
        },
        PAYLOAD_TYPES.QR_CREDENTIAL
      ),
      delegated
    );

    const result = await mintChildObjectFromSignedCredential(
      new Request("https://humanity.llc/", { method: "POST" }),
      db as unknown as D1Database,
      PROFILE,
      OBJECT_ID,
      qrCredential
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.qr_id).toBe(CHILD_QR);
    }
  });
});
