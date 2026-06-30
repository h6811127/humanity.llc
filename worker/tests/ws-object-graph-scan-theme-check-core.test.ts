import { describe, expect, it } from "vitest";

import { assertScanGraphDarkTheme } from "../scripts/ws-object-graph-scan-theme-check-core.mjs";

describe("ws-object-graph-scan-theme-check-core", () => {
  it("assertScanGraphDarkTheme passes for pending dual-gate graph", () => {
    expect(
      assertScanGraphDarkTheme({
        dataTheme: "dark",
        colorScheme: "dark",
        graphHeadingVisible: true,
        missingRowCount: 2,
      })
    ).toEqual({ ok: true });
  });

  it("assertScanGraphDarkTheme fails when theme not dark", () => {
    const result = assertScanGraphDarkTheme({
      dataTheme: null,
      colorScheme: "light",
      graphHeadingVisible: true,
      missingRowCount: 2,
    });
    expect(result.ok).toBe(false);
  });
});
