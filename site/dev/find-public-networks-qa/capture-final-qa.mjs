/**
 * Final QA screenshots — Find public networks. Not CI.
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = dirname(fileURLToPath(import.meta.url));
mkdirSync(outDir, { recursive: true });

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8788";

async function waitLoaded(page) {
  await page.goto(`${base}/play/season/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Wake the city" }).waitFor({ timeout: 15000 });
}

async function main() {
  const browser = await chromium.launch();
  try {
    const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await waitLoaded(desktop);
    await desktop.screenshot({
      path: join(outDir, "desktop-find-public-networks.png"),
      fullPage: true,
    });

    await desktop.getByLabel("Search public networks").fill("cedar");
    await desktop.getByRole("button", { name: /^City games/ }).click();
    await desktop.locator(".public-networks-filter-btn--active", { hasText: "City games" }).waitFor();
    await desktop.screenshot({
      path: join(outDir, "search-filter-cedar-city-games.png"),
      fullPage: true,
    });

    await desktop.locator(".public-networks-card", { hasText: "Wake the city" }).screenshot({
      path: join(outDir, "cedar-rapids-card.png"),
    });

    await desktop.getByRole("button", { name: /^All/ }).click();
    await desktop.getByLabel("Search public networks").fill("zzznomatchzzz");
    await desktop.getByText(/No public networks match that search/i).waitFor();
    await desktop.screenshot({
      path: join(outDir, "search-no-result.png"),
      fullPage: true,
    });

    await desktop.getByLabel("Search public networks").fill("");
    await desktop.getByRole("button", { name: /^Markets/ }).click();
    await desktop.locator(".public-networks-card__status", { hasText: "Prototype" }).waitFor();
    await desktop.getByRole("button", { name: /^Events/ }).click();
    await desktop.locator(".public-networks-card__status", { hasText: "Coming soon" }).first().waitFor();

    await desktop.getByLabel("Search public networks").fill("cedar");
    await desktop.getByRole("button", { name: /^City games/ }).click();
    await desktop.getByRole("link", { name: "Open board" }).click();
    await desktop.waitForURL(/\/play\/cedar-rapids\/map\//);
    await desktop.waitForTimeout(2000);
    await desktop.screenshot({
      path: join(outDir, "cedar-rapids-board-open.png"),
      fullPage: true,
    });
    await desktop.close();

    const iPhone = devices["iPhone 13"];
    const mobile = await browser.newPage({ ...iPhone });
    await waitLoaded(mobile);
    await mobile.screenshot({
      path: join(outDir, "mobile-find-public-networks.png"),
      fullPage: true,
    });
    await mobile.close();

    console.log("Wrote QA screenshots to", outDir);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
