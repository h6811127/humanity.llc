import { describe, expect, it } from "vitest";

import type { ScanCapability } from "../src/live-object/scan-capabilities";
import { resolveSuccessionScanContext } from "../src/live-object/succession-spec";
import type { ObjectTimePolicyScanContext } from "../src/live-object/time-policy";
import type { ScanViewModel } from "../src/resolver/scan-state";

function timePolicy(
  phase: ObjectTimePolicyScanContext["phase"],
  scanNote: string | null
): ObjectTimePolicyScanContext {
  return {
    phase,
    scanNote,
    chip: null,
    schedulePublicState: null,
    graceEndsAt: null,
  };
}

function vm(overrides: Partial<ScanViewModel> = {}): ScanViewModel {
  return {
    kind: "active",
    capabilities: [],
    childTimePolicy: null,
    ...overrides,
  } as ScanViewModel;
}

function archiveCap(state: string, available = true): ScanCapability {
  return { verb: "archive", available, state };
}

describe("resolveSuccessionScanContext", () => {
  it("archives revoked card and QR scans with the same steward-disabled note", () => {
    const expected = {
      phase: "archived",
      scanNote:
        "This object was disabled by its steward. The URL may still resolve for audit and last public state.",
    };
    expect(resolveSuccessionScanContext(vm({ kind: "card_revoked" }))).toEqual(expected);
    expect(resolveSuccessionScanContext(vm({ kind: "qr_revoked" }))).toEqual(expected);
  });

  it("does not treat other inactive kinds as archived", () => {
    expect(resolveSuccessionScanContext(vm({ kind: "card_suspended" })).phase).toBe("live");
    expect(resolveSuccessionScanContext(vm({ kind: "qr_expired" })).phase).toBe("live");
    expect(resolveSuccessionScanContext(vm({ kind: "qr_replaced" })).phase).toBe("live");
  });

  it("maps archive capability states to sunset notes", () => {
    expect(
      resolveSuccessionScanContext(vm({ capabilities: [archiveCap("season_ended")] }))
    ).toEqual({
      phase: "sunset",
      scanNote: "Season ended — public state is read-only until a new act opens.",
    });
    expect(
      resolveSuccessionScanContext(vm({ capabilities: [archiveCap("season_not_open")] }))
    ).toEqual({
      phase: "sunset",
      scanNote: "Season not open yet — object readable, game actions asleep.",
    });
    expect(
      resolveSuccessionScanContext(vm({ capabilities: [archiveCap("dormant")] }))
    ).toEqual({
      phase: "sunset",
      scanNote: "Object dormant — readable public state only.",
    });
    expect(
      resolveSuccessionScanContext(vm({ capabilities: [archiveCap("after")] }))
    ).toEqual({
      phase: "sunset",
      scanNote: "Published window ended — last signed state only.",
    });
    expect(
      resolveSuccessionScanContext(vm({ capabilities: [archiveCap("outside_schedule")] }))
    ).toEqual({
      phase: "sunset",
      scanNote: "Outside published hours — schedule may resume later.",
    });
  });

  it("keeps grace and care_pause archive states live", () => {
    expect(
      resolveSuccessionScanContext(vm({ capabilities: [archiveCap("grace")] }))
    ).toEqual({
      phase: "live",
      scanNote: "Recall grace — steward may update before archive.",
    });
    expect(
      resolveSuccessionScanContext(vm({ capabilities: [archiveCap("care_pause")] }))
    ).toEqual({
      phase: "live",
      scanNote: "Maintenance pause — care stream overrides game copy.",
    });
  });

  it("ignores unavailable or unknown archive capabilities and falls through", () => {
    expect(
      resolveSuccessionScanContext(vm({ capabilities: [archiveCap("season_ended", false)] }))
    ).toEqual({ phase: "live", scanNote: null });
    expect(
      resolveSuccessionScanContext(vm({ capabilities: [archiveCap("fallback")] }))
    ).toEqual({ phase: "live", scanNote: null });
    expect(
      resolveSuccessionScanContext(
        vm({
          capabilities: [archiveCap("fallback")],
          childTimePolicy: timePolicy("after", "Window closed."),
        })
      )
    ).toEqual({ phase: "sunset", scanNote: "Window closed." });
  });

  it("uses child time-policy after/grace when archive does not decide", () => {
    expect(
      resolveSuccessionScanContext(
        vm({ childTimePolicy: timePolicy("after", "Last signed state.") })
      )
    ).toEqual({ phase: "sunset", scanNote: "Last signed state." });
    expect(
      resolveSuccessionScanContext(
        vm({ childTimePolicy: timePolicy("grace", "Steward can still edit.") })
      )
    ).toEqual({ phase: "live", scanNote: "Steward can still edit." });
    expect(
      resolveSuccessionScanContext(vm({ childTimePolicy: timePolicy("live", "Open now.") }))
    ).toEqual({ phase: "live", scanNote: null });
  });

  it("lets a deciding archive capability win over child time-policy", () => {
    expect(
      resolveSuccessionScanContext(
        vm({
          capabilities: [archiveCap("season_ended")],
          childTimePolicy: timePolicy("grace", "Still in grace."),
        })
      )
    ).toEqual({
      phase: "sunset",
      scanNote: "Season ended — public state is read-only until a new act opens.",
    });
    expect(
      resolveSuccessionScanContext(
        vm({
          capabilities: [archiveCap("grace")],
          childTimePolicy: timePolicy("after", "Window closed."),
        })
      )
    ).toEqual({
      phase: "live",
      scanNote: "Recall grace — steward may update before archive.",
    });
  });

  it("lets revoked kinds win over archive and time-policy hints", () => {
    expect(
      resolveSuccessionScanContext(
        vm({
          kind: "qr_revoked",
          capabilities: [archiveCap("grace")],
          childTimePolicy: timePolicy("after", "Window closed."),
        })
      ).phase
    ).toBe("archived");
  });
});
