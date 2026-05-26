import { describe, expect, it } from "vitest";

import {
  appendDotDiagLog,
  countPopoverOpensWithoutAction,
  countStateFlaps,
  normalizeDotDiagEntry,
} from "../../site/js/device-dot-diagnostics-core.mjs";

describe("normalizeDotDiagEntry", () => {
  it("tags legacy transition rows", () => {
    expect(
      normalizeDotDiagEntry({ from: "ok:keys", to: "ok:steward", at: "t" })
    ).toEqual({
      type: "state_transition",
      from: "ok:keys",
      to: "ok:steward",
      at: "t",
    });
  });

  it("keeps typed rows", () => {
    expect(normalizeDotDiagEntry({ type: "popover_open", at: "t" })).toEqual({
      type: "popover_open",
      at: "t",
    });
  });
});

describe("appendDotDiagLog", () => {
  it("prepends and caps the ring buffer", () => {
    const log = [{ type: "dot_click", at: "1" }];
    const next = appendDotDiagLog(log, { type: "popover_open" }, 2);
    expect(next).toHaveLength(2);
    expect(next[0]?.type).toBe("popover_open");
    expect(next[1]?.type).toBe("dot_click");
  });
});

describe("confusion signals", () => {
  it("counts popover opens without a follow-up action", () => {
    const log = [
      { type: "popover_open", at: "3" },
      { type: "popover_open", at: "2" },
      { type: "quick_action", action: "retry", at: "1" },
    ];
    expect(countPopoverOpensWithoutAction(log)).toBe(2);
  });

  it("counts rapid state transitions in a window", () => {
    const now = Date.now();
    const log = [
      { type: "state_transition", from: "a", to: "b", at: new Date(now).toISOString() },
      {
        type: "state_transition",
        from: "b",
        to: "c",
        at: new Date(now - 2000).toISOString(),
      },
      {
        type: "state_transition",
        from: "c",
        to: "d",
        at: new Date(now - 4000).toISOString(),
      },
    ];
    expect(countStateFlaps(log, 15_000, 3)).toBe(3);
  });
});
