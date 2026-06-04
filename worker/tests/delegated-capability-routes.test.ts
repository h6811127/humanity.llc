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
  handleGetDelegatedCapabilities,
  handlePostDelegatedCapabilityIssue,
  handlePostDelegatedCapabilityRevoke,
} from "../src/resolver/delegated-capability-routes";
import {
  DELEGATION_SPEC_VERSION,
  type DelegatedCapabilityDocument,
} from "../src/live-object/delegation-spec";
import type { DelegatedCapabilityRow } from "../src/db/types";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const OBJECT_ID = "obj_door_1";
const CAP_ID = "cap_volunteer_route1";

async function randomKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKeyBase58: encodeBase58(publicKey) };
}

function capabilityDoc(
  ownerPk: string,
  delegatedPk: string,
  overrides: Partial<DelegatedCapabilityDocument> = {}
): DelegatedCapabilityDocument {
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
    ...overrides,
  };
}

class DelegatedCapabilityRouteDb {
  parent = {
    public_key: "",
    recovery_public_key: null as string | null,
    status: "active",
  };
  child = {
    object_id: OBJECT_ID,
    parent_profile_id: PROFILE,
    object_type: "status_plate",
    public_label: "Door",
    public_state: "Open",
    status: "active",
    child_object_document_json: "{}",
    created_at: "2026-05-16T17:00:00.000Z",
    updated_at: "2026-05-16T17:00:00.000Z",
  };
  capabilities = new Map<string, DelegatedCapabilityRow>();

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
              return db.child as T;
            }
            if (sql.includes("FROM delegated_capabilities WHERE capability_id")) {
              return (db.capabilities.get(String(args[0])) ?? null) as T | null;
            }
            if (sql.includes("status = 'active'") && sql.includes("delegated_public_key")) {
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
            return null as T | null;
          },
          async all<T>() {
            if (sql.includes("FROM delegated_capabilities") && sql.includes("parent_profile_id")) {
              const parentId = String(args[0]);
              const rows = Array.from(db.capabilities.values()).filter(
                (row) => row.parent_profile_id === parentId
              );
              return { results: rows as T[] };
            }
            return { results: [] as T[] };
          },
          async run() {
            if (sql.startsWith("INSERT INTO delegated_capabilities")) {
              const row: DelegatedCapabilityRow = {
                capability_id: String(args[0]),
                parent_profile_id: String(args[1]),
                delegated_public_key: String(args[2]),
                operations_json: String(args[3]),
                scope_json: String(args[4]),
                label: String(args[5]),
                expires_at: String(args[6]),
                status: args[7] as DelegatedCapabilityRow["status"],
                capability_document_json: String(args[8]),
                created_at: String(args[9]),
                updated_at: String(args[10]),
              };
              db.capabilities.set(row.capability_id, row);
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.startsWith("UPDATE delegated_capabilities")) {
              const capabilityId = String(args[6]);
              const parentId = String(args[7]);
              const existing = db.capabilities.get(capabilityId);
              if (!existing || existing.parent_profile_id !== parentId) {
                return { success: true, meta: { changes: 0 } };
              }
              db.capabilities.set(capabilityId, {
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

describe("delegated capability routes (step 17)", () => {
  it("issues and lists a root-signed capability", async () => {
    const owner = await getTestKeypair();
    const delegated = await randomKeypair();
    const db = new DelegatedCapabilityRouteDb();
    db.parent.public_key = owner.publicKeyBase58;

    const doc = capabilityDoc(owner.publicKeyBase58, delegated.publicKeyBase58);
    const signed = await signDocument(withProtocolFields(doc, PAYLOAD_TYPES.DELEGATED_CAPABILITY), {
      privateKey: owner.privateKey,
      publicKeyBase58: owner.publicKeyBase58,
    });

    const issueRes = await handlePostDelegatedCapabilityIssue(
      new Request("https://humanity.llc/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capability: signed }),
      }),
      db as unknown as D1Database,
      PROFILE
    );
    expect(issueRes.status).toBe(201);

    const listRes = await handleGetDelegatedCapabilities(db as unknown as D1Database, PROFILE);
    expect(listRes.status).toBe(200);
    const body = (await listRes.json()) as { capabilities: Array<{ capability_id: string }> };
    expect(body.capabilities).toHaveLength(1);
    expect(body.capabilities[0]?.capability_id).toBe(CAP_ID);
  });

  it("rejects capability signed by delegated key at issuance", async () => {
    const owner = await getTestKeypair();
    const delegated = await randomKeypair();
    const db = new DelegatedCapabilityRouteDb();
    db.parent.public_key = owner.publicKeyBase58;

    const doc = capabilityDoc(owner.publicKeyBase58, delegated.publicKeyBase58);
    const signed = await signDocument(withProtocolFields(doc, PAYLOAD_TYPES.DELEGATED_CAPABILITY), {
      privateKey: delegated.privateKey,
      publicKeyBase58: delegated.publicKeyBase58,
    });

    const issueRes = await handlePostDelegatedCapabilityIssue(
      new Request("https://humanity.llc/", {
        method: "POST",
        body: JSON.stringify({ capability: signed }),
      }),
      db as unknown as D1Database,
      PROFILE
    );
    expect(issueRes.status).toBe(401);
  });

  it("revokes an active capability with root signature", async () => {
    const owner = await getTestKeypair();
    const delegated = await randomKeypair();
    const db = new DelegatedCapabilityRouteDb();
    db.parent.public_key = owner.publicKeyBase58;

    const activeDoc = capabilityDoc(owner.publicKeyBase58, delegated.publicKeyBase58);
    const issueSigned = await signDocument(
      withProtocolFields(activeDoc, PAYLOAD_TYPES.DELEGATED_CAPABILITY),
      { privateKey: owner.privateKey, publicKeyBase58: owner.publicKeyBase58 }
    );
    await handlePostDelegatedCapabilityIssue(
      new Request("https://humanity.llc/", {
        method: "POST",
        body: JSON.stringify({ capability: issueSigned }),
      }),
      db as unknown as D1Database,
      PROFILE
    );

    const revokedDoc = capabilityDoc(owner.publicKeyBase58, delegated.publicKeyBase58, {
      status: "revoked",
    });
    const revokeSigned = await signDocument(
      withProtocolFields(revokedDoc, PAYLOAD_TYPES.DELEGATED_CAPABILITY),
      { privateKey: owner.privateKey, publicKeyBase58: owner.publicKeyBase58 }
    );
    const revokeRes = await handlePostDelegatedCapabilityRevoke(
      new Request("https://humanity.llc/", {
        method: "POST",
        body: JSON.stringify({ capability: revokeSigned }),
      }),
      db as unknown as D1Database,
      PROFILE,
      CAP_ID
    );
    expect(revokeRes.status).toBe(200);
    expect(db.capabilities.get(CAP_ID)?.status).toBe("revoked");
  });
});
