import { describe, expect, it } from "vitest";

import { buildPublicObjectSnapshot } from "../src/resolver/object-snapshot";

describe("buildPublicObjectSnapshot", () => {
  it("returns null when no object_streams", () => {
    expect(
      buildPublicObjectSnapshot("Studio door\nOpen until 9 PM", [])
    ).toBeNull();
  });

  it("assembles status plate manifesto and stream fields", () => {
    const snapshot = buildPublicObjectSnapshot("Studio door\nOpen until 9 PM", [
      { id: "hours", class: "place", label: "Special hours", value: "Thursday closes at 6 PM" },
    ]);
    expect(snapshot).toEqual({
      text: "Studio door · Open until 9 PM · Special hours: Thursday closes at 6 PM",
      fields: [
        { key: "object", value: "Studio door" },
        { key: "status", value: "Open until 9 PM" },
        { key: "Special hours", value: "Thursday closes at 6 PM" },
      ],
    });
  });

  it("assembles live object statement and streams", () => {
    const snapshot = buildPublicObjectSnapshot(
      "Neighborhood tool library · Closed for inventory until Tuesday",
      [{ id: "returns", class: "care", label: "Returns due", value: "Cordless drill" }]
    );
    expect(snapshot?.text).toContain("Neighborhood tool library");
    expect(snapshot?.text).toContain("Returns due: Cordless drill");
  });

  it("skips lost-item relay layouts", () => {
    expect(
      buildPublicObjectSnapshot("[relay] Keys\nFound - thank you", [
        { id: "note", class: "narrative", label: "Note", value: "At front desk" },
      ])
    ).toBeNull();
  });
});
