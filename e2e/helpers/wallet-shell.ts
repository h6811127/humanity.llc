import { expect, type Page } from "@playwright/test";

/** Resolver health stub so shell boot can reach `data-boot=ready`. */
export async function stubShellHealthOk(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: "ok" }),
    })
  );
}

export async function waitForDeviceBootReady(page: Page) {
  await expect(page.locator("body")).toHaveAttribute("data-boot", "ready", {
    timeout: 20_000,
  });
}

export async function gotoWalletWithBoot(page: Page) {
  await stubShellHealthOk(page);
  await page.goto("/wallet/", { waitUntil: "domcontentloaded" });
  await waitForDeviceBootReady(page);
}

export async function gotoLandingWithBoot(page: Page) {
  await stubShellHealthOk(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForDeviceBootReady(page);
}
