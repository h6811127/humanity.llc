import { test, expect, type Page } from "@playwright/test";

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

function cardStatusBody(entry = SAMPLE_WALLET_ENTRY) {
  return {
    version: "1.0",
    resolver: { operator: "humanity.llc", version: "1.0" },
    scan: {
      kind: "active",
      profile_id: entry.profile_id,
      qr_id: entry.qr_id,
      card: {
        status: "active",
        handle: entry.handle,
        manifesto_line: entry.manifesto_line,
      },
      verification: { state: "registered", label: "Registered" },
      human_trust: { label: "Registered", subtitle: "", pill_active: false },
    },
  };
}

async function stubCreatedResolver(page: Page, entry = SAMPLE_WALLET_ENTRY) {
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
      body: JSON.stringify(cardStatusBody(entry)),
    })
  );
  await page.route(`**/.well-known/hc/v1/cards/${entry.profile_id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        handle: entry.handle,
        manifesto_line: entry.manifesto_line,
        created_at: "2026-05-25T12:00:00.000Z",
        status: "active",
      }),
    })
  );
}

async function waitForStatusDotReady(page: Page) {
  await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/, {
    timeout: 15_000,
  });
}

async function clickOpenControlsOnSavedCard(page: Page) {
  await page
    .locator(".hub-card-item")
    .first()
    .getByRole("button", { name: "Open controls", exact: true })
    .click();
}

test.describe("device OS wallet flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, SAMPLE_WALLET_ENTRY);
  });

  test("shows My objects home and Open controls opens /created/ with session keys", async ({
    page,
  }) => {
    await page.goto("/wallet/");
    await expect(page.getByRole("heading", { name: "My objects on this device" })).toBeVisible();
    await expect(page.getByText("E2E Test Card")).toBeVisible();
    await clickOpenControlsOnSavedCard(page);
    await expect(page).toHaveURL(/\/created\/\?.*profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD5/);
    const sessionRaw = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(sessionRaw).toContain("privkeyfortestonlyxxxxxxxxx");
  });

  test("Revoke QR from hub opens Manage revoke panel (not setup Print)", async ({
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
    await expect(page.locator(".hub-card-status-label")).toContainText("Reachable", {
      timeout: 15_000,
    });

    const cardRow = page.locator(".hub-card-item").first();
    await cardRow.locator(".hub-card-menu summary").click();
    await expect(
      cardRow.getByText("Opens card page to confirm")
    ).toBeVisible();
    await cardRow.getByRole("button", { name: "Revoke QR" }).click();

    await expect(page).toHaveURL(/\/created\/\?.*profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD5/);
    await expect(page.locator("#created-setup-root")).toBeHidden();

    await expect(page.getByRole("tab", { name: "Manage", selected: true })).toBeVisible();
    await expect(page.locator("#revoke-details")).toBeVisible();
    await expect(page.locator("#revoke-details")).toHaveAttribute("open");
  });

  test("Open controls opens control workspace when hc_setup_done unset (not setup Print)", async ({
    page,
  }) => {
    await page.addInitScript((profileId) => {
      localStorage.removeItem("hc_setup_done");
    }, SAMPLE_WALLET_ENTRY.profile_id);
    await stubCreatedResolver(page);

    await page.goto("/wallet/");
    await clickOpenControlsOnSavedCard(page);

    await expect(page).toHaveURL(/\/created\/\?.*profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD5/);
    await expect(page.locator("#created-setup-root")).toBeHidden();
    await expect(page.locator("#created-control-root")).toBeVisible();
    await expect(page.locator("#created-tab-now")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Live", selected: true })).toBeVisible();
  });

  test("control mode shows Live tab, setup memory chips, and primary CTA", async ({
    page,
  }) => {
    await page.addInitScript((profileId) => {
      localStorage.setItem("hc_setup_done", JSON.stringify({ [profileId]: true }));
      const done = JSON.stringify({
        [profileId]: ["save-keys", "download-qr", "test-scan"],
      });
      sessionStorage.setItem("hc_created_task_done", done);
    }, SAMPLE_WALLET_ENTRY.profile_id);
    await stubCreatedResolver(page);

    await page.goto("/wallet/");
    await clickOpenControlsOnSavedCard(page);

    await expect(page.locator("#created-control-root")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Live", selected: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Manage" })).toBeVisible();
    await expect(page.locator("#created-live-setup-memory-wrap")).toBeVisible();
    await expect(page.locator("#created-live-primary-btn")).toBeVisible();
    await expect(page.getByText("You already finished setup")).toBeVisible();
  });

  test("fresh=1 shows post-create setup wizard (not control tabs)", async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.removeItem("hc_setup_done");
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      sessionStorage.setItem(
        "hc_created",
        JSON.stringify({
          profile_id: entry.profile_id,
          qr_id: entry.qr_id,
          owner_private_key_b58: entry.owner_private_key_b58,
          owner_public_key_b58: entry.owner_public_key_b58,
          handle: entry.handle,
          manifesto_line: entry.manifesto_line,
          scan_url: entry.scan_url,
        })
      );
    }, SAMPLE_WALLET_ENTRY);
    await stubCreatedResolver(page);

    const url = `/created/?profile_id=${SAMPLE_WALLET_ENTRY.profile_id}&qr_id=${SAMPLE_WALLET_ENTRY.qr_id}&fresh=1`;
    await page.goto(url);

    await expect(page.locator("#created-setup-root")).toBeVisible();
    await expect(page.locator("#created-control-root")).toBeHidden();
    await expect(page.getByText("Four steps · keys stay in this browser")).toBeVisible();
  });

  test("fresh=1 setup save step shows created keys custody emphasis card", async ({
    page,
  }) => {
    await page.addInitScript((entry) => {
      localStorage.removeItem("hc_setup_done");
      localStorage.removeItem("hc_keys_custody_notice_dismissed");
      localStorage.setItem("hc_auto_save_device", "0");
      localStorage.setItem("hc_wallet", JSON.stringify([]));
      sessionStorage.setItem(
        "hc_created",
        JSON.stringify({
          profile_id: entry.profile_id,
          qr_id: entry.qr_id,
          owner_private_key_b58: entry.owner_private_key_b58,
          owner_public_key_b58: entry.owner_public_key_b58,
          handle: entry.handle,
          manifesto_line: entry.manifesto_line,
          scan_url: entry.scan_url,
        })
      );
    }, SAMPLE_WALLET_ENTRY);
    await stubCreatedResolver(page);

    await page.goto(
      `/created/?profile_id=${SAMPLE_WALLET_ENTRY.profile_id}&qr_id=${SAMPLE_WALLET_ENTRY.qr_id}&fresh=1`
    );

    const card = page.locator("#device-keys-custody-created-setup .device-keys-custody--created");
    await expect(card).toBeVisible();
    await expect(card.locator(".hc-emphasis-card__eyebrow")).toHaveText(/keys on this device/i);
    await expect(card.getByRole("button", { name: "Acknowledge" })).toBeVisible();
    await expect(page.locator("#created-setup-keys-mount #created-keys-strip")).toBeVisible();
  });

  test("Update status opens /created/ with keys and update panel focus", async ({ page }) => {
    await page.addInitScript((profileId) => {
      localStorage.setItem("hc_setup_done", JSON.stringify({ [profileId]: true }));
      sessionStorage.setItem(
        "hc_created_first_qr_revoke",
        JSON.stringify({ [profileId]: true })
      );
    }, SAMPLE_WALLET_ENTRY.profile_id);
    await stubCreatedResolver(page);
    await page.goto("/wallet/");
    await expect(page.locator(".hub-card-status-label")).toContainText("Reachable", {
      timeout: 15_000,
    });
    const cardRow = page.locator(".hub-card-item").first();
    await cardRow.locator(".hub-card-menu summary").click();
    await cardRow.getByRole("button", { name: "Update status" }).click();
    await expect(page).toHaveURL(/\/created\/\?.*profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD5/);
    await expect(page).toHaveURL(/#update-status/);
    const sessionRaw = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(sessionRaw).toContain("privkeyfortestonlyxxxxxxxxx");
    await expect(page.getByRole("tab", { name: "Live", selected: true })).toBeVisible();
    await expect(page.locator("#created-live-scanners-see")).toBeVisible();
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

  test("P0b-1: fresh saved card without device baseline hides since-visit banner", async ({
    page,
  }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      localStorage.removeItem("hc_wallet_last_seen_network");
      sessionStorage.removeItem("hc_wallet_network_cache");
    }, SAMPLE_WALLET_ENTRY);

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
    await expect(page.getByText("Reachable")).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText("Card disabled on the network since your last visit.")
    ).toBeHidden();
    const baseline = await page.evaluate((profileId) => {
      const raw = localStorage.getItem("hc_wallet_last_seen_network");
      return raw ? JSON.parse(raw)[profileId] : undefined;
    }, SAMPLE_WALLET_ENTRY.profile_id);
    expect(baseline).toBeUndefined();
  });

  test("does not re-show since-visit banner after live-control tick once resolver reports active (G3/A5)", async ({
    page,
  }) => {
    const profileId = SAMPLE_WALLET_ENTRY.profile_id;

    await page.addInitScript((pid) => {
      localStorage.setItem(
        "hc_wallet_last_seen_network",
        JSON.stringify({ [pid]: "active" })
      );
      sessionStorage.removeItem("hc_wallet_network_cache");
      try {
        localStorage.setItem("hc_watch_live_proof", "0");
      } catch {
        /* ignore */
      }
    }, profileId);

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

    const activeStatusBody = {
      version: "1.0",
      resolver: { operator: "humanity.llc", version: "1.0" },
      scan: {
        kind: "active",
        profile_id: profileId,
        qr_id: SAMPLE_WALLET_ENTRY.qr_id,
        card: { status: "active", handle: "e2etest", manifesto_line: "Test line" },
        verification: { state: "registered", label: "Registered" },
        human_trust: { label: "Registered", subtitle: "", pill_active: false },
      },
    };

    let seededRevoked = false;
    await page.route("**/.well-known/hc/v1/cards/**/status**", async (route) => {
      if (!seededRevoked) {
        seededRevoked = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            version: "1.0",
            resolver: { operator: "humanity.llc", version: "1.0" },
            scan: {
              kind: "card_revoked",
              profile_id: profileId,
              qr_id: SAMPLE_WALLET_ENTRY.qr_id,
              card: { status: "revoked", handle: "e2etest", manifesto_line: "Test line" },
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(activeStatusBody),
      });
    });

    const statusResponse = (resp) =>
      resp.url().includes("/status") && resp.request().method() === "GET" && resp.ok();

    await page.goto("/wallet/");
    await page.waitForResponse(statusResponse, { timeout: 15_000 });
    await page.evaluate(() => {
      sessionStorage.removeItem("hc_wallet_network_cache");
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith("hc_resolver_etag:")) sessionStorage.removeItem(key);
      }
    });

    const refreshStatus = page.waitForResponse(statusResponse, { timeout: 15_000 });
    await page.getByRole("button", { name: "Check network" }).click({ timeout: 15_000 });
    await refreshStatus;
    await expect(page.locator(".hub-card-status-label")).toContainText("Reachable", {
      timeout: 15_000,
    });
    await expect(page.locator(".hub-card-status-alert:not([hidden])")).toHaveCount(0, {
      timeout: 15_000,
    });

    await page.evaluate(() => {
      window.dispatchEvent(new Event("hc-live-control-inbox-changed"));
    });

    await expect(page.locator(".hub-card-status-alert:not([hidden])")).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(
      page.getByText("Card disabled on the network since your last visit.")
    ).toBeHidden();
    await expect(page.getByText("Reachable")).toBeVisible();
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

    await page
      .locator(".hub-card-item")
      .first()
      .getByRole("button", { name: "Open controls" })
      .click();
    await expect(page).toHaveURL(/\/created\/\?.*profile_id=/);
    await page.goto("/wallet/");
    await expect(page.getByText("Reachable").first()).toBeVisible();
    await expect(page.locator(".hub-card-status-alert:not([hidden])")).toHaveCount(0);
  });

  test("contextless /created/ redirects to My objects home", async ({ page }) => {
    await page.goto("/created/");
    await expect(page).toHaveURL(/\/wallet\/$/);
    await expect(page.getByRole("heading", { name: "My objects on this device" })).toBeVisible();
  });

  test("keys custody wallet notice uses compact stacked layout", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("hc_keys_custody_notice_dismissed");
    });
    await page.goto("/wallet/");
    const card = page.locator(".device-keys-custody--wallet");
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: "Acknowledge" })).toBeVisible();

    const metrics = await card.evaluate((el) => {
      const detail = el.querySelector(".hc-emphasis-card__detail");
      const ack = el.querySelector("[data-keys-custody-ack]");
      const main = el.querySelector(".hc-emphasis-card__main");
      if (!detail || !ack || !main) return null;
      return {
        gapPx: ack.getBoundingClientRect().top - detail.getBoundingClientRect().bottom,
        justifyContent: getComputedStyle(el).justifyContent,
        mainFlexGrow: getComputedStyle(main).flexGrow,
      };
    });
    expect(metrics).not.toBeNull();
    expect(metrics!.justifyContent).toBe("flex-start");
    expect(metrics!.mainFlexGrow).toBe("0");
    expect(metrics!.gapPx).toBeGreaterThan(0);
    expect(metrics!.gapPx).toBeLessThan(56);
  });

  test("keys custody acknowledge dismiss persists on wallet", async ({ page }) => {
    await page.goto("/wallet/");
    await page.evaluate(() => localStorage.removeItem("hc_keys_custody_notice_dismissed"));
    await page.reload();
    const card = page.locator(".device-keys-custody--wallet");
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Acknowledge" }).click();
    await expect(card).toHaveCount(0);
    expect(
      await page.evaluate(() => localStorage.getItem("hc_keys_custody_notice_dismissed"))
    ).toBe("1");
    await page.reload();
    await expect(page.locator(".device-keys-custody--wallet")).toHaveCount(0);
  });

  test("keys custody wallet notice readable in dark theme", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("hc_theme", "dark");
      localStorage.removeItem("hc_keys_custody_notice_dismissed");
    });
    await page.goto("/wallet/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const card = page.locator(".device-keys-custody--wallet");
    await expect(card).toBeVisible();

    const colors = await card.evaluate((el) => {
      const eyebrow = el.querySelector(".hc-emphasis-card__eyebrow");
      const detail = el.querySelector(".hc-emphasis-card__detail");
      if (!eyebrow || !detail) return null;
      const parseRgb = (s: string) => {
        const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
      };
      return {
        eyebrow: parseRgb(getComputedStyle(eyebrow).color),
        detail: parseRgb(getComputedStyle(detail).color),
      };
    });
    expect(colors).not.toBeNull();
    expect(colors!.eyebrow![2]).toBeGreaterThan(150);
    expect(colors!.detail![0]).toBeGreaterThan(180);
  });

  test("keys custody hub notice uses compact stacked layout", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("hc_keys_custody_notice_dismissed");
    });
    await page.goto("/");
    await waitForStatusDotReady(page);
    await page.locator("#brand-status-dot-btn").click({ timeout: 15_000 });
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/, {
      timeout: 15_000,
    });

    const card = page.locator(".device-keys-custody--hub");
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: "Acknowledge" })).toBeVisible();

    const metrics = await card.evaluate((el) => {
      const detail = el.querySelector(".hc-emphasis-card__detail");
      const ack = el.querySelector("[data-keys-custody-ack]");
      const main = el.querySelector(".hc-emphasis-card__main");
      if (!detail || !ack || !main) return null;
      return {
        gapPx: ack.getBoundingClientRect().top - detail.getBoundingClientRect().bottom,
        justifyContent: getComputedStyle(el).justifyContent,
        mainFlexGrow: getComputedStyle(main).flexGrow,
      };
    });
    expect(metrics).not.toBeNull();
    expect(metrics!.justifyContent).toBe("flex-start");
    expect(metrics!.mainFlexGrow).toBe("0");
    expect(metrics!.gapPx).toBeGreaterThan(0);
    expect(metrics!.gapPx).toBeLessThan(56);
  });
});

test.describe("P0b-1 fresh create hub row (R10)", () => {
  async function stubFreshCreateHubNetwork(page: Page) {
    await stubCreatedResolver(page);
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) =>
      route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
    );
  }

  async function seedFreshCreateWallet(
    page: Page,
    opts: { baseline?: "none" | "active" } = {}
  ) {
    await page.addInitScript(
      ({ entry, baselineMode }) => {
        localStorage.setItem("hc_device_hub_intro_dismissed", "1");
        localStorage.setItem("hc_wallet", JSON.stringify([entry]));
        if (baselineMode === "active") {
          localStorage.setItem(
            "hc_wallet_last_seen_network",
            JSON.stringify({ [entry.profile_id]: "active" })
          );
        } else {
          localStorage.removeItem("hc_wallet_last_seen_network");
        }
        sessionStorage.setItem(
          "hc_wallet_network_cache",
          JSON.stringify({
            [entry.profile_id]: {
              status: "active",
              scanKind: "card_revoked",
              verificationLabel: null,
              verificationState: null,
              at: Date.now(),
            },
          })
        );
      },
      { entry: SAMPLE_WALLET_ENTRY, baselineMode: opts.baseline ?? "none" }
    );
  }

  async function openLandingHub(page: Page) {
    await page.goto("/");
    await waitForStatusDotReady(page);
    await page.locator("#brand-status-dot-btn").click({ timeout: 15_000 });
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/, {
      timeout: 15_000,
    });
  }

  test("does not show since-visit banner on landing hub after fresh create (no baseline)", async ({
    page,
  }) => {
    await stubFreshCreateHubNetwork(page);
    await seedFreshCreateWallet(page, { baseline: "none" });
    await openLandingHub(page);

    await expect(page.locator(".hub-card-status-label")).toContainText("Reachable", {
      timeout: 15_000,
    });
    await expect(page.locator("#device-hub-card-disabled-group")).toBeHidden();
    await expect(
      page.getByText("Card disabled on the network since your last visit.")
    ).toBeHidden();
  });

  test("does not show since-visit banner on landing hub when baseline is active and resolver is active", async ({
    page,
  }) => {
    await stubFreshCreateHubNetwork(page);
    await seedFreshCreateWallet(page, { baseline: "active" });
    await openLandingHub(page);

    await expect(page.locator(".hub-card-status-label")).toContainText("Reachable", {
      timeout: 15_000,
    });
    await expect(page.locator("#device-hub-card-disabled-group")).toBeHidden();
    await expect(
      page.getByText("Card disabled on the network since your last visit.")
    ).toBeHidden();
  });
});
