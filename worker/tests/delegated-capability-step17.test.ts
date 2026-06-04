import { describe, expect, it } from "vitest";
import * as ed from "@noble/ed25519";

import {
  encodeBase58,
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import {
  DELEGATION_SPEC_VERSION,
  type DelegatedCapabilityDocument,
} from "../src/live-object/delegation-spec";
import { handlePostDelegatedCapabilityIssue } from "../src/resolver/delegated-capability-routes";
import {
  handlePostChildObjectCreate,
  handlePostChildObjectUpdate,
} from "../src/resolver/child-objects";
import { delegatedAccessHintsByObjectId } from "../../site/js/delegated-capability-display-core.mjs";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const OBJECT_ID = "obj_door_1";
const CAP_ID = "cap_step17_test";
const CREATED = "2026-05-16T17:00:00.000Z";

async function randomKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKeyBase58: encodeBase58(publicKey) };
}

function capabilityDoc(delegatedPk: string): DelegatedCapabilityDocument {
  return {
    version: DELEGATION_SPEC_VERSION,
    capability_id: CAP_ID,
    parent_profile_id: PROFILE,
    delegated_public_key: delegatedPk,
    operations: ["child_object.update"],
    scope: { object_ids: [OBJECT_ID], print_artifact_ids: [] },
    label: "Volunteer",
    expires_at: "2027-06-01T06:00:00Z",
    status: "active",
    created_at: "2026-05-28T18:00:00Z",
  };
}

type StoredObject = {
  object_id: string;
  parent_profile_id: string;
  object_type: string;
  public_label: string;
  public_state: string;
  status: "active" | "disabled" | "revoked" | "replaced";
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

class Step17Db {
  parent = { public_key: "", recovery_public_key: null as string | null, status: "active" };
  objects = new Map<string, StoredObject>();
  capabilities = new Map<string, StoredCapability>();

  prepare(sql: string) {
    const db = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
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
            if (sql.includes("FROM delegated_capabilities WHERE capability_id")) {
              return (db.capabilities.get(String(args[0])) ?? null) as T | null;
            }
            return null as T | null;
          },
          async all<T>() {
            return { results: [] as T[] };
          },
          async run() {
            if (sql.startsWith("INSERT INTO child_objects")) {
              db.objects.set(String(args[0]), {
                object_id: String(args[0]),
                parent_profile_id: String(args[1]),
                object_type: String(args[2]),
                public_label: String(args[3]),
                public_state: String(args[4]),
                status: args[5] as StoredObject["status"],
                child_object_document_json: String(args[6]),
                created_at: String(args[7]),
                updated_at: String(args[8]),
              });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.startsWith("UPDATE child_objects")) {
              const objectId = String(args[6]);
              const existing = db.objects.get(objectId);
              if (!existing) return { success: true, meta: { changes: 0 } };
              db.objects.set(objectId, {
                ...existing,
                public_state: String(args[2]),
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
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
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
        public_label: "Door",
        public_state: "Open",
        status: "active",
        created_at: CREATED,
        updated_at: CREATED,
        ...overrides,
      },
      PAYLOAD_TYPES.CHILD_OBJECT
    ),
    { privateKey: keypair.privateKey, publicKeyBase58: keypair.publicKeyBase58 }
  );
}

describe("delegated capability step 17 integration", () => {
  it("root owner still updates child object while delegation is active", async () => {
    const owner = await getTestKeypair();
    const delegated = await randomKeypair();
    const db = new Step17Db();
    db.parent.public_key = owner.publicKeyBase58;

    const created = await signedChildObject(owner);
    await handlePostChildObjectCreate(
      new Request("https://humanity.llc/", {
        method: "POST",
        body: JSON.stringify({ object: created }),
      }),
      db as unknown as D1Database,
      PROFILE
    );

    const doc = capabilityDoc(delegated.publicKeyBase58);
    const signedCap = await signDocument(
      withProtocolFields(doc, PAYLOAD_TYPES.DELEGATED_CAPABILITY),
      { privateKey: owner.privateKey, publicKeyBase58: owner.publicKeyBase58 }
    );
    await handlePostDelegatedCapabilityIssue(
      new Request("https://humanity.llc/", {
        method: "POST",
        body: JSON.stringify({ capability: signedCap }),
      }),
      db as unknown as D1Database,
      PROFILE
    );

    const ownerUpdate = await signedChildObject(owner, {
      public_state: "Owner override",
      updated_at: "2026-05-17T12:00:00.000Z",
    });
    const res = await handlePostChildObjectUpdate(
      new Request("https://humanity.llc/", {
        method: "POST",
        body: JSON.stringify({ object: ownerUpdate }),
      }),
      db as unknown as D1Database,
      PROFILE,
      OBJECT_ID
    );
    expect(res.status).toBe(200);
    expect(db.objects.get(OBJECT_ID)?.public_state).toBe("Owner override");
  });

  it("rejects issuance with forbidden operations", async () => {
    const owner = await getTestKeypair();
    const delegated = await randomKeypair();
    const db = new Step17Db();
    db.parent.public_key = owner.publicKeyBase58;

    const doc = {
      ...capabilityDoc(delegated.publicKeyBase58),
      operations: ["vouch.create"],
    };
    const signedCap = await signDocument(
      withProtocolFields(doc, PAYLOAD_TYPES.DELEGATED_CAPABILITY),
      { privateKey: owner.privateKey, publicKeyBase58: owner.publicKeyBase58 }
    );
    const res = await handlePostDelegatedCapabilityIssue(
      new Request("https://humanity.llc/", {
        method: "POST",
        body: JSON.stringify({ capability: signedCap }),
      }),
      db as unknown as D1Database,
      PROFILE
    );
    expect(res.status).toBe(422);
  });

  it("rejects issuance with more than one scoped object_id", async () => {
    const owner = await getTestKeypair();
    const delegated = await randomKeypair();
    const db = new Step17Db();
    db.parent.public_key = owner.publicKeyBase58;

    const doc = {
      ...capabilityDoc(delegated.publicKeyBase58),
      scope: { object_ids: [OBJECT_ID, "obj_other"], print_artifact_ids: [] },
    };
    const signedCap = await signDocument(
      withProtocolFields(doc, PAYLOAD_TYPES.DELEGATED_CAPABILITY),
      { privateKey: owner.privateKey, publicKeyBase58: owner.publicKeyBase58 }
    );
    const res = await handlePostDelegatedCapabilityIssue(
      new Request("https://humanity.llc/", {
        method: "POST",
        body: JSON.stringify({ capability: signedCap }),
      }),
      db as unknown as D1Database,
      PROFILE
    );
    expect(res.status).toBe(422);
  });

  it("maps active capabilities to hub hints by object_id", () => {
    const hints = delegatedAccessHintsByObjectId(
      [
        {
          status: "active",
          expires_at: "2027-06-01T06:00:00Z",
          scope: { object_ids: [OBJECT_ID] },
        },
      ],
      Date.parse("2026-06-01T00:00:00Z")
    );
    expect(hints.get(OBJECT_ID)).toContain("Limited signer");
  });
});
