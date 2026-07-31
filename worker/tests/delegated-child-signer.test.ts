import { describe, expect, it } from "vitest";

import { CRYPTO_ERROR } from "../src/crypto";
import type { ChildObjectParentRow } from "../src/db/child-objects";
import {
  authorizeDelegatedChildRoute,
  isParentOrRecoverySigner,
  qrCredentialMustMatchOwnerKey,
} from "../src/resolver/delegated-child-signer";

const OWNER_KEY = "ownerPublicKeyBase58ExampleAAAAAAAAAAA";
const RECOVERY_KEY = "recoveryPublicKeyBase58ExampleAAAAAAA";
const OTHER_KEY = "unrelatedSignerPublicKeyBase58AAAAAAAA";
const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

function parent(
  overrides: Partial<ChildObjectParentRow> = {}
): ChildObjectParentRow {
  return {
    public_key: OWNER_KEY,
    recovery_public_key: RECOVERY_KEY,
    status: "active",
    ...overrides,
  } as ChildObjectParentRow;
}

function emptyCapabilityDb(): D1Database {
  return {
    prepare() {
      return {
        bind() {
          return {
            async first() {
              return null;
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}

function invalidCapabilityDb(): D1Database {
  return {
    prepare() {
      return {
        bind() {
          return {
            async first() {
              return {
                capability_id: "cap_bad",
                parent_profile_id: PROFILE,
                delegated_public_key: OTHER_KEY,
                operations_json: "[]",
                scope_json: "{}",
                label: "bad",
                expires_at: "2099-01-01T00:00:00.000Z",
                status: "active",
                capability_document_json: "{not-json",
                created_at: "2026-07-01T00:00:00.000Z",
                updated_at: "2026-07-01T00:00:00.000Z",
              };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}

describe("delegated-child-signer helpers", () => {
  it("recognizes owner and recovery signers only", () => {
    const row = parent();
    expect(isParentOrRecoverySigner(OWNER_KEY, row)).toBe(true);
    expect(isParentOrRecoverySigner(RECOVERY_KEY, row)).toBe(true);
    expect(isParentOrRecoverySigner(OTHER_KEY, row)).toBe(false);
    expect(
      isParentOrRecoverySigner(RECOVERY_KEY, parent({ recovery_public_key: null }))
    ).toBe(false);
  });

  it("requires owner-key credentials unless auth is delegated", () => {
    expect(qrCredentialMustMatchOwnerKey("owner", OWNER_KEY, OWNER_KEY)).toBe(true);
    expect(qrCredentialMustMatchOwnerKey("owner", OTHER_KEY, OWNER_KEY)).toBe(false);
    expect(qrCredentialMustMatchOwnerKey("recovery", OWNER_KEY, OWNER_KEY)).toBe(true);
    expect(qrCredentialMustMatchOwnerKey("recovery", RECOVERY_KEY, OWNER_KEY)).toBe(
      false
    );
    expect(qrCredentialMustMatchOwnerKey("delegated", OTHER_KEY, OWNER_KEY)).toBe(true);
  });
});

describe("authorizeDelegatedChildRoute", () => {
  it("accepts owner and recovery without reading capabilities", async () => {
    const db = emptyCapabilityDb();
    const owner = await authorizeDelegatedChildRoute(
      db,
      PROFILE,
      parent(),
      OWNER_KEY,
      "child_object.update",
      { objectId: "obj_1" }
    );
    expect(owner).toEqual({ ok: true, kind: "owner" });

    const recovery = await authorizeDelegatedChildRoute(
      db,
      PROFILE,
      parent(),
      RECOVERY_KEY,
      "child_object.update",
      { objectId: "obj_1" }
    );
    expect(recovery).toEqual({ ok: true, kind: "recovery" });
  });

  it("rejects unknown signers when no active delegated capability exists", async () => {
    const denied = await authorizeDelegatedChildRoute(
      emptyCapabilityDb(),
      PROFILE,
      parent(),
      OTHER_KEY,
      "child_object.update",
      { objectId: "obj_1" }
    );
    expect(denied).toEqual({
      ok: false,
      code: CRYPTO_ERROR.INVALID_SIGNATURE,
      message:
        "Request must be signed by the root owner, recovery key, or an active delegated capability.",
      httpStatus: 401,
    });
  });

  it("rejects active capability rows with invalid stored documents", async () => {
    const denied = await authorizeDelegatedChildRoute(
      invalidCapabilityDb(),
      PROFILE,
      parent(),
      OTHER_KEY,
      "child_object.update",
      { objectId: "obj_1" }
    );
    expect(denied).toEqual({
      ok: false,
      code: "DELEGATION_INVALID",
      message: "Stored delegated capability document is invalid.",
      httpStatus: 500,
    });
  });
});
