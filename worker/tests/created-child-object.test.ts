import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { childObjectIssueQrPath } from "../../site/js/child-object-api-core.mjs";

import {
  appendChildObjectRow,
  childObjectsBucketKey,
  readChildObjectRows,
  rowsFromNetworkChildObjects,
  updateChildObjectRow,
  writeChildObjectRows,
} from "../../site/js/child-object-store-core.mjs";
import {
  CHILD_OBJECT_STATUS_DISABLED,
  CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
  CHILD_OBJECT_TYPE_STATUS_PLATE,
  isActiveLostItemRelayRow,
  isActiveStatusPlateRow,
  parseLostItemRelayChildFields,
  parseLostItemRelayChildState,
  parseStatusPlateChildFields,
  parseStatusPlateChildState,
  shouldOfferAddLostItemRelay,
  shouldOfferAddStatusPlate,
} from "../../site/js/created-child-object-core.mjs";
import {
  buildGameNodeRegisterUnsigned,
  CHILD_OBJECT_TYPE_GAME_NODE,
  CHILD_OBJECT_STATUS_DISABLED,
  isActiveGameNodeRow,
  parseGameNodeChildFields,
  shouldOfferAddGameNode,
} from "../../site/js/created-child-object-game-node-core.mjs";

const PROFILE = "cuAPt5nFYr8VCCWgPbAAupBS";

