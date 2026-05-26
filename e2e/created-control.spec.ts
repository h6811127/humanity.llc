import { test, expect } from "@playwright/test";

const SAMPLE = {
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  qr_id: "qr_E2eWakketTest9",
  handle: "e2etest",
  manifesto_line: "Test line",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_E2eWakketTest9",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
};

function cardStatusRoute() {
  return {
    version: "1.0",
    resolver: { operator: "humanity.llc", version: "1.0" },
    scan: {
      kind: "active",
      profile_id: SAMPLE.profile_id,
      qr_id: SAMPLE.qr_id,
      card: {
        status: "active",
        handle: SAMPLE.handle,
        manifesto_line: SAMPLE.manifesto_line,
      },
      verification: { state: "registered", label: "Registered" },
      human_trust: { label: "Registered", subtitle: "", pill_active: false },
    },
  };
}

async function stubResolver(page) {
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
      body: JSON.stringify(cardStatusRoute()),
    })
  );
  await page.route(`**/.well-known/hc/v1/cards/${SAMPLE.profile_id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        handle: SAMPLE.handle,
        manifesto_line: SAMPLE.manifesto_line,
        created_at: "2026-05-25T12:00:00.000Z",
        status: "active",
      }),
    })
  );
}

test.describe("/created/ control mode (Live · Manage)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((sample) => {
      localStorage.setItem(
        "hc_setup_done",
        JSON.stringify({ [sample.profile_id]: true })
      );
      localStorage.setItem(
        "hc_wallet",
        JSON.stringify([
          {
            id: "e2e_created_control",
            label: "E2E Control",
            profile_id: sample.profile_id,
            qr_id: sample.qr_id,
            handle: sample.handle,
            manifesto_line: sample.manifesto_line,
            scan_url: sample.scan_url,
            owner_public_key_b58: sample.owner_public_key_b58,
            owner_private_key_b58: sample.owner_private_key_b58,
          },
        ])
      );
      sessionStorage.setItem(
        "hc_created",
        JSON.stringify({
          profile_id: sample.profile_id,
          qr_id: sample.qr_id,
          handle: sample.handle,
          manifesto_line: sample.manifesto_line,
          scan_url: sample.scan_url,
          owner_public_key_b58: sample.owner_public_key_b58,
          owner_private_key_b58: sample.owner_private_key_b58,
        })
      );
    }, SAMPLE);
    await stubResolver(page);
  });

  test("opens control workspace with Live tab cockpit", async ({ page }) => {
    const url = `/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}`;
    await page.goto(url);

    await expect(page.locator("#created-setup-root")).toBeHidden();
    await expect(page.locator("#created-control-root")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your object is live" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Live", selected: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Manage" })).toBeVisible();
    await expect(page.locator("#created-live-setup-memory-wrap")).toBeVisible();
    await expect(page.locator("#created-live-primary-btn")).toBeVisible();
    await expect(page.locator("#created-live-scanners-see")).toBeVisible();
    await expect(page.locator("#created-deploy-print")).toBeVisible();
    await expect(page.locator("#manifesto-update-panel")).toHaveCount(0);
  });

  test("#revoke deep link opens Manage revoke panel", async ({ page }) => {
    await page.goto(
      `/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}#revoke`
    );
    await expect(page.getByRole("tab", { name: "Manage", selected: true })).toBeVisible();
    await expect(page.locator("#revoke-details")).toBeVisible();
    await expect(page.locator("#revoke-details")).toHaveAttribute("open");
  });

  test("#update-status deep link focuses Live scanners-see form", async ({ page }) => {
    await page.addInitScript((profileId) => {
      sessionStorage.setItem(
        "hc_created_first_qr_revoke",
        JSON.stringify({ [profileId]: true })
      );
    }, SAMPLE.profile_id);

    await page.goto(
      `/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}#update-status`
    );
    await expect(page.getByRole("tab", { name: "Live", selected: true })).toBeVisible();
    await expect(page.locator("#created-live-scanners-see")).toBeVisible();
    await expect(page.locator("#manifesto-update-form")).toBeVisible();
  });
});
