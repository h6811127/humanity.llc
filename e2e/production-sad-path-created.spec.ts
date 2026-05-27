import { test, expect } from "@playwright/test";

/** Valid base58 shape; resolver returns not found (PRODUCTION_SAD_PATH_QA S2). */
const BOGUS_PROFILE_ID = "fakeprofileid123456789012345";

async function stubHealth(page: import("@playwright/test").Page) {
  await page.route("**/.well-known/hc/v1/health**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: "ok" }),
    })
  );
}

test.describe("production sad-path — /created/ route gate", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await stubHealth(page);
  });

  test("S2: bogus profile_id shows invalid link, not live success hero", async ({ page }) => {
    await page.route("**/.well-known/hc/v1/cards/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/status")) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: "NOT_FOUND" }),
        });
        return;
      }
      if (url.includes(BOGUS_PROFILE_ID)) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: "NOT_FOUND", message: "Card not found." }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(`/created/?profile_id=${BOGUS_PROFILE_ID}`);
    await expect(page.getByRole("heading", { name: "Link not valid" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("heading", { name: "Your object is live" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Live QR ready" })).toHaveCount(0);
    await expect(page.locator("#created-control-root")).toBeHidden();
    await expect(page.locator("#created-setup-root")).toBeHidden();
  });

  test("bare /created/ redirects to wallet when no session", async ({ page }) => {
    await page.goto("/created/", { waitUntil: "commit" });
    await page.waitForURL(/\/wallet\/?$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "My cards on this device" })).toBeVisible();
  });

  test("S6: #revoke without keys shows view-only notice, not live revoke controls", async ({
    page,
  }) => {
    const profileId = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
    const qrId = "qr_E2eSadPathRevoke1";

    await page.route("**/.well-known/hc/v1/cards/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/status")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            scan: {
              kind: "active",
              profile_id: profileId,
              qr_id: qrId,
              card: { status: "active", handle: "showcase" },
            },
          }),
        });
        return;
      }
      if (url.includes(profileId)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            profile_id: profileId,
            handle: "showcase",
            status: "active",
            qr: { active_qr_id: qrId },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(`/created/?profile_id=${profileId}&qr_id=${qrId}#revoke`);

    await expect(page.getByText("No signing keys in this tab")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#created-control-root")).toBeHidden();
    await expect(page.locator("#revoke-qr-btn")).toHaveCount(0);
  });
});
