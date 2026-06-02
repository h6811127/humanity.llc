import { test, expect, type Route } from "@playwright/test";

/**
 * Phase 0 proxy for time-to-interactive on standard shell (empty wallet landing).
 * Lab devices record subjective jank separately — see docs/DEVICE_SMOOTH_MODE_PHASE0_GATE.md.
 *
 * @see docs/DEVICE_LITE_MOBILE_PLAN.md § Phase 0 · Success metrics
 */

function mockHealth(route: Route) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: "ok", database: "ok" }),
  });
}

test.describe("device shell Phase 0 boot baseline", () => {
  test("landing reaches data-boot=ready within CI ceiling", async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route));

    const started = Date.now();
    await page.goto("/");
    await expect(page.locator("body")).toHaveAttribute("data-boot", "ready", { timeout: 20_000 });
    const bootReadyMs = Date.now() - started;

    await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/);
    await expect(page.locator("#top-chrome")).not.toHaveAttribute("data-device-status-error", "1");

    // Generous CI ceiling — lab low-end targets are recorded manually in the gate doc.
    expect(bootReadyMs).toBeLessThan(20_000);

    console.log(`[device-shell-baseline] boot-ready-ms=${bootReadyMs}`);
  });

  test("hub open scroll remains interactive with 10 saved cards (jank proxy)", async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route));

    const wallet = Array.from({ length: 10 }, (_, i) => ({
      id: `e2e_smooth_baseline_${i}`,
      label: `Smooth baseline ${i + 1}`,
      saved_at: "2026-06-01T12:00:00.000Z",
      profile_id: `profSmoothBaseline${i}xxxxxxxxxx`.slice(0, 26),
      qr_id: `qr_SmoothBaseline${i}xxxx`.slice(0, 22),
      handle: `smooth${i}`,
      manifesto_line: `Baseline card ${i + 1}`,
      scan_url: `http://127.0.0.1:8787/c/prof?q=qr_${i}`,
      owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
      verification: { state: "steward", label: "Steward" },
    }));

    await page.addInitScript((entries) => {
      localStorage.setItem("hc_wallet", JSON.stringify(entries));
    }, wallet);

    await page.goto("/");
    await expect(page.locator("body")).toHaveAttribute("data-boot", "ready", { timeout: 20_000 });

    await page.locator("#brand-status-dot-btn").click();
    await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/, { timeout: 8000 });

    const scrollOk = await page.evaluate(async () => {
      const scroller =
        document.querySelector("#device-hub .device-hub-scroll") ??
        document.querySelector("#device-hub");
      if (!scroller) return { ok: false, reason: "no-hub-scroller" };

      const before = scroller.scrollTop;
      scroller.scrollTop = Math.min(scroller.scrollHeight, before + 400);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return { ok: scroller.scrollTop !== before || scroller.scrollHeight <= scroller.clientHeight };
    });

    expect(scrollOk.ok, scrollOk.reason ?? "scroll failed").toBe(true);
  });
});
