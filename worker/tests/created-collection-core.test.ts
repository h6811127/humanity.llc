import { describe, expect, it } from "vitest";

import {
  accountStripSummary,
  collectionAddPassLabel,
  collectionCrossRoomBadge,
  collectionRowIdentityLabel,
  compareCollectionShelfRows,
  createdCollectionFocusedUrl,
  listCollectionShelfRows,
} from "../../site/js/created-collection-core.mjs";
import {
  STEWARD_ROOM_DOORS,
  STEWARD_ROOM_SEASON,
  STEWARD_ROOM_WEAR,
} from "../../site/js/steward-active-room-core.mjs";

const PLATE = {
  object_id: "obj_plate",
  object_type: "status_plate",
  public_label: "Front door",
  public_state: "Open",
  status: "active",
  created_at: "2026-06-01T12:00:00.000Z",
};

const CHECKPOINT = {
  object_id: "obj_cp",
  object_type: "game_node",
  public_label: "Relay stop",
  public_state: "Active",
  status: "active",
  created_at: "2026-06-02T12:00:00.000Z",
};

describe("created-collection-core", () => {
  it("collectionAddPassLabel follows active room", () => {
    expect(collectionAddPassLabel(STEWARD_ROOM_DOORS)).toBe("Add scan point");
    expect(collectionAddPassLabel(STEWARD_ROOM_WEAR)).toBe("Add wear QR");
    expect(collectionAddPassLabel(STEWARD_ROOM_SEASON)).toBe("Add checkpoint");
  });

  it("collectionCrossRoomBadge appears outside home room only", () => {
    expect(collectionCrossRoomBadge("status_plate", STEWARD_ROOM_DOORS)).toBeNull();
    expect(collectionCrossRoomBadge("game_node", STEWARD_ROOM_DOORS)).toBe("Season");
    expect(collectionCrossRoomBadge("game_node", STEWARD_ROOM_SEASON)).toBeNull();
  });

  it("sorts active-room rows before cross-room rows", () => {
    const sorted = listCollectionShelfRows([CHECKPOINT, PLATE], STEWARD_ROOM_DOORS);
    expect(sorted.map((row) => row.object_id)).toEqual(["obj_plate", "obj_cp"]);
  });

  it("compareCollectionShelfRows keeps alpha within room bucket", () => {
    const b = { ...PLATE, object_id: "obj_b", public_label: "Back door" };
    const a = { ...PLATE, object_id: "obj_a", public_label: "Alpha door" };
    expect(compareCollectionShelfRows(a, b, STEWARD_ROOM_DOORS)).toBeLessThan(0);
  });

  it("collectionRowIdentityLabel includes type, cross-room, and recency", () => {
    const label = collectionRowIdentityLabel(CHECKPOINT, STEWARD_ROOM_DOORS);
    expect(label).toContain("Checkpoint");
    expect(label).toContain("Season");
    expect(label).toContain("Updated");
  });

  it("accountStripSummary formats handle, count, and backup", () => {
    expect(
      accountStripSummary({
        handle: "studio",
        activeChildCount: 2,
        backupSatisfied: true,
        reachabilityLine: "Active",
      })
    ).toEqual({
      heading: "Managing @studio",
      metaLine: "2 scan points · Active",
      backupLine: "Backup on this device",
    });
  });

  it("createdCollectionFocusedUrl carries profile and object ids", () => {
    expect(
      createdCollectionFocusedUrl("prof_1", "obj_a", new URLSearchParams("qr_id=qr_test"))
    ).toBe("/created/?profile_id=prof_1&object_id=obj_a&qr_id=qr_test");
  });
});
