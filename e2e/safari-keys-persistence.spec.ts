import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Safari keys persistence — WebKit regression for matrix S2 and S3.
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P2-3 · S2 · S3
 */

const SCAN_FIXTURE = "/e2e-fixtures/scan-active.html";

const VOUCHEE_PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const VOUCHER_PROFILE = "8Ym8nQ3pR5sU7wX9zA2bC4dE6";
const VOUCHER_QR = "qr_E2eVouchSoleSign1";

const SOLE_VOUCHER_ENTRY = {
  id: "e2e_safari_sole",
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

/** Standalone PWA display mode for S3 scan actor-band restore CTA. */
async function mockStandaloneDisplayMode(page: Page) {
  await page.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => {
      if (query === "(display-mode: standalone)") {
        return {
          matches: true,
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => true,
        } as MediaQueryList;
      }
      return nativeMatchMedia(query);
    };
  });
}

async function wireWalletShellRoutes(page: Page) {
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
}

test.describe("Scan quiet rehydrate wiring (P0-1 · WebKit)", () => {
  test("multi-card with rehydrate toggle off leaves scan tab without session keys", async ({
    page,
  }) => {
    const secondEntry = {
      ...SOLE_VOUCHER_ENTRY,
      id: "e2e_p01_second",
      profile_id: "9Zn0oR4qS6tV8wY0aB3cD5eF7",
      qr_id: "qr_E2eP01SecondCard1",
      label: "Second steward card",
      handle: "second_steward",
      scan_url: "http://127.0.0.1:8788/c/9Zn0oR4qS6tV8wY0aB3cD5eF7?q=qr_E2eP01SecondCard1",
    };

    await page.addInitScript(
      ({ sole, second }) => {
        localStorage.setItem("hc_wallet", JSON.stringify([sole, second]));
        localStorage.setItem("hc_quiet_tab_rehydrate", "0");
        localStorage.removeItem("hc_last_active_profile_id");
      },
      { sole: SOLE_VOUCHER_ENTRY, second: secondEntry }
    );

    await gotoScanFixture(page);

    await expect(page.locator("#vouch-interactive")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator("#vouch-explainer")).toBeVisible();
    const sessionRaw = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(sessionRaw).toBeNull();
  });
});

test.describe("Safari keys persistence (P2-3)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.clear();
      localStorage.removeItem("hc_default_vouch_profile_id");
      localStorage.removeItem("hc_vouch_auto_activate");
      localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    });
  });

  test("S2 / P0-1: Camera-style scan tab rehydrates sole saved signing row (WebKit)", async ({
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

    await expect(page.locator("#vouch-status")).toContainText(/loaded from this device/i, {
      timeout: 15_000,
    });
  });

  test("S3: browser wallet after standalone signing shows home-screen guidance (WebKit)", async ({
    page,
  }) => {
    const secondEntry = {
      ...SOLE_VOUCHER_ENTRY,
      id: "e2e_safari_second",
      profile_id: "9Zn0oR4qS6tV8wY0aB3cD5eF7",
      qr_id: "qr_E2eSafariSecondCard1",
      label: "Second steward card",
      handle: "second_steward",
      scan_url: "http://127.0.0.1:8788/c/9Zn0oR4qS6tV8wY0aB3cD5eF7?q=qr_E2eSafariSecondCard1",
    };

    await page.addInitScript(
      ({ sole, second }) => {
        localStorage.setItem("hc_wallet", JSON.stringify([sole, second]));
        localStorage.setItem("hc_last_signing_shell_mode", "standalone");
        localStorage.setItem("hc_quiet_tab_rehydrate", "0");
        localStorage.removeItem("hc_last_active_profile_id");
      },
      { sole: SOLE_VOUCHER_ENTRY, second: secondEntry }
    );

    await wireWalletShellRoutes(page);
    await page.goto("/wallet/", { waitUntil: "domcontentloaded" });

    const tabHint = page.locator("#wallet-tab-hint");
    await expect(tabHint).toBeVisible({ timeout: 15_000 });
    await expect(tabHint).toContainText(/home screen/i);
    await expect(page.locator("#wallet-tab-hint-title")).toContainText(
      /ownership may be in your home screen app/i
    );
    const useKeysHidden = await page
      .locator("#wallet-tab-hint-use-keys")
      .evaluate((el) => el.hidden);
    expect(useKeysHidden).toBe(true);

    const sessionRaw = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(sessionRaw).toBeNull();
  });

  test("S3: standalone scan after browser signing shows restore-in-app on actor band (WebKit)", async ({
    page,
  }) => {
    const secondEntry = {
      ...SOLE_VOUCHER_ENTRY,
      id: "e2e_safari_scan_second",
      profile_id: "9Zn0oR4qS6tV8wY0aB3cD5eF7",
      qr_id: "qr_E2eSafariScanSecond1",
      label: "Second steward card",
      handle: "second_steward",
      scan_url: "http://127.0.0.1:8788/c/9Zn0oR4qS6tV8wY0aB3cD5eF7?q=qr_E2eSafariScanSecond1",
    };

    await mockStandaloneDisplayMode(page);
    await page.addInitScript(
      ({ sole, second }) => {
        localStorage.setItem("hc_wallet", JSON.stringify([sole, second]));
        localStorage.setItem("hc_last_signing_shell_mode", "browser");
        localStorage.setItem("hc_quiet_tab_rehydrate", "0");
        localStorage.removeItem("hc_last_active_profile_id");
      },
      { sole: SOLE_VOUCHER_ENTRY, second: secondEntry }
    );

    await gotoScanFixture(page);

    const band = page.locator("#scan-actor-band");
    await expect(band).toBeVisible({ timeout: 15_000 });
    await expect(band).toHaveClass(/scan-actor-band--restore-prompt/);

    const restoreBtn = page.locator("#scan-actor-band-restore");
    await expect(restoreBtn).toBeVisible();
    await expect(restoreBtn).toHaveText(/restore control in this app/i);
    await expect(page.locator("#scan-actor-band-vouch")).toBeHidden();

    const sessionRaw = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(sessionRaw).toBeNull();
  });
});
