import { test, expect, type Page, type Route } from "@playwright/test";

const STEWARD_WALLET_ENTRY = {
  id: "e2e_safari_shell_1",
  label: "E2E Safari Shell",
  saved_at: "2026-05-25T12:00:00.000Z",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD6",
  qr_id: "qr_E2eSafariShell9",
  handle: "e2esafari",
  manifesto_line: "Safari shell test",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD6?q=qr_E2eSafariShell9",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  verification: { state: "steward", label: "Steward" },
};

function mockHealth(route: Route) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: "ok", database: "ok" }),
  });
}

async function waitForShellReady(page: Page) {
  await expect(page.locator("#top-chrome")).not.toHaveAttribute("data-device-status-error");
  await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/);
  await page.waitForSelector("#device-hub-backdrop", { state: "attached" });
  await page.waitForSelector("#device-inbox-backdrop", { state: "attached" });
  await expect(page.locator("#brand-status-dot-btn")).toBeVisible();
  await page.waitForFunction(() => {
    const btn = document.getElementById("brand-status-dot-btn");
    if (!btn) return false;
    const r = btn.getBoundingClientRect();
    return r.width >= 40 && r.height >= 40;
  });
}

/**
 * elementsFromPoint at the dot must not include visible sheet/backdrop blockers.
 * WebKit may return only HTML when the float chrome uses pointer-events:none;
 * dot tap behavior is asserted separately.
 */
async function elementFromPointHasNoSheetBlockers(page: Page) {
  return page.evaluate(() => {
    const btn = document.getElementById("brand-status-dot-btn");
    if (!btn) return { ok: false, reason: "missing-btn" };
    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const stack = document.elementsFromPoint(x, y);

    for (const el of stack) {
      if (el.id === "device-hub-backdrop" && el.classList.contains("is-visible")) {
        return { ok: false, reason: "hub-backdrop-visible" };
      }
      if (el.id === "device-inbox-backdrop" && el.classList.contains("is-visible")) {
        return { ok: false, reason: "inbox-backdrop-visible" };
      }
      const hub = el.id === "device-hub" ? el : el.closest?.("#device-hub");
      if (hub && !hub.classList.contains("device-hub-collapsed")) {
        return { ok: false, reason: "hub-open-on-stack" };
      }
      const inbox = el.id === "device-inbox-sheet" ? el : el.closest?.("#device-inbox-sheet");
      if (inbox && !inbox.classList.contains("device-inbox-sheet--collapsed")) {
        return { ok: false, reason: "inbox-open-on-stack" };
      }
    }

    const dotInStack = stack.some((el) => el === btn || btn.contains(el));
    const chromeBarInStack = stack.some((el) => el.closest?.(".top-chrome-bar--minimal"));
    return {
      ok: true,
      reason: dotInStack ? "dot" : chromeBarInStack ? "chrome-bar" : "no-blockers",
    };
  });
}

async function clickStatusDot(page: Page) {
  const btn = page.locator("#brand-status-dot-btn");
  await btn.evaluate((el) => {
    el.click();
  });
}

async function expectHubBackdropClosed(page: Page) {
  const backdrop = page.locator("#device-hub-backdrop");
  await expect(backdrop).not.toHaveClass(/is-visible/);
  await expect(backdrop).toBeHidden();
  await expect(backdrop).toHaveAttribute("aria-hidden", "true");
  const pe = await backdrop.evaluate((el) => getComputedStyle(el).pointerEvents);
  expect(pe).toBe("none");
}

test.describe("Safari / WebKit shell smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      localStorage.setItem("hc_landing_focus", "0");
    }, STEWARD_WALLET_ENTRY);
    await page.route("**/.well-known/hc/v1/health**", mockHealth);
  });

  test("elementFromPoint at dot has no sheet/backdrop blockers", async ({ page }) => {
    await page.goto("/");
    await waitForShellReady(page);

    const hit = await elementFromPointHasNoSheetBlockers(page);
    expect(hit.ok, `unexpected blocker: ${hit.reason}`).toBe(true);
  });

  test("hub and inbox backdrops are closed when sheets collapsed", async ({ page }) => {
    await page.goto("/");
    await waitForShellReady(page);
    await expect(page.locator("body")).not.toHaveClass(/device-hub-sheet-open/);
    await expectHubBackdropClosed(page);

    const inboxBackdrop = page.locator("#device-inbox-backdrop");
    await expect(inboxBackdrop).not.toHaveClass(/is-visible/);
    await expect(inboxBackdrop).toBeHidden();
    await expect(inboxBackdrop).toHaveAttribute("aria-hidden", "true");
    const inboxPe = await inboxBackdrop.evaluate((el) => getComputedStyle(el).pointerEvents);
    expect(inboxPe).toBe("none");
  });

  test("dot opens hub sheet", async ({ page }) => {
    await page.goto("/");
    await waitForShellReady(page);
    await clickStatusDot(page);
    await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/);
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/);
  });

  test("after scroll, dot still opens hub and landing link is tappable", async ({ page }) => {
    await page.addInitScript(() => {
      document.documentElement.style.minHeight = "300vh";
    });
    await page.goto("/");
    await waitForShellReady(page);

    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(150);

    const hit = await elementFromPointHasNoSheetBlockers(page);
    expect(hit.ok, `after scroll unexpected blocker: ${hit.reason}`).toBe(true);

    await clickStatusDot(page);
    await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/);

    await page.locator(".device-hub-sheet-close").click();
    await expect(page.locator("body")).not.toHaveClass(/device-hub-sheet-open/);
    await expectHubBackdropClosed(page);

    await page.getByRole("link", { name: /Start with one live object/i }).click();
    await expect(page).toHaveURL(/\/create\//);
  });

  test("touch profile skips document scroll-edge chrome", async ({ page, isMobile }) => {
    test.skip(!isMobile, "coarse-pointer scroll chrome is desktop-only");

    await page.addInitScript(() => {
      document.documentElement.style.minHeight = "300vh";
    });
    await page.goto("/");
    await expect(page.locator("body")).toHaveClass(/shell-scroll-chrome-off/);

    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(150);
    await expect(page.locator("#top-chrome")).not.toHaveClass(/top-chrome--edge-hidden/);
  });
});
