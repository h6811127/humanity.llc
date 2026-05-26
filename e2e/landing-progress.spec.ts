import { test, expect } from "@playwright/test";

test.describe("landing progress strip", () => {
  test("stranger sees neutral legend and Create continue", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto("/");
    await expect(page.locator("#landing-progress-continue")).toHaveText(
      "Create your first live object"
    );
    await expect(page.locator("#landing-progress-continue")).toHaveAttribute("href", "/create/");
    await expect(page.locator(".landing-progress-step.is-next")).toHaveCount(0);
    await expect(page.locator(".landing-progress-step a")).toHaveCount(0);
  });

  test("unsaved tab keys show Save keys continue", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.setItem(
        "hc_created",
        JSON.stringify({
          profile_id: "p_e2e_unsaved",
          owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
        })
      );
    });
    await page.goto("/");
    await expect(page.locator("#landing-progress-continue")).toHaveText(
      "Save keys on this device"
    );
    await expect(page.locator("#landing-progress-continue")).toHaveAttribute(
      "href",
      /\/created\/\?profile_id=p_e2e_unsaved&fresh=1#setup$/
    );
    await expect(page.locator('.landing-progress-step[data-legend-step="2"]')).toHaveClass(
      /is-next/
    );
  });

  test("saved wallet without pin deeplinks to print setup", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "hc_wallet",
        JSON.stringify([
          { profile_id: "p_e2e_print", qr_id: "qr_e2e_print123456789", label: "E2E" },
        ])
      );
      localStorage.setItem("hc_setup_done", JSON.stringify({}));
      localStorage.removeItem("hc_device_pins");
      sessionStorage.clear();
    });
    await page.goto("/");
    await expect(page.locator("#landing-progress-continue")).toHaveText("Print your QR");
    await expect(page.locator("#landing-progress-continue")).toHaveAttribute(
      "href",
      /\/created\/\?profile_id=p_e2e_print&qr_id=qr_e2e_print123456789#setup-qr$/
    );
  });

  test("saved wallet with pin shows My cards continue and step highlight", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "hc_wallet",
        JSON.stringify([{ profile_id: "p_e2e_saved", label: "E2E" }])
      );
      localStorage.setItem("hc_setup_done", JSON.stringify({ p_e2e_saved: true }));
      localStorage.setItem("hc_device_pins", JSON.stringify([{ profile_id: "p_e2e_saved" }]));
      sessionStorage.clear();
    });
    await page.goto("/");
    await expect(page.locator("#landing-progress-continue")).toHaveText("Open My cards");
    await expect(page.locator('.landing-progress-step[data-legend-step="4"]')).toHaveClass(
      /is-next/
    );
  });
});
