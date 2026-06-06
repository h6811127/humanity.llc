import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Hub keys custody row layout — mobile stack + desktop side-by-side regression.
 *
 * PR scope: custody row markup/CSS + shell styles cache bust only.
 * Intentionally excludes device-shell-baseline.json, build-meta.mjs, and
 * city-game data timestamp drift — regenerate those in their own PRs if needed.
 *
 * @see docs/DEVICE_OS_QA.md
 */

const PROFILE_ID = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_ID = "qr_E2eWakketTest9";

const DEVICE_UNLOCK_WALLET_ENTRY = {
  id: "e2e_hub_unlock_layout",
  label: "E2E hub unlock layout",
  saved_at: "2026-06-03T12:00:00.000Z",
  profile_id: PROFILE_ID,
  qr_id: "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  handle: "hub_unlock_layout",
  manifesto_line: "Wrapped custody row",
  scan_url: `http://127.0.0.1:8788/c/${PROFILE_ID}?q=qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5`,
  owner_public_key_b58: "pubkeydeviceunlocktestxxxxxxxx",
  custody_mode: "device_unlock",
  has_signing_key: true,
  wrapped_owner_key: {
    version: 1,
    credential_id: "e2e-cred-id",
    prf_salt: "c2FsdA==",
    iv: "aXY=",
    ciphertext: "Y2lwaGVy",
  },
};

const PLAINTEXT_WALLET_ENTRY = {
  id: "e2e_hub_open_controls",
  label: "E2E open controls row",
  saved_at: "2026-06-03T12:00:00.000Z",
  profile_id: PROFILE_ID,
  qr_id: QR_ID,
  handle: "e2etest",
  manifesto_line: "Plaintext wallet row",
  scan_url: `http://127.0.0.1:8787/c/${PROFILE_ID}?q=${QR_ID}`,
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
};

const ACTIVE_SESSION = {
  profile_id: PROFILE_ID,
  qr_id: QR_ID,
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  handle: "e2etest",
  manifesto_line: "Active tab session",
  scan_url: `http://127.0.0.1:8787/c/${PROFILE_ID}?q=${QR_ID}`,
};

const UNSAVED_SESSION = { ...ACTIVE_SESSION };

type CustodyRowLayoutMetrics = {
  ok: boolean;
  reason?: string;
  innerFlexDirection?: string;
  headFlexDirection?: string;
  copyWidthRatio?: number;
  textToCtaGapPx?: number;
  overlapsText?: boolean;
  horizontalSeparationPx?: number;
  copyToActionsOverlapPx?: number;
  hasActions?: boolean;
  ctaLabel?: string;
  titleText?: string;
};

async function wireShellHealth(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: "ok" }),
    })
  );
  await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route: Route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
  );
}

async function seedHubCustodyDefaults(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    localStorage.setItem("hc_keys_custody_notice_dismissed", "1");
  });
}

async function openHub(page: Page) {
  const dotReady = page.locator("#brand-status-dot").getAttribute("data-dot-state");
  if (!(await dotReady)) {
    await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/, {
      timeout: 15_000,
    });
  }
  await page.locator("#brand-status-dot-btn").click();
  await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/, { timeout: 15_000 });
}

