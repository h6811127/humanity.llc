import { describe, expect, it } from "vitest";

import {
  isChildObjectScope,
  normalizeQrScope,
  objectTypeLabelFromContext,
  qrNoCalendarExpirySubtitle,
  qrScopeRelationshipCopy,
  qrTrustGroupScopeSubtitle,
} from "../../site/js/object-taxonomy-core.mjs";

describe("object taxonomy core", () => {
  it("normalizes known QR scopes", () => {
    expect(normalizeQrScope("card")).toBe("card");
    expect(normalizeQrScope(" print_artifact ")).toBe("print_artifact");
    expect(normalizeQrScope("unknown")).toBeNull();
    expect(isChildObjectScope("print_artifact")).toBe(true);
    expect(isChildObjectScope("card")).toBe(false);
  });

  it("describes child-object QR scope without assigning human trust to it", () => {
    expect(qrTrustGroupScopeSubtitle("print_artifact")).toBe(
      "Printed object - revoke this item without disabling the root card"
    );
    expect(qrNoCalendarExpirySubtitle("print_artifact")).toBe(
      "This object QR stays valid until the owner revokes or replaces it"
    );
    expect(qrScopeRelationshipCopy({ scope: "print_artifact", handle: "river" })).toBe(
      "Controlled by @river"
    );
  });

  it("keeps root-card scope distinct from printed objects", () => {
    expect(qrTrustGroupScopeSubtitle("card")).toBe("Root card-scoped credential");
    expect(qrNoCalendarExpirySubtitle("card")).toBeNull();
    expect(objectTypeLabelFromContext({ qrScope: "print_artifact" })).toEqual({
      label: "Printed object",
      tone: "wearable",
    });
    expect(objectTypeLabelFromContext({ qrScope: "card" })).toEqual({
      label: "Root card",
      tone: "general",
    });
  });

  it("keeps pilot object labels ahead of generic QR scope", () => {
    expect(
      objectTypeLabelFromContext({
        pilotTemplate: "status_plate",
        qrScope: "print_artifact",
      })
    ).toEqual({ label: "Status plate", tone: "status-plate" });
  });
});

