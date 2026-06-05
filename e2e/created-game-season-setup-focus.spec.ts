import { test, expect, type Page } from "@playwright/test";

/**
 * Season continuation landing on /created/?focus=game-season-setup&room=season
 * @see docs/STEWARD_UX_PRESENTATION_TARGET.md § Identity and rooms
 */

const GENERAL_ROOT = {
  id: "e2e_season_land_root",
  label: "River studio",
  saved_at: "2026-05-29T12:00:00.000Z",
  profile_id: "profE2eSeasonLand01",
  qr_id: "qr_e2e_season_land_01",
  handle: "river_studio",
  manifesto_line: "General root for season landing",
  pilot_template: "general",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  scan_url: "http://127.0.0.1:8788/c/profE2eSeasonLand01?q=qr_e2e_season_land_01",
  status: "active",
};

async function stubCreatedShell(page: Page) {
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
          profile_id: GENERAL_ROOT.profile_id,
          qr_id: GENERAL_ROOT.qr_id,
          card: {
            status: "active",
            handle: GENERAL_ROOT.handle,
            manifesto_line: GENERAL_ROOT.manifesto_line,
          },
          verification: { state: "registered", label: "Registered" },
          human_trust: { label: "Registered", subtitle: "", pill_active: false },
        },
      }),
    })
  );
  await page.route(`**/.well-known/hc/v1/cards/${GENERAL_ROOT.profile_id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        handle: GENERAL_ROOT.handle,
        manifesto_line: GENERAL_ROOT.manifesto_line,
        created_at: "2026-05-25T12:00:00.000Z",
        status: "active",
      }),
    })
  );
}

async function seedGeneralRootControl(page: Page) {
  await page.addInitScript((entry) => {
    localStorage.setItem("hc_keys_custody_notice_dismissed", "1");
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
        pilot_template: "general",
        scan_url: entry.scan_url,
        owner_public_key_b58: entry.owner_public_key_b58,
        owner_private_key_b58: entry.owner_private_key_b58,
      })
    );
  }, GENERAL_ROOT);
}

test.describe("game season setup landing", () => {
  test.beforeEach(async ({ page }) => {
    await stubCreatedShell(page);
    await seedGeneralRootControl(page);
  });

  test("focus=game-season-setup&room=season lands in season setup, not generic Live", async ({
    page,
  }) => {
    await page.goto(
      `/created/?profile_id=${GENERAL_ROOT.profile_id}&qr_id=${GENERAL_ROOT.qr_id}&focus=game-season-setup&room=season`
    );

    await expect(page.getByRole("heading", { name: "Set up your live season" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your object is live" })).toHaveCount(0);
    const seasonTab = page.locator('[data-steward-room="season"]');
    if ((await seasonTab.count()) > 0) {
      await expect(seasonTab).toHaveAttribute("aria-pressed", "true");
    }
    await expect(page.locator("#child-object-add-hub")).toHaveAttribute("open", "");
    await expect(page.locator("#child-object-game-node-setup")).toBeVisible();
    await expect(page.getByText(/Register checkpoints, publish rules/i)).toBeVisible();
  });
});
