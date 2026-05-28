import { describe, expect, it } from "vitest";

import {
  CREATE_HANDLE_INVALID_MESSAGE,
  validateCreateHandle,
} from "../../site/js/create-handle-validation-core.mjs";

describe("validateCreateHandle", () => {
  it("rejects handles shorter than 3 characters", () => {
    expect(validateCreateHandle("AB")).toEqual({
      ok: false,
      message: CREATE_HANDLE_INVALID_MESSAGE,
    });
  });

  it("accepts valid handles", () => {
    expect(validateCreateHandle("river_example")).toEqual({
      ok: true,
      normalized: "river_example",
    });
  });

  it("rejects reserved handles", () => {
    expect(validateCreateHandle("admin")).toEqual({
      ok: false,
      message: "Handle is reserved. Choose a different handle.",
    });
  });
});
