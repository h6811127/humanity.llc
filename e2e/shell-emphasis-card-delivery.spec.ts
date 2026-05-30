import { test, expect, type Page } from "@playwright/test";

/**
 * Shell emphasis-card CSS delivery (import regression Step 4).
 * @see docs/HC_EMPHASIS_CARD_IMPORT_REGRESSION.md
 * @see docs/DEVICE_OS_QA.md § P1-EC
 *
 * Cross-tab pill CTAs: `e2e/scan-cross-tab-banner-webkit.spec.ts` (P1-CT).
 */

const WALLET_ENTRY = {
  id: "e2e_ec_wallet",
  label: "E2E Emphasis Card",
  saved_at: "2026-05-26T12:00:00.000Z",
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

const LIVE_PROOF_CHALLENGE_ID = "e2e_shell_emphasis_live_proof";

type EmphasisCardMetrics = {
  ok: boolean;
  reason?: string;
  boxShadow?: string;
  borderRadius?: string;
  cardBg?: string;
  titleColor?: string;
  ctaDisplay?: string;
  hasDot?: boolean;
};

async function measureEmphasisCard(page: Page, selector: string): Promise<EmphasisCardMetrics> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!(el instanceof HTMLElement)) return { ok: false, reason: "missing-root" };
    if (!el.classList.contains("hc-emphasis-card")) {
      return { ok: false, reason: "missing-hc-emphasis-card-class" };
    }

    const title = el.querySelector(".hc-emphasis-card__title, .hc-emphasis-card__eyebrow");
    const cta = el.querySelector(".hc-emphasis-card__cta");
    const dot = el.querySelector(".hc-emphasis-card__dot");
    const cs = getComputedStyle(el);

    return {
      ok: true,
      boxShadow: cs.boxShadow,
      borderRadius: cs.borderRadius,
      cardBg: cs.backgroundColor,
      titleColor: title ? getComputedStyle(title).color : "",
      ctaDisplay: cta ? getComputedStyle(cta).display : "",
      hasDot:
        dot instanceof HTMLElement &&
        getComputedStyle(dot).display !== "none" &&
        dot.getBoundingClientRect().width > 0,
    };
  }, selector);
}

function assertStyledEmphasisCard(metrics: EmphasisCardMetrics) {
  expect(metrics.ok, metrics.reason ?? "emphasis card metrics").toBe(true);
  expect(metrics.boxShadow).not.toBe("none");
  expect(Number.parseFloat(metrics.borderRadius ?? "0")).toBeGreaterThan(8);
  expect(metrics.ctaDisplay).toMatch(/flex/);
  expect(metrics.hasDot).toBe(true);
  if (metrics.titleColor && metrics.cardBg) {
    expect(metrics.titleColor).not.toBe(metrics.cardBg);
  }
}

