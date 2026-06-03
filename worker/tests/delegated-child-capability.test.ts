import { describe, expect, it } from "vitest";

import {
  DELEGATION_SPEC_VERSION,
  evaluateDelegatedCapabilityAccess,
  isDelegatedCapabilityExpired,
  type DelegatedCapabilityDocument,
} from "../src/live-object/delegation-spec";

function volunteerCapability(
  overrides: Partial<DelegatedCapabilityDocument> = {}
): DelegatedCapabilityDocument {
  return {
    version: DELEGATION_SPEC_VERSION,
    capability_id: "cap_volunteer_01",
    parent_profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    delegated_public_key: "delegated-pk-base58",
    operations: ["child_object.update"],
    scope: { object_ids: ["obj_door_1"], print_artifact_ids: [] },
    label: "Volunteer — front door sign",
    expires_at: "2026-06-01T06:00:00Z",
    status: "active",
    created_at: "2026-05-28T18:00:00Z",
    ...overrides,
  };
}

describe("delegated child capability access (step 17 prep)", () => {
  it("allows scoped update before expiry", () => {
    const result = evaluateDelegatedCapabilityAccess({
      capability: volunteerCapability(),
      route: "child_object.update",
      objectId: "obj_door_1",
      now: new Date("2026-05-31T12:00:00.000Z"),
    });
    expect(result).toEqual({ allowed: true });
  });

  it("rejects out-of-scope object", () => {
    const result = evaluateDelegatedCapabilityAccess({
      capability: volunteerCapability(),
      route: "child_object.update",
      objectId: "obj_other",
      now: new Date("2026-05-31T12:00:00.000Z"),
    });
    expect(result).toEqual({ allowed: false, reason: "object_out_of_scope" });
  });

  it("rejects expired capability", () => {
    expect(
      isDelegatedCapabilityExpired(
        volunteerCapability(),
        new Date("2026-06-02T00:00:00.000Z")
      )
    ).toBe(true);
    const result = evaluateDelegatedCapabilityAccess({
      capability: volunteerCapability(),
      route: "child_object.update",
      objectId: "obj_door_1",
      now: new Date("2026-06-02T00:00:00.000Z"),
    });
    expect(result).toEqual({ allowed: false, reason: "capability_expired" });
  });

  it("rejects revoked capability", () => {
    const result = evaluateDelegatedCapabilityAccess({
      capability: volunteerCapability({ status: "revoked" }),
      route: "child_object.update",
      objectId: "obj_door_1",
      now: new Date("2026-05-31T12:00:00.000Z"),
    });
    expect(result).toEqual({ allowed: false, reason: "capability_revoked" });
  });

  it("rejects when parent card is inactive", () => {
    const result = evaluateDelegatedCapabilityAccess({
      capability: volunteerCapability(),
      route: "child_object.update",
      objectId: "obj_door_1",
      parentCardActive: false,
      now: new Date("2026-05-31T12:00:00.000Z"),
    });
    expect(result).toEqual({ allowed: false, reason: "parent_card_inactive" });
  });

  it("rejects operation not granted on capability", () => {
    const result = evaluateDelegatedCapabilityAccess({
      capability: volunteerCapability({ operations: ["child_object.issue_qr"] }),
      route: "child_object.revoke",
      objectId: "obj_door_1",
      now: new Date("2026-05-31T12:00:00.000Z"),
    });
    expect(result).toEqual({ allowed: false, reason: "operation_not_granted" });
  });

  it("scopes print artifact issue_qr to print_artifact_ids", () => {
    const capability = volunteerCapability({
      operations: ["print_artifact.issue_qr"],
      scope: { object_ids: [], print_artifact_ids: ["pa_shift_1"] },
    });
    expect(
      evaluateDelegatedCapabilityAccess({
        capability,
        route: "print_artifact.issue_qr",
        printArtifactId: "pa_shift_1",
        now: new Date("2026-05-31T12:00:00.000Z"),
      })
    ).toEqual({ allowed: true });
    expect(
      evaluateDelegatedCapabilityAccess({
        capability,
        route: "print_artifact.issue_qr",
        printArtifactId: "pa_other",
        now: new Date("2026-05-31T12:00:00.000Z"),
      })
    ).toEqual({ allowed: false, reason: "print_artifact_out_of_scope" });
  });
});
