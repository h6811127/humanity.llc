import { describe, expect, it } from "vitest";

import { setupManageTabHintVisible } from "../../site/js/created-workspace-manage-visibility-core.mjs";
import {
  LIVE_CONTROL_SIGNING_KEYS_MISSING,
  SETUP_DONE_PANEL_LEAD,
  SETUP_MANAGE_TAB_HINT,
  STEWARD_REVIEW_QUEUE_MANAGE_HINT,
} from "../../site/js/device-ownership-copy-core.mjs";

describe("setupManageTabHintVisible (RC-13)", () => {
  it("shows hint only during setup mode", () => {
    expect(setupManageTabHintVisible("setup")).toBe(true);
    expect(setupManageTabHintVisible("control")).toBe(false);
    expect(setupManageTabHintVisible("view")).toBe(false);
  });
});

describe("RC-13 Manage tab copy", () => {
  it("uses Manage tab naming in setup and steward pointers", () => {
    expect(SETUP_MANAGE_TAB_HINT).toMatch(/Manage tab/i);
    expect(SETUP_DONE_PANEL_LEAD).toMatch(/Manage/i);
    expect(LIVE_CONTROL_SIGNING_KEYS_MISSING).toMatch(/Manage/i);
    expect(STEWARD_REVIEW_QUEUE_MANAGE_HINT).toMatch(/Manage/i);
    expect(SETUP_MANAGE_TAB_HINT).not.toMatch(/Advanced/i);
    expect(LIVE_CONTROL_SIGNING_KEYS_MISSING).not.toMatch(/Advanced/i);
  });
});
