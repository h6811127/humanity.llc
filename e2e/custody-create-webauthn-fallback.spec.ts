import { test, expect, type Route } from "@playwright/test";

/**
 * Create flow falls back to full_keys when WebAuthn is unavailable (G-C3 · K12).
 * @see docs/CUSTODY_WEBAUTHN_FALLBACK_QA.md
 *
 * CI: npm run e2e:custody-create-fallback
 */

async function wireShellHealth(page: import("@playwright/test").Page) {
  await page.route("**/.well-known/hc/v1/health**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: "ok" }),
    })
  );
}

async function stripWebAuthn(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    try {
      // @ts-expect-error test harness
      delete window.PublicKeyCredential;
    } catch {
      /* ignore */
    }
  });
}

test.describe("create custody WebAuthn fallback (G-C3 · K12)", () => {
  test("disables device unlock and selects full control keys", async ({ page }) => {
    await stripWebAuthn(page);
    await wireShellHealth(page);
    await page.goto("/create/", { waitUntil: "domcontentloaded" });

    const fieldset = page.locator("#create-custody-mode");
    await expect(fieldset).toBeVisible({ timeout: 15_000 });

    const deviceRadio = page.locator('input[name="custody_mode"][value="device_unlock"]');
    const fullRadio = page.locator('input[name="custody_mode"][value="full_keys"]');

    await expect(deviceRadio).toBeDisabled();
    await expect(fullRadio).toBeChecked();
    await expect(page.locator("#create-custody-mode-hint")).toContainText(
      /cannot use Face ID/i
    );
  });
});
