import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  createdLiveProofPollShouldRun,
  createdLiveProofPendingPollShouldRun,
  liveProofPanelMostlyVisible,
  shouldScrollLiveProofPanelIntoView,
} from "../../site/js/created-live-proof-poll-core.mjs";

describe("createdLiveProofPendingPollShouldRun", () => {
  it("polls in view mode when the tab is visible", () => {
    expect(
      createdLiveProofPendingPollShouldRun({ documentVisible: true })
    ).toBe(true);
    expect(
      createdLiveProofPendingPollShouldRun({ documentVisible: false })
    ).toBe(false);
  });
});

describe("created view-mode pending live-proof wiring", () => {
  it("wires the pending watcher into created.mjs view mode", () => {
    const src = readFileSync(join(process.cwd(), "site/js/created.mjs"), "utf8");
    expect(src).toContain(
      'import { initCreatedLiveProofPendingWatch } from "./created-live-proof-pending-watch.mjs";'
    );
    expect(src).toContain("initCreatedLiveProofPendingWatch({");
    expect(src).toContain("onRestoreKeys: () => focusCreatedViewRestore");
  });
});

describe("createdLiveProofPollShouldRun", () => {
  it("requires visible document and signing keys", () => {
    expect(
      createdLiveProofPollShouldRun({
        documentVisible: true,
        hasSigningKeys: true,
      })
    ).toBe(true);
    expect(
      createdLiveProofPollShouldRun({
        documentVisible: false,
        hasSigningKeys: true,
      })
    ).toBe(false);
    expect(
      createdLiveProofPollShouldRun({
        documentVisible: true,
        hasSigningKeys: false,
      })
    ).toBe(false);
  });
});

describe("liveProofPanelMostlyVisible", () => {
  it("is true when panel top sits in upper viewport with enough visible height", () => {
    expect(
      liveProofPanelMostlyVisible({
        panelTop: 80,
        panelBottom: 220,
        viewportHeight: 800,
      })
    ).toBe(true);
  });

  it("is false when panel is below the fold", () => {
    expect(
      liveProofPanelMostlyVisible({
        panelTop: 620,
        panelBottom: 760,
        viewportHeight: 800,
      })
    ).toBe(false);
  });

  it("is false when less than min visible px shows", () => {
    expect(
      liveProofPanelMostlyVisible({
        panelTop: -60,
        panelBottom: 10,
        viewportHeight: 800,
      })
    ).toBe(false);
  });
});

describe("shouldScrollLiveProofPanelIntoView", () => {
  it("scrolls on poll discovery or deeplink when panel is not mostly visible", () => {
    expect(
      shouldScrollLiveProofPanelIntoView({
        reason: "poll_discovered",
        panelMostlyVisible: false,
      })
    ).toBe(true);
    expect(
      shouldScrollLiveProofPanelIntoView({
        reason: "deeplink",
        panelMostlyVisible: false,
      })
    ).toBe(true);
    expect(
      shouldScrollLiveProofPanelIntoView({
        reason: "visibility_resume",
        panelMostlyVisible: false,
      })
    ).toBe(true);
  });

  it("does not scroll when panel is already salient", () => {
    expect(
      shouldScrollLiveProofPanelIntoView({
        reason: "poll_discovered",
        panelMostlyVisible: true,
      })
    ).toBe(false);
  });
});