describe("child-object-store-core", () => {
  it("stores rows per profile in localStorage", () => {
    const storage = new Map();
    const ls = {
      getItem(key) {
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
    };
    expect(childObjectsBucketKey(PROFILE)).toContain(PROFILE);
    appendChildObjectRow(ls, PROFILE, {
      object_id: "obj_testPlate001",
      object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
      public_label: "Studio door",
      public_state: "Open",
      created_at: "2026-05-16T17:00:00.000Z",
    });
    const rows = readChildObjectRows(ls, PROFILE);
    expect(rows).toHaveLength(1);
    expect(rows[0].public_state).toBe("Open");
  });

  it("updates stored child object rows", () => {
    const storage = new Map();
    const ls = {
      getItem(key) {
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
    };
    appendChildObjectRow(ls, PROFILE, {
      object_id: "obj_testPlate001",
      object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
      public_label: "Studio door",
      public_state: "Open",
      created_at: "2026-05-16T17:00:00.000Z",
    });
    updateChildObjectRow(ls, PROFILE, "obj_testPlate001", { public_state: "Closed" });
    expect(readChildObjectRows(ls, PROFILE)[0].public_state).toBe("Closed");
  });

  it("stores issued scan link metadata on the row", () => {
    const storage = new Map();
    const ls = {
      getItem(key: string) {
        return storage.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
    };
    appendChildObjectRow(ls, PROFILE, {
      object_id: "obj_testPlate001",
      object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
      public_label: "Studio door",
      public_state: "Open",
      created_at: "2026-05-16T17:00:00.000Z",
    });
    updateChildObjectRow(ls, PROFILE, "obj_testPlate001", {
      qr_id: "qr_testPlateScan01",
      scan_url: `https://humanity.llc/c/${PROFILE}?q=qr_testPlateScan01`,
    });
    expect(readChildObjectRows(ls, PROFILE)[0]).toMatchObject({
      qr_id: "qr_testPlateScan01",
      scan_url: `https://humanity.llc/c/${PROFILE}?q=qr_testPlateScan01`,
    });
  });

  it("stores disabled status on child object rows", () => {
    const storage = new Map();
    const ls = {
      getItem(key: string) {
        return storage.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
    };
    appendChildObjectRow(ls, PROFILE, {
      object_id: "obj_testPlate001",
      object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
      public_label: "Studio door",
      public_state: "Open",
      created_at: "2026-05-16T17:00:00.000Z",
    });
    updateChildObjectRow(ls, PROFILE, "obj_testPlate001", { status: "disabled" });
    expect(readChildObjectRows(ls, PROFILE)[0].status).toBe("disabled");
  });

  it("builds device rows from resolver list payload", () => {
    const rows = rowsFromNetworkChildObjects(
      PROFILE,
      [
        {
          object_id: "obj_netPlate001",
          object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
          public_label: "Studio door",
          public_state: "Open",
          status: "active",
          created_at: "2026-05-16T17:00:00.000Z",
          active_qr_id: "qr_netPlateScan1",
        },
      ],
      (profileId, qrId) => `https://humanity.llc/c/${profileId}?q=${qrId}`
    );
    expect(rows[0]).toMatchObject({
      object_id: "obj_netPlate001",
      qr_id: "qr_netPlateScan1",
      scan_url: `https://humanity.llc/c/${PROFILE}?q=qr_netPlateScan1`,
    });
  });

  it("replaces local index from network rows", () => {
    const storage = new Map();
    const ls = {
      getItem(key: string) {
        return storage.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
    };
    appendChildObjectRow(ls, PROFILE, {
      object_id: "obj_staleLocal01",
      object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
      public_label: "Stale",
      public_state: "Old",
      created_at: "2026-05-15T17:00:00.000Z",
    });
    writeChildObjectRows(
      ls,
      PROFILE,
      rowsFromNetworkChildObjects(
        PROFILE,
        [
          {
            object_id: "obj_netPlate001",
            object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
            public_label: "Studio door",
            public_state: "Open",
            created_at: "2026-05-16T17:00:00.000Z",
            active_qr_id: null,
          },
        ],
        () => "https://humanity.llc/c/x?q=y"
      )
    );
    expect(readChildObjectRows(ls, PROFILE)).toHaveLength(1);
    expect(readChildObjectRows(ls, PROFILE)[0].object_id).toBe("obj_netPlate001");
  });
});

describe("child-object issue-qr client", () => {
  it("browser signDocument accepts parent_profile_id for child_object payloads", () => {
    const src = readFileSync(join(process.cwd(), "site/js/hc-sign.mjs"), "utf8");
    const requireFields = src.slice(
      src.indexOf("function requireFields"),
      src.indexOf("export async function signDocument")
    );
    expect(requireFields).toContain("parent_profile_id");
  });

  it("exports issue-qr path and signing module for /created/", () => {
    expect(childObjectIssueQrPath("prof_1", "obj_1")).toContain("/issue-qr");
    const src = readFileSync(
      join(process.cwd(), "site/js/created-child-object.mjs"),
      "utf8"
    );
    expect(src).toContain("child-object-plate-issue-qr");
    expect(src).toContain("child-object-plate-disable");
    expect(src).toContain("registerChildObjectAndIssueScanLink");
    expect(src).toContain("issueChildObjectScanLink");
    expect(src).toContain("signChildObjectRevoke");
    expect(src).toContain("postChildObjectRevoke");
  });

  it("exports lost-item relay client wiring for /created/", () => {
    const src = readFileSync(
      join(process.cwd(), "site/js/created-child-object-lost-item.mjs"),
      "utf8"
    );
    expect(src).toContain("child-object-relay-issue-qr");
    expect(src).toContain("child-object-relay-disable");
    expect(src).toContain("CHILD_OBJECT_TYPE_LOST_ITEM_RELAY");
    expect(src).toContain("registerChildObjectAndIssueScanLink");
    expect(src).toContain("issueChildObjectScanLink");
    expect(src).toContain("signChildObjectRevoke");
    expect(src).toContain("refreshChildObjectsFromNetwork");
  });
});

describe("created-child-object-core", () => {
  it("hides disabled status plates from active list", () => {
    expect(
      isActiveStatusPlateRow({
        object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
        public_label: "Door",
        public_state: "Open",
      })
    ).toBe(true);
    expect(
      isActiveStatusPlateRow({
        object_type: CHILD_OBJECT_TYPE_STATUS_PLATE,
        public_label: "Door",
        public_state: "Closed",
        status: CHILD_OBJECT_STATUS_DISABLED,
      })
    ).toBe(false);
  });

  it("offers add status plate only for general root cards", () => {
    expect(shouldOfferAddStatusPlate({ pilot_template: "general" })).toBe(true);
    expect(shouldOfferAddStatusPlate({ pilot_template: "status_plate" })).toBe(false);
    expect(
      shouldOfferAddStatusPlate({ manifesto_line: "Studio door\nOpen until 9 PM" })
    ).toBe(false);
  });

  it("validates status plate child fields", () => {
    expect(
      parseStatusPlateChildFields("Studio door", "Open until 9 PM")
    ).toEqual({
      publicLabel: "Studio door",
      publicState: "Open until 9 PM",
    });
    expect(() => parseStatusPlateChildFields("", "Open")).toThrow(/required/i);
    expect(() => parseStatusPlateChildFields("x".repeat(121), "Open")).toThrow(/120/);
    expect(() => parseStatusPlateChildFields("Door", "x".repeat(281))).toThrow(/280/);
  });

  it("validates status plate child state updates", () => {
    expect(parseStatusPlateChildState("Open until 9 PM")).toEqual({
      publicState: "Open until 9 PM",
    });
    expect(() => parseStatusPlateChildState("")).toThrow(/required/i);
    expect(() => parseStatusPlateChildState("x".repeat(281))).toThrow(/280/);
  });

  it("hides disabled lost-item relays from active list", () => {
    expect(
      isActiveLostItemRelayRow({
        object_type: CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
        public_label: "Keys",
        public_state: "Lost",
      })
    ).toBe(true);
    expect(
      isActiveLostItemRelayRow({
        object_type: CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
        public_label: "Keys",
        public_state: "Found",
        status: CHILD_OBJECT_STATUS_DISABLED,
      })
    ).toBe(false);
  });

  it("offers add lost-item relay only for general root cards", () => {
    expect(shouldOfferAddLostItemRelay({ pilot_template: "general" })).toBe(true);
    expect(shouldOfferAddLostItemRelay({ pilot_template: "lost_item_relay" })).toBe(false);
  });

  it("validates lost-item relay child fields", () => {
    expect(
      parseLostItemRelayChildFields("House keys", "Lost — contact owner through relay")
    ).toEqual({
      publicLabel: "House keys",
      publicState: "Lost — contact owner through relay",
    });
    expect(() => parseLostItemRelayChildFields("", "Lost")).toThrow(/required/i);
    expect(() => parseLostItemRelayChildState("")).toThrow(/required/i);
  });
});

describe("created-child-object-game-node-core", () => {
  it("offers add game node when organizer issuer key is registered", () => {
    expect(shouldOfferAddGameNode({ pilot_template: "general" })).toBe(false);
    expect(
      shouldOfferAddGameNode({
        pilot_template: "general",
        issuer_public_key: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      })
    ).toBe(true);

    expect(
      parseGameNodeChildFields("Main square relay", "relay_gate", "downtown", "my_city_season_01")
    ).toEqual({
      publicLabel: "Main square relay",
      nodeRole: "relay_gate",
      district: "downtown",
      seasonId: "my_city_season_01",
    });

    expect(
      isActiveGameNodeRow({
        object_type: CHILD_OBJECT_TYPE_GAME_NODE,
        public_label: "Lantern",
        public_state: "Dormant",
      })
    ).toBe(true);
    expect(
      isActiveGameNodeRow({
        object_type: CHILD_OBJECT_TYPE_GAME_NODE,
        public_label: "Lantern",
        public_state: "Dormant",
        status: CHILD_OBJECT_STATUS_DISABLED,
      })
    ).toBe(false);

    const payload = buildGameNodeRegisterUnsigned({
      profileId: "abc123",
      seasonId: "my_city_season_01",
      publicLabel: "River lantern",
      nodeRole: "temp_drop",
      district: "river",
    });
    expect(payload.object_type).toBe("game_node");
    expect(payload.season_id).toBe("my_city_season_01");
    expect(payload.node_role).toBe("temp_drop");
  });

  it("created game node module wires register + issue flow", () => {
    const src = readFileSync(
      join(process.cwd(), "site/js/created-child-object-game-node.mjs"),
      "utf8"
    );
    expect(src).toContain("initCreatedGameNode");
    expect(src).toContain("signGameNodeChildObjectCreate");
    expect(src).toContain("registerChildObjectAndIssueScanLink");
    expect(src).toContain("child-object-game-node-bulk");
  });
});
