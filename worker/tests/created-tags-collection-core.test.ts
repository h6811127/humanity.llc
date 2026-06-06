import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CREATED_TAGS_COLLECTION_FLAG_KEY,
  isCreatedTagsCollectionFlagEnabled,
} from "../../site/js/created-tags-collection-flag-core.mjs";
import {
  CREATED_TAGS_COLLECTION_ADD_LABEL,
  CREATED_TAGS_COLLECTION_EMPTY_LABEL,
  createdTagsCollectionCountLabel,
  createdTagsCollectionLeadLabel,
  createdTagsCollectionRowIdentity,
  isActiveChildObjectRow,
  listCreatedTagsCollectionRows,
  shouldMountCreatedTagsCollection,
  shouldShowCreatedTagsCollection,
} from "../../site/js/created-tags-collection-core.mjs";

const PROFILE = "prof_tags_collection_test";

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

const GENERAL_SESSION = {
  profile_id: PROFILE,
  pilot_template: "general",
  handle: "studio",
};

const SIGN_ROW = {
  object_id: "obj_sign_1",
  object_type: "status_plate",
  public_label: "Front door",
  public_state: "Open",
  status: "active",
};

describe("created-tags-collection-core", () => {
  it("labels count in collection title", () => {
    expect(createdTagsCollectionCountLabel(0)).toBe("Attached QRs");
    expect(createdTagsCollectionCountLabel(10)).toBe("Attached QRs (10)");
  });

  it("frames collection under the root handle", () => {
    expect(createdTagsCollectionLeadLabel("studio")).toBe(
      "Scan points controlled by @studio's root QR."
    );
    expect(createdTagsCollectionLeadLabel(null)).toBe(
      "Scan points controlled by this root's root QR."
    );
  });

  it("uses root-network row subtitles", () => {
    expect(createdTagsCollectionRowIdentity("status_plate", "studio")).toBe(
      "Sign · under @studio"
    );
    expect(createdTagsCollectionRowIdentity("game_node", "studio")).toBe(
      "Checkpoint · under @studio"
    );
  });

  it("exports add and empty copy", () => {
    expect(CREATED_TAGS_COLLECTION_ADD_LABEL).toBe("Add QR");
    expect(CREATED_TAGS_COLLECTION_EMPTY_LABEL).toBe(
      "No attached QRs yet. Add a sign, tag, or checkpoint controlled by this root."
    );
  });

  it("filters inactive rows", () => {
    expect(isActiveChildObjectRow({ ...SIGN_ROW, status: "disabled" })).toBe(false);
    expect(isActiveChildObjectRow(SIGN_ROW)).toBe(true);
  });

  it("shows collection for general root with tags or add hub", () => {
    storage.setItem(`hc_child_objects_v1:${PROFILE}`, JSON.stringify([SIGN_ROW]));
    expect(shouldShowCreatedTagsCollection(GENERAL_SESSION, PROFILE, storage)).toBe(true);
    storage.setItem(`hc_child_objects_v1:${PROFILE}`, JSON.stringify([]));
    expect(shouldShowCreatedTagsCollection(GENERAL_SESSION, PROFILE, storage)).toBe(true);
  });

  it("does not mount when created-collection flag is enabled", () => {
    storage.setItem(`hc_child_objects_v1:${PROFILE}`, JSON.stringify([SIGN_ROW]));
    expect(
      shouldMountCreatedTagsCollection(
        new URLSearchParams("tags_collection=1&collection=1"),
        storage,
        GENERAL_SESSION,
        PROFILE
      )
    ).toBe(false);
  });
});

describe("created-tags-collection-flag-core", () => {
  it("reads query and localStorage flag", () => {
    expect(
      isCreatedTagsCollectionFlagEnabled(new URLSearchParams("tags_collection=1"), storage)
    ).toBe(true);
    storage.setItem(CREATED_TAGS_COLLECTION_FLAG_KEY, "1");
    expect(isCreatedTagsCollectionFlagEnabled(new URLSearchParams(""), storage)).toBe(true);
  });
});

describe("created tags collection page shell", () => {
  it("exposes dom ids expected by initCreatedTagsCollection", () => {
    const html = readFileSync(join(process.cwd(), "site/created/index.html"), "utf8");
    for (const id of [
      "created-tags-collection",
      "created-tags-count",
      "created-tags-lead",
      "created-tags-empty",
      "created-tags-list",
      "created-tags-add-btn",
      "created-tags-manage-panel",
      "created-tags-manage-title",
      "created-tags-manage-subtitle",
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("Attached QRs");
    expect(html).toContain("Manage attached QR");
  });
});
