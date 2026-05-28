import { describe, expect, it } from "vitest";

import {
  formatCreateRequiredFieldsMessage,
  validateCreateFormFields,
} from "../../site/js/create-form-validation-core.mjs";

describe("create-form-validation-core", () => {
  it("lists all missing fields for empty status plate submit", () => {
    const result = validateCreateFormFields("status_plate", "", {
      objectLabel: "",
      statusLine: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Handle, Object name, and Status line are required.");
      expect(result.missingFieldIds).toEqual(["handle", "object-label", "status-line"]);
    }
  });

  it("lists pilot fields when handle is valid on status plate", () => {
    const result = validateCreateFormFields("status_plate", "river_example", {
      objectLabel: "",
      statusLine: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Object name and Status line are required.");
    }
  });

  it("lists all missing fields for empty lost item relay", () => {
    const result = validateCreateFormFields("lost_item_relay", "", {
      relayItem: "",
      relayMessage: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Handle, Item name, and Return message are required.");
    }
  });

  it("accepts complete general form", () => {
    const result = validateCreateFormFields("general", "river_example", {
      manifesto: "Hello world",
    });
    expect(result).toEqual({ ok: true, handle: "river_example" });
  });

  it("formats two-field message", () => {
    expect(formatCreateRequiredFieldsMessage(["Handle", "Public statement"])).toBe(
      "Handle and Public statement are required."
    );
  });
});
