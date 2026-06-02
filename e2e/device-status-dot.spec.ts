import { test, expect, type Route } from "@playwright/test";
import { deviceStatusShellModulePaths } from "../site/js/device-status-shell-modules.mjs";

const STEWARD_WALLET_ENTRY = {
  id: "e2e_steward_1",
  label: "E2E Steward Card",
  saved_at: "2026-05-25T12:00:00.000Z",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD6",
  qr_id: "qr_E2eStewardTest9",
  handle: "e2esteward",
  manifesto_line: "Steward test",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD6?q=qr_E2eStewardTest9",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  verification: { state: "steward", label: "Steward" },
};

function mockHealth(route: Route, status: "ok" | "degraded") {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status, database: "ok" }),
  });
}

/** Critical static imports for device-status bootstrap (partial deploy guard). */
const SHELL_STATUS_MODULE_PATHS = deviceStatusShellModulePaths();

async function waitForStatusDotReady(page: import("@playwright/test").Page) {
  await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/, {
    timeout: 15_000,
  });
}

test.describe("status dot module graph", () => {
  test("shell status modules are reachable", async ({ page, baseURL }) => {
    for (const path of SHELL_STATUS_MODULE_PATHS) {
      const res = await page.request.get(`${baseURL}${path}`);
      expect(res.status(), `expected 200 for ${path}`).toBe(200);
      const type = res.headers()["content-type"] ?? "";
      expect(type, `expected JavaScript for ${path}, got ${type}`).toMatch(/javascript/);
    }
  });

  test("status partial load opens hub without error coach hijack", async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
    await page.route("**/device-status.mjs**", (route) => route.abort("failed"));

    await page.goto("/");
    await expect(page.locator("#top-chrome")).toHaveAttribute("data-device-status-partial", "1");
    await expect(page.locator("#top-chrome")).not.toHaveAttribute("data-device-status-error", "1");
    await expect(page.locator("#brand-status-dot-btn")).toHaveAttribute(
      "aria-label",
      /basic hub available/i
    );
    await expect(page.locator("#device-status-load-error-popover")).toBeHidden();

    await page.locator("#brand-status-dot-btn").click();
    await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/, { timeout: 8000 });
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/);
  });

  test("total status load error shows coach card", async ({ page }) => {
    await page.route("**/device-status-core.mjs**", (route) => route.abort("failed"));

    await page.goto("/");
    await expect(page.locator("#top-chrome")).toHaveAttribute("data-device-status-error", "1");
    await expect(page.locator("#top-chrome")).not.toHaveAttribute("data-device-status-partial", "1");
    await expect(page.locator("#brand-status-dot-btn")).toHaveAttribute(
      "aria-label",
      /failed to load/i
    );

    const coachCard = page.locator("#device-status-load-error-popover");
    await expect(coachCard).toBeVisible({ timeout: 5000 });
    await expect(coachCard).toContainText("Controls couldn't load");
    await expect(coachCard).toContainText("Now:");
    await expect(coachCard).toContainText("Why:");
    await expect(coachCard).toContainText("Next:");
    await expect(coachCard.getByRole("button", { name: "Refresh page" })).toBeVisible();
    await expect(coachCard.getByRole("button", { name: "Got it" })).toBeVisible();
    await expect(page.locator("body")).not.toHaveClass(/device-hub-sheet-open/);

    await coachCard.getByRole("button", { name: "Got it" }).click();
    await expect(coachCard).toBeHidden();

    await page.locator("#brand-status-dot-btn").click();
    await expect(coachCard).toBeVisible();
    await page.locator("#brand-status-dot-btn").click();
    await expect(coachCard).toBeHidden();
  });

  test("bootstrap inner failure shows load-error coach card", async ({ page }) => {
    await page.route("**/device-status-bootstrap-inner.mjs**", (route) =>
      route.abort("failed")
    );

    await page.goto("/");
    await expect(page.locator("#top-chrome")).toHaveAttribute("data-device-status-error", "1");
    await expect(page.locator("#device-status-load-error-popover")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator("#device-status-load-error-popover")).toContainText(
      "Controls couldn't load"
    );
  });
});

