import { describe, expect, it } from "vitest";

import { CREATED_COLLECTION_FLAG_KEY } from "../../site/js/created-collection-flag-core.mjs";
import {
  CREATED_TAGS_ADVANCED_EDITOR_LEAD,
  CREATED_TAGS_ADVANCED_EDITOR_SUMMARY,
  shouldApplyTagsAdvancedDemotion,
  tagsAdvancedEditorDefaultOpen,
  tagsAdvancedEditorOpenStateForProfile,
  tagsAdvancedEditorShouldBeOpen,
} from "../../site/js/created-tags-advanced-editor-core.mjs";
import { CREATED_TAGS_COLLECTION_FLAG_KEY } from "../../site/js/created-tags-collection-flag-core.mjs";

const PROFILE = "prof_tags_advanced_editor";

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
  object_id: "obj_sign_advanced",
  object_type: "status_plate",
  public_label: "Front door",
  public_state: "Open",
  status: "active",
};

describe("created-tags-advanced-editor-core", () => {
  it("exports Advanced editor copy", () => {
    expect(CREATED_TAGS_ADVANCED_EDITOR_SUMMARY).toBe("Advanced editor");
    expect(CREATED_TAGS_ADVANCED_EDITOR_LEAD).toContain("custody");
  });

  it("opens Advanced by default only at zero attached QRs", () => {
    expect(tagsAdvancedEditorDefaultOpen(0)).toBe(true);
    expect(tagsAdvancedEditorDefaultOpen(1)).toBe(false);
    expect(tagsAdvancedEditorDefaultOpen(10)).toBe(false);
  });

  it("respects forced-open override for deploy/setup flows", () => {
    expect(tagsAdvancedEditorShouldBeOpen(3, { forcedOpen: true })).toBe(true);
    expect(tagsAdvancedEditorShouldBeOpen(3, { forcedOpen: false })).toBe(false);
  });

  it("derives open state from stored child rows", () => {
    storage.setItem(`hc_child_objects_v1:${PROFILE}`, JSON.stringify([]));
    expect(tagsAdvancedEditorOpenStateForProfile(storage, PROFILE)).toBe(true);
    storage.setItem(`hc_child_objects_v1:${PROFILE}`, JSON.stringify([SIGN_ROW]));
    expect(tagsAdvancedEditorOpenStateForProfile(storage, PROFILE)).toBe(false);
  });

  it("does not apply demotion when collection shelf flag is on", () => {
    storage.setItem(CREATED_TAGS_COLLECTION_FLAG_KEY, "1");
    storage.setItem(CREATED_COLLECTION_FLAG_KEY, "1");
    storage.setItem(`hc_child_objects_v1:${PROFILE}`, JSON.stringify([SIGN_ROW]));
    expect(
      shouldApplyTagsAdvancedDemotion(
        new URLSearchParams("tags_collection=1&collection=1"),
        storage,
        GENERAL_SESSION,
        PROFILE
      )
    ).toBe(false);
  });

  it("applies demotion when tags collection flag is on alone", () => {
    storage.data.clear();
    storage.setItem(CREATED_TAGS_COLLECTION_FLAG_KEY, "1");
    storage.setItem(`hc_child_objects_v1:${PROFILE}`, JSON.stringify([SIGN_ROW]));
    expect(
      shouldApplyTagsAdvancedDemotion(
        new URLSearchParams("tags_collection=1"),
        storage,
        GENERAL_SESSION,
        PROFILE
      )
    ).toBe(true);
  });
});
