import { test, expect } from "@playwright/test";

/**
 * Merch funnel — create with scan_customize lands on /shop/customize/ (docs/MERCH_FUNNEL_MVP.md).
 */

async function stubHealth(page: import("@playwright/test").Page) {
  await page.route("**/.well-known/hc/v1/health**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: "ok" }),
    })
  );
}

async function stubCreateResolver(page: import("@playwright/test").Page) {
  await page.route("**/.well-known/hc/v1/cards**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === "POST" && /\/cards\/?(\?|$)/.test(url)) {
      const body = route.request().postDataJSON() as {
        card?: { profile_id?: string; handle?: string };
        qr_credential?: { qr_id?: string };
        attribution_ref?: string;
      };
      const profileId = body?.card?.profile_id ?? "";
      const qrId = body?.qr_credential?.qr_id ?? "";
      const handle = body?.card?.handle ?? "";
      expect(body.attribution_ref).toBe("scan_customize");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          profile_id: profileId,
          qr_id: qrId,
          scan_url: `http://127.0.0.1:8787/c/${profileId}?q=${qrId}`,
          handle,
        }),
      });
      return;
    }

    await route.fulfill({ status: 405, body: "METHOD_NOT_ALLOWED" });
  });
}

test.describe("merch funnel customize", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem("__e2e_storage_boot")) return;
      sessionStorage.clear();
      localStorage.clear();
      sessionStorage.setItem("__e2e_storage_boot", "1");
    });
    await stubHealth(page);
  });

  test("scan_customize: create redirects to customize with session ready", async ({ page }) => {
    await stubCreateResolver(page);
    const handle = `e2e_merch_${Date.now().toString(36).slice(-8)}`;

    await page.goto("/create/?hc_ref=scan_customize");
    await page.locator("#handle").fill(handle);
    await page.locator("#manifesto").fill("E2E merch funnel — live object on a hoodie");
    await page.locator("#submit").click();

    await page.waitForURL(/\/shop\/customize\/\?hc_ref=scan_customize/, {
      timeout: 20_000,
    });

    await expect(page.locator("#shop-customize-card-ready")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#shop-customize-card-gate")).toBeHidden();

    const session = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(session).toBeTruthy();
    const parsed = JSON.parse(session!) as { handle?: string; profile_id?: string };
    expect(parsed.handle).toBe(handle);

    await expect(page.locator("#shop-customize-handle")).toContainText(`@${handle}`);
    await expect(page.getByRole("heading", { name: "Customize your live object" })).toBeVisible();
  });
});