test.describe("status dot steward green", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, STEWARD_WALLET_ENTRY);
  });

  test("shows bright green when resolver is healthy", async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));

    await page.goto("/wallet/");
    const dot = page.locator("#brand-status-dot");
    await expect(dot).toHaveAttribute("data-dot-state", "ok:steward");
    await expect(dot).toHaveClass(/pass-dot-status-network-ok/);
    await expect(dot).toHaveClass(/pass-dot-status-device-steward/);
    await expect(dot).not.toHaveClass(/pass-dot-status-network-degraded/);
  });

  test("suppresses green when resolver is degraded", async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) =>
      mockHealth(route, "degraded")
    );

    await page.goto("/wallet/");
    const dot = page.locator("#brand-status-dot");
    await expect(dot).toHaveAttribute("data-dot-state", "degraded:steward");
    await expect(dot).not.toHaveClass(/pass-dot-status-network-ok/);
    await expect(dot).toHaveClass(/pass-dot-status-network-degraded/);
  });

  test("suppresses green when resolver is offline", async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => route.abort("failed"));

    await page.goto("/wallet/");
    const dot = page.locator("#brand-status-dot");
    await expect(dot).toHaveAttribute("data-dot-state", "offline:steward");
    await expect(dot).not.toHaveClass(/pass-dot-status-network-ok/);
    await expect(dot).toHaveClass(/pass-dot-status-network-offline/);
  });

  test("shows steward green on landing when resolver is healthy", async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));

    await page.goto("/");
    const dot = page.locator("#brand-status-dot");
    await expect(dot).toHaveAttribute("data-dot-state", "ok:steward");
    await expect(dot).toHaveClass(/pass-dot-status-device-steward/);
  });

  test("shows steward green on created and create pages", async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));

    for (const path of ["/created/", "/create/"]) {
      await page.goto(path);
      const dot = page.locator("#brand-status-dot");
      await expect(dot).toHaveAttribute("data-dot-state", "ok:steward");
      await expect(dot).toHaveClass(/pass-dot-status-device-steward/);
    }
  });

  test("dot click opens hub sheet on landing", async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));

    await page.goto("/");
    await expect(page.locator("body")).not.toHaveClass(/device-hub-sheet-open/);
    await waitForStatusDotReady(page);
    await page.locator("#brand-status-dot-btn").click();
    await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/);
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/);
  });

  test("dot click opens hub when body class desynced from collapsed hub", async ({
    page,
  }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));

    await page.goto("/");
    await waitForStatusDotReady(page);
    await page.evaluate(() => {
      document.body.classList.add("device-hub-sheet-open");
      document.getElementById("device-hub")?.classList.add("device-hub-collapsed");
    });
    await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/);
    await expect(page.locator("#device-hub")).toHaveClass(/device-hub-collapsed/);

    await page.locator("#brand-status-dot-btn").click();
    await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/);
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/);
  });

  test("dot click opens hub after page scroll", async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
    await page.addInitScript(() => {
      document.documentElement.style.minHeight = "300vh";
    });

    await page.goto("/");
    await waitForStatusDotReady(page);
    await page.evaluate(() => {
      window.scrollTo(0, 400);
    });
    await page.locator("#brand-status-dot-btn").click();
    await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/);
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/);
  });

  test("status bootstrap loads and records dot_click in diagnostics", async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
    await page.addInitScript(() => {
      localStorage.setItem("hc_dot_diagnostics", "1");
    });

    await page.goto("/");
    await expect(page.locator("#top-chrome")).not.toHaveAttribute("data-device-status-error");
    await waitForStatusDotReady(page);
    await page.locator("#brand-status-dot-btn").click();
    const log = await page.evaluate(() => {
      try {
        return JSON.parse(sessionStorage.getItem("hc_dot_diag_log") || "[]");
      } catch {
        return [];
      }
    });
    expect(log.some((entry: { type?: string }) => entry.type === "dot_click")).toBe(true);
  });

  test("wallet dot scrolls saved cards into view", async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));

    await page.goto("/wallet/");
    const saved = page.locator("#device-hub-saved-group");
    await page.locator("#brand-status-dot-btn").click();
    await expect(saved).toBeInViewport();
  });

  test("wallet dot aria-label mentions scroll to saved cards", async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));

    await page.goto("/wallet/");
    await expect(page.locator("#brand-status-dot-btn")).toHaveAttribute(
      "aria-label",
      /tap to scroll to saved cards/i
    );
    await expect(page.locator("#brand-status-dot-btn")).toHaveAttribute(
      "aria-label",
      /resolver online/i
    );
  });
});

test.describe("status dot accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, STEWARD_WALLET_ENTRY);
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
  });

  test("skips steward celebration when reduced motion is preferred", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/wallet/");
    const dot = page.locator("#brand-status-dot");
    await expect(dot).toHaveAttribute("data-dot-state", "ok:steward");
    await expect(dot).not.toHaveClass(/pass-dot-steward-celebrate/);
  });

  test("exposes steward readiness in aria-label and hub explainer", async ({ page }) => {
    await page.goto("/");
    const dotBtn = page.locator("#brand-status-dot-btn");
    await waitForStatusDotReady(page);
    await expect(dotBtn).toHaveAttribute("aria-label", /steward control ready/i);
    await expect(dotBtn).toHaveAttribute("aria-label", /resolver online/i);

    await dotBtn.click();
    const explainer = page.locator("#device-hub-status-key .device-dot-explainer");
    await expect(explainer).toBeVisible();
    await expect(explainer.locator(".device-dot-explainer-line")).toHaveCount(3);
    await expect(explainer).toContainText("Now:");
    await expect(explainer).toContainText("Steward ready, resolver online.");
    await expect(explainer).toContainText("Why:");
    await expect(explainer).toContainText("Next:");
    await expect(explainer.getByRole("button", { name: "Open controls" })).toBeVisible();
  });

  test("uses glance steward subtitle in landing popover explainer", async ({ page }) => {
    await page.goto("/");
    await waitForStatusDotReady(page);
    await page.locator("#brand-status-dot-btn").click();
    const popoverExplainer = page.locator(
      "#device-hub-glance-popover .device-dot-explainer--popover"
    );
    await expect(popoverExplainer).toContainText(
      "Steward ready: you can review and sign steward actions now."
    );
  });
});

