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
import { delegatedCapabilityWriteFromDocument } from "../src/db/delegated-capabilities";
import { handlePostRevoke } from "../src/resolver/revoke";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const OBJECT_ID = "obj_door_1";
const CHILD_QR = "qr_8Yk9nQ3oR5sU7wX9zA2bC3dE6fG";
const CAP_ID = "cap_revoke_qr_test";

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
    operations: ["child_object.revoke_qr"],
    scope: { object_ids: [OBJECT_ID], print_artifact_ids: [] },
    label: "Shift volunteer",
    expires_at: "2027-06-01T06:00:00Z",
    status: "active",
    created_at: "2026-05-28T18:00:00Z",
  };
}

describe("delegated revoke_qr (step 17)", () => {
  it("accepts scoped child_object QR revocation from delegated signer", async () => {
    const owner = await getTestKeypair();
    const delegated = await randomKeypair();
    const nonce = `nonce_delegated_revoke_${Date.now()}`;

    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          target_kind: "qr_credential",
          target_qr_id: CHILD_QR,
          reason: "owner_revoked",
          revoked_at: "2026-05-16T17:00:00.000Z",
          nonce,
        },
        PAYLOAD_TYPES.REVOCATION
      ),
      delegated
    );

    const capability = capabilityDoc(delegated.publicKeyBase58);
    const capJson = JSON.stringify(capability);
    const capWrite = delegatedCapabilityWriteFromDocument(capability, capJson);

    const batchCalls: unknown[] = [];
    const db = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          async first<T>() {
            if (sql.includes("FROM cards WHERE profile_id")) {
              return {
                public_key: owner.publicKeyBase58,
                recovery_public_key: null,
                issuer_public_key: null,
                status: "active",
              } as T;
            }
            if (sql.includes("FROM revocations WHERE revocation_id")) return null as T;
            if (sql.includes("FROM qr_credentials")) {
              return {
                qr_id: CHILD_QR,
                profile_id: PROFILE,
                status: "active",
                scope: "child_object",
                object_id: OBJECT_ID,
                print_artifact_id: null,
              } as T;
            }
            if (sql.includes("FROM delegated_capabilities")) {
              const delegatedPk = String(args[1] ?? "");
              if (delegatedPk !== delegated.publicKeyBase58) return null as T;
              return {
                capability_id: CAP_ID,
                parent_profile_id: PROFILE,
                delegated_public_key: delegated.publicKeyBase58,
                operations_json: JSON.stringify(capability.operations),
                scope_json: JSON.stringify(capability.scope),
                label: capability.label,
                expires_at: capability.expires_at,
                status: "active",
                capability_document_json: capWrite.capabilityDocumentJson,
                created_at: capability.created_at,
                updated_at: capability.created_at,
              } as T;
            }
            return null as T;
          },
          async run() {
            return { success: true };
          },
          async all<T>() {
            return [] as T;
          },
        }),
      }),
      batch: async (stmts: unknown) => {
        batchCalls.push(stmts);
        return Array.isArray(stmts)
          ? stmts.map(() => ({ success: true }))
          : [{ success: true }];
      },
    } as unknown as D1Database;

    const res = await handlePostRevoke(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revocation: signed }),
      }),
      db,
      PROFILE
    );

    expect(res.status).toBe(200);
    expect(batchCalls.length).toBe(1);
  });

  it("rejects delegated revoke_qr when operation not granted", async () => {
    const owner = await getTestKeypair();
    const delegated = await randomKeypair();
    const capability = capabilityDoc(delegated.publicKeyBase58);
    capability.operations = ["child_object.update"];

    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          target_kind: "qr_credential",
          target_qr_id: CHILD_QR,
          reason: "owner_revoked",
          revoked_at: "2026-05-16T17:00:00.000Z",
          nonce: `nonce_denied_${Date.now()}`,
        },
        PAYLOAD_TYPES.REVOCATION
      ),
      delegated
    );

    const capJson = JSON.stringify(capability);
    const capWrite = delegatedCapabilityWriteFromDocument(capability, capJson);

    const db = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          async first<T>() {
            if (sql.includes("FROM cards WHERE profile_id")) {
              return {
                public_key: owner.publicKeyBase58,
                recovery_public_key: null,
                issuer_public_key: null,
                status: "active",
              } as T;
            }
            if (sql.includes("FROM revocations")) return null as T;
            if (sql.includes("FROM qr_credentials")) {
              return {
                qr_id: CHILD_QR,
                profile_id: PROFILE,
                status: "active",
                scope: "child_object",
                object_id: OBJECT_ID,
                print_artifact_id: null,
              } as T;
            }
            if (sql.includes("FROM delegated_capabilities")) {
              return {
                capability_id: CAP_ID,
                parent_profile_id: PROFILE,
                delegated_public_key: delegated.publicKeyBase58,
                operations_json: JSON.stringify(capability.operations),
                scope_json: JSON.stringify(capability.scope),
                label: capability.label,
                expires_at: capability.expires_at,
                status: "active",
                capability_document_json: capWrite.capabilityDocumentJson,
                created_at: capability.created_at,
                updated_at: capability.created_at,
              } as T;
            }
            return null as T;
          },
        }),
      }),
      batch: async () => [{ success: true }],
    } as unknown as D1Database;

    const res = await handlePostRevoke(
      new Request(`https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revocation: signed }),
      }),
      db,
      PROFILE
    );

    expect(res.status).toBe(403);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("DELEGATION_OPERATION_DENIED");
  });
});
