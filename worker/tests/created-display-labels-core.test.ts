import { describe, expect, it } from "vitest";

import {
  CHILD_OBJECT_REGISTER_SUBMIT_LABEL,
  CREATED_ADD_CHECKPOINT_TITLE,
  CREATED_ADD_FIRST_LOST_ITEM_TAG_TITLE,
  CREATED_ADD_FIRST_SIGN_TITLE,
  CREATED_ADD_HUB_SUMMARY,
  CREATED_ADD_LOST_ITEM_TAG_TITLE,
  CREATED_ADD_SIGN_TITLE,
  CREATED_CONNECTION_DETAILS_SUMMARY,
  CREATED_SETUP_FINISH_LABEL,
} from "../../site/js/created-display-labels-core.mjs";

describe("created-display-labels-core", () => {
  it("exports steward-facing presentation labels", () => {
    expect(CHILD_OBJECT_REGISTER_SUBMIT_LABEL).toBe("Create QR");
    expect(CREATED_CONNECTION_DETAILS_SUMMARY).toBe("Connection details");
    expect(CREATED_SETUP_FINISH_LABEL).toBe("Continue");
    expect(CREATED_ADD_HUB_SUMMARY).toBe("Add another…");
    expect(CREATED_ADD_SIGN_TITLE).toBe("Add another sign");
    expect(CREATED_ADD_LOST_ITEM_TAG_TITLE).toBe("Add another lost-item tag");
    expect(CREATED_ADD_CHECKPOINT_TITLE).toBe("Add another checkpoint");
  });

  it("ships distinct first-time and repeat sign/tag titles", () => {
    expect(CREATED_ADD_FIRST_SIGN_TITLE).toBe("Add your first sign");
    expect(CREATED_ADD_FIRST_LOST_ITEM_TAG_TITLE).toBe("Add your first lost-item tag");
  });
});
