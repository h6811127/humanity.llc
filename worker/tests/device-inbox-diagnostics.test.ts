import { describe, expect, it } from "vitest";

import {
  appendInboxDiagLog,
  countInboxOpensWithoutAction,
  normalizeInboxDiagEntry,
} from "../../site/js/device-inbox-diagnostics-core.mjs";

describe("normalizeInboxDiagEntry", () => {
  it("keeps typed rows", () => {
    expect(
      normalizeInboxDiagEntry({ type: "inbox_open", source: "badge", at: "t" })
    ).toEqual({
      type: "inbox_open",
      source: "badge",
      at: "t",
    });
  });

  it("rejects rows without type", () => {
    expect(normalizeInboxDiagEntry({ source: "badge" })).toBeNull();
  });
});

describe("appendInboxDiagLog", () => {
  it("prepends and caps the ring buffer", () => {
    const log = [{ type: "inbox_open", source: "badge", at: "1" }];
    const next = appendInboxDiagLog(log, { type: "inbox_item_action", kind: "live_proof" }, 2);
    expect(next).toHaveLength(2);
    expect(next[0]?.type).toBe("inbox_item_action");
    expect(next[1]?.type).toBe("inbox_open");
  });
});

describe("countInboxOpensWithoutAction", () => {
  it("counts opens until a row action or OS click", () => {
    const log = [
      { type: "inbox_open", source: "glance", at: "4" },
      { type: "inbox_open", source: "badge", at: "3" },
      { type: "inbox_item_action", kind: "live_proof", at: "2" },
      { type: "inbox_open", source: "badge", at: "1" },
    ];
    expect(countInboxOpensWithoutAction(log)).toBe(2);
  });

  it("stops counting at os_notification_click (newest-first log)", () => {
    const log = [
      { type: "inbox_open", source: "badge", at: "2" },
      { type: "os_notification_click", at: "1" },
    ];
    expect(countInboxOpensWithoutAction(log)).toBe(1);
  });
});
