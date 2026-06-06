import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CREATED_COLLECTION_FLAG_KEY } from "../../site/js/created-collection-flag-core.mjs";
import {
  CREATED_TAGS_ADVANCED_EDITOR_SUMMARY,
  shouldApplyTagsAdvancedDemotion,
  tagsAdvancedEditorDefaultOpen,
} from "../../site/js/created-tags-advanced-editor-core.mjs";
import { expandTagsAdvancedEditor } from "../../site/js/created-tags-advanced-editor-expand.mjs";
import { CREATED_TAGS_COLLECTION_FLAG_KEY } from "../../site/js/created-tags-collection-flag-core.mjs";
import { shouldMountCreatedTagsCollection } from "../../site/js/created-tags-collection-core.mjs";
import { CREATED_TAGS_MANAGE_ADVANCED_CUE } from "../../site/js/created-tags-manage-panel-core.mjs";

const PROFILE = "prof_tags_collection_phase2b";

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
  object_id: "obj_sign_phase2b",
  object_type: "status_plate",
  public_label: "Front door",
  public_state: "Open",
  status: "active",
  scan_url: "https://humanity.llc/scan/obj_sign_phase2b",
};

describe("created-tags-collection Phase 2B Advanced demotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes Advanced editor shell ids", () => {
    const html = readFileSync(join(process.cwd(), "site/created/index.html"), "utf8");
    for (const id of ["created-tags-advanced-editor", "created-tags-advanced-editor-lead"]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain(CREATED_TAGS_ADVANCED_EDITOR_SUMMARY);
  });

  it("uses Phase 2B manage panel advanced cue", () => {
    expect(CREATED_TAGS_MANAGE_ADVANCED_CUE).toBe("Advanced controls are still available below.");
  });

  it("collapses Advanced by default when attached count is at least one", () => {
    expect(tagsAdvancedEditorDefaultOpen(1)).toBe(false);
    expect(tagsAdvancedEditorDefaultOpen(3)).toBe(false);
  });

  it("opens Advanced by default when attached count is zero", () => {
    expect(tagsAdvancedEditorDefaultOpen(0)).toBe(true);
  });

  it("keeps legacy mount gate off when tags flag is disabled", () => {
    storage.setItem(`hc_child_objects_v1:${PROFILE}`, JSON.stringify([SIGN_ROW]));
    expect(
      shouldApplyTagsAdvancedDemotion(
        new URLSearchParams(""),
        storage,
        GENERAL_SESSION,
        PROFILE
      )
    ).toBe(false);
    expect(
      shouldMountCreatedTagsCollection(
        new URLSearchParams(""),
        storage,
        GENERAL_SESSION,
        PROFILE
      )
    ).toBe(false);
  });

  it("still suppresses tags collection when collection shelf flag is on", () => {
    storage.setItem(CREATED_TAGS_COLLECTION_FLAG_KEY, "1");
    storage.setItem(CREATED_COLLECTION_FLAG_KEY, "1");
    storage.setItem(`hc_child_objects_v1:${PROFILE}`, JSON.stringify([SIGN_ROW]));
    expect(
      shouldMountCreatedTagsCollection(
        new URLSearchParams("tags_collection=1&collection=1"),
        storage,
        GENERAL_SESSION,
        PROFILE
      )
    ).toBe(false);
    expect(
      shouldApplyTagsAdvancedDemotion(
        new URLSearchParams("tags_collection=1&collection=1"),
        storage,
        GENERAL_SESSION,
        PROFILE
      )
    ).toBe(false);
  });

  it("expandTagsAdvancedEditor opens Advanced wrapper and hub", () => {
    const advanced = {
      hidden: true,
      open: false,
      scrollIntoView: vi.fn(),
    };
    const hub = {
      hidden: true,
      open: false,
      scrollIntoView: vi.fn(),
    };
    vi.stubGlobal("document", {
      getElementById(id) {
        if (id === "created-tags-advanced-editor") return advanced;
        if (id === "child-object-add-hub") return hub;
        return null;
      },
    });

    expandTagsAdvancedEditor();

    expect(advanced.hidden).toBe(false);
    expect(advanced.open).toBe(true);
    expect(hub.hidden).toBe(false);
    expect(hub.open).toBe(true);
    expect(hub.scrollIntoView).toHaveBeenCalled();
  });
});
