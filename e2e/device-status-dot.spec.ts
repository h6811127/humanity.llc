import { test, expect, type Route } from "@playwright/test";

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
