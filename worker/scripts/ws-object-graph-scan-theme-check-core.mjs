/**
 * Playwright dark-theme checks for cabinet scan graph (launch checklist proxy).
 * @see docs/WS_OBJECT_GRAPH_LAUNCH_V1.md
 */

/**
 * @param {{
 *   dataTheme: string | null;
 *   colorScheme: string;
 *   graphHeadingVisible: boolean;
 *   missingRowCount: number;
 * }} snapshot
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertScanGraphDarkTheme(snapshot) {
  if (snapshot.dataTheme !== "dark") {
    return {
      ok: false,
      message: `expected data-theme="dark", got ${snapshot.dataTheme ?? "null"}`,
    };
  }
  if (snapshot.colorScheme !== "dark") {
    return {
      ok: false,
      message: `expected color-scheme dark, got ${snapshot.colorScheme}`,
    };
  }
  if (!snapshot.graphHeadingVisible) {
    return { ok: false, message: "scan graph heading not visible in dark mode" };
  }
  if (snapshot.missingRowCount < 2) {
    return {
      ok: false,
      message: `expected ≥2 Missing graph rows in dark mode, got ${snapshot.missingRowCount}`,
    };
  }
  return { ok: true };
}

/**
 * @param {import("playwright").Page} page
 * @param {string} cabinetScan
 */
export async function readScanGraphDarkThemeSnapshot(page, cabinetScan) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("hc_theme", "dark");
    } catch {
      /* ignore */
    }
  });
  await page.goto(cabinetScan, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.theme === "dark" &&
      (document.querySelector("#scan-object-graph-heading") ||
        document.querySelector(".scan-live-check--ready")),
    { timeout: 45000 }
  );
  await page.locator("summary.scan-game-state-summary").click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);

  return page.evaluate(() => {
    const heading = document.querySelector("#scan-object-graph-heading");
    const missingRows = document.querySelectorAll(
      ".scan-object-graph-status"
    );
    let missingCount = 0;
    for (const node of missingRows) {
      if ((node.textContent ?? "").trim() === "Missing") missingCount += 1;
    }
    return {
      dataTheme: document.documentElement.dataset.theme ?? null,
      colorScheme: getComputedStyle(document.documentElement).colorScheme || "",
      graphHeadingVisible: Boolean(heading),
      missingRowCount: missingCount,
    };
  });
}

/**
 * @param {{
 *   cabinetScan: string;
 *   outDir?: string;
 *   repoRoot?: string;
 *   captureScreenshot?: boolean;
 *   record: (step: string, ok: boolean, detail: string) => void;
 * }} input
 */
export async function runCabinetScanDarkThemeCheck(input) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    const snapshot = await readScanGraphDarkThemeSnapshot(page, input.cabinetScan);
    const result = assertScanGraphDarkTheme(snapshot);
    input.record(
      "dark mode scan graph",
      result.ok,
      result.ok ? "data-theme dark · graph visible · ≥2 Missing rows" : result.message
    );

    if (input.captureScreenshot && input.outDir && result.ok) {
      const graph = page.locator("#scan-object-graph-heading").locator(
        'xpath=ancestor::section[contains(@class,"scan-object-graph")]'
      );
      if (await graph.count()) {
        const { mkdirSync } = await import("node:fs");
        const { join } = await import("node:path");
        mkdirSync(input.outDir, { recursive: true });
        const path = join(input.outDir, "cabinet-dual-gate-mobile-dark-check.png");
        await graph.screenshot({ path });
        input.record(
          "dark mode screenshot",
          true,
          input.repoRoot ? path.replace(`${input.repoRoot}/`, "") : path
        );
      }
    }
  } finally {
    await page.close();
    await browser.close();
  }
}
