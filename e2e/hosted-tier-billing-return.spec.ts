import { expect, test, type Route } from "@playwright/test";

/**
 * Hosted steward billing checkout return (roadmap step 4 / verify-path step 3).
 * @see docs/STEWARD_DEVICE_ROADMAP.md § steps 3–4
 * @see site/js/device-steward-session.mjs
 */

const ACCOUNT_ID = "acc_TestHostedSteward1";

const WALLET_ENTRY = {
  id: "hosted_billing_return_1",
  label: "Hosted Billing Return Card",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  qr_id: "qr_HostedBillingReturn9",
  handle: "hostedbill",
  manifesto_line: "Billing return test",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_HostedBillingReturn9",
  owner_public_key_b58: "AXBxsNjTx7KQXM5DJPFgKEFYZD6vt6TNDueNKrwyfPeT",
  /** Deterministic test seed — see worker/tests/export-e2e-test-keypair.test.ts */
  owner_private_key_b58: "5r8oDw5WCtRqxB4FY9bxxZ1qwJBwbdvYtoiq4jNmvoRn",
  status: "active",
};

const HOSTED_ENTITLEMENTS_BODY = {
  plan_id: "hosted_steward_v1",
  status: "active",
  entitlements: {
    "steward.hosted": true,
    "notify.push.live_proof": true,
    "poll.live_proof.auto_daily_cap": 4000,
    "poll.live_proof.idle_ms": 30_000,
    "poll.live_proof.active_ms": 5000,
    "poll.network.max_parallel": 5,
    "poll.network.manual_max_parallel": 3,
    "wallet.large_threshold": 25,
    "sw.periodic_min_ms": 300_000,
  },
};

function mockHealth(route: Route) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: "ok", database: "ok" }),
  });
}

function mockCardStatus(route: Route) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      version: "1.0",
      resolver: { operator: "humanity.llc", version: "1.0" },
      scan: {
        kind: "active",
        profile_id: WALLET_ENTRY.profile_id,
        qr_id: WALLET_ENTRY.qr_id,
        card: {
          status: "active",
          handle: WALLET_ENTRY.handle,
          manifesto_line: WALLET_ENTRY.manifesto_line,
        },
        verification: { state: "registered", label: "Registered" },
        human_trust: { label: "Registered", subtitle: "", pill_active: false },
      },
    }),
  });
}

async function installCommonRoutes(page: import("@playwright/test").Page) {
  await page.route("**/.well-known/hc/v1/health**", mockHealth);
  await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardStatus);
  await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
  );
}

async function installWalletEntry(
  page: import("@playwright/test").Page,
  opts: { withTabKeys?: boolean } = {}
) {
  await page.addInitScript(
    ({ entry, withTabKeys }) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      localStorage.setItem("hc_device_id", "device-e2e-billing-return");
      if (withTabKeys) {
        sessionStorage.setItem("hc_created", JSON.stringify(entry));
      } else {
        sessionStorage.removeItem("hc_created");
      }
      sessionStorage.removeItem("hc_steward_session");
      sessionStorage.removeItem("hc_steward_pending_account_id");
    },
    { entry: WALLET_ENTRY, withTabKeys: opts.withTabKeys === true }
  );
}

async function dismissHubIntro(page: import("@playwright/test").Page) {
  const dismiss = page.locator("#device-hub-intro-dismiss");
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
  }
}

async function openHub(page: import("@playwright/test").Page) {
  await dismissHubIntro(page);
  await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/, {
    timeout: 15_000,
  });
  await page.locator("#brand-status-dot-btn").click({ timeout: 15_000 });
  await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/, {
    timeout: 15_000,
  });
}

async function readPendingAccountId(page: import("@playwright/test").Page) {
  return page.evaluate(() => sessionStorage.getItem("hc_steward_pending_account_id"));
}

test.describe("hosted steward billing checkout return", () => {
  test("shows hub pending line and persists account id when keys are not loaded", async ({
    page,
  }) => {
    await installCommonRoutes(page);
    await installWalletEntry(page, { withTabKeys: false });

    await page.goto(`/?${new URLSearchParams({ hc_account_id: ACCOUNT_ID }).toString()}`);
    await expect.poll(() => readPendingAccountId(page)).toBe(ACCOUNT_ID);

    await openHub(page);

    const pendingLine = page.locator("#device-hub-steward-billing-pending-line");
    await expect(pendingLine).toBeVisible();
    await expect(pendingLine).toContainText(/open or import a saved card/i);
    expect(page.url()).toContain(`hc_account_id=${ACCOUNT_ID}`);
  });

  test("retries link after keys load and clears checkout param on success", async ({
    page,
  }) => {
    await installCommonRoutes(page);
    let sessionPosts = 0;
    await page.route("**/.well-known/hc/v1/steward/session**", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      sessionPosts += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: "e2e-billing-session", account_id: ACCOUNT_ID }),
      });
    });
    await page.route("**/.well-known/hc/v1/steward/entitlements**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { ETag: '"billing-return-e2e"' },
        body: JSON.stringify(HOSTED_ENTITLEMENTS_BODY),
      })
    );

    await installWalletEntry(page, { withTabKeys: false });

    const params = new URLSearchParams({
      hc_account_id: ACCOUNT_ID,
    });
    await page.goto(`/wallet/?${params.toString()}`);

    await expect
      .poll(() => readPendingAccountId(page), { timeout: 5_000 })
      .toBe(ACCOUNT_ID);

    await page.evaluate(async (entry) => {
      const { activateWalletEntry } = await import("/js/device-keys.mjs");
      activateWalletEntry(entry);
    }, WALLET_ENTRY);

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const raw = sessionStorage.getItem("hc_steward_session");
            if (!raw) return null;
            try {
              return JSON.parse(raw)?.token ?? null;
            } catch {
              return null;
            }
          }),
        { timeout: 15_000 }
      )
      .toBe("e2e-billing-session");

    await expect.poll(() => readPendingAccountId(page)).toBeNull();
    expect(sessionPosts).toBeGreaterThan(0);
    expect(page.url()).not.toContain("hc_account_id=");

    await expect(page.locator("#device-hub-steward-billing-pending-line")).toBeHidden();
    await expect(page.locator("#device-hub-steward-tier-line")).toContainText(
      /Hosted steward plan/i
    );
  });
});
