import { describe, expect, it } from "vitest";

import type { ChildObjectParentRow } from "../src/db/child-objects";
import {
  DELEGATION_SPEC_VERSION,
  type DelegatedCapabilityDocument,
} from "../src/live-object/delegation-spec";
import { authorizeDelegatedChildRoute } from "../src/resolver/delegated-child-signer";

const OWNER_KEY = "ownerPublicKeyBase58ExampleAAAAAAAAAAA";
const RECOVERY_KEY = "recoveryPublicKeyBase58ExampleAAAAAAA";
const DELEGATED_KEY = "delegatedSignerPublicKeyBase58AAAAAAA";
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

function capabilityDoc(
  overrides: Partial<DelegatedCapabilityDocument> = {}
): DelegatedCapabilityDocument {
  return {
    version: DELEGATION_SPEC_VERSION,
    capability_id: "cap_volunteer_denial_01",
    parent_profile_id: PROFILE,
    delegated_public_key: DELEGATED_KEY,
    operations: ["child_object.update"],
    scope: { object_ids: ["obj_door_1"], print_artifact_ids: ["pa_shift_1"] },
    label: "Volunteer — denial matrix",
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    created_at: "2026-05-28T18:00:00.000Z",
    ...overrides,
  };
}

/** Active capability row whose document drives evaluateDelegatedCapabilityAccess. */
function capabilityDb(doc: DelegatedCapabilityDocument): D1Database {
  const row = {
    capability_id: doc.capability_id,
    parent_profile_id: doc.parent_profile_id,
    delegated_public_key: doc.delegated_public_key,
    operations_json: JSON.stringify(doc.operations),
    scope_json: JSON.stringify(doc.scope),
    label: doc.label,
    expires_at: doc.expires_at,
    status: "active" as const,
    capability_document_json: JSON.stringify(doc),
    created_at: doc.created_at,
    updated_at: doc.created_at,
  };
  return {
    prepare() {
      return {
        bind() {
          return {
            async first() {
              return row;
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}

describe("authorizeDelegatedChildRoute denial map", () => {
  it("allows an in-scope delegated update", async () => {
    const ok = await authorizeDelegatedChildRoute(
      capabilityDb(capabilityDoc()),
      PROFILE,
      parent(),
      DELEGATED_KEY,
      "child_object.update",
      { objectId: "obj_door_1" }
    );
    expect(ok).toEqual({ ok: true, kind: "delegated" });
  });

  it("maps capability_expired to DELEGATION_EXPIRED", async () => {
    const denied = await authorizeDelegatedChildRoute(
      capabilityDb(capabilityDoc({ expires_at: "2020-01-01T00:00:00.000Z" })),
      PROFILE,
      parent(),
      DELEGATED_KEY,
      "child_object.update",
      { objectId: "obj_door_1" }
    );
    expect(denied).toEqual({
      ok: false,
      code: "DELEGATION_EXPIRED",
      message: "Delegated capability has expired.",
      httpStatus: 403,
    });
  });

  it("maps document-revoked capability to DELEGATION_REVOKED", async () => {
    const denied = await authorizeDelegatedChildRoute(
      capabilityDb(capabilityDoc({ status: "revoked" })),
      PROFILE,
      parent(),
      DELEGATED_KEY,
      "child_object.update",
      { objectId: "obj_door_1" }
    );
    expect(denied).toEqual({
      ok: false,
      code: "DELEGATION_REVOKED",
      message: "Delegated capability is revoked.",
      httpStatus: 403,
    });
  });

  it("maps operation_not_granted to DELEGATION_OPERATION_DENIED", async () => {
    const denied = await authorizeDelegatedChildRoute(
      capabilityDb(capabilityDoc({ operations: ["child_object.issue_qr"] })),
      PROFILE,
      parent(),
      DELEGATED_KEY,
      "child_object.update",
      { objectId: "obj_door_1" }
    );
    expect(denied).toEqual({
      ok: false,
      code: "DELEGATION_OPERATION_DENIED",
      message: "Delegated capability does not allow this operation.",
      httpStatus: 403,
    });
  });

  it("maps object_out_of_scope to DELEGATION_OBJECT_DENIED", async () => {
    const denied = await authorizeDelegatedChildRoute(
      capabilityDb(capabilityDoc()),
      PROFILE,
      parent(),
      DELEGATED_KEY,
      "child_object.update",
      { objectId: "obj_other" }
    );
    expect(denied).toEqual({
      ok: false,
      code: "DELEGATION_OBJECT_DENIED",
      message: "Child object is outside delegated capability scope.",
      httpStatus: 403,
    });
  });

  it("maps missing object_id to DELEGATION_OBJECT_REQUIRED", async () => {
    const denied = await authorizeDelegatedChildRoute(
      capabilityDb(capabilityDoc()),
      PROFILE,
      parent(),
      DELEGATED_KEY,
      "child_object.update",
      { objectId: "  " }
    );
    expect(denied).toEqual({
      ok: false,
      code: "DELEGATION_OBJECT_REQUIRED",
      message: "object_id is required for this delegated operation.",
      httpStatus: 422,
    });
  });

  it("maps print_artifact_out_of_scope to DELEGATION_PRINT_ARTIFACT_DENIED", async () => {
    const denied = await authorizeDelegatedChildRoute(
      capabilityDb(
        capabilityDoc({
          operations: ["print_artifact.issue_qr"],
          scope: { object_ids: [], print_artifact_ids: ["pa_shift_1"] },
        })
      ),
      PROFILE,
      parent(),
      DELEGATED_KEY,
      "print_artifact.issue_qr",
      { printArtifactId: "pa_other" }
    );
    expect(denied).toEqual({
      ok: false,
      code: "DELEGATION_PRINT_ARTIFACT_DENIED",
      message: "print_artifact_id is outside delegated capability scope.",
      httpStatus: 403,
    });
  });

  it("maps missing print_artifact_id to DELEGATION_PRINT_ARTIFACT_REQUIRED", async () => {
    const denied = await authorizeDelegatedChildRoute(
      capabilityDb(
        capabilityDoc({
          operations: ["print_artifact.issue_qr"],
          scope: { object_ids: [], print_artifact_ids: ["pa_shift_1"] },
        })
      ),
      PROFILE,
      parent(),
      DELEGATED_KEY,
      "print_artifact.issue_qr",
      { printArtifactId: null }
    );
    expect(denied).toEqual({
      ok: false,
      code: "DELEGATION_PRINT_ARTIFACT_REQUIRED",
      message: "print_artifact_id is required for this delegated operation.",
      httpStatus: 422,
    });
  });

  it("maps inactive parent card to CARD_NOT_ACTIVE", async () => {
    const denied = await authorizeDelegatedChildRoute(
      capabilityDb(capabilityDoc()),
      PROFILE,
      parent({ status: "revoked" }),
      DELEGATED_KEY,
      "child_object.update",
      { objectId: "obj_door_1" }
    );
    expect(denied).toEqual({
      ok: false,
      code: "CARD_NOT_ACTIVE",
      message: "Parent card is not active.",
      httpStatus: 410,
    });
  });
});
