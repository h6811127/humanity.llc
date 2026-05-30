import { describe, expect, it } from "vitest";

import {
  browserAlertBackgroundCopy,
  browserAlertWhileOpenCopy,
  controlHereDetail,
  controlHereEyebrow,
  crossTabAggregateTitle,
  crossTabPresenceFallbackLabel,
  dotOverlayCrossTabPhrase,
  inboxAriaManagingInOtherContext,
  inboxAriaOrphanManagingElsewhere,
  keysInOtherContextDetail,
  keysInOtherContextEyebrow,
  otherContextPresenceExtra,
  shellSurfaceFromStandalone,
  statusKeyCrossTabLine,
} from "../../site/js/device-shell-copy-core.mjs";

describe("shellSurfaceFromStandalone", () => {
  it("maps standalone flag to surface", () => {
    expect(shellSurfaceFromStandalone(true)).toBe("standalone");
    expect(shellSurfaceFromStandalone(false)).toBe("browser");
  });
});

describe("standalone shell copy", () => {
  it("uses app/window/Safari language", () => {
    expect(controlHereEyebrow("standalone")).toBe("Active here");
    expect(controlHereDetail("standalone")).toContain("this app");
    expect(keysInOtherContextEyebrow("standalone")).toBe("Keys in Safari");
    expect(keysInOtherContextDetail("standalone")).toContain("Safari");
    expect(crossTabAggregateTitle(1, "standalone")).toBe("Managing in Safari");
    expect(crossTabAggregateTitle(2, "standalone")).toBe("Managing in 2 other windows");
    expect(crossTabPresenceFallbackLabel("standalone")).toBe("Other window");
    expect(dotOverlayCrossTabPhrase("standalone")).toBe("managing in Safari");
    expect(statusKeyCrossTabLine("standalone")).toContain("Safari");
    expect(otherContextPresenceExtra(1, "standalone")).toBe(" (+1 other window)");
    expect(inboxAriaManagingInOtherContext(2, "", "standalone")).toContain("other windows");
    expect(inboxAriaOrphanManagingElsewhere("", "standalone")).toContain("elsewhere");
    expect(browserAlertBackgroundCopy(true, "standalone")).toContain("this app");
    expect(browserAlertWhileOpenCopy("standalone")).toContain("this app");
  });

  it("keeps browser tab language in browser surface", () => {
    expect(controlHereEyebrow("browser")).toBe("Active in this tab");
    expect(crossTabAggregateTitle(1, "browser")).toBe("Managing in 1 other tab");
    expect(dotOverlayCrossTabPhrase("browser")).toBe("managing in another tab");
    expect(browserAlertBackgroundCopy(false, "browser")).toContain("this tab");
  });
});
