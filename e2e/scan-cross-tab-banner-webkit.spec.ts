import { test, expect, type BrowserContext, type Page, type Route } from "@playwright/test";

/**
 * WebKit layout regression for cross-tab keys emphasis banners.
 * @see docs/SCAN_CROSS_TAB_BANNER_SAFARI_LAYOUT_INVESTIGATION.md
 * @see docs/DEVICE_OS_QA.md § P1-CT
 */

const SCAN_FIXTURE = "/e2e-fixtures/scan-active.html";

const OTHER_TAB_SESSION = {
  profile_id: "8Ym8nQ3pR5sU7wX9zA2bC4dE6",
  qr_id: "qr_E2eOtherTabTest1",
  handle: "othertab",
  wallet_label: "Other Tab Card",
  manifesto_line: "Other tab line",
  scan_url:
    "http://127.0.0.1:8787/c/8Ym8nQ3pR5sU7wX9zA2bC4dE6?q=qr_E2eOtherTabTest1",
  owner_public_key_b58: "pubkeyothertabtestxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyothertabtestxxxxxxxxxx",
};

const OTHER_TAB_WALLET_ENTRY = {
  id: "e2e_ct_other_wallet",
  label: "Other Tab Card",
  saved_at: "2026-05-26T12:00:00.000Z",
  profile_id: OTHER_TAB_SESSION.profile_id,
  qr_id: OTHER_TAB_SESSION.qr_id,
  handle: OTHER_TAB_SESSION.handle,
  manifesto_line: OTHER_TAB_SESSION.manifesto_line,
  scan_url: OTHER_TAB_SESSION.scan_url,
  owner_public_key_b58: OTHER_TAB_SESSION.owner_public_key_b58,
  owner_private_key_b58: OTHER_TAB_SESSION.owner_private_key_b58,
};

const TAB_B_ID = "e2e-ct-banner-webkit-tab-b";

function mockHealth(route: Route) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: "ok", database: "ok" }),
  });
}

function mockNoLiveProof(route: Route) {
  const url = route.request().url();
  if (!url.includes("/live-control/challenges")) {
    return route.continue();
  }
  return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
}

async function wireShellRoutes(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", mockHealth);
  await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", mockNoLiveProof);
}

async function stabilizeCrossTabChrome(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event("hc-tab-presence-changed"));
    window.dispatchEvent(new Event("hc-device-hub-changed"));
  });
  await page.waitForTimeout(450);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("hc-tab-presence-changed"));
    window.dispatchEvent(new Event("hc-device-hub-changed"));
  });
  await page.waitForTimeout(450);
}

type BannerLayoutMetrics = {
  ok: boolean;
  reason?: string;
  cardFlexDirection?: string;
  horizontalGap?: number | null;
  primaryBg?: string;
  appearance?: string;
  secondaryHasClass?: boolean;
  secondaryVisible?: boolean;
};

/**
 * @param {Page} page
 * @param {string} rootSelector
 * @param {{ primary: string; secondary: string }} ctas
 */
async function measureCrossTabBannerLayout(
  page: Page,
  rootSelector: string,
  ctas: { primary: string; secondary: string }
): Promise<BannerLayoutMetrics> {
  return page.evaluate(
    ({ rootSel, primarySel, secondarySel }) => {
      const isDisplayed = (el: Element | null) => {
        if (!(el instanceof HTMLElement)) return false;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const r = el.getBoundingClientRect();
        return r.width > 1 && r.height > 1;
      };

      const root = document.querySelector(rootSel);
      if (!root) return { ok: false, reason: "missing-root" };

      const primary = root.querySelector(primarySel);
      const secondary = root.querySelector(secondarySel);
      if (!primary || !isDisplayed(primary)) {
        return { ok: false, reason: "missing-primary" };
      }

      const r1 = primary.getBoundingClientRect();
      const cs1 = getComputedStyle(primary);
      const secondaryEl = secondary;
      const secondaryVisible = isDisplayed(secondaryEl);

      let horizontalGap: number | null = null;
      let secondaryHasClass = false;
      if (secondaryVisible && secondaryEl instanceof HTMLElement) {
        const r2 = secondaryEl.getBoundingClientRect();
        horizontalGap = Math.round((r2.left - r1.right) * 100) / 100;
        secondaryHasClass = secondaryEl.classList.contains("hc-emphasis-card__cta--secondary");
      }

      return {
        ok: true,
        cardFlexDirection: getComputedStyle(root).flexDirection,
        horizontalGap,
        primaryBg: cs1.backgroundColor,
        appearance: cs1.getPropertyValue("-webkit-appearance") || cs1.appearance,
        secondaryHasClass,
        secondaryVisible,
      };
    },
    { rootSel: rootSelector, primarySel: ctas.primary, secondarySel: ctas.secondary }
  );
}

function assertCrossTabBannerLayout(metrics: BannerLayoutMetrics) {
  expect(metrics.ok, metrics.reason ?? "layout metrics").toBe(true);
  expect(metrics.cardFlexDirection).toBe("column");
  expect(metrics.appearance).toBe("none");
  expect(metrics.primaryBg).toBe("rgb(219, 27, 67)");
  expect(metrics.secondaryVisible).toBe(true);
  expect(metrics.secondaryHasClass).toBe(true);
  expect(metrics.horizontalGap ?? 0).toBeGreaterThanOrEqual(6);
}

test.describe("cross-tab banner WebKit layout", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  async function openKeysTab(context: BrowserContext, gotoPath: string) {
    const page = await context.newPage();
    await page.addInitScript(({ tabId, session }) => {
      localStorage.setItem("hc_device_hub_intro_dismissed", "1");
      sessionStorage.setItem("hc_tab_id", tabId);
      sessionStorage.setItem("hc_created", JSON.stringify(session));
    }, { tabId: TAB_B_ID, session: OTHER_TAB_SESSION });
    await wireShellRoutes(page);
    await page.goto(gotoPath, { waitUntil: "domcontentloaded" });
    return page;
  }

  test("scan #scan-cross-tab-banner CTAs are spaced and styled", async ({ context }) => {
    const pageA = await context.newPage();
    await pageA.addInitScript(({ walletEntry }) => {
      localStorage.setItem("hc_wallet", JSON.stringify([walletEntry]));
      localStorage.removeItem("hc_created");
      localStorage.setItem("hc_scan_operator_familiar", "1");
      localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    }, { walletEntry: OTHER_TAB_WALLET_ENTRY });
    await wireShellRoutes(pageA);
    await pageA.goto(SCAN_FIXTURE, { waitUntil: "domcontentloaded" });

    const pageB = await openKeysTab(context, SCAN_FIXTURE);

    await expect
      .poll(async () =>
        pageA.evaluate((id) => {
          const raw = localStorage.getItem("hc_tab_keys_presence");
          const map = raw ? JSON.parse(raw) : {};
          return map[id]?.profile_id ?? null;
        }, TAB_B_ID)
      )
      .toBe(OTHER_TAB_SESSION.profile_id);

    await stabilizeCrossTabChrome(pageA);

    const banner = pageA.locator("#scan-cross-tab-banner");
    await expect(banner).toBeVisible({ timeout: 20_000 });
    await expect(banner.locator("[data-cross-tab-use-keys]")).toBeVisible();

    const metrics = await measureCrossTabBannerLayout(pageA, "#scan-cross-tab-banner", {
      primary: "[data-cross-tab-action]",
      secondary: "[data-cross-tab-use-keys]",
    });
    assertCrossTabBannerLayout(metrics);

    await pageB.close();
    await pageA.close();
  });
});
