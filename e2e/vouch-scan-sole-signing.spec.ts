import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * P0b-3 — scan vouch auto-loads sole saved signing row without default-vouch setup.
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P0b-3
 * @see docs/VOUCH_READY_KEYS_DESIGN.md
 *
 * Static fixture on Pages :8788. Regenerate: npm run site:generate-scan-e2e-fixture
 */

const SCAN_FIXTURE = "/e2e-fixtures/scan-active.html";

const VOUCHEE_PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const VOUCHER_PROFILE = "8Ym8nQ3pR5sU7wX9zA2bC4dE6";
const VOUCHER_QR = "qr_E2eVouchSoleSign1";

const SOLE_VOUCHER_ENTRY = {
  id: "e2e_vouch_sole",
  label: "Sole steward card",
  saved_at: "2026-05-29T12:00:00.000Z",
  profile_id: VOUCHER_PROFILE,
  qr_id: VOUCHER_QR,
  handle: "sole_steward",
  manifesto_line: "Field steward",
  scan_url: `http://127.0.0.1:8788/c/${VOUCHER_PROFILE}?q=${VOUCHER_QR}`,
  owner_public_key_b58: "pubkeysolevouchtestxxxxxxxxxxx",
  owner_private_key_b58: "privkeysolevouchtestxxxxxxxxxx",
};

function statusBody(
  profileId: string,
  qrId: string,
  verification: { state: string; label: string }
) {
  return {
    version: "1.0",
    resolver: { operator: "humanity.llc", version: "1.0" },
    scan: {
      kind: "active",
      profile_id: profileId,
      qr_id: qrId,
      card: { status: "active", handle: "e2e_vouch" },
      verification: { state: verification.state, label: verification.label },
      human_trust: { label: verification.label, subtitle: "", pill_active: false },
    },
  };
}

async function stubVouchScanRoutes(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: "ok" }),
    })
  );

  await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
  );

  await page.route("**/.well-known/hc/v1/cards/**", async (route) => {
    const url = route.request().url();
    if (!url.includes("/status")) {
      await route.continue();
      return;
    }

    if (url.includes(VOUCHEE_PROFILE)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          statusBody(VOUCHEE_PROFILE, "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5", {
            state: "registered",
            label: "Registered",
          })
        ),
      });
      return;
    }

    if (url.includes(VOUCHER_PROFILE)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          statusBody(VOUCHER_PROFILE, VOUCHER_QR, {
            state: "steward",
            label: "Steward",
          })
        ),
      });
      return;
    }

    await route.continue();
  });
}

async function gotoScanFixture(page: Page) {
  await stubVouchScanRoutes(page);
  await page.goto(SCAN_FIXTURE, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#scan-safety-header[data-profile-id]")).toBeVisible();
}

test.describe("P0b-3 scan sole signing row vouch", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.clear();
      localStorage.removeItem("hc_default_vouch_profile_id");
      localStorage.removeItem("hc_vouch_auto_activate");
    });
  });

  test("auto-loads vouch UI from sole saved signing row without default vouch", async ({
    page,
  }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, SOLE_VOUCHER_ENTRY);

    await gotoScanFixture(page);

    await expect(page.locator("#vouch-interactive")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#vouch-row")).toBeVisible();
    await expect(page.locator("#vouch-explainer")).toHaveAttribute("hidden", "");

    const sessionRaw = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(sessionRaw).toBeTruthy();
    const session = JSON.parse(sessionRaw!) as Record<string, unknown>;
    expect(session.profile_id).toBe(VOUCHER_PROFILE);
    expect(session.owner_private_key_b58).toBeTruthy();

    await expect(page.getByRole("button", { name: /loaded from this device/i })).toBeVisible();
  });

  test("does not auto-load vouch UI when multiple signing rows exist", async ({ page }) => {
    const secondEntry = {
      ...SOLE_VOUCHER_ENTRY,
      id: "e2e_vouch_second",
      profile_id: "9Zn0oR4qS6tV8wY0aB3cD5eF7",
      qr_id: "qr_E2eVouchSecondCard1",
      label: "Second steward card",
      handle: "second_steward",
      scan_url: "http://127.0.0.1:8788/c/9Zn0oR4qS6tV8wY0aB3cD5eF7?q=qr_E2eVouchSecondCard1",
    };

    await page.addInitScript(
      ({ sole, second }) => {
        localStorage.setItem("hc_wallet", JSON.stringify([sole, second]));
      },
      { sole: SOLE_VOUCHER_ENTRY, second: secondEntry }
    );

    await page.route("**/.well-known/hc/v1/cards/**", async (route: Route) => {
      const url = route.request().url();
      if (!url.includes("/status")) {
        await route.continue();
        return;
      }
      if (url.includes(VOUCHEE_PROFILE)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            statusBody(VOUCHEE_PROFILE, "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5", {
              state: "registered",
              label: "Registered",
            })
          ),
        });
        return;
      }
      if (url.includes("9Zn0oR4qS6tV8wY0aB3cD5eF7")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            statusBody("9Zn0oR4qS6tV8wY0aB3cD5eF7", "qr_E2eVouchSecondCard1", {
              state: "steward",
              label: "Steward",
            })
          ),
        });
        return;
      }
      if (url.includes(VOUCHER_PROFILE)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            statusBody(VOUCHER_PROFILE, VOUCHER_QR, {
              state: "steward",
              label: "Steward",
            })
          ),
        });
        return;
      }
      await route.continue();
    });

    await page.route("**/.well-known/hc/v1/health**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", database: "ok" }),
      })
    );
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) =>
      route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
    );

    await page.goto(SCAN_FIXTURE, { waitUntil: "domcontentloaded" });

    await expect(page.locator("#vouch-interactive")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator("#vouch-explainer")).toBeVisible();
    await expect(page.locator("#vouch-explainer-copy")).toContainText(/Attest as/i);

    const sessionRaw = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(sessionRaw).toBeNull();
  });
});