async function stubCreatedResolver(page: Page) {
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
    })
  );
  await page.route(`**/.well-known/hc/v1/cards/${WALLET_ENTRY.profile_id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        handle: WALLET_ENTRY.handle,
        manifesto_line: WALLET_ENTRY.manifesto_line,
        created_at: "2026-05-25T12:00:00.000Z",
        status: "active",
      }),
    })
  );
}

async function seedWalletWithActiveSession(page: Page, theme?: "dark") {
  await page.addInitScript(
    ({ entry, dark }) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      localStorage.setItem("hc_keys_custody_notice_dismissed", "1");
      if (dark) localStorage.setItem("hc_theme", "dark");
      sessionStorage.setItem(
        "hc_created",
        JSON.stringify({
          profile_id: entry.profile_id,
          qr_id: entry.qr_id,
          handle: entry.handle,
          wallet_label: entry.label,
          manifesto_line: entry.manifesto_line,
          scan_url: entry.scan_url,
          owner_public_key_b58: entry.owner_public_key_b58,
          owner_private_key_b58: entry.owner_private_key_b58,
        })
      );
    },
    { entry: WALLET_ENTRY, dark: theme === "dark" }
  );
}

test.describe("shell emphasis card delivery (import regression Step 4)", () => {
  test("wallet active banner is a raised emphasis card with pill CTA", async ({ page }) => {
    await seedWalletWithActiveSession(page);
    await page.goto("/wallet/");

    await expect(page.locator("#wallet-active-banner")).toBeVisible();
    await expect(page.locator("#wallet-active-banner")).toHaveClass(/hc-emphasis-card--active/);
    await expect(page.locator("#wallet-active-link")).toHaveClass(/hc-emphasis-card__cta/);

    assertStyledEmphasisCard(await measureEmphasisCard(page, "#wallet-active-banner"));
  });

  test("wallet active banner readable in dark theme", async ({ page }) => {
    await seedWalletWithActiveSession(page, "dark");
    await page.goto("/wallet/");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("#wallet-active-banner")).toBeVisible();

    const metrics = await measureEmphasisCard(page, "#wallet-active-banner");
    assertStyledEmphasisCard(metrics);
    expect(metrics.cardBg).not.toBe("rgb(255, 255, 255)");
  });

  test.describe("created live proof panel", () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((entry) => {
        localStorage.setItem(
          "hc_setup_done",
          JSON.stringify({ [entry.profile_id]: true })
        );
        localStorage.setItem("hc_wallet", JSON.stringify([entry]));
        sessionStorage.setItem(
          "hc_created",
          JSON.stringify({
            profile_id: entry.profile_id,
            qr_id: entry.qr_id,
            handle: entry.handle,
            manifesto_line: entry.manifesto_line,
            scan_url: entry.scan_url,
            owner_public_key_b58: entry.owner_public_key_b58,
            owner_private_key_b58: entry.owner_private_key_b58,
          })
        );
      }, WALLET_ENTRY);
      await stubCreatedResolver(page);
    });

    test("light: live proof waiting card is styled", async ({ page }) => {
      await page.goto(
        `/created/?profile_id=${WALLET_ENTRY.profile_id}&qr_id=${WALLET_ENTRY.qr_id}&live_challenge=${LIVE_PROOF_CHALLENGE_ID}`
      );

      await expect(page.locator("#live-control-proof")).toBeVisible();
      await expect(page.locator("#live-control-proof")).toHaveClass(/hc-emphasis-card--urgent/);
      await expect(page.locator("#live-control-proof-btn")).toHaveText("Prove control now");

      assertStyledEmphasisCard(await measureEmphasisCard(page, "#live-control-proof"));
    });

    test("dark: live proof waiting card keeps contrast", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("hc_theme", "dark");
      });
      await page.goto(
        `/created/?profile_id=${WALLET_ENTRY.profile_id}&qr_id=${WALLET_ENTRY.qr_id}&live_challenge=${LIVE_PROOF_CHALLENGE_ID}`
      );

      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(page.locator("#live-control-proof")).toBeVisible();

      const metrics = await measureEmphasisCard(page, "#live-control-proof");
      assertStyledEmphasisCard(metrics);
      expect(metrics.cardBg).not.toBe("rgb(255, 255, 255)");
    });
  });

  test.describe("shell live proof banner", () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((entry) => {
        localStorage.setItem(
          "hc_setup_done",
          JSON.stringify({ [entry.profile_id]: true })
        );
        localStorage.setItem("hc_wallet", JSON.stringify([entry]));
        localStorage.setItem("hc_watch_live_proof", "1");
        sessionStorage.setItem(
          "hc_created",
          JSON.stringify({
            profile_id: entry.profile_id,
            qr_id: entry.qr_id,
            handle: entry.handle,
            manifesto_line: entry.manifesto_line,
            scan_url: entry.scan_url,
            owner_public_key_b58: entry.owner_public_key_b58,
            owner_private_key_b58: entry.owner_private_key_b58,
          })
        );
      }, WALLET_ENTRY);
      await stubCreatedResolver(page);
      const signUrl = new URL("/created/", "http://127.0.0.1:8788");
      signUrl.searchParams.set("profile_id", WALLET_ENTRY.profile_id);
      signUrl.searchParams.set("qr_id", WALLET_ENTRY.qr_id);
      signUrl.searchParams.set("live_challenge", LIVE_PROOF_CHALLENGE_ID);
      await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "pending",
            challenge_id: LIVE_PROOF_CHALLENGE_ID,
            owner_url: signUrl.href,
            return_url: WALLET_ENTRY.scan_url,
            expires_at: new Date(Date.now() + 600_000).toISOString(),
          }),
        })
      );
    });

    test("wallet shows urgent live proof banner when challenge pending", async ({ page }) => {
      await page.goto("/wallet/");

      const banner = page.locator("#device-live-proof-banner");
      await expect(banner).toBeVisible({ timeout: 15_000 });
      await expect(banner).toHaveClass(/hc-emphasis-card--urgent/);
      await expect(banner.getByRole("button", { name: "Prove control now" })).toBeVisible();

      assertStyledEmphasisCard(await measureEmphasisCard(page, "#device-live-proof-banner"));
    });

    test("created page uses panel instead of shell banner", async ({ page }) => {
      await page.goto(
        `/created/?profile_id=${WALLET_ENTRY.profile_id}&qr_id=${WALLET_ENTRY.qr_id}&live_challenge=${LIVE_PROOF_CHALLENGE_ID}`
      );

      await expect(page.locator("#live-control-proof")).toBeVisible({ timeout: 15_000 });
      await expect(page.locator("#device-live-proof-banner")).toBeHidden();
    });
  });
});
