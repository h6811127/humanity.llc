import { test, expect, type Page } from "@playwright/test";

import { gotoLandingWithBoot, waitForDeviceBootReady } from "./helpers/wallet-shell";

/**
 * WebKit layout regression for keys custody emphasis cards.
 * @see docs/KEYS_CUSTODY_EMPHASIS_CARD_SPACING_INVESTIGATION.md § step 13c
 * @see docs/DEVICE_OS_QA.md § P1-KC step 5
 */

type CustodyLayoutMetrics = {
  ok: boolean;
  reason?: string;
  flexDirection?: string;
  justifyContent?: string;
  mainFlexGrow?: string;
  detailToAckGapPx?: number;
  appearance?: string;
  ackHeight?: number;
  ackWidth?: number;
};

/**
 * @param {Page} page
 * @param {string} rootSelector
 */
async function measureKeysCustodyLayout(
  page: Page,
  rootSelector: string
): Promise<CustodyLayoutMetrics> {
  return page.evaluate((rootSel) => {
    const root = document.querySelector(rootSel);
    if (!root) return { ok: false, reason: "missing-root" };

    const detail = root.querySelector(".hc-emphasis-card__detail");
    const ack = root.querySelector("[data-keys-custody-ack]");
    const main = root.querySelector(".hc-emphasis-card__main");
    if (!detail || !ack || !main) return { ok: false, reason: "missing-parts" };

    const ackEl = ack;
    const ackRect = ackEl.getBoundingClientRect();
    const csAck = getComputedStyle(ackEl);

    return {
      ok: true,
      flexDirection: getComputedStyle(root).flexDirection,
      justifyContent: getComputedStyle(root).justifyContent,
      mainFlexGrow: getComputedStyle(main).flexGrow,
      detailToAckGapPx:
        Math.round((ackRect.top - detail.getBoundingClientRect().bottom) * 100) / 100,
      appearance: csAck.getPropertyValue("-webkit-appearance") || csAck.appearance,
      ackHeight: Math.round(ackRect.height),
      ackWidth: Math.round(ackRect.width),
    };
  }, rootSelector);
}

function assertKeysCustodyLayout(metrics: CustodyLayoutMetrics) {
  expect(metrics.ok, metrics.reason ?? "layout metrics").toBe(true);
  expect(metrics.flexDirection).toBe("column");
  expect(metrics.justifyContent).toBe("flex-start");
  expect(metrics.mainFlexGrow).toBe("0");
  expect(metrics.appearance).toBe("none");
  expect(metrics.detailToAckGapPx ?? 999).toBeGreaterThan(0);
  expect(metrics.detailToAckGapPx ?? 999).toBeLessThan(56);
  expect(metrics.ackHeight ?? 0).toBeGreaterThanOrEqual(44);
  expect(metrics.ackWidth ?? 0).toBeGreaterThanOrEqual(44);
}

test.describe("keys custody emphasis WebKit layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("hc_keys_custody_notice_dismissed");
      localStorage.setItem("hc_device_hub_intro_dismissed", "1");
      localStorage.setItem(
        "hc_device_pins",
        JSON.stringify([
          {
            id: "pin_e2e_hub_custody",
            label: "Pinned scan",
            profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
            qr_id: null,
            scan_url: "https://humanity.llc/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
            pinned_at: "2026-05-25T12:00:00.000Z",
          },
        ])
      );
    });
  });

  test("wallet custody card is compact with native-styled Acknowledge on WebKit", async ({
    page,
  }) => {
    await page.goto("/wallet/");
    const card = page.locator(".device-keys-custody--wallet");
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: "Acknowledge" })).toBeVisible();

    const metrics = await measureKeysCustodyLayout(page, ".device-keys-custody--wallet");
    assertKeysCustodyLayout(metrics);
  });

  test("hub custody card is compact with native-styled Acknowledge on WebKit", async ({
    page,
  }) => {
    await gotoLandingWithBoot(page);
    await page.locator("#brand-status-dot-btn").click({ timeout: 15_000 });
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/, {
      timeout: 15_000,
    });
    await waitForDeviceBootReady(page);

    const card = page.locator(".device-keys-custody--hub");
    await expect(card).toBeVisible();

    const metrics = await measureKeysCustodyLayout(page, ".device-keys-custody--hub");
    assertKeysCustodyLayout(metrics);
  });
});
