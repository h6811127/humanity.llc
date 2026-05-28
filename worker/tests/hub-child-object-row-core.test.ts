import { describe, expect, it } from "vitest";

import {
  childObjectHubFocusHash,
  childObjectIdFromHubFocusHash,
  hubChildObjectIdentityLine,
  hubChildObjectSearchHaystack,
  hubChildObjectStatusLine,
  hubChildObjectTitle,
  hubChildObjectTypeMeta,
  isGeneralRootWalletEntry,
  listHubChildObjectsForDisplay,
  shouldRenderHubChildObjectRows,
} from "../../site/js/hub-child-object-row-core.mjs";
import { writeChildObjectRows } from "../../site/js/child-object-store-core.mjs";

describe("isGeneralRootWalletEntry", () => {
  it("treats general pilot as root", () => {
    expect(isGeneralRootWalletEntry({ pilot_template: "general", profile_id: "p1" })).toBe(true);
  });

  it("excludes status plate wallet rows", () => {
    expect(isGeneralRootWalletEntry({ pilot_template: "status_plate", profile_id: "p1" })).toBe(
      false
    );
  });
});

describe("shouldRenderHubChildObjectRows", () => {
  it("shows on wallet full rows", () => {
    expect(shouldRenderHubChildObjectRows(true, false)).toBe(true);
  });

  it("shows on expanded hub summary", () => {
    expect(shouldRenderHubChildObjectRows(false, false)).toBe(true);
  });

  it("hides on collapsed hub preview", () => {
    expect(shouldRenderHubChildObjectRows(false, true)).toBe(false);
  });
});

describe("hubChildObjectTypeMeta", () => {
  it("labels status plates", () => {
    expect(hubChildObjectTypeMeta("status_plate")).toEqual({
      label: "Status plate",
      tone: "status-plate",
      manageLabel: "Update status",
    });
  });

  it("labels lost item relays", () => {
    expect(hubChildObjectTypeMeta("lost_item_relay")).toEqual({
      label: "Lost item",
      tone: "lost-item",
      manageLabel: "Update message",
    });
  });
});

describe("hubChildObjectStatusLine", () => {
  it("never uses scanned or seen copy", () => {
    const line = hubChildObjectStatusLine({
      publicState: "Open · Thu–Sun until 9 PM",
      scanUrl: "https://humanity.llc/scan/qr_test",
      status: "active",
    });
    expect(line.label).toContain("Open");
    expect(line.label.toLowerCase()).not.toContain("scanned");
    expect(line.label.toLowerCase()).not.toContain("seen");
    expect(line.tone).toBe("ok");
  });

  it("warns when disabled on network", () => {
    expect(
      hubChildObjectStatusLine({ status: "disabled", publicState: "Open", scanUrl: "https://x" })
    ).toEqual({ label: "Disabled on network", tone: "warn" });
  });
});

describe("hubChildObjectSearchHaystack", () => {
  it("includes object label and parent handle", () => {
    const haystack = hubChildObjectSearchHaystack(
      { handle: "river_studio", profile_id: "prof_abc" },
      { object_type: "status_plate", object_id: "obj_1", public_label: "Studio door" }
    );
    expect(haystack).toContain("studio door");
    expect(haystack).toContain("@river_studio");
    expect(haystack).toContain("status plate");
  });
});

describe("listHubChildObjectsForDisplay", () => {
  it("filters revoked and disabled rows", () => {
    const backing = new Map<string, string>();
    const storage = {
      getItem(key: string) {
        return backing.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        backing.set(key, value);
      },
    };
    writeChildObjectRows(storage, "prof_1", [
      {
        object_id: "obj_active",
        object_type: "status_plate",
        public_label: "Door",
        public_state: "Open",
        status: "active",
      },
      {
        object_id: "obj_revoked",
        object_type: "lost_item_relay",
        public_label: "Keys",
        public_state: "Closed",
        status: "revoked",
      },
      {
        object_id: "obj_disabled",
        object_type: "status_plate",
        public_label: "Back door",
        public_state: "Closed",
        status: "disabled",
      },
    ]);
    const rows = listHubChildObjectsForDisplay(storage, "prof_1");
    expect(rows.map((r) => r.object_id)).toEqual(["obj_active"]);
    expect(hubChildObjectTitle(rows[0])).toBe("Door");
    expect(
      hubChildObjectIdentityLine({
        objectTypeLabel: hubChildObjectTypeMeta(rows[0].object_type).label,
        rootHandle: "@studio",
      })
    ).toBe("Status plate · under @studio");
  });
});

describe("childObjectHubFocusHash", () => {
  it("round-trips object ids in location hash", () => {
    expect(childObjectHubFocusHash("obj_abc123")).toBe("child-object-obj_abc123");
    expect(childObjectIdFromHubFocusHash("#child-object-obj_abc123")).toBe("obj_abc123");
    expect(childObjectIdFromHubFocusHash("update-status")).toBeNull();
  });
});
