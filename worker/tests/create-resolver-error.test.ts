import { describe, expect, it } from "vitest";

import { formatCreateResolverError } from "../../site/js/create-resolver-error-core.mjs";

describe("formatCreateResolverError", () => {
  it("strips API URLs from handle validation errors", () => {
    expect(
      formatCreateResolverError(
        {
          message:
            "Handle must be 3–32 chars: lowercase letter, then letters, digits, or underscores. (https://humanity.llc/.well-known/hc/v1/cards)",
        },
        400
      )
    ).toBe(
      "Handle must be 3–32 characters: start with a lowercase letter, then letters, digits, or underscores."
    );
  });

  it("maps duplicate handle without URL", () => {
    expect(
      formatCreateResolverError(
        {
          error: "HANDLE_TAKEN",
          message: "Handle is already taken. (https://humanity.llc/.well-known/hc/v1/cards)",
        },
        409
      )
    ).toBe("Handle is already taken.");
  });
});
