import { describe, expect, it } from "vitest";

import {
  CHILD_OBJECT_REGISTER_SUBMIT_LABEL,
  childObjectRegisterProgressLabel,
  childObjectRegisterSuccessMessage,
} from "../../site/js/child-object-register-issue-core.mjs";

describe("childObjectRegisterSuccessMessage", () => {
  it("celebrates combined register + scan link", () => {
    expect(
      childObjectRegisterSuccessMessage({
        objectType: "status_plate",
        scanUrl: "https://humanity.llc/c/p?q=qr_1",
        issueFailed: false,
      })
    ).toMatch(/scan link ready/i);
  });

  it("falls back when issue-qr fails after create", () => {
    expect(
      childObjectRegisterSuccessMessage({
        objectType: "lost_item_relay",
        issueFailed: true,
      })
    ).toMatch(/Issue scan link below/i);
  });
});

describe("childObjectRegisterProgressLabel", () => {
  it("mentions issuing scan link", () => {
    expect(childObjectRegisterProgressLabel("status_plate")).toMatch(/issuing scan link/i);
    expect(childObjectRegisterProgressLabel("lost_item_relay")).toMatch(/issuing scan link/i);
  });
});

describe("CHILD_OBJECT_REGISTER_SUBMIT_LABEL", () => {
  it("matches /created/ submit buttons", () => {
    expect(CHILD_OBJECT_REGISTER_SUBMIT_LABEL).toBe("Register & issue scan link");
  });
});
