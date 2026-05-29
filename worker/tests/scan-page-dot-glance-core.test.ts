import { describe, expect, it } from "vitest";

import { scanOverlayQuickAction } from "../../site/js/device-dot-state-core.mjs";
import {
  renderScanDotExplainerHtml,
  scanGlancePrimaryAction,
  scanPageDotAriaLabel,
} from "../../site/js/scan-page-dot-glance-core.mjs";

describe("scanOverlayQuickAction", () => {
  it("returns in-page scan actions for overlays", () => {
    expect(scanOverlayQuickAction("cross_tab_keys")).toEqual({
      kind: "scan_focus_other_tab",
      label: "Open that tab",
    });
    expect(scanOverlayQuickAction("proof_waiting")).toEqual({
      kind: "scan_scroll_live_proof",
      label: "Go to live proof",
    });
  });
});

describe("scanGlancePrimaryAction", () => {
  it("prefers overlay actions over device defaults", () => {
    expect(
      scanGlancePrimaryAction({ kind: "open_controls", label: "Open controls" }, "cross_tab_keys")
    ).toEqual({ kind: "scan_focus_other_tab", label: "Open that tab" });
  });

  it("maps hub-style controls to scan vouch navigation", () => {
    expect(
      scanGlancePrimaryAction({ kind: "open_controls", label: "Open controls" }, "none")
    ).toEqual({ kind: "scan_go_vouch", label: "Go to vouch" });
    expect(
      scanGlancePrimaryAction({ kind: "create_card", label: "Create a card", href: "/create/" }, "none")
    ).toEqual({ kind: "scan_use_keys_here", label: "Take control here" });
  });
});

describe("renderScanDotExplainerHtml", () => {
  it("renders lead copy and a primary button without duplicating next", () => {
    const html = renderScanDotExplainerHtml(
      {
        now: "Ownership not loaded in this tab.",
        why: "Resolver is online.",
        next: "Take control here to attest.",
      },
      { kind: "scan_use_keys_here", label: "Take control here" }
    );
    expect(html).toContain("scan-page-dot-glance-now");
    expect(html).toContain("Ownership not loaded in this tab.");
    expect(html).toContain('data-scan-dot-action="scan_use_keys_here"');
    expect(html).not.toContain("scan-page-dot-glance-next");
  });
});

describe("scanPageDotAriaLabel", () => {
  it("uses checking copy while resolver health is in flight", () => {
    expect(
      scanPageDotAriaLabel({
        networkResolved: false,
        online: true,
        network: "ok",
        device: "none",
        overlay: "none",
      })
    ).toBe("Your device: checking connection. Tap for details.");
  });

  it("describes steward readiness when resolved", () => {
    expect(
      scanPageDotAriaLabel({
        networkResolved: true,
        online: true,
        network: "ok",
        device: "steward",
        overlay: "none",
      })
    ).toBe("Your device: steward control ready in this tab. Tap for details.");
  });

  it("distinguishes wallet saved from tab signing (P0-5)", () => {
    expect(
      scanPageDotAriaLabel({
        networkResolved: true,
        online: true,
        network: "ok",
        device: "none",
        overlay: "none",
        walletKeysNotInTab: true,
      })
    ).toBe(
      "Your device: ownership saved on device, not in this tab. Tap for details."
    );
    expect(
      scanPageDotAriaLabel({
        networkResolved: true,
        online: true,
        network: "ok",
        device: "keys",
        overlay: "none",
      })
    ).toBe("Your device: ownership saved in this tab. Tap for details.");
  });
});
