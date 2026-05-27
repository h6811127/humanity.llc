import { test, expect } from "@playwright/test";

/**
 * Create form submit — P2-2 validation + handleResult regression (PRODUCTION_SAD_PATH_QA).
 * @see docs/PRODUCTION_SAD_PATH_QA_2026-05-26.md P2-2
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
  /** @type {{ profileId: string, qrId: string, handle: string } | null} */
  let created = null;

  const isCardsApi = (href: string) => href.includes("/.well-known/hc/v1/cards");

  await page.route(
    (url) => isCardsApi(url.href),
    async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (method === "POST" && /\/cards\/?(\?|$)/.test(url)) {
        const body = route.request().postDataJSON() as {
          card?: { profile_id?: string; handle?: string };
          qr_credential?: { qr_id?: string };
        };
        const profileId = body?.card?.profile_id ?? "";
        const qrId = body?.qr_credential?.qr_id ?? "";
        const handle = body?.card?.handle ?? "";
        created = { profileId, qrId, handle };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            profile_id: profileId,
            qr_id: qrId,
            scan_url: `http://127.0.0.1:8787/c/${profileId}?q=${qrId}`,
          }),
        });
        return;
      }

      if (method === "GET") {
        const profileMatch = url.match(/\/cards\/([^/?]+)/);
        if (!profileMatch) {
          await route.fulfill({ status: 404, body: "NOT_FOUND" });
          return;
        }
        const profileId = decodeURIComponent(profileMatch[1]);
        const statusUrl = new URL(url);
        const qrId =
          statusUrl.searchParams.get("q")?.trim() ||
          statusUrl.searchParams.get("qr_id")?.trim() ||
          created?.qrId ||
          "qr_e2e_stub";

        if (url.includes("/status")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              scan: {
                kind: "active",
                profile_id: profileId,
                qr_id: qrId,
                card: { status: "active", handle: created?.handle ?? "e2e" },
              },
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            profile_id: profileId,
            handle: created?.handle ?? "e2e",
            status: "active",
            qr: { active_qr_id: qrId },
          }),
        });
        return;
      }

      await route.fulfill({ status: 405, body: "METHOD_NOT_ALLOWED" });
    }
  );
}

test.describe("create form submit", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem("__e2e_storage_boot")) return;
      sessionStorage.clear();
      localStorage.clear();
      sessionStorage.setItem("__e2e_storage_boot", "1");
    });
    await stubHealth(page);
  });

  test("S9: valid general submit passes validation and lands on /created/", async ({
    page,
  }) => {
    await stubCreateResolver(page);
    const handle = `e2e_${Date.now().toString(36).slice(-8)}`;

    await page.goto("/create/");
    await page.locator("#handle").fill(handle);
    await page.locator("#manifesto").fill("E2E create submit regression");
    await page.locator("#submit").click();

    await page.waitForURL(/\/created\/\?.*profile_id=.*qr_id=.*fresh=1/, {
      timeout: 20_000,
    });

    const session = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(session).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Set up your live QR" })).toBeVisible({
      timeout: 15_000,
    });
    const parsed = JSON.parse(session!) as {
      handle?: string;
      profile_id?: string;
      qr_id?: string;
    };
    expect(parsed.handle).toBe(handle);
    expect(parsed.profile_id).toMatch(/^[A-Za-z0-9]+$/);
    expect(parsed.qr_id).toMatch(/^qr_/);

    const landed = new URL(page.url());
    expect(landed.searchParams.get("profile_id")).toBe(parsed.profile_id);
    expect(landed.searchParams.get("qr_id")).toBe(parsed.qr_id);
    await expect(page.getByRole("heading", { name: "Link not valid" })).toHaveCount(0);
  });

  test("P2-2: empty status plate lists all missing fields in one message", async ({
    page,
  }) => {
    await page.goto("/create/?template=status_plate");
    await page.locator("#submit").click();

    const status = page.locator("#status");
    await expect(status).toHaveClass(/error/);
    await expect(status).toHaveText(
      "Handle, Object name, and Status line are required."
    );
  });

  test("P2-2: empty general form lists handle and public statement", async ({ page }) => {
    await page.goto("/create/");
    await page.locator("#submit").click();

    const status = page.locator("#status");
    await expect(status).toHaveClass(/error/);
    await expect(status).toHaveText("Handle and Public statement are required.");
  });
});
