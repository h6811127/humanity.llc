import { describe, expect, it } from "vitest";

import {
  DELEGATION_SPEC_VERSION,
  validateDelegatedCapabilityShape,
} from "../src/live-object/delegation-spec";

describe("delegation spec (Order 6)", () => {
  it("validates a minimal allowed capability document shape", () => {
    const result = validateDelegatedCapabilityShape({
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
    });
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("rejects forbidden operations and missing scope", () => {
    const result = validateDelegatedCapabilityShape({
      version: DELEGATION_SPEC_VERSION,
      capability_id: "cap_bad",
      parent_profile_id: "root",
      delegated_public_key: "pk",
      operations: ["card.revoke"],
      label: "Bad",
      expires_at: "2026-06-01T06:00:00Z",
      status: "active",
      created_at: "2026-05-28T18:00:00Z",
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.includes("card.revoke"))).toBe(true);
  });
});
