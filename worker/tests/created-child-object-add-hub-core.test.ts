import { describe, expect, it } from "vitest";

import { writeChildObjectRows } from "../../site/js/child-object-store-core.mjs";
import { CHILD_OBJECT_TYPE_STATUS_PLATE } from "../../site/js/created-child-object-core.mjs";
import { STEWARD_ROOM_DOORS, STEWARD_ROOM_SEASON } from "../../site/js/steward-active-room-core.mjs";
import {
  childObjectAddCountLabel,
  childObjectAddHubSubcopy,
  shouldShowChildObjectAddHub,
} from "../../site/js/created-child-object-add-hub-core.mjs";

const PROFILE = "prof_add_hub";

function makeStorage() {
  const storage = new Map<string, string>();
  return {
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storage.set(key, String(value));
    },
  };
}

describe("created-child-object-add-hub-core", () => {
  it("shows hub for general root cards in deploy room", () => {
    expect(
      shouldShowChildObjectAddHub(
        { pilot_template: "general" },
        { profileId: PROFILE, storage: makeStorage(), activeRoom: STEWARD_ROOM_DOORS }
      )
    ).toBe(true);
  });

  it("hides hub for non-general pilots", () => {
    expect(
      shouldShowChildObjectAddHub(
        { pilot_template: "status_plate" },
        { profileId: PROFILE, storage: makeStorage(), activeRoom: STEWARD_ROOM_DOORS }
      )
    ).toBe(false);
  });

  it("shows hub when plates exist but active room is season", () => {
    const storage = makeStorage();
    writeChildObjectRows(storage, PROFILE, [
      {
        object_id: "plate_1",
        object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
        status: "active",
        public_label: "Lobby",
        public_state: "Closed",
      },
    ]);
    expect(
      shouldShowChildObjectAddHub(
        { pilot_template: "general" },
        { profileId: PROFILE, storage, activeRoom: STEWARD_ROOM_SEASON }
      )
    ).toBe(true);
  });

  it("builds deploy subcopy without game nodes", () => {
    expect(childObjectAddHubSubcopy({ pilot_template: "general" })).toBe(
      "status plates · lost items"
    );
  });

  it("builds season subcopy for organizer roots", () => {
    expect(
      childObjectAddHubSubcopy({
        pilot_template: "general",
        issuer_public_key: "abc123",
      })
    ).toBe("Game season scan points");
  });

  it("formats registered count labels", () => {
    expect(childObjectAddCountLabel(0)).toBeNull();
    expect(childObjectAddCountLabel(1)).toBe("1 registered");
    expect(childObjectAddCountLabel(3)).toBe("3 registered");
  });
});
