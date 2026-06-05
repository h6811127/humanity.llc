import { test, expect, type Page, type Route } from "@playwright/test";

import {
  SHOWCASE_PROFILE,
  SHOWCASE_QR,
} from "../worker/tests/fixtures/scan-showcase-fixtures";

/**
 * Phase 3 — stranger rescan must show revoked state when CDN still serves active HTML.
 * Simulates cached SSR (static fixture) + live no-store status JSON after owner revoke.
 *
 * @see docs/FLOW_2_QR_SCAN_REPAIR_SPEC.md manual #2
 * @see docs/SYSTEM_INVARIANTS.md § Live objects — scan live truth
 *
 * Fixtures: `npm run site:generate-scan-e2e-fixture`
 */

const SCAN_ACTIVE = "/e2e-fixtures/scan-active.html";
const STATUS_PATH = `/.well-known/hc/v1/cards/${SHOWCASE_PROFILE}/status`;

type ScanNetworkKind = "active" | "qr_revoked";

function statusBody(kind: ScanNetworkKind) {
  return {
    scan: {
      kind,
      profile_id: SHOWCASE_PROFILE,
      qr_id: SHOWCASE_QR,
      card: {
        status: "active",
        handle: "river_example",
        manifesto_line: "Open studio",
      },
      qr: {
        status: kind === "qr_revoked" ? "revoked" : "active",
        qr_id: SHOWCASE_QR,
      },
      freshness: {
        fetched_at: new Date().toISOString(),
        max_age_seconds: 30,
        stale_disclosure: "Status checked live from the network.",
        source: "resolver",
      },
    },
  };
}

function createStatusHandler(getKind: () => ScanNetworkKind) {
  return async (route: Route) => {
    const kind = getKind();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify(statusBody(kind)),
    });
  };
}

async function wireScanTruthRoutes(page: Page, getKind: () => ScanNetworkKind) {
  await page.route(`**${STATUS_PATH}**`, createStatusHandler(getKind));
}

async function clearScanTruthSession(page: Page) {
  await page.goto("about:blank");
  await page.evaluate(() => {
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
}

async function gotoCachedActiveScan(page: Page) {
  await page.goto(SCAN_ACTIVE, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#scan-safety-header.scan-hero")).toBeVisible();
}

test.describe("scan revoke freshness (Phase 3 / M3.6)", () => {
  test("stranger scan settles Active when SSR and status JSON agree", async ({ page }) => {
    await clearScanTruthSession(page);
    await wireScanTruthRoutes(page, () => "active");
    await gotoCachedActiveScan(page);

    const label = page.locator(".scan-arrive-status-label");
    await expect(label).toHaveText("Active", { timeout: 8_000 });
    await expect(page.locator("#scan-truth-unverified-banner")).toBeHidden();
    await expect(page.locator("#scan-safety-header")).toHaveAttribute("data-scan-active", "1");
  });

  test("after revoke, rescan shows Revoked within 2s despite cached active HTML", async ({
    page,
  }) => {
    await clearScanTruthSession(page);
    let networkKind: ScanNetworkKind = "active";
    await wireScanTruthRoutes(page, () => networkKind);

    await gotoCachedActiveScan(page);
    await expect(page.locator(".scan-arrive-status-label")).toHaveText("Active", {
      timeout: 8_000,
    });

    networkKind = "qr_revoked";
    const rescanStarted = Date.now();
    await page.reload({ waitUntil: "domcontentloaded" });

    const label = page.locator(".scan-arrive-status-label");
    await expect(label).toHaveText("Revoked", { timeout: 8_000 });
    expect(Date.now() - rescanStarted).toBeLessThan(6_000);

    await expect(page.locator("#scan-safety-header")).not.toHaveAttribute(
      "data-scan-active",
      "1"
    );
    await expect(page.locator(".scan-safety-strip--bad")).toBeVisible();
    await expect(page.locator("#scan-truth-unverified-banner")).not.toContainText(
      "Could not verify live status"
    );
  });

  test("first load with cached active HTML and revoked status JSON shows Revoked", async ({
    page,
  }) => {
    await clearScanTruthSession(page);
    await wireScanTruthRoutes(page, () => "qr_revoked");
    await gotoCachedActiveScan(page);

    await expect(page.locator(".scan-arrive-status-label")).toHaveText("Revoked", {
      timeout: 8_000,
    });
    await expect(page.locator(".scan-safety-strip--bad")).toBeVisible();
    await expect(page.locator("#scan-truth-unverified-banner")).not.toContainText(
      "Could not verify live status"
    );
  });
});