test.describe("hub sheet header chrome (simplification step 4)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
    await page.addInitScript(() => {
      localStorage.setItem("hc_device_hub_intro_seen", "1");
    });
  });

  test("Close dismisses expanded hub on landing", async ({ page }) => {
    await page.goto("/");
    await waitForStatusDotReady(page);
    await page.locator("#brand-status-dot-btn").click();
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/);
    await page.locator(".device-hub-sheet-close").click();
    await expect(page.locator("body")).not.toHaveClass(/device-hub-sheet-open/);
    await expect(page.locator("#device-hub")).toHaveClass(/device-hub-collapsed/);
  });

  test("Create + New lives in saved-items header and navigates to /create/", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".device-hub-status-head .device-hub-create-btn")).toHaveCount(0);
    await waitForStatusDotReady(page);
    await page.locator("#brand-status-dot-btn").click();
    const createBtn = page.locator("#device-hub-saved-items-section .device-hub-create-btn");
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    await expect(page).toHaveURL(/\/create\//);
  });

  test("Home and Close controls are visible when hub is expanded", async ({ page }) => {
    await page.goto("/");
    await waitForStatusDotReady(page);
    await page.locator("#brand-status-dot-btn").click();
    await expect(page.locator(".device-hub-home-btn")).toBeVisible();
    await expect(page.locator(".device-hub-sheet-close")).toBeVisible();
  });
});

test.describe("hub intro coachmark", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("hc_device_hub_intro_dismissed");
      localStorage.removeItem("hc_device_hub_intro_seen");
    });
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
  });

  test("shows first-visit coachmark on landing", async ({ page }) => {
    await page.goto("/");
    const intro = page.locator("#device-hub-intro-coachmark");
    await expect(intro).toBeVisible({ timeout: 5000 });
    await expect(intro).toContainText(/meet your device hub/i);
    await expect(intro).toContainText(/tap the dot/i);
    await expect(page.locator(".shell-status-cluster--hub-intro")).toBeVisible();
  });

  test("does not show coachmark again after refresh without interaction", async ({ page }) => {
    await page.goto("/");
    const intro = page.locator("#device-hub-intro-coachmark");
    await expect(intro).toBeVisible({ timeout: 5000 });
    await page.reload();
    await expect(intro).toBeHidden();
    await expect(page.locator("body")).not.toHaveClass(/device-hub-intro-visible/);
  });

  test("hides coachmark after Got it and stays dismissed on reload", async ({ page }) => {
    await page.goto("/");
    const intro = page.locator("#device-hub-intro-coachmark");
    await expect(intro).toBeVisible({ timeout: 5000 });
    await page.locator("#device-hub-intro-dismiss").click();
    await expect(intro).toBeHidden();
    await page.reload();
    await expect(intro).toBeHidden();
    await expect(page.locator("body")).not.toHaveClass(/device-hub-intro-visible/);
  });

  test("dismisses coachmark when dot opens hub", async ({ page }) => {
    await page.goto("/");
    const intro = page.locator("#device-hub-intro-coachmark");
    await expect(intro).toBeVisible({ timeout: 5000 });
    await waitForStatusDotReady(page);
    await page.locator("#brand-status-dot-btn").click();
    await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/);
    await expect(intro).toBeHidden();
    await page.reload();
    await expect(intro).toBeHidden();
  });

  test("does not show coachmark on wallet", async ({ page }) => {
    await page.goto("/wallet/");
    await page.waitForTimeout(1200);
    await expect(page.locator("#device-hub-intro-coachmark")).toHaveCount(0);
  });
});

test.describe("shell S4 empty-wallet chrome", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    });
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
  });

  test("shows neutral dot without chrome status line when wallet is empty", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#shell-status-line")).toBeHidden({ timeout: 15_000 });

    const dot = page.locator("#brand-status-dot");
    await expect(dot).toHaveAttribute("data-dot-state", "ok:none");
    await expect(dot).toHaveClass(/shell-status-dot--neutral-empty/);
    await expect(dot).not.toHaveClass(/pass-dot-status-device-steward/);

    const animation = await dot.evaluate((el) => getComputedStyle(el).animationName);
    expect(animation === "none" || animation === "").toBe(true);
  });

  test("hides status line and uses steward dot when cards are saved", async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    }, STEWARD_WALLET_ENTRY);

    await page.goto("/");
    await expect(page.locator("#shell-status-line")).toBeHidden({ timeout: 15_000 });

    const dot = page.locator("#brand-status-dot");
    await expect(dot).toHaveAttribute("data-dot-state", "ok:steward");
    await expect(dot).toHaveClass(/pass-dot-status-device-steward/);
    await expect(dot).not.toHaveClass(/shell-status-dot--neutral-empty/);
  });
});
