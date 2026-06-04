import { describe, expect, it } from "vitest";

import {
  buildDelegatedCapabilityIssueUnsigned,
  delegatedCapabilityRowSummary,
  normalizeDelegatedOperations,
} from "../../site/js/created-delegated-capability-core.mjs";

describe("created-delegated-capability-core", () => {
  it("normalizes volunteer operations", () => {
    expect(
      normalizeDelegatedOperations(["child_object.update", "child_object.update", "card.revoke"])
    ).toEqual(["child_object.update"]);
  });

  it("builds issue document with one scoped object", () => {
    const doc = buildDelegatedCapabilityIssueUnsigned({
      parentProfileId: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      delegatedPublicKey: "delegated-pk",
      objectId: "obj_door_1",
      operations: ["child_object.update"],
      label: "Volunteer",
      expiresAt: "2027-06-01T06:00:00Z",
      capabilityId: "cap_test_01",
    });
    expect(doc.scope.object_ids).toEqual(["obj_door_1"]);
    expect(doc.status).toBe("active");
  });

  it("formats limited signer copy for active rows", () => {
    const copy = delegatedCapabilityRowSummary(
      { status: "active", expires_at: "2027-06-01T06:00:00Z" },
      Date.parse("2026-06-01T00:00:00Z")
    );
    expect(copy).toContain("Limited signer");
  });
});
