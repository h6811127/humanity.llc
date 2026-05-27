import { test, expect, type Page } from "@playwright/test";

/**
 * Scan hero tier-4 plate + Path 2 settle (automates SCAN_HERO_CARD_VISUAL_SPEC step 5 / DEVICE_OS_QA P1-SD 8–9).
 * @see docs/SCAN_HERO_CARD_VISUAL_SPEC.md
 *
 * Fixtures: `npm run site:generate-scan-e2e-fixture`
 */

const SCAN_ACTIVE = "/e2e-fixtures/scan-active.html";
const SCAN_REVOKED = "/e2e-fixtures/scan-revoked.html";

async function gotoScan(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#scan-safety-header.scan-hero")).toBeVisible();
}

test.describe("scan hero visual (tier 4)", () => {
  test("light: raised plate uses hero fill and shadow, not whole-card green", async ({
    page,
  }) => {
    await gotoScan(page, SCAN_ACTIVE);

    const hero = page.locator("#scan-safety-header.scan-hero");

    await expect
      .poll(async () => hero.evaluate((el) => getComputedStyle(el).boxShadow))
      .not.toBe("none");

    const heroBgImage = await hero.evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(heroBgImage).toContain("linear-gradient");

    const [heroBg, stripBg] = await page.evaluate(() => {
      const h = document.querySelector("#scan-safety-header.scan-hero");
      const s = document.querySelector(".scan-safety-strip--live");
      if (!h || !s) return ["", ""];
      return [
        getComputedStyle(h).backgroundColor,
        getComputedStyle(s).backgroundColor,
      ];
    });
    expect(heroBg).not.toBe(stripBg);
  });

  test("active scan: live check settles to Active and reveals body", async ({ page }) => {
    await gotoScan(page, SCAN_ACTIVE);

    const hero = page.locator("#scan-safety-header");
    const label = page.locator(".scan-arrive-status-label");

    await expect(label).toHaveText("Checking live status…");
    await expect(hero).toHaveClass(/scan-live-check--pending/);

    await expect(label).toHaveText("Active", { timeout: 8_000 });
    await expect(hero).not.toHaveClass(/scan-live-check--pending/, { timeout: 8_000 });
    await expect(page.locator(".scan-hero-title")).toBeVisible();
    await expect(page.locator(".scan-hero-limit")).toBeVisible();
  });

  test("dark: hc_theme shows dark hero plate with readable title", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("hc_theme", "dark");
    });
    await gotoScan(page, SCAN_ACTIVE);

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const hero = page.locator("#scan-safety-header.scan-hero");

    await expect(page.locator(".scan-arrive-status-label")).toHaveText("Active", {
      timeout: 8_000,
    });

    const { heroBg, titleColor } = await page.evaluate(() => {
      const h = document.querySelector("#scan-safety-header.scan-hero");
      const t = document.querySelector(".scan-hero-title");
      if (!h || !t) return { heroBg: "", titleColor: "" };
      return {
        heroBg: getComputedStyle(h).backgroundColor,
        titleColor: getComputedStyle(t).color,
      };
    });

    expect(heroBg).not.toBe("rgb(255, 255, 255)");
    expect(titleColor).not.toBe(heroBg);

    await expect
      .poll(async () => hero.evaluate((el) => getComputedStyle(el).boxShadow))
      .not.toBe("none");
  });

  test("reduced motion: no hero settle animation class after arrive", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoScan(page, SCAN_ACTIVE);

    const hero = page.locator("#scan-safety-header");
    await expect(page.locator(".scan-arrive-status-label")).toHaveText("Active", {
      timeout: 5_000,
    });

    const animation = await hero.evaluate((el) => getComputedStyle(el).animationName);
    expect(animation === "none" || animation === "").toBe(true);
    await expect(hero).not.toHaveClass(/scan-safety--pulse/);
  });

  test("revoked scan: bad strip, no data-scan-active, still tier-4 plate", async ({
    page,
  }) => {
    await gotoScan(page, SCAN_REVOKED);

    const hero = page.locator("#scan-safety-header.scan-hero");
    await expect(hero).not.toHaveAttribute("data-scan-active", "1");
    await expect(page.locator(".scan-safety-strip--bad")).toBeVisible();

    await expect
      .poll(async () => hero.evaluate((el) => getComputedStyle(el).boxShadow))
      .not.toBe("none");
  });
});
