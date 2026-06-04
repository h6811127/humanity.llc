import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * device_unlock desk proxy — no silent rehydrate; unlock copy when wallet wrapped (C2 · K10).
 * @see docs/CUSTODY_EASY_MODE.md · docs/KEY_LOSS_SAD_PATH_MATRIX.md K10
 * @see docs/QUIET_TAB_REHYDRATE.md
 *
 * CI: npm run e2e:custody-device-unlock
 */

const SCAN_FIXTURE = "/e2e-fixtures/scan-active.html";

const PROFILE_ID = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_ID = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

const DEVICE_UNLOCK_WALLET_ENTRY = {
  id: "e2e_device_unlock",
  label: "E2E device unlock",
  saved_at: "2026-06-03T12:00:00.000Z",
  profile_id: PROFILE_ID,
  qr_id: QR_ID,
  handle: "device_unlock_e2e",
  manifesto_line: "Wrapped custody row",
  scan_url: `http://127.0.0.1:8788/c/${PROFILE_ID}?q=${QR_ID}`,
  owner_public_key_b58: "pubkeydeviceunlocktestxxxxxxxx",
  custody_mode: "device_unlock",
  has_signing_key: true,
  wrapped_owner_key: {
    version: 1,
    credential_id: "e2e-cred-id",
    prf_salt: "c2FsdA==",
    iv: "aXY=",
    ciphertext: "Y2lwaGVy",
  },
};

async function wireShellHealth(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: "ok" }),
    })
  );
  await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route: Route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
  );
}

async function seedDeviceUnlockWallet(page: Page) {
  await page.addInitScript((entry) => {
    localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    localStorage.removeItem("hc_created");
    sessionStorage.removeItem("hc_created");
    localStorage.setItem("hc_device_hub_intro_dismissed", "1");
  }, DEVICE_UNLOCK_WALLET_ENTRY);
}

async function expectNoSigningSession(page: Page) {
  const hasKeys = await page.evaluate(() => {
    const raw = sessionStorage.getItem("hc_created");
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return Boolean(
        typeof parsed.owner_private_key_b58 === "string" && parsed.owner_private_key_b58.trim()
      );
    } catch {
      return false;
    }
  });
  expect(hasKeys).toBe(false);
}

test.describe("device_unlock custody (C2 desk proxy)", () => {
  test("wallet page shows unlock hint and does not silently rehydrate keys", async ({ page }) => {
    await seedDeviceUnlockWallet(page);
    await wireShellHealth(page);
    await page.goto("/wallet/", { waitUntil: "domcontentloaded" });

    const tabHint = page.locator("#wallet-tab-hint");
    await expect(tabHint).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#wallet-tab-hint-title")).toContainText(/Unlock to manage/i);
    await expect(page.locator("#wallet-tab-hint-use-keys")).toContainText(/Unlock to manage/i);
    await expectNoSigningSession(page);
  });

  test("scan dot reflects unlock state without populating hc_created", async ({ page }) => {
    await seedDeviceUnlockWallet(page);
    await wireShellHealth(page);
    await page.route("**/.well-known/hc/v1/cards/**", async (route: Route) => {
      const url = route.request().url();
      if (!url.includes("/status")) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version: "1.0",
          resolver: { operator: "humanity.llc", version: "1.0" },
          scan: {
            kind: "active",
            profile_id: PROFILE_ID,
            qr_id: QR_ID,
            card: { status: "active", handle: "device_unlock_e2e" },
            verification: { state: "registered", label: "Registered" },
            human_trust: { label: "Registered", subtitle: "", pill_active: false },
          },
        }),
      });
    });

    await page.goto(SCAN_FIXTURE, { waitUntil: "domcontentloaded" });

    const dot = page.locator("#scan-page-dot");
    await expect(dot).toHaveAttribute("data-dot-state", /ok/, { timeout: 15_000 });

    const btn = page.locator("#scan-page-dot-btn");
    await btn.click();
    const glance = page.locator("#scan-page-dot-glance");
    await expect(glance).toBeVisible();
    await expect(glance.locator(".scan-page-dot-glance-now")).toContainText(/Unlock to manage/i);
    await expectNoSigningSession(page);
  });
});

const REENROLL_PENDING_WALLET_ENTRY = {
  id: "e2e_device_unlock_reenroll",
  label: "E2E re-enroll pending",
  saved_at: "2026-06-03T12:00:00.000Z",
  profile_id: PROFILE_ID,
  qr_id: QR_ID,
  handle: "device_unlock_e2e",
  manifesto_line: "Recovery imported on new phone",
  scan_url: `http://127.0.0.1:8788/c/${PROFILE_ID}?q=${QR_ID}`,
  owner_public_key_b58: "pubkeydeviceunlocktestxxxxxxxx",
  custody_mode: "device_unlock",
  recovery_private_key_b58: "e2eRecoveryPrivateKeyPlaceholder",
  recovery_key_acknowledged: true,
  device_unlock_reenroll_pending: true,
  has_signing_key: true,
};

async function seedReenrollPendingWallet(page: Page) {
  await page.addInitScript((entry) => {
    localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    localStorage.removeItem("hc_created");
    sessionStorage.removeItem("hc_created");
    localStorage.setItem("hc_device_hub_intro_dismissed", "1");
  }, REENROLL_PENDING_WALLET_ENTRY);
}

test.describe("device_unlock cross-device re-enroll (C4 · K11)", () => {
  test("wallet page shows import-backup hint after recovery import on new device", async ({
    page,
  }) => {
    await seedReenrollPendingWallet(page);
    await wireShellHealth(page);
    await page.goto("/wallet/", { waitUntil: "domcontentloaded" });

    const tabHint = page.locator("#wallet-tab-hint");
    await expect(tabHint).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#wallet-tab-hint-title")).toContainText(/Set up Face ID/i);
    await expect(page.locator("#wallet-tab-hint-detail")).toContainText(/encrypted backup/i);
    await expect(page.locator("#wallet-tab-hint-use-keys")).toContainText(
      /Import encrypted backup/i
    );
    await expectNoSigningSession(page);
  });

  test("scan dot shows re-enroll copy without populating hc_created", async ({ page }) => {
    await seedReenrollPendingWallet(page);
    await wireShellHealth(page);
    await page.route("**/.well-known/hc/v1/cards/**", async (route: Route) => {
      const url = route.request().url();
      if (!url.includes("/status")) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version: "1.0",
          resolver: { operator: "humanity.llc", version: "1.0" },
          scan: {
            kind: "active",
            profile_id: PROFILE_ID,
            qr_id: QR_ID,
            card: { status: "active", handle: "device_unlock_e2e" },
            verification: { state: "registered", label: "Registered" },
            human_trust: { label: "Registered", subtitle: "", pill_active: false },
          },
        }),
      });
    });

    await page.goto(SCAN_FIXTURE, { waitUntil: "domcontentloaded" });

    const dot = page.locator("#scan-page-dot");
    await expect(dot).toHaveAttribute("data-dot-state", /ok/, { timeout: 15_000 });

    const btn = page.locator("#scan-page-dot-btn");
    await btn.click();
    const glance = page.locator("#scan-page-dot-glance");
    await expect(glance).toBeVisible();
    await expect(glance.locator(".scan-page-dot-glance-now")).toContainText(/Set up Face ID/i);
    await expectNoSigningSession(page);
  });
});
