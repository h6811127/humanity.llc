import { describe, expect, it } from "vitest";

import {
  applyCreatedControlPageTarget,
  buildCreatedControlPagePath,
} from "../../site/js/created-control-page-url-core.mjs";
import { childObjectHubFocusHash } from "../../site/js/hub-child-object-row-core.mjs";

describe("created-control-page-url-core", () => {
  it("appends object_id when collection flag is enabled", () => {
    expect(
      buildCreatedControlPagePath({
        profileId: "prof_1",
        qrId: "qr_test",
        objectId: "obj_a",
        focus: "update-status",
        collectionFlagEnabled: true,
      })
    ).toBe("/created/?profile_id=prof_1&qr_id=qr_test&object_id=obj_a#update-status");
  });

  it("root control URL does not append object_id", () => {
    expect(
      buildCreatedControlPagePath({
        profileId: "prof_1",
        qrId: "qr_test",
        focus: "update-status",
        collectionFlagEnabled: true,
      })
    ).toBe("/created/?profile_id=prof_1&qr_id=qr_test#update-status");
  });

  it("legacy child handoff keeps child-object hash when flag is off", () => {
    expect(
      buildCreatedControlPagePath({
        profileId: "prof_1",
        qrId: "qr_test",
        objectId: "obj_a",
        focus: "update-status",
        collectionFlagEnabled: false,
      })
    ).toBe(
      `/created/?profile_id=prof_1&qr_id=qr_test#${childObjectHubFocusHash("obj_a")}`
    );
  });

  it("applyCreatedControlPageTarget mutates an existing URL", () => {
    const url = new URL("https://humanity.invalid/created/?profile_id=prof_1&qr_id=qr_test");
    applyCreatedControlPageTarget(url, {
      focus: "update-status",
      objectId: "obj_b",
      collectionFlagEnabled: true,
    });
    expect(url.searchParams.get("object_id")).toBe("obj_b");
    expect(url.hash).toBe("#update-status");
  });
});
