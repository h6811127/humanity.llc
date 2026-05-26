import { test, expect } from "@playwright/test";

const SAMPLE_WALLET_ENTRY = {
  id: "e2e_test_1",
  label: "E2E Test Card",
  saved_at: "2026-05-25T12:00:00.000Z",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  qr_id: "qr_E2eWakketTest9",
  handle: "e2etest",
  manifesto_line: "Test line",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_E2eWakketTest9",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  status: "active",
};

test.describe("device OS wallet flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, SAMPLE_WALLET_ENTRY);
  });

  test("shows My cards home and Open controls opens /created/ with session keys", async ({
    page,
  }) => {
    await page.goto("/wallet/");
    await expect(page.getByRole("heading", { name: "My cards on this device" })).toBeVisible();
    await expect(page.getByText("E2E Test Card")).toBeVisible();
    await page.getByRole("button", { name: "Open controls" }).click();
    await expect(page).toHaveURL(/\/created\/\?.*profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD5/);
    const sessionRaw = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(sessionRaw).toContain("privkeyfortestonlyxxxxxxxxx");
  });

  test("Revoke QR from hub opens Advanced revoke panel (not setup Print)", async ({
    page,
  }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", database: "ok" }),
      })
    );

    await page.route(
      "**/.well-known/hc/v1/cards/**/status**",
      async (route) => {
        const url = new URL(route.request().url());
        const parts = url.pathname.split("/");
        const profileId = parts[parts.indexOf("cards") + 1] ?? "";
        const qrId = url.searchParams.get("q") ?? SAMPLE_WALLET_ENTRY.qr_id;

        // Minimal resolver truth needed for row + revoke panel initialization.
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            version: "1.0",
            resolver: { operator: "humanity.llc", version: "1.0" },
            scan: {
              kind: "active",
              profile_id: profileId || SAMPLE_WALLET_ENTRY.profile_id,
              qr_id: qrId,
              card: {
                status: "active",
                handle: SAMPLE_WALLET_ENTRY.handle,
                manifesto_line: SAMPLE_WALLET_ENTRY.manifesto_line,
              },
              verification: { state: "registered", label: "Registered" },
              human_trust: { label: "Registered", subtitle: "", pill_active: false },
            },
          }),
        });
      }
    );

    await page.route(
      `**/.well-known/hc/v1/cards/${SAMPLE_WALLET_ENTRY.profile_id}`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            handle: SAMPLE_WALLET_ENTRY.handle,
            manifesto_line: SAMPLE_WALLET_ENTRY.manifesto_line,
            created_at: "2026-05-25T12:00:00.000Z",
            status: "active",
          }),
        })
    );

    await page.goto("/wallet/");
    await expect(page.getByText("Reachable")).toBeVisible({ timeout: 15_000 });

    const cardRow = page.locator(".hub-card-item").first();
    await cardRow.locator(".hub-card-menu summary").click();
    await cardRow.getByRole("button", { name: "Revoke QR" }).click();

    await expect(page).toHaveURL(/\/created\/\?.*profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD5/);
    await expect(page.locator("#created-setup-root")).toBeHidden();

    await expect(page.locator("#created-tab-advanced")).toBeVisible();
    await expect(page.locator("#revoke-details")).toBeVisible();
    await expect(page.locator("#revoke-details")).toHaveAttribute("open");
  });

  test("Update status opens /created/ with keys and update panel focus", async ({ page }) => {
    await page.addInitScript((profileId) => {
      localStorage.setItem("hc_setup_done", JSON.stringify({ [profileId]: true }));
    }, SAMPLE_WALLET_ENTRY.profile_id);
    await page.route("**/.well-known/hc/v1/health**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", database: "ok" }),
      })
    );
    await page.route("**/.well-known/hc/v1/cards/**/status**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version: "1.0",
          resolver: { operator: "humanity.llc", version: "1.0" },
          scan: {
            kind: "active",
            profile_id: SAMPLE_WALLET_ENTRY.profile_id,
            qr_id: SAMPLE_WALLET_ENTRY.qr_id,
            card: {
              status: "active",
              handle: SAMPLE_WALLET_ENTRY.handle,
              manifesto_line: SAMPLE_WALLET_ENTRY.manifesto_line,
            },
            verification: { state: "registered", label: "Registered" },
            human_trust: { label: "Registered", subtitle: "", pill_active: false },
          },
        }),
      })
    );
    await page.goto("/wallet/");
    await expect(page.getByText("Reachable")).toBeVisible({ timeout: 15_000 });
    const cardRow = page.locator(".hub-card-item").first();
    await cardRow.locator(".hub-card-menu summary").click();
    await cardRow.getByRole("button", { name: "Update status" }).click();
    await expect(page).toHaveURL(/\/created\/\?.*profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD5/);
    await expect(page).toHaveURL(/#update-status/);
    const sessionRaw = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(sessionRaw).toContain("privkeyfortestonlyxxxxxxxxx");
    await expect(page.locator("#created-tab-advanced")).toBeVisible();
  });

  test("does not show card-disabled-since-visit banner when resolver reports active", async ({
    page,
  }) => {
    await page.addInitScript((profileId) => {
      localStorage.setItem(
        "hc_wallet_last_seen_network",
        JSON.stringify({ [profileId]: "active" })
      );
      sessionStorage.removeItem("hc_wallet_network_cache");
    }, SAMPLE_WALLET_ENTRY.profile_id);

    await page.route("**/.well-known/hc/v1/cards/**/status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version: "1.0",
          resolver: { operator: "humanity.llc", version: "1.0" },
          scan: {
            kind: "active",
            profile_id: SAMPLE_WALLET_ENTRY.profile_id,
            qr_id: SAMPLE_WALLET_ENTRY.qr_id,
            card: { status: "active", handle: "e2etest", manifesto_line: "Test line" },
            verification: { state: "registered", label: "Registered" },
            human_trust: { label: "Registered", subtitle: "", pill_active: false },
          },
        }),
      });
    });

    await page.goto("/wallet/");
    await expect(page.getByText("Reachable")).toBeVisible();
    await expect(page.getByText("Registered")).toBeVisible();
    await expect(
      page.getByText("Card disabled on the network since your last visit.")
    ).toBeHidden();
  });

  test("does not show banner when stale session cache says card_revoked but resolver is active", async ({
    page,
  }) => {
    await page.addInitScript(({ profileId, qrId }) => {
      const now = Date.now();
      localStorage.setItem(
        "hc_wallet_last_seen_network",
        JSON.stringify({ [profileId]: "active" })
      );
      sessionStorage.setItem(
        "hc_wallet_network_cache",
        JSON.stringify({
          [profileId]: {
            status: "active",
            scanKind: "card_revoked",
            verificationLabel: null,
            verificationState: null,
            at: now,
          },
        })
      );
    }, {
      profileId: SAMPLE_WALLET_ENTRY.profile_id,
      qrId: SAMPLE_WALLET_ENTRY.qr_id,
    });

    await page.route("**/.well-known/hc/v1/cards/**/status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version: "1.0",
          resolver: { operator: "humanity.llc", version: "1.0" },
          scan: {
            kind: "active",
            profile_id: SAMPLE_WALLET_ENTRY.profile_id,
            qr_id: SAMPLE_WALLET_ENTRY.qr_id,
            card: { status: "active", handle: "e2etest", manifesto_line: "Test line" },
            verification: { state: "registered", label: "Registered" },
            human_trust: { label: "Registered", subtitle: "", pill_active: false },
          },
        }),
      });
    });

    await page.goto("/wallet/");
    await expect(page.getByText("Reachable")).toBeVisible();
    await expect(page.getByText("Registered")).toBeVisible();
    await expect(
      page.getByText("Card disabled on the network since your last visit.")
    ).toBeHidden();
  });

  test("does not re-show banner on other cards after Got it (baseline-changed guard)", async ({
    page,
  }) => {
    const profileA = SAMPLE_WALLET_ENTRY.profile_id;
    const profileB = "8Ym2nP3oR5sU7wX9zA1bC4dE6";
    const entryB = {
      ...SAMPLE_WALLET_ENTRY,
      id: "e2e_test_2",
      label: "E2E Second Card",
      profile_id: profileB,
      qr_id: "qr_E2eWalletTestSecond",
      scan_url: `http://127.0.0.1:8787/c/${profileB}?q=qr_E2eWalletTestSecond`,
    };

    await page.addInitScript(
      ({ a, b }) => {
        const now = Date.now();
        const stale = (pid) => ({
          status: "active",
          scanKind: "card_revoked",
          verificationLabel: null,
          verificationState: null,
          at: now,
        });
        sessionStorage.setItem(
          "hc_wallet_network_cache",
          JSON.stringify({ [a]: stale(a), [b]: stale(b) })
        );
        localStorage.setItem(
          "hc_wallet_last_seen_network",
          JSON.stringify({ [a]: "active", [b]: "active" })
        );
      },
      { a: profileA, b: profileB }
    );

    await page.route("**/.well-known/hc/v1/cards/**/status**", async (route) => {
      const url = new URL(route.request().url());
      const parts = url.pathname.split("/");
      const profileId = parts[parts.indexOf("cards") + 1] ?? SAMPLE_WALLET_ENTRY.profile_id;
      const qrId =
        url.searchParams.get("q") ??
        (profileId === entryB.profile_id ? entryB.qr_id : SAMPLE_WALLET_ENTRY.qr_id);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version: "1.0",
          resolver: { operator: "humanity.llc", version: "1.0" },
          scan: {
            kind: "active",
            profile_id: profileId,
            qr_id: qrId,
            card: { status: "active", handle: "e2etest", manifesto_line: "Test line" },
            verification: { state: "registered", label: "Registered" },
            human_trust: { label: "Registered", subtitle: "", pill_active: false },
          },
        }),
      });
    });

    await page.addInitScript((entries) => {
      localStorage.setItem("hc_wallet", JSON.stringify(entries));
    }, [SAMPLE_WALLET_ENTRY, entryB]);

    await page.goto("/wallet/");
    await expect(page.getByText("Reachable").first()).toBeVisible();
    await expect(page.locator(".hub-card-status-alert:not([hidden])")).toHaveCount(0);

    const dismiss = page.getByRole("button", { name: "Got it" }).first();
    if (await dismiss.isVisible().catch(() => false)) {
      await dismiss.click();
      await expect(page.locator(".hub-card-status-alert:not([hidden])")).toHaveCount(0);
    }
  });

  test("does not re-show banner on other cards after Open controls (baseline-changed guard)", async ({
    page,
  }) => {
    const profileA = SAMPLE_WALLET_ENTRY.profile_id;
    const profileB = "8Ym2nP3oR5sU7wX9zA1bC4dE6";
    const entryB = {
      ...SAMPLE_WALLET_ENTRY,
      id: "e2e_test_2",
      label: "E2E Second Card",
      profile_id: profileB,
      qr_id: "qr_E2eWalletTestSecond",
      scan_url: `http://127.0.0.1:8787/c/${profileB}?q=qr_E2eWalletTestSecond`,
    };

    await page.addInitScript(
      ({ a, b }) => {
        const now = Date.now();
        const stale = (pid) => ({
          status: "active",
          scanKind: "card_revoked",
          verificationLabel: null,
          verificationState: null,
          at: now,
        });
        sessionStorage.setItem(
          "hc_wallet_network_cache",
          JSON.stringify({ [a]: stale(a), [b]: stale(b) })
        );
        localStorage.setItem(
          "hc_wallet_last_seen_network",
          JSON.stringify({ [a]: "active", [b]: "active" })
        );
      },
      { a: profileA, b: profileB }
    );

    await page.route("**/.well-known/hc/v1/health**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", database: "ok" }),
      })
    );
    await page.route("**/.well-known/hc/v1/cards/**/status**", async (route) => {
      const url = new URL(route.request().url());
      const parts = url.pathname.split("/");
      const profileId = parts[parts.indexOf("cards") + 1] ?? SAMPLE_WALLET_ENTRY.profile_id;
      const qrId =
        url.searchParams.get("q") ??
        (profileId === entryB.profile_id ? entryB.qr_id : SAMPLE_WALLET_ENTRY.qr_id);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version: "1.0",
          resolver: { operator: "humanity.llc", version: "1.0" },
          scan: {
            kind: "active",
            profile_id: profileId,
            qr_id: qrId,
            card: { status: "active", handle: "e2etest", manifesto_line: "Test line" },
            verification: { state: "registered", label: "Registered" },
            human_trust: { label: "Registered", subtitle: "", pill_active: false },
          },
        }),
      });
    });

    await page.addInitScript((entries) => {
      localStorage.setItem("hc_wallet", JSON.stringify(entries));
    }, [SAMPLE_WALLET_ENTRY, entryB]);

    await page.goto("/wallet/");
    await expect(page.getByText("Reachable").first()).toBeVisible();
    await expect(page.locator(".hub-card-status-alert:not([hidden])")).toHaveCount(0);

    await page.getByRole("button", { name: "Open controls" }).first().click();
    await expect(page).toHaveURL(/\/created\/\?.*profile_id=/);
    await page.goto("/wallet/");
    await expect(page.getByText("Reachable").first()).toBeVisible();
    await expect(page.locator(".hub-card-status-alert:not([hidden])")).toHaveCount(0);
  });

  test("contextless /created/ redirects to My cards home", async ({ page }) => {
    await page.goto("/created/");
    await expect(page).toHaveURL(/\/wallet\/$/);
    await expect(page.getByRole("heading", { name: "My cards on this device" })).toBeVisible();
  });
});
