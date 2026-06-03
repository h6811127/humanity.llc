import { describe, expect, it } from "vitest";

import {
  OBJECT_CUSTODY_DISCLAIMER,
  parseObjectCustody,
  resolveChildCustodyContext,
  resolveObjectCustodyPhase,
  validateCustodyForChildDocument,
} from "../src/live-object/custody";

describe("live-object custody (Layer 1)", () => {
  it("parses optional custody with holder_label, until, and note", () => {
    const custody = parseObjectCustody({
      custody: {
        holder_label: "@river_gallery",
        until: "2026-06-14T22:00:00-05:00",
        note: "On loan for June show",
      },
    });
    expect(custody?.holder_label).toBe("@river_gallery");
    expect(custody?.note).toBe("On loan for June show");
  });

  it("requires holder_label when custody is present", () => {
    expect(() =>
      parseObjectCustody({
        custody: { until: "2026-06-14T22:00:00-05:00" },
      })
    ).toThrow(/holder_label is required/);
  });

  it("rejects custody on game_node documents", () => {
    expect(() =>
      validateCustodyForChildDocument(
        { custody: { holder_label: "Volunteer desk" } },
        "game_node"
      )
    ).toThrow(/status_plate and lost_item_relay/);
  });

  it("resolves active and expired custody phases", () => {
    const custody = parseObjectCustody({
      custody: {
        holder_label: "Tool library desk",
        until: "2026-06-14T22:00:00-05:00",
      },
    });
    expect(
      resolveObjectCustodyPhase(custody, new Date("2026-06-10T12:00:00.000Z"))
    ).toBe("active");
    expect(
      resolveObjectCustodyPhase(custody, new Date("2026-06-20T12:00:00.000Z"))
    ).toBe("expired");
  });

  it("builds scan line and disclaimer for active custody", () => {
    const applied = resolveChildCustodyContext({
      documentJson: JSON.stringify({
        custody: {
          holder_label: "River gallery",
          until: "2026-06-14T22:00:00-05:00",
          note: "On loan for June show",
        },
      }),
      now: new Date("2026-06-10T12:00:00.000Z"),
    });
    expect(applied.context?.phase).toBe("active");
    expect(applied.context?.scanLine).toMatch(/^Held by River gallery/);
    expect(applied.context?.scanNote).toContain("On loan for June show");
    expect(applied.context?.scanNote).toContain(OBJECT_CUSTODY_DISCLAIMER);
  });

  it("shows ended note when custody expired", () => {
    const applied = resolveChildCustodyContext({
      documentJson: JSON.stringify({
        custody: {
          holder_label: "River gallery",
          until: "2026-06-01T12:00:00.000Z",
        },
      }),
      now: new Date("2026-06-10T12:00:00.000Z"),
    });
    expect(applied.context?.phase).toBe("expired");
    expect(applied.context?.scanLine).toBeNull();
    expect(applied.context?.scanNote).toMatch(/custody assignment has ended/i);
  });
});
