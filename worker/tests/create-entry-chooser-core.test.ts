import { describe, expect, it } from "vitest";

import {
  CREATE_ENTRY_DOORS,
  createEntryDoorById,
  defaultTemplateForCreateEntry,
  shouldSkipCreateEntryChooser,
} from "../../site/js/create-entry-chooser-core.mjs";

describe("shouldSkipCreateEntryChooser", () => {
  it("shows chooser on bare /create/", () => {
    expect(shouldSkipCreateEntryChooser(new URLSearchParams(""))).toBe(false);
  });

  it("skips for template, intent, and merch ref deep links", () => {
    expect(shouldSkipCreateEntryChooser(new URLSearchParams("template=status_plate"))).toBe(
      true
    );
    expect(shouldSkipCreateEntryChooser(new URLSearchParams("intent=deploy"))).toBe(true);
    expect(shouldSkipCreateEntryChooser(new URLSearchParams("intent=game"))).toBe(true);
    expect(shouldSkipCreateEntryChooser(new URLSearchParams("intent=wear"))).toBe(true);
    expect(shouldSkipCreateEntryChooser(new URLSearchParams("intent=general"))).toBe(true);
    expect(shouldSkipCreateEntryChooser(new URLSearchParams("hc_ref=scan_customize"))).toBe(
      true
    );
  });
});

describe("defaultTemplateForCreateEntry", () => {
  it("maps deploy intent to status plate", () => {
    expect(
      defaultTemplateForCreateEntry(new URLSearchParams("intent=deploy"))
    ).toBe("status_plate");
  });

  it("maps wear intent to general", () => {
    expect(defaultTemplateForCreateEntry(new URLSearchParams("intent=wear"))).toBe("general");
  });

  it("maps general intent to general template", () => {
    expect(defaultTemplateForCreateEntry(new URLSearchParams("intent=general"))).toBe("general");
  });

  it("maps legacy template params", () => {
    expect(
      defaultTemplateForCreateEntry(new URLSearchParams("template=lost_item"))
    ).toBe("lost_item_relay");
  });
});

describe("CREATE_ENTRY_DOORS", () => {
  it("lists steward paths only (no player play door)", () => {
    expect(CREATE_ENTRY_DOORS.map((d) => d.title)).toEqual([
      "Your @handle",
      "Live status on something",
      "Live status on you",
    ]);
    expect(createEntryDoorById("account")?.sub).toMatch(/control updates/i);
    expect(createEntryDoorById("account")?.intent).toBe("general");
    expect(createEntryDoorById("wear")?.href).toContain("glitch_hoodie_v1");
    expect(createEntryDoorById("play")).toBeNull();
  });
});
