import { describe, expect, it } from "vitest";

import {
  CREATED_COLLAPSED_PASS_QUERY,
  isCollapsedPassRoot,
  isLegacyFlatChildMatch,
} from "../../site/js/created-collapsed-pass-core.mjs";

describe("created-collapsed-pass-core", () => {
  it("?collapsed=1 forces collapsed pass", () => {
    expect(
      isCollapsedPassRoot({
        searchParams: new URLSearchParams(`${CREATED_COLLAPSED_PASS_QUERY}=1`),
        session: { pilot_template: "general" },
        childRows: [],
      })
    ).toBe(true);
  });

  it("0 children + inferred status_plate manifesto is collapsed", () => {
    expect(
      isCollapsedPassRoot({
        searchParams: new URLSearchParams(""),
        session: {
          pilot_template: "general",
          manifesto_line: "Studio door\nOpen until 9 PM",
        },
        childRows: [],
      })
    ).toBe(true);
  });

  it("general manifesto without pilot encoding is not collapsed", () => {
    expect(
      isCollapsedPassRoot({
        searchParams: new URLSearchParams(""),
        session: {
          pilot_template: "general",
          manifesto_line: "Studio account",
        },
        childRows: [],
      })
    ).toBe(false);
  });

  it("1 child with manifesto 1:1 match is collapsed", () => {
    const session = {
      pilot_template: "general",
      manifesto_line: "Studio door\nOpen until 9 PM",
    };
    const child = {
      object_id: "obj_1",
      object_type: "status_plate",
      public_label: "Studio door",
      public_state: "Open until 9 PM",
      status: "active",
    };
    expect(isLegacyFlatChildMatch(session, child)).toBe(true);
    expect(
      isCollapsedPassRoot({
        searchParams: new URLSearchParams(""),
        session,
        childRows: [child],
      })
    ).toBe(true);
  });
});
