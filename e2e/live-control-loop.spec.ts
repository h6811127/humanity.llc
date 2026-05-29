import { test, expect, type Page, type Route } from "@playwright/test";

import {
  SHOWCASE_PROFILE,
  SHOWCASE_QR,
} from "../worker/tests/fixtures/scan-showcase-fixtures";

/**
 * Live proof scanner full loop (H-13).
 * @see docs/LIVE_CONTROL_USABILITY_HARDENING.md § H-13
 * @see docs/SAD_PATH_COVERAGE_AND_BACKLOG.md § S12
 *
 * Static scan fixture on Pages :8788 (no Worker DB). Regenerate after scan-html changes:
 * `npm run site:generate-scan-e2e-fixture`
 */

const SCAN_FIXTURE = "/e2e-fixtures/scan-active.html";
const PAGES_ORIGIN = new URL(
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8788"
).origin;

const CHALLENGE_ID = "e2e_live_control_loop_challenge";

function statusUrl() {
  return `${PAGES_ORIGIN}/.well-known/hc/v1/cards/${SHOWCASE_PROFILE}/live-control/challenges/${CHALLENGE_ID}`;
}

function ownerUrl() {
  const url = new URL("/created/", PAGES_ORIGIN);
  url.searchParams.set("profile_id", SHOWCASE_PROFILE);
  url.searchParams.set("qr_id", SHOWCASE_QR);
  url.searchParams.set("live_challenge", CHALLENGE_ID);
  return url.href;
}

type LiveControlMockOptions = {
  /** After this many status GETs, return proven (default 1). */
  provenAfterPolls?: number;
  /** Force status GET to return expired. */
  statusExpired?: boolean;
  /** Challenge window for POST / pending GET (ms). */
  challengeTtlMs?: number;
};

function createLiveControlHandler(options: LiveControlMockOptions = {}) {
  const {
    provenAfterPolls = 1,
    statusExpired = false,
    challengeTtlMs = 120_000,
  } = options;
  let statusPolls = 0;

  return async (route: Route) => {
    const request = route.request();
    const url = request.url();
    if (!url.includes("/live-control/challenges")) {
      await route.continue();
      return;
    }

    const method = request.method();
    const challengeSegment = url.split("/challenges/")[1]?.split("?")[0] ?? "";

    if (method === "POST") {
      statusPolls = 0;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          type: "live_control_challenge",
          version: "1.0",
          challenge_id: CHALLENGE_ID,
          profile_id: SHOWCASE_PROFILE,
          qr_id: SHOWCASE_QR,
          status: "pending",
          status_url: statusUrl(),
          expires_at: new Date(Date.now() + challengeTtlMs).toISOString(),
          owner_url: ownerUrl(),
        }),
      });
      return;
    }

    if (method === "GET") {
      if (!challengeSegment) {
        await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
        return;
      }
      statusPolls += 1;
      if (statusExpired) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "expired",
            challenge_id: challengeSegment,
          }),
        });
        return;
      }
      if (statusPolls < provenAfterPolls) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "pending",
            challenge_id: challengeSegment,
            expires_at: new Date(Date.now() + challengeTtlMs).toISOString(),
            owner_url: ownerUrl(),
          }),
        });
        return;
      }
      const provenAt = new Date().toISOString();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "proven",
          challenge_id: challengeSegment,
          proven_at: provenAt,
          proof_expires_at: new Date(Date.now() + 300_000).toISOString(),
        }),
      });
      return;
    }

    await route.continue();
  };
}

async function openLiveControlSection(page: Page) {
  const details = page.locator("details.scan-group-live");
  await details.evaluate((el: HTMLDetailsElement) => {
    el.open = true;
  });
}

async function wireScanFixture(page: Page, options?: LiveControlMockOptions) {
  await page.route(/\/live-control\/challenges/, createLiveControlHandler(options));
  await page.goto(SCAN_FIXTURE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.removeItem("hc_created");
  });
  await openLiveControlSection(page);
  await expect(page.locator("#live-control-request")).toBeVisible();
}

test.describe("live control scanner loop (H-13)", () => {
  test("ask → wait → proven shows comprehension limits", async ({ page }) => {
    await wireScanFixture(page, { provenAfterPolls: 1 });

    await page.locator("#live-control-request").click();

    await expect(page.locator("#live-control-request")).toBeDisabled();
    await expect(page.locator("#live-control-request")).toHaveText("Waiting…");
    await expect(page.locator("#live-control-status")).toContainText(/Expires in|Waiting/);
    await expect(page.locator("#live-control-owner-panel")).toBeVisible();

    await expect(page.locator("#live-control-success")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#live-control-interactive")).toBeHidden();
    await expect(page.locator("#live-control-success")).toContainText(
      "does not prove legal identity"
    );
    await expect(page.locator("#live-control-row")).toHaveClass(/is-proven/);
  });

  test("refresh during wait resumes polling without a second ask (H-09)", async ({ page }) => {
    await wireScanFixture(page, { provenAfterPolls: 3 });

    await page.locator("#live-control-request").click();
    await expect(page.locator("#live-control-request")).toHaveText("Waiting…");

    await expect
      .poll(async () =>
        page.evaluate(
          ([profile, qr]) =>
            sessionStorage.getItem(`hc_live_control_pending:${profile}:${qr}`),
          [SHOWCASE_PROFILE, SHOWCASE_QR]
        )
      )
      .not.toBeNull();

    await page.reload({ waitUntil: "domcontentloaded" });
    await openLiveControlSection(page);
    await expect(page.locator("#live-control-status")).toContainText(
      /Checking live proof|Expires in|Waiting for the owner/,
      { timeout: 10_000 }
    );
    await expect(page.locator("#live-control-request")).toHaveText("Waiting…");

    await expect(page.locator("#live-control-success")).toBeVisible({ timeout: 15_000 });
  });

  test("expired challenge shows retry copy and enabled ask button (H-10)", async ({ page }) => {
    await wireScanFixture(page, { challengeTtlMs: 1_500, provenAfterPolls: 99 });

    await page.locator("#live-control-request").click();
    await expect(page.locator("#live-control-request")).toHaveText("Waiting…");

    await expect(page.locator("#live-control-status")).toContainText(
      "The 2-minute window ended. You can ask again.",
      { timeout: 10_000 }
    );
    await expect(page.locator("#live-control-request")).toBeEnabled();
    await expect(page.locator("#live-control-request")).toHaveText("Ask for live proof");
    await expect(page.locator("#live-control-status-panel")).toHaveClass(/is-request-expired/);
  });
});
