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

test.describe("status dot module graph", () => {
  test("shell status modules are reachable", async ({ page, baseURL }) => {
    for (const path of SHELL_STATUS_MODULE_PATHS) {
      const res = await page.request.get(`${baseURL}${path}`);
      expect(res.status(), `expected 200 for ${path}`).toBe(200);
      const type = res.headers()["content-type"] ?? "";
      expect(type, `expected JavaScript for ${path}, got ${type}`).toMatch(/javascript/);
    }
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
    await page.locator("#brand-status-dot-btn").click();
    await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/);
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/);
  });

  test("dot click opens hub when body class desynced from collapsed hub", async ({
    page,
  }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));

    await page.goto("/");
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

  test("dot click opens hub after scroll hides chrome bar", async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
    await page.addInitScript(() => {
      document.documentElement.style.minHeight = "300vh";
    });

    await page.goto("/");
    await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/);
    await page.evaluate(() => {
      document.documentElement.style.minHeight = "300vh";
      window.scrollTo(0, 400);
    });
    await page.waitForFunction(() =>
      document.getElementById("top-chrome")?.classList.contains("top-chrome--edge-hidden")
    );
    await page.locator("#brand-status-dot-btn").click();
    await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/);
  });

  test("status bootstrap loads and records dot_click in diagnostics", async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
    await page.addInitScript(() => {
      localStorage.setItem("hc_dot_diagnostics", "1");
    });

    await page.goto("/");
    await expect(page.locator("#top-chrome")).not.toHaveAttribute("data-device-status-error");
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
    await expect(dotBtn).toHaveAttribute("aria-label", /steward keys ready/i);
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
    await page.locator("#brand-status-dot-btn").click();
    const popoverExplainer = page.locator(
      "#device-hub-glance-popover .device-dot-explainer--popover"
    );
    await expect(popoverExplainer).toContainText(
      "Steward ready: you can review and sign steward actions now."
    );
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
    await expect(intro).toContainText(/status dot/i);
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