async function measureCustodyRowLayout(
  page: Page,
  rowSelector: string,
  ctaSelector?: string
): Promise<CustodyRowLayoutMetrics> {
  return page.evaluate(
    ({ rowSel, ctaSel }) => {
      const row = document.querySelector(rowSel);
      if (!row) return { ok: false, reason: "missing-row" };

      const inner = row.querySelector(".device-hub-keys-custody-row-inner");
      const head = row.querySelector(".device-hub-keys-custody-row-head");
      const copy = row.querySelector(".device-hub-keys-custody-row-copy");
      const title = row.querySelector(".list-title");
      const sub = row.querySelector(".list-sub");
      const actions = row.querySelector(".device-hub-keys-custody-actions");
      if (!inner || !head || !copy || !title) {
        return { ok: false, reason: "missing-parts" };
      }

      const innerRect = inner.getBoundingClientRect();
      const headRect = head.getBoundingClientRect();
      const copyRect = copy.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const subRect = sub?.getBoundingClientRect();
      const textBottom = Math.max(titleRect.bottom, subRect?.bottom ?? titleRect.bottom);

      const cta = ctaSel ? row.querySelector(ctaSel) : actions?.querySelector("button, a");
      const hasActions = Boolean(actions && cta);

      let textToCtaGapPx: number | undefined;
      let overlapsText = false;
      let horizontalSeparationPx: number | undefined;
      let copyToActionsOverlapPx: number | undefined;

      if (hasActions && cta instanceof HTMLElement) {
        const ctaRect = cta.getBoundingClientRect();
        const actionsRect = actions!.getBoundingClientRect();
        textToCtaGapPx = Math.round((ctaRect.top - textBottom) * 100) / 100;
        horizontalSeparationPx = Math.round((actionsRect.left - headRect.right) * 100) / 100;
        copyToActionsOverlapPx = Math.round((copyRect.right - actionsRect.left) * 100) / 100;
        const sideBySide = getComputedStyle(inner).flexDirection === "row";
        overlapsText = sideBySide
          ? copyToActionsOverlapPx > 2
          : ctaRect.top < textBottom - 1;
      }

      return {
        ok: true,
        innerFlexDirection: getComputedStyle(inner).flexDirection,
        headFlexDirection: getComputedStyle(head).flexDirection,
        copyWidthRatio: innerRect.width > 0 ? copyRect.width / innerRect.width : 0,
        textToCtaGapPx,
        overlapsText,
        horizontalSeparationPx,
        copyToActionsOverlapPx,
        hasActions,
        ctaLabel: cta instanceof HTMLElement ? cta.textContent?.trim() ?? "" : "",
        titleText: title.textContent?.trim() ?? "",
      };
    },
    { rowSel: rowSelector, ctaSel: ctaSelector ?? null }
  );
}

function assertMobileCustodyRowLayout(metrics: CustodyRowLayoutMetrics) {
  expect(metrics.ok, metrics.reason ?? "layout metrics").toBe(true);
  expect(metrics.innerFlexDirection).toBe("column");
  expect(metrics.headFlexDirection).toBe("column");
  expect(metrics.overlapsText).toBe(false);
  expect(metrics.copyWidthRatio ?? 0).toBeGreaterThanOrEqual(0.85);
  if (metrics.hasActions) {
    expect(metrics.textToCtaGapPx ?? 0).toBeGreaterThanOrEqual(4);
  }
}

function assertDesktopCustodyRowLayout(metrics: CustodyRowLayoutMetrics) {
  expect(metrics.ok, metrics.reason ?? "layout metrics").toBe(true);
  expect(metrics.innerFlexDirection).toBe("row");
  expect(metrics.headFlexDirection).toBe("row");
  expect(metrics.overlapsText).toBe(false);
  if (metrics.hasActions) {
    expect(metrics.horizontalSeparationPx ?? -999).toBeGreaterThanOrEqual(4);
    expect(metrics.copyToActionsOverlapPx ?? 999).toBeLessThanOrEqual(2);
  } else {
    // Dot + copy share one row on desktop; copy should still dominate horizontal space.
    expect(metrics.copyWidthRatio ?? 0).toBeGreaterThanOrEqual(0.75);
  }
}

async function assertRowAtViewport(
  page: Page,
  viewport: { width: number; height: number },
  rowSelector: string,
  assertFn: (metrics: CustodyRowLayoutMetrics) => void,
  ctaSelector?: string,
  opts: { clearTabSessionBeforeHub?: boolean } = {}
) {
  await page.setViewportSize(viewport);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/, {
    timeout: 15_000,
  });
  if (opts.clearTabSessionBeforeHub) {
    await page.evaluate(() => {
      sessionStorage.removeItem("hc_created");
      window.dispatchEvent(new Event("hc-device-hub-changed"));
    });
  }
  await openHub(page);
  await expect(page.locator(rowSelector)).toBeVisible({ timeout: 15_000 });
  const metrics = await measureCustodyRowLayout(page, rowSelector, ctaSelector);
  assertFn(metrics);
  return metrics;
}

