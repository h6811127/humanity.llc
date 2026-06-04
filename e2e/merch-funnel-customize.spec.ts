import { test, expect } from "@playwright/test";

/**
 * Merch funnel — create with scan_customize stays on /created/; optional CTA to customize.
 * @see docs/MERCH_FUNNEL_MVP.md · exit checklist · priority stack item 1
 */

const PRINT_CATALOG = {
  products: [
    {
      template_id: "hc-hoodie-live-object-v1",
      type: "hoodie",
      title: "Live Object hoodie",
      description: "Unique QR per unit.",
      variants: [{ variant_id: "black-m", label: "Black / M", enabled: true }],
    },
    {
      template_id: "hc-sticker-square-v1",
      type: "sticker",
      title: "Humanity QR Sticker",
      description: "Square sticker.",
      variants: [{ variant_id: "2x2-white", enabled: true }],
    },
  ],
};

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
  await page.route(
    (url) => url.href.includes("/.well-known/hc/v1/cards"),
    async (route) => {
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
    }
  );
}

async function stubCustomizeApis(page: import("@playwright/test").Page) {
  await page.route("**/v1/print/catalog**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PRINT_CATALOG),
    })
  );

  await page.route(/artifact-intents/, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fulfill({ status: 405, body: "METHOD_NOT_ALLOWED" });
      return;
    }
    const body = route.request().postDataJSON() as {
      profile_id?: string;
      source_qr_id?: string;
      product_id?: string;
    };
    const profileId = body?.profile_id ?? "prof_e2e";
    const plannedQrId = "qr_planned_e2e_item";
    const intentId = "ai_e2eMerchFunnel01";
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        artifact_intent_id: intentId,
        profile_id: profileId,
        source_qr_id: body?.source_qr_id ?? "qr_e2e",
        product_id: body?.product_id ?? "sticker_personalized_v1",
        planned_item_qr_ids: [plannedQrId],
        preview_url: `http://127.0.0.1:8787/c/${profileId}?q=${plannedQrId}`,
      }),
    });
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
    await stubCreateResolver(page);
    await stubCustomizeApis(page);
  });

  test("direct create without hc_ref ignores stale customize_glitch session", async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("hc_merch_customize_ref", "customize_glitch");
      sessionStorage.setItem("hc_merch_create_ref", "customize_glitch");
    });

    const handle = `e2e_lo1_${Date.now().toString(36).slice(-8)}`;
    await page.route(
      (url) => url.href.includes("/.well-known/hc/v1/cards"),
      async (route) => {
        if (route.request().method() !== "POST") {
          await route.fulfill({ status: 405, body: "METHOD_NOT_ALLOWED" });
          return;
        }
        const body = route.request().postDataJSON() as { attribution_ref?: string };
        expect(body.attribution_ref).toBeUndefined();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            profile_id: "prof_e2e_lo1",
            qr_id: "qr_e2e_lo1",
            scan_url: "http://127.0.0.1:8787/c/prof_e2e_lo1?q=qr_e2e_lo1",
            handle,
          }),
        });
      }
    );

    await page.goto("/create/?template=general");
    await page.locator("#handle").fill(handle);
    await page.locator("#manifesto").fill("LO-1 studio door — open until 9");
    await page.locator("#submit").click();

    await page.waitForURL(/\/created\/\?.*fresh=1/, { timeout: 20_000 });
    expect(page.url()).not.toContain("/shop/customize/");
  });

  test("scan_customize: create stays on /created/ with customize CTA", async ({ page }) => {
    const handle = `e2e_merch_${Date.now().toString(36).slice(-8)}`;

    await page.goto("/create/?hc_ref=scan_customize");
    await page.locator("#handle").fill(handle);
    await page.locator("#manifesto").fill("E2E merch funnel — live object on a hoodie");
    await page.locator("#submit").click();

    await page.waitForURL(/\/created\/\?.*fresh=1.*hc_ref=scan_customize/, {
      timeout: 20_000,
    });
    expect(page.url()).not.toMatch(/\/shop\/customize\//);

    await expect(page.locator("#created-merch-customize-card")).toBeVisible({
      timeout: 15_000,
    });
    await page.locator("#created-merch-customize-link").click();
    await page.waitForURL(/\/shop\/customize\/\?hc_ref=scan_customize/, {
      timeout: 15_000,
    });

    await expect(page.locator("#shop-customize-card-ready")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#shop-customize-card-gate")).toBeHidden();

    const session = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(session).toBeTruthy();
    const parsed = JSON.parse(session!) as {
      handle?: string;
      profile_id?: string;
      owner_private_key_b58?: string;
    };
    expect(parsed.handle).toBe(handle);
    expect(parsed.owner_private_key_b58).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);

    await expect(page.locator("#shop-customize-handle")).toContainText(`@${handle}`);
  });

  test("customizer shows card gate when no session exists", async ({ page }) => {
    await page.goto("/shop/customize/?hc_ref=customize_shop");

    await expect(page.locator("#shop-customize-card-gate")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#shop-customize-card-ready")).toBeHidden();
    await expect(page.locator("#shop-customize-create-link")).toHaveAttribute(
      "href",
      /\/create\/\?hc_ref=customize_shop/
    );
  });
});
