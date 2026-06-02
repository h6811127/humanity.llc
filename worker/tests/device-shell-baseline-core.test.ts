import { describe, expect, it } from "vitest";

import {
  compareShellBaselineSnapshots,
  shellBaselineToSnapshot,
  sumBaselineBytes,
} from "../scripts/device-shell-baseline-core.mjs";

describe("device-shell-baseline-core (unit)", () => {
  it("compareShellBaselineSnapshots passes identical snapshots", () => {
    const snap = shellBaselineToSnapshot({
      assetVersion: 82,
      moduleCount: 2,
      jsModules: [{ file: "js/a.mjs", bytes: 100 }],
      jsBytesTotal: 100,
      shellCss: [{ file: "css/device-shell.css", bytes: 50 }],
      shellCssBytesTotal: 50,
      landingCss: [{ file: "styles.css", bytes: 200 }],
      landingCssBytesTotal: 200,
      transferBytesShellGraph: 150,
      transferBytesLandingFirstPaint: 300,
    });
    expect(compareShellBaselineSnapshots(snap, snap).ok).toBe(true);
  });

  it("sumBaselineBytes sums only present files", () => {
    expect(
      sumBaselineBytes([
        { file: "a", bytes: 5 },
        { file: "b", bytes: 7 },
      ])
    ).toBe(12);
  });
});