test.describe("hub custody row layout", () => {
  test.beforeEach(async ({ page }) => {
    await wireShellHealth(page);
    await seedHubCustodyDefaults(page);
  });

  test("unlock row stacks CTA below copy at 320px, 375px, and 430px", async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      localStorage.removeItem("hc_created");
      sessionStorage.removeItem("hc_created");
    }, DEVICE_UNLOCK_WALLET_ENTRY);

    for (const width of [320, 375, 430]) {
      const metrics = await assertRowAtViewport(
        page,
        { width, height: 844 },
        ".device-hub-keys-custody-row--wallet_not_in_tab",
        assertMobileCustodyRowLayout,
        "[data-hub-custody-restore-tab]"
      );
      expect(metrics.ctaLabel).toMatch(/Unlock to manage in this tab/i);
    }
  });

  test("unsaved row stacks save CTA below copy on narrow hub", async ({ page }) => {
    await page.addInitScript((session) => {
      localStorage.removeItem("hc_wallet");
      localStorage.setItem("hc_auto_save_device", "0");
      sessionStorage.setItem("hc_created", JSON.stringify(session));
    }, UNSAVED_SESSION);

    const metrics = await assertRowAtViewport(
      page,
      { width: 375, height: 844 },
      ".device-hub-keys-custody-row--this_tab_unsaved",
      assertMobileCustodyRowLayout,
      "[data-hub-custody-save]"
    );
    expect(metrics.ctaLabel).toMatch(/Save ownership on this device/i);
  });

  test("active saved row uses full-width copy without CTA on mobile and desktop", async ({
    page,
  }) => {
    await page.addInitScript(({ session, walletEntry }) => {
      localStorage.setItem("hc_wallet", JSON.stringify([walletEntry]));
      sessionStorage.setItem("hc_created", JSON.stringify(session));
    }, { session: ACTIVE_SESSION, walletEntry: PLAINTEXT_WALLET_ENTRY });

    for (const viewport of [
      { width: 375, height: 844, assertFn: assertMobileCustodyRowLayout },
      { width: 1280, height: 800, assertFn: assertDesktopCustodyRowLayout },
    ]) {
      const metrics = await assertRowAtViewport(
        page,
        viewport,
        ".device-hub-keys-custody-row--this_tab_active",
        viewport.assertFn
      );
      expect(metrics.hasActions).toBe(false);
      expect(metrics.titleText).toMatch(/You can update these QRs from this browser/i);
    }
  });

  test("open-controls row keeps CTA beside copy on desktop and below on mobile", async ({
    page,
  }) => {
    await page.addInitScript((walletEntry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([walletEntry]));
      localStorage.removeItem("hc_created");
      sessionStorage.removeItem("hc_created");
    }, PLAINTEXT_WALLET_ENTRY);

    const rowOpts = {
      clearTabSessionBeforeHub: true,
    } as const;

    const mobileMetrics = await assertRowAtViewport(
      page,
      { width: 375, height: 844 },
      ".device-hub-keys-custody-row--wallet_not_in_tab",
      assertMobileCustodyRowLayout,
      "[data-hub-custody-restore-tab]",
      rowOpts
    );
    expect(mobileMetrics.ctaLabel).toMatch(/Open controls/i);
    expect(mobileMetrics.ctaLabel).not.toMatch(/Unlock/i);

    const desktopMetrics = await assertRowAtViewport(
      page,
      { width: 1280, height: 800 },
      ".device-hub-keys-custody-row--wallet_not_in_tab",
      assertDesktopCustodyRowLayout,
      "[data-hub-custody-restore-tab]",
      rowOpts
    );
    expect(desktopMetrics.ctaLabel).toMatch(/Open controls/i);
  });
});
