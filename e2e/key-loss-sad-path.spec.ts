import { join } from "node:path";

import { test, expect } from "@playwright/test";

/**
 * Key-loss sad paths — view-only / backup import (K1, K2, K5).
 * @see docs/KEY_LOSS_SAD_PATH_MATRIX.md
 * Fixture: npm run e2e:generate-key-loss-fixture
 */

const PROFILE_ID = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_ID = "qr_E2eKeyLossSadPath1";

const BACKUP_FIXTURE = join(process.cwd(), "e2e/fixtures/key-loss-e2e.hcbackup.json");

async function stubCardRoutes(page: import("@playwright/test").Page) {
  await page.route("**/.well-known/hc/v1/health**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: "ok" }),
    })
  );

  await page.route("**/.well-known/hc/v1/cards/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/status")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          scan: {
            kind: "active",
            profile_id: PROFILE_ID,
            qr_id: QR_ID,
            card: { status: "active", handle: "keyloss_e2e" },
          },
        }),
      });
      return;
    }
    if (url.includes(PROFILE_ID)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          profile_id: PROFILE_ID,
          handle: "keyloss_e2e",
          status: "active",
          qr: { active_qr_id: QR_ID },
        }),
      });
      return;
    }
    await route.continue();
  });
}

test.beforeAll(async () => {
  const { access } = await import("node:fs/promises");
  try {
    await access(BACKUP_FIXTURE);
  } catch {
    throw new Error(
      `Missing ${BACKUP_FIXTURE}. Run: npm run e2e:generate-key-loss-fixture`
    );
  }
});

test.describe("key-loss sad paths", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.clear();
      localStorage.clear();
      localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    });
    await stubCardRoutes(page);
  });

  test("K1: revisit /created/ without tab keys shows view-only recovery guidance", async ({
    page,
  }) => {
    await page.goto(`/created/?profile_id=${PROFILE_ID}&qr_id=${QR_ID}`);

    await expect(page.getByRole("heading", { name: "View this card" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#created-control-root")).toBeVisible();
    await expect(page.locator("#created-setup-root")).toBeHidden();
    await expect(page.locator("#created-view-live-banner")).toBeVisible();
    await expect(page.locator("#created-view-live-lead")).toContainText(/read-only/i);
    await expect(page.locator("#created-live-scanners-see")).toBeHidden();
    await expect(page.locator("#created-deploy-print")).toBeVisible();

    await page.getByRole("tab", { name: "Manage" }).click();
    await expect(page.locator("#created-view-restore-panel")).toBeVisible();
    await expect(page.locator("#import-recovery-form")).toBeVisible();
    await expect(page.locator("#no-session")).toBeHidden();

    const sessionRaw = await page.evaluate(() =>
      sessionStorage.getItem("hc_created")
    );
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw) as Record<string, unknown>;
      expect(parsed.owner_private_key_b58).toBeTruthy();
    }
  });

  test("K5: wallet label without signing keys still view-only on /created/", async ({ page }) => {
    await page.addInitScript(
      ({ profileId, qrId }) => {
        localStorage.setItem(
          "hc_wallet",
          JSON.stringify([
            {
              id: "e2e_label_only",
              profile_id: profileId,
              qr_id: qrId,
              label: "Label only card",
              handle: "label_only",
              saved_at: "2026-05-29T12:00:00.000Z",
            },
          ])
        );
      },
      { profileId: PROFILE_ID, qrId: QR_ID }
    );

    await page.goto(`/created/?profile_id=${PROFILE_ID}&qr_id=${QR_ID}`);

    await expect(page.getByRole("heading", { name: "View this card" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#created-view-live-banner")).toBeVisible();
    await expect(page.locator("#revoke-qr-btn")).toBeHidden();

    await page.getByRole("tab", { name: "Manage" }).click();
    await expect(page.locator("#created-view-ownership-hint")).toBeVisible();
  });

  test("R7: corrupt hc_wallet shows urgent tab hint on /wallet/ not empty-wallet copy", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      sessionStorage.clear();
      localStorage.clear();
      localStorage.setItem("hc_device_hub_intro_dismissed", "1");
      localStorage.setItem("hc_wallet", "{not-valid-json");
    });
    await stubCardRoutes(page);
    await page.goto("/wallet/");

    const tabHint = page.locator("#wallet-tab-hint");
    await expect(tabHint).toBeVisible({ timeout: 15_000 });
    await expect(tabHint).toHaveAttribute("role", "alert", { timeout: 15_000 });
    await expect(page.locator("#wallet-tab-hint-title")).toContainText(/could not be read/i);
    await expect(page.locator("#wallet-tab-hint-detail")).toContainText(/import a backup/i);
    await expect(page.locator("#wallet-tab-hint-use-keys")).toHaveText(/import backup/i);
    await expect(page.locator("#wallet-tab-hint-focus")).toHaveText(/backup help/i);
    await expect(page.locator("#device-hub-empty-hint")).toBeHidden();
    await expect(page.locator("#wallet-page")).toHaveClass(/device-hub--stranger-empty/);
  });

  test("K2: wrong backup passphrase shows plain error on wallet import", async ({ page }) => {
    await page.goto("/wallet/");

    await expect(page.locator('[data-hub-group="import"]')).toBeVisible();
    await expect(page.locator("#wallet-page")).toHaveClass(/device-hub--stranger-empty/);

    await page.locator("#hub-import-form").evaluate((el) => {
      const details = el.closest("details");
      if (details instanceof HTMLDetailsElement) details.open = true;
    });

    await expect(page.locator("#hub-import-passphrase")).toBeVisible();

    await page.locator("#hub-import-passphrase").fill("wrong-passphrase-here");
    await page.locator("#hub-import-form input[type='file']").setInputFiles(BACKUP_FIXTURE);
    await page.locator("#hub-import-form button[type='submit']").click();

    const status = page.locator("#hub-import-status");
    await expect(status).toBeVisible({ timeout: 15_000 });
    await expect(status).toContainText(/Wrong passphrase/i);
    await expect(status).toContainText(/password manager/i);
  });
});
