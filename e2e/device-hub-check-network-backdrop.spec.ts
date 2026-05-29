import { test, expect } from "@playwright/test";

const SAMPLE_WALLET_ENTRY = {
  id: "e2e_backdrop_1",
  label: "E2E Backdrop Card",
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

test.describe("Check network after stuck inbox backdrop", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", database: { status: "ok" } }),
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
          },
        }),
      })
    );
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, SAMPLE_WALLET_ENTRY);
  });

  test("check network works after stuck inbox backdrop is reconciled on tab focus", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Status indicator" }).click();
    await expect(page.getByRole("button", { name: "Check network" })).toBeVisible({
      timeout: 15_000,
    });

    await page.evaluate(() => {
      let backdrop = document.getElementById("device-inbox-backdrop");
      if (!backdrop) {
        backdrop = document.createElement("button");
        backdrop.id = "device-inbox-backdrop";
        backdrop.className = "device-inbox-backdrop is-visible";
        backdrop.hidden = false;
        document.body.appendChild(backdrop);
      } else {
        backdrop.hidden = false;
        backdrop.classList.add("is-visible");
      }
      const hub = document.getElementById("device-hub");
      hub?.classList.remove("device-hub-collapsed");
      document.body.classList.add("device-hub-sheet-open");
    });

    const statusResponse = (resp) =>
      resp.url().includes("/status") && resp.request().method() === "GET" && resp.ok();

    const refreshStatus = page.waitForResponse(statusResponse, { timeout: 15_000 });
    await page.getByRole("button", { name: "Check network" }).click({ timeout: 15_000 });
    await refreshStatus;

    await expect(page.locator("#device-hub-network-status-line")).toContainText(
      /Network checked/i,
      { timeout: 15_000 }
    );
  });
});
