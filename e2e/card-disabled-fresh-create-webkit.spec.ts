import { test, expect, type Page } from "@playwright/test";

/**
 * P0b-1 step 2 — WebKit desk proxy for fresh-create “card disabled since visit” (R10).
 * Prod WebKit sign-off still required on humanity.llc after deploy.
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P0b-1 · R10
 * @see docs/SAD_PATH_COVERAGE_AND_BACKLOG.md S30
 */

const SAMPLE_WALLET_ENTRY = {
  id: "e2e_r10_webkit",
  label: "E2E R10 WebKit Card",
  saved_at: "2026-05-29T12:00:00.000Z",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  qr_id: "qr_E2eR10WebkitTest1",
  handle: "r10webkit",
  manifesto_line: "Fresh create R10",
  scan_url:
    "http://127.0.0.1:8788/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_E2eR10WebkitTest1",
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

async function stubFreshCreateHubNetwork(page: Page) {
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
      body: JSON.stringify(cardStatusBody()),
    })
  );
  await page.route(`**/.well-known/hc/v1/cards/${SAMPLE_WALLET_ENTRY.profile_id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        handle: SAMPLE_WALLET_ENTRY.handle,
        manifesto_line: SAMPLE_WALLET_ENTRY.manifesto_line,
        created_at: "2026-05-29T12:00:00.000Z",
        status: "active",
      }),
    })
  );
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

async function waitForStatusDotReady(page: Page) {
  await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/, {
    timeout: 15_000,
  });
}

async function openLandingHub(page: Page) {
  await page.goto("/");
  await waitForStatusDotReady(page);
  await page.locator("#brand-status-dot-btn").click({ timeout: 15_000 });
  await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/, {
    timeout: 15_000,
  });
}

test.describe("P0b-1 fresh create hub row WebKit (R10 · step 2 desk proxy)", () => {
  test("does not show since-visit banner after fresh create (no baseline)", async ({
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

  test("does not show since-visit banner when baseline is active and resolver is active", async ({
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
