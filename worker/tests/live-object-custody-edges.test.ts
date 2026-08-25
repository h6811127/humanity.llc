import { describe, expect, it } from "vitest";

import {
  OBJECT_CUSTODY_DISCLAIMER,
  custodyFromChildDocumentJson,
  objectCustodyStatusPayload,
  parseObjectCustody,
  resolveChildCustodyContext,
  resolveObjectCustodyPhase,
  type ObjectCustodyScanContext,
} from "../src/live-object/custody";

const UNTIL = "2026-06-14T22:00:00.000Z";

function activeContext(
  overrides: Partial<ObjectCustodyScanContext> = {}
): ObjectCustodyScanContext {
  return {
    phase: "active",
    holder_label: "River gallery",
    until: UNTIL,
    note: "On loan",
    scanLine: "Held by River gallery · until Sat, Jun 14, 10:00 PM",
    scanNote: `On loan ${OBJECT_CUSTODY_DISCLAIMER}`,
    disclaimer: OBJECT_CUSTODY_DISCLAIMER,
    ...overrides,
  };
}

describe("parseObjectCustody validation edges", () => {
  it("rejects a non-object custody field", () => {
    expect(() => parseObjectCustody({ custody: "River gallery" })).toThrow(
      /custody must be an object/
    );
  });

  it("rejects empty or overlong holder_label and note", () => {
    expect(() => parseObjectCustody({ custody: { holder_label: "   " } })).toThrow(
      /holder_label must be a non-empty string/
    );
    expect(() =>
      parseObjectCustody({ custody: { holder_label: "x".repeat(81) } })
    ).toThrow(/holder_label is too long/);
    expect(() =>
      parseObjectCustody({
        custody: { holder_label: "Desk", note: "n".repeat(121) },
      })
    ).toThrow(/note is too long/);
  });

  it("rejects until that is not ISO 8601", () => {
    expect(() =>
      parseObjectCustody({
        custody: { holder_label: "Desk", until: "2026-06-14 22:00" },
      })
    ).toThrow(/until must be ISO 8601/);
    expect(() =>
      parseObjectCustody({
        custody: { holder_label: "Desk", until: "June 14" },
      })
    ).toThrow(/until must be ISO 8601/);
  });
});

describe("resolveObjectCustodyPhase exclusive expiry", () => {
  const custody = parseObjectCustody({
    custody: { holder_label: "Desk", until: UNTIL },
  });

  it("stays active at the until instant and expires only after", () => {
    expect(resolveObjectCustodyPhase(custody, new Date(UNTIL))).toBe("active");
    expect(
      resolveObjectCustodyPhase(custody, new Date("2026-06-14T22:00:00.001Z"))
    ).toBe("expired");
  });

  it("treats missing until as active and missing custody as unset", () => {
    expect(
      resolveObjectCustodyPhase(
        parseObjectCustody({ custody: { holder_label: "Desk" } }),
        new Date("2099-01-01T00:00:00.000Z")
      )
    ).toBe("active");
    expect(resolveObjectCustodyPhase(null)).toBe("unset");
  });
});

describe("custodyFromChildDocumentJson", () => {
  it("returns null for blank, invalid JSON, or invalid custody shape", () => {
    expect(custodyFromChildDocumentJson(null)).toBeNull();
    expect(custodyFromChildDocumentJson("   ")).toBeNull();
    expect(custodyFromChildDocumentJson("{")).toBeNull();
    expect(
      custodyFromChildDocumentJson(JSON.stringify({ custody: "nope" }))
    ).toBeNull();
    expect(
      custodyFromChildDocumentJson(
        JSON.stringify({ custody: { until: UNTIL } })
      )
    ).toBeNull();
  });

  it("parses a valid custody object from child document JSON", () => {
    expect(
      custodyFromChildDocumentJson(
        JSON.stringify({
          custody: { holder_label: "Desk", until: UNTIL, note: "Loan" },
        })
      )
    ).toEqual({
      holder_label: "Desk",
      until: UNTIL,
      note: "Loan",
    });
  });
});

describe("objectCustodyStatusPayload", () => {
  it("omits unset or missing context from the public status body", () => {
    expect(objectCustodyStatusPayload(null)).toBeNull();
    expect(
      objectCustodyStatusPayload(activeContext({ phase: "unset" }))
    ).toBeNull();
  });

  it("publishes phase fields without scanLine or scanNote", () => {
    const payload = objectCustodyStatusPayload(activeContext());
    expect(payload).toEqual({
      phase: "active",
      holder_label: "River gallery",
      until: UNTIL,
      note: "On loan",
      disclaimer: OBJECT_CUSTODY_DISCLAIMER,
    });
    expect(payload).not.toHaveProperty("scanLine");
    expect(payload).not.toHaveProperty("scanNote");
  });

  it("still publishes expired custody so scanners see the ended assignment", () => {
    const applied = resolveChildCustodyContext({
      documentJson: JSON.stringify({
        custody: { holder_label: "River gallery", until: UNTIL },
      }),
      now: new Date("2026-06-20T12:00:00.000Z"),
    });
    expect(applied.context?.phase).toBe("expired");
    expect(objectCustodyStatusPayload(applied.context)).toMatchObject({
      phase: "expired",
      holder_label: "River gallery",
      until: UNTIL,
    });
  });
});
