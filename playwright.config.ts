import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8788";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL,
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run pages:dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Pixel 5"] },
      testIgnore:
        /safari-shell-scroll|scan-cross-tab-banner-webkit\.spec\.ts|keys-custody-emphasis-webkit\.spec\.ts|safari-keys-persistence\.spec\.ts|card-disabled-fresh-create-webkit\.spec\.ts/,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testMatch:
        /safari-shell-scroll|scan-hero-visual|scan-cross-tab-banner-webkit\.spec\.ts|keys-custody-emphasis-webkit\.spec\.ts|safari-keys-persistence\.spec\.ts|card-disabled-fresh-create-webkit\.spec\.ts/,
    },
    {
      name: "iphone-13-pro",
      use: { ...devices["iPhone 13 Pro"] },
      testMatch:
        /safari-shell-scroll|scan-hero-visual|scan-cross-tab-banner-webkit\.spec\.ts|keys-custody-emphasis-webkit\.spec\.ts|safari-keys-persistence\.spec\.ts|card-disabled-fresh-create-webkit\.spec\.ts/,
    },
  ],
});
