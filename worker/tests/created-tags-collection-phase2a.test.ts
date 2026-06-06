import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CREATED_COLLECTION_FLAG_KEY } from "../../site/js/created-collection-flag-core.mjs";
import {
  CREATED_TAGS_COLLECTION_FLAG_KEY,
  isCreatedTagsCollectionFlagEnabled,
} from "../../site/js/created-tags-collection-flag-core.mjs";
import { shouldMountCreatedTagsCollection } from "../../site/js/created-tags-collection-core.mjs";
import {
  CREATED_TAGS_MANAGE_ADVANCED_CUE,
  CREATED_TAGS_MANAGE_OPEN_SCAN_LABEL,
  CREATED_TAGS_MANAGE_PANEL_TITLE,
  CREATED_TAGS_MANAGE_UPDATE_STATUS_LABEL,
  createdTagsManageInlineEditorTarget,
  createdTagsManagePanelPresentation,
} from "../../site/js/created-tags-manage-panel-core.mjs";
import { buildCreatedTagsCollectionRowElement } from "../../site/js/hub-child-object-row-render.mjs";

const PROFILE = "prof_tags_collection_phase2a";

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
  object_id: "obj_sign_phase2a",
  object_type: "status_plate",
  public_label: "Front door",
  public_state: "Open",
  status: "active",
  scan_url: "https://humanity.llc/scan/obj_sign_phase2a",
};

function mockDocument() {
  vi.stubGlobal("document", {
    createElement(tag: string) {
      const el = {
        tagName: tag.toUpperCase(),
        className: "",
        classList: {
          add(value: string) {
            el.className = `${el.className} ${value}`.trim();
          },
        },
        dataset: {} as Record<string, string>,
        innerHTML: "",
        tabIndex: undefined as number | undefined,
        _attrs: {} as Record<string, string>,
        setAttribute(name: string, value: string) {
          el._attrs[name] = value;
        },
        getAttribute(name: string) {
          return el._attrs[name] ?? null;
        },
      };
      return el;
    },
  });
}

describe("created-tags-collection Phase 2A row interactivity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps rows read-only when interactive is false", () => {
    mockDocument();
    const row = buildCreatedTagsCollectionRowElement(SIGN_ROW, {
      rootHandle: "studio",
      interactive: false,
    }) as {
      getAttribute: (name: string) => string | null;
      tabIndex?: number;
      className: string;
      innerHTML: string;
    };

    expect(row.getAttribute("aria-readonly")).toBe("true");
    expect(row.getAttribute("role")).toBeNull();
    expect(row.tabIndex).toBeUndefined();
    expect(row.className).not.toContain("created-tags-collection-row--interactive");
    expect(row.innerHTML).not.toContain("hub-card-action");
  });

  it("marks rows interactive when tags_collection flag path is on", () => {
    mockDocument();
    const row = buildCreatedTagsCollectionRowElement(SIGN_ROW, {
      rootHandle: "studio",
      interactive: true,
    }) as {
      getAttribute: (name: string) => string | null;
      tabIndex?: number;
      className: string;
      innerHTML: string;
    };

    expect(row.getAttribute("role")).toBe("button");
    expect(row.tabIndex).toBe(0);
    expect(row.getAttribute("aria-readonly")).toBeNull();
    expect(row.className).toContain("created-tags-collection-row--interactive");
    expect(row.innerHTML).not.toContain("hub-card-action");
  });
});

describe("created-tags-collection Phase 2A manage panel", () => {
  it("renders manage panel title and root-child subtitle", () => {
    const presentation = createdTagsManagePanelPresentation(SIGN_ROW, "studio");
    expect(presentation.title).toBe(CREATED_TAGS_MANAGE_PANEL_TITLE);
    expect(presentation.subtitle).toBe("Sign · under @studio");
    expect(presentation.name).toBe("Front door");
    expect(presentation.statusLabel).toBe("Open");
    expect(presentation.canOpenScan).toBe(true);
    expect(presentation.canUpdateStatus).toBe(true);
  });

  it("exports action labels and advanced editor cue", () => {
    expect(CREATED_TAGS_MANAGE_OPEN_SCAN_LABEL).toBe("Open scan page");
    expect(CREATED_TAGS_MANAGE_UPDATE_STATUS_LABEL).toBe("Update status");
    expect(CREATED_TAGS_MANAGE_ADVANCED_CUE).toContain("Advanced editor below");
  });

  it("maps inline editor targets for update status handoff", () => {
    expect(createdTagsManageInlineEditorTarget("status_plate")?.canFocusUpdate).toBe(true);
    expect(createdTagsManageInlineEditorTarget("lost_item_relay")?.canFocusUpdate).toBe(true);
    expect(createdTagsManageInlineEditorTarget("game_node")?.canFocusUpdate).toBe(false);
  });

  it("exposes manage panel dom ids in /created/ shell", () => {
    const html = readFileSync(join(process.cwd(), "site/created/index.html"), "utf8");
    for (const id of [
      "created-tags-manage-root",
      "created-tags-manage-panel",
      "created-tags-manage-title",
      "created-tags-manage-subtitle",
      "created-tags-manage-open-scan",
      "created-tags-manage-update-status",
      "created-tags-manage-close",
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("Manage attached QR");
  });
});

describe("created-tags-collection flag mutual exclusion", () => {
  it("suppresses tags collection when created-collection flag is on", () => {
    storage.setItem(CREATED_TAGS_COLLECTION_FLAG_KEY, "1");
    storage.setItem(CREATED_COLLECTION_FLAG_KEY, "1");
    storage.setItem(`hc_child_objects_v1:${PROFILE}`, JSON.stringify([SIGN_ROW]));

    expect(isCreatedTagsCollectionFlagEnabled(new URLSearchParams(""), storage)).toBe(true);
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
