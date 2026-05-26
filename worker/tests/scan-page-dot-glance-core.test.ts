import { describe, expect, it } from "vitest";

import {
  renderScanDotExplainerHtml,
  scanGlancePrimaryAction,
} from "../../site/js/scan-page-dot-glance-core.mjs";

describe("scanGlancePrimaryAction", () => {
  it("maps overlays to in-page scan actions", () => {
    expect(scanGlancePrimaryAction(null, "proof_waiting")).toEqual({
      kind: "scan_scroll_live_proof",
      label: "Go to live proof",
    });
    expect(scanGlancePrimaryAction(null, "cross_tab_keys")).toEqual({
      kind: "scan_focus_other_tab",
      label: "Open that tab",
    });
    expect(scanGlancePrimaryAction(null, "card_disabled_since_visit")).toEqual({
      kind: "scan_scroll_notice",
      label: "Review notice",
    });
  });

  it("maps hub-style actions to scan scroll / use keys", () => {
    expect(
      scanGlancePrimaryAction({ kind: "open_controls", label: "Open controls" }, "none")
    ).toEqual({ kind: "scan_go_vouch", label: "Go to vouch" });
    expect(
      scanGlancePrimaryAction({ kind: "create_card", label: "Create a card", href: "/create/" }, "none")
    ).toEqual({ kind: "scan_use_keys_here", label: "Use keys here" });
  });
});

describe("renderScanDotExplainerHtml", () => {
  it("renders Now/Why/Next and a primary button", () => {
    const html = renderScanDotExplainerHtml(
      {
        now: "No saved keys.",
        why: "Resolver online.",
        next: "Use keys here.",
      },
      { kind: "scan_use_keys_here", label: "Use keys here" }
    );
    expect(html).toContain("Your device on this scan");
    expect(html).toContain("<strong>Now:</strong>");
    expect(html).toContain('data-scan-dot-action="scan_use_keys_here"');
    expect(html).not.toContain("<script");
  });
});
