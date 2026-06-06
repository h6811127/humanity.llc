import { afterEach, describe, expect, it, vi } from "vitest";

import {
  appendChildObjectRow,
  updateChildObjectRow,
  writeChildObjectRows,
} from "../../site/js/child-object-store-core.mjs";
import { CREATED_TAGS_COLLECTION_SYNC_EVENT } from "../../site/js/created-tags-collection-sync-core.mjs";

const PROFILE = "prof_child_store_sync";

/** @type {Storage} */
const storage = {
  data: new Map(),
  getItem(key) {
    return this.data.get(key) ?? null;
  },
  setItem(key, value) {
    this.data.set(key, value);
  },
};

const SIGN_ROW = {
  object_id: "obj_sign_sync",
  object_type: "status_plate",
  public_label: "Front door",
  public_state: "Open",
  status: "active",
};

describe("child-object-store-core tags collection sync", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dispatches tags collection sync when rows are written", () => {
    const events = [];
    vi.stubGlobal("window", {
      dispatchEvent(event) {
        events.push(event.type);
        return true;
      },
    });

    writeChildObjectRows(storage, PROFILE, [SIGN_ROW]);
    appendChildObjectRow(storage, PROFILE, {
      ...SIGN_ROW,
      object_id: "obj_sign_sync_2",
      public_label: "Back door",
    });
    updateChildObjectRow(storage, PROFILE, "obj_sign_sync", { public_state: "Closed" });

    expect(events).toEqual([
      CREATED_TAGS_COLLECTION_SYNC_EVENT,
      CREATED_TAGS_COLLECTION_SYNC_EVENT,
      CREATED_TAGS_COLLECTION_SYNC_EVENT,
    ]);
  });
});
