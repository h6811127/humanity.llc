import { describe, expect, it } from "vitest";

import {
  buildRootManifestoLine,
  canPublishFocusedObjectType,
  findFocusedChildRow,
  focusedObjectFieldsForRow,
  focusedObjectPublishPayload,
  focusedObjectRootFields,
  focusedObjectScanUrl,
  FOCUSED_OBJECT_GAME_NODE_READONLY_NOTE,
  isFocusedObjectStaleRow,
  resolveFocusedObjectTarget,
} from "../../site/js/created-focused-object-core.mjs";
import { CREATED_VIEW_FOCUSED_OBJECT } from "../../site/js/created-collection-route-core.mjs";
import { STEWARD_ROOM_DOORS } from "../../site/js/steward-active-room-core.mjs";

const PLATE = {
  object_id: "obj_plate",
  object_type: "status_plate",
  public_label: "Front door",
  public_state: "Open",
  status: "active",
  scan_url: "http://127.0.0.1:8787/c/p?q=qr_plate",
  created_at: "2026-06-01T12:00:00.000Z",
};

const RELAY = {
  object_id: "obj_relay",
  object_type: "lost_item_relay",
  public_label: "Blue jacket",
  public_state: "Return to front desk",
  status: "active",
  scan_url: "http://127.0.0.1:8787/c/p?q=qr_relay",
};

const CHECKPOINT = {
  object_id: "obj_cp",
  object_type: "game_node",
  public_label: "Relay stop",
  public_state: "Active",
  status: "active",
  scan_url: "http://127.0.0.1:8787/c/p?q=qr_cp",
};

describe("created-focused-object-core", () => {
  it("focusedObjectFieldsForRow maps status_plate fields", () => {
    const presentation = focusedObjectFieldsForRow(PLATE, STEWARD_ROOM_DOORS);
    expect(presentation.title).toBe("Front door");
    expect(presentation.typeBadge).toBe("Sign");
    expect(presentation.fields.map((f) => f.label)).toEqual([
      "Object name",
      "Status line",
    ]);
    expect(presentation.canPublish).toBe(true);
    expect(presentation.readOnlyNote).toBeNull();
  });

  it("focusedObjectFieldsForRow maps lost_item_relay fields", () => {
    const presentation = focusedObjectFieldsForRow(RELAY, STEWARD_ROOM_DOORS);
    expect(presentation.fields.map((f) => f.label)).toEqual([
      "Item name",
      "Return message",
    ]);
    expect(presentation.fields[1]?.multiline).toBe(true);
    expect(presentation.canPublish).toBe(true);
  });

  it("focusedObjectFieldsForRow keeps game_node read-only", () => {
    const presentation = focusedObjectFieldsForRow(CHECKPOINT, STEWARD_ROOM_DOORS);
    expect(presentation.canPublish).toBe(false);
    expect(presentation.readOnlyNote).toBe(FOCUSED_OBJECT_GAME_NODE_READONLY_NOTE);
    expect(presentation.fields.every((field) => field.readonly)).toBe(true);
    expect(presentation.roomBadge).toBe("Season");
  });

  it("focusedObjectPublishPayload builds child updates per type", () => {
    expect(
      focusedObjectPublishPayload("child", {
        public_label: " Side door ",
        public_state: " Closed ",
      }, { objectType: "status_plate" })
    ).toEqual({
      publishMode: "child",
      objectType: "status_plate",
      publicLabel: "Side door",
      publicState: "Closed",
    });

    expect(
      focusedObjectPublishPayload("child", {
        public_label: "Coat",
        public_state: "Ask at desk",
      }, { objectType: "lost_item_relay" })
    ).toEqual({
      publishMode: "child",
      objectType: "lost_item_relay",
      publicLabel: "Coat",
      publicState: "Ask at desk",
    });
  });

  it("focusedObjectPublishPayload builds root manifesto lines", () => {
    expect(
      focusedObjectPublishPayload("root", {
        public_label: "Studio",
        public_state: "Open",
      }, { pilot: "status_plate" })
    ).toEqual({
      publishMode: "root",
      manifestoLine: "Studio\nOpen",
    });

    expect(
      buildRootManifestoLine("lost_item_relay", {
        public_label: "Keys",
        public_state: "Front desk",
      })
    ).toBe("[relay] Keys\nFront desk");
  });

  it("resolveFocusedObjectTarget resolves child and collapsed root", () => {
    expect(
      resolveFocusedObjectTarget({
        landing: {
          view: CREATED_VIEW_FOCUSED_OBJECT,
          objectId: "obj_plate",
        },
        childRows: [PLATE],
      })
    ).toEqual({ mode: "child", row: PLATE });

    expect(
      resolveFocusedObjectTarget({
        landing: {
          view: CREATED_VIEW_FOCUSED_OBJECT,
          objectId: "missing",
        },
        childRows: [PLATE],
      })
    ).toBeNull();

    expect(
      resolveFocusedObjectTarget({
        landing: {
          view: CREATED_VIEW_FOCUSED_OBJECT,
          collapsedRoot: true,
        },
        session: { pilot_template: "general", manifesto_line: "Hello world" },
        childRows: [],
      })
    ).toEqual({ mode: "root", pilot: "general" });
  });

  it("focusedObjectScanUrl prefers child row then session scan_url", () => {
    expect(focusedObjectScanUrl(PLATE, null, "child")).toBe(PLATE.scan_url);
    expect(
      focusedObjectScanUrl(null, { scan_url: "http://127.0.0.1:8787/c/p?q=root" }, "root")
    ).toBe("http://127.0.0.1:8787/c/p?q=root");
    expect(focusedObjectScanUrl(PLATE, null, "root")).toBeNull();
  });

  it("stale row detection ignores disabled and inactive game nodes", () => {
    expect(findFocusedChildRow([PLATE], "obj_plate")).toEqual(PLATE);
    expect(findFocusedChildRow([{ ...PLATE, status: "disabled" }], "obj_plate")).toBeNull();
    expect(isFocusedObjectStaleRow({ ...PLATE, status: "disabled" })).toBe(true);
    expect(canPublishFocusedObjectType("game_node")).toBe(false);
  });

  it("focusedObjectRootFields exposes public line for general pilot", () => {
    const presentation = focusedObjectRootFields(
      { manifesto_line: "Studio account", scan_url: "http://127.0.0.1:8787/c/p?q=root" },
      "general"
    );
    expect(presentation.fields[0]?.label).toBe("Public line");
    expect(presentation.canPublish).toBe(true);
  });
});
