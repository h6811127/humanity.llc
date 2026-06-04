/**
 * Phase 0 investigation: measure unsaved custody row layout in hub.
 * Temporary diagnostic spec — not a permanent regression gate.
 */
import { test, expect, type Page } from "@playwright/test";

const SESSION = {
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  qr_id: "qr_E2eWakketTest9",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  handle: "e2etest",
  manifesto_line: "Test line",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_E2eWakketTest9",
};

async function seedUnsavedTabKeys(page: Page) {
  await page.addInitScript((session) => {
    localStorage.removeItem("hc_wallet");
    localStorage.setItem("hc_auto_save_device", "0");
    localStorage.setItem("hc_keys_custody_notice_dismissed", "1");
    localStorage.setItem("hc_hub_intro_dismissed", "1");
    sessionStorage.setItem("hc_created", JSON.stringify(session));
  }, SESSION);
}

async function openHub(page: Page) {
  await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/, {
    timeout: 15_000,
  });
  await page.locator("#brand-status-dot-btn").click();
  await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/, { timeout: 15_000 });
}

type LayoutMetrics = {
  viewport: { width: number; height: number };
  hubSheetWidth: number;
  noticeGroupEmpty: boolean;
  legacyNoticeVisible: boolean;
  rowVisible: boolean;
  title: {
    text: string;
    width: number;
    height: number;
    lineCount: number;
    fontSize: string;
  };
  subtitle: { width: number; height: number; lineCount: number };
  listContent: { width: number };
  actions: { width: number };
  rowInner: { width: number; height: number };
  row: { height: number };
  cta: { width: number; height: number; text: string };
};

async function measureCustodyRow(page: Page): Promise<LayoutMetrics> {
  const row = page.locator(".device-hub-keys-custody-row--this_tab_unsaved");
  await expect(row).toBeVisible({ timeout: 15_000 });

  return page.evaluate(() => {
    const rowEl = document.querySelector(
      ".device-hub-keys-custody-row--this_tab_unsaved"
    ) as HTMLElement | null;
    const titleEl = rowEl?.querySelector(".list-title") as HTMLElement | null;
    const subEl = rowEl?.querySelector(".list-sub") as HTMLElement | null;
    const contentEl = rowEl?.querySelector(".list-content") as HTMLElement | null;
    const actionsEl = rowEl?.querySelector(
      ".device-hub-keys-custody-actions"
    ) as HTMLElement | null;
    const innerEl = rowEl?.querySelector(
      ".device-hub-keys-custody-row-inner"
    ) as HTMLElement | null;
    const ctaEl = rowEl?.querySelector(
      "[data-hub-custody-save]"
    ) as HTMLElement | null;
    const hub = document.getElementById("device-hub") as HTMLElement | null;
    const noticeGroup = document.getElementById("device-hub-notice-group");

    const lineCount = (el: HTMLElement | null) => {
      if (!el) return 0;
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 16;
      return Math.max(1, Math.round(el.getBoundingClientRect().height / lh));
    };

    const rect = (el: HTMLElement | null) => el?.getBoundingClientRect();

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      hubSheetWidth: hub?.getBoundingClientRect().width ?? 0,
      noticeGroupEmpty: !noticeGroup?.innerHTML?.trim(),
      legacyNoticeVisible: Boolean(
        noticeGroup?.querySelector(".device-hub-notice-banner:not([hidden])")
      ),
      rowVisible: Boolean(rowEl && rowEl.offsetParent !== null),
      title: {
        text: titleEl?.textContent?.trim() ?? "",
        width: rect(titleEl)?.width ?? 0,
        height: rect(titleEl)?.height ?? 0,
        lineCount: lineCount(titleEl),
        fontSize: titleEl ? getComputedStyle(titleEl).fontSize : "",
      },
      subtitle: {
        width: rect(subEl)?.width ?? 0,
        height: rect(subEl)?.height ?? 0,
        lineCount: lineCount(subEl),
      },
      listContent: { width: rect(contentEl)?.width ?? 0 },
      actions: { width: rect(actionsEl)?.width ?? 0 },
      rowInner: {
        width: rect(innerEl)?.width ?? 0,
        height: rect(innerEl)?.height ?? 0,
      },
      row: { height: rect(rowEl)?.height ?? 0 },
      cta: {
        width: rect(ctaEl)?.width ?? 0,
        height: rect(ctaEl)?.height ?? 0,
        text: ctaEl?.textContent?.trim() ?? "",
      },
    };
  });
}

async function runSurface(
  page: Page,
  path: string,
  viewport: { width: number; height: number },
  theme: "light" | "dark"
) {
  await page.setViewportSize(viewport);
  await seedUnsavedTabKeys(page);
  await page.goto(path, { waitUntil: "domcontentloaded" });
  if (theme === "dark") {
    await page.evaluate(() => localStorage.setItem("hc_theme", "dark"));
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  await openHub(page);
  const metrics = await measureCustodyRow(page);
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({ surface: path, theme, ...metrics }, null, 2)
  );
  return metrics;
}

test.describe("Phase 0 hub custody unsaved layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", database: "ok" }),
      })
    );
  });

  test("capture layout metrics at 390px, 430px, and desktop", async ({ page }) => {
    const viewports = [
      { label: "iphone-390", width: 390, height: 844 },
      { label: "hub-max-430", width: 430, height: 900 },
      { label: "desktop-1280", width: 1280, height: 800 },
    ];
    const surfaces = ["/", "/create/", "/created/"];

    const report: Record<string, LayoutMetrics> = {};

    for (const path of surfaces) {
      for (const vp of viewports) {
        const key = `${path}@${vp.label}:light`;
        const light = await runSurface(page, path, vp, "light");
        report[key] = light;
        expect(light.rowVisible).toBe(true);
        expect(light.noticeGroupEmpty).toBe(true);
        expect(light.legacyNoticeVisible).toBe(false);
        expect(light.title.text).toContain("Control active");
      }
      // Dark theme spot-check on landing hub at iPhone width only
      const darkKey = `${path}@iphone-390:dark`;
      report[darkKey] = await runSurface(page, path, viewports[0], "dark");
    }

    const narrow = report["/@iphone-390:light"];
    // Phase 0 hypothesis: CTA steals horizontal space from title on narrow hub
    expect(narrow.title.lineCount).toBeGreaterThan(2);
    expect(narrow.actions.width).toBeGreaterThan(narrow.listContent.width);
    test.info().attach("phase0-metrics.json", {
      body: JSON.stringify(report, null, 2),
      contentType: "application/json",
    });
  });
});
