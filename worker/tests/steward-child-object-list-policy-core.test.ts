import { describe, expect, it } from "vitest";

import { writeChildObjectRows } from "../../site/js/child-object-store-core.mjs";
import {
  CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
  CHILD_OBJECT_TYPE_STATUS_PLATE,
} from "../../site/js/created-child-object-core.mjs";
import { CHILD_OBJECT_TYPE_GAME_NODE } from "../../site/js/created-child-object-game-node-core.mjs";
import { STEWARD_ROOM_DOORS, STEWARD_ROOM_SEASON } from "../../site/js/steward-active-room-core.mjs";
import {
  childObjectListRoomBadgeText,
  shouldShowChildObjectAddForm,
  shouldShowChildObjectAddHubForRoot,
  shouldShowChildObjectGameNodePanel,
  shouldShowChildObjectTypeSection,
} from "../../site/js/steward-child-object-list-policy-core.mjs";

const PROFILE = "prof_list_policy";
const deployRoot = { pilot_template: "general" };
const seasonRootWithIssuer = {
  pilot_template: "general",
  issuer_public_key: "abc123organizer",
};
const seasonRootManifesto = {
  pilot_template: "general",
  manifesto_line: "City game season spring-2026",
};

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

describe("steward-child-object-list-policy-core", () => {
  it("builds room badge copy per child type", () => {
    expect(childObjectListRoomBadgeText("status_plate")).toBe(
      "Sign · managed under Doors"
    );
    expect(childObjectListRoomBadgeText("lost_item_relay")).toBe(
      "Lost-item tag · managed under Doors"
    );
    expect(childObjectListRoomBadgeText("game_node")).toBe(
      "Checkpoint · managed under Season"
    );
  });

  it("shows section when add is allowed or active rows exist", () => {
    const seasonExtras = { activeRoom: STEWARD_ROOM_SEASON };
    expect(
      shouldShowChildObjectTypeSection(deployRoot, "status_plate", 0, seasonExtras)
    ).toBe(false);
    expect(
      shouldShowChildObjectTypeSection(deployRoot, "status_plate", 2, seasonExtras)
    ).toBe(true);
    expect(
      shouldShowChildObjectTypeSection(deployRoot, "status_plate", 0, {
        activeRoom: STEWARD_ROOM_DOORS,
      })
    ).toBe(true);
  });

  it("filters add forms by active room only", () => {
    const seasonExtras = { activeRoom: STEWARD_ROOM_SEASON };
    expect(shouldShowChildObjectAddForm(deployRoot, "status_plate", seasonExtras)).toBe(
      false
    );
    expect(
      shouldShowChildObjectAddForm(deployRoot, "status_plate", { activeRoom: STEWARD_ROOM_DOORS })
    ).toBe(true);
  });

  it("shows hub when stored children exist outside active add room", () => {
    const storage = makeStorage();
    writeChildObjectRows(storage, PROFILE, [
      {
        object_id: "plate_1",
        object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
        status: "active",
        public_label: "Front door",
        public_state: "Open",
      },
    ]);
    expect(
      shouldShowChildObjectAddHubForRoot(deployRoot, PROFILE, storage, {
        activeRoom: STEWARD_ROOM_SEASON,
      })
    ).toBe(true);
  });

  it("shows game node panel for setup-only season roots", () => {
    const seasonExtras = { activeRoom: STEWARD_ROOM_SEASON };
    expect(
      shouldShowChildObjectGameNodePanel(seasonRootManifesto, 0, seasonExtras)
    ).toBe(true);
    expect(
      shouldShowChildObjectAddHubForRoot(seasonRootManifesto, PROFILE, makeStorage(), seasonExtras)
    ).toBe(true);
  });

  it("shows game node add when organizer key is present", () => {
    const seasonExtras = { activeRoom: STEWARD_ROOM_SEASON };
    expect(
      shouldShowChildObjectGameNodePanel(seasonRootWithIssuer, 0, seasonExtras)
    ).toBe(true);
  });

  it("hides hub for non-general pilots even with stored rows", () => {
    const storage = makeStorage();
    writeChildObjectRows(storage, PROFILE, [
      {
        object_id: "relay_1",
        object_type: CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
        status: "active",
        public_label: "Keys",
        public_state: "Thanks",
      },
    ]);
    expect(
      shouldShowChildObjectAddHubForRoot({ pilot_template: "status_plate" }, PROFILE, storage, {
        activeRoom: STEWARD_ROOM_DOORS,
      })
    ).toBe(false);
  });

  it("counts game nodes toward hub visibility", () => {
    const storage = makeStorage();
    writeChildObjectRows(storage, PROFILE, [
      {
        object_id: "node_1",
        object_type: CHILD_OBJECT_TYPE_GAME_NODE,
        status: "active",
        public_label: "Park bench",
        public_state: "Active",
      },
    ]);
    expect(
      shouldShowChildObjectAddHubForRoot(deployRoot, PROFILE, storage, {
        activeRoom: STEWARD_ROOM_DOORS,
      })
    ).toBe(true);
  });
});
