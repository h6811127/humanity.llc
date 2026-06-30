import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * Agent D integrator — discover → understand → act → scan (shell + board affordances).
 * Board snapshot mocked; does not exercise scan SSR or object-graph.
 */

const SEASON_ID = "cr_season_01_wake";
const SNAPSHOT_PATH = `/.well-known/hc/v1/seasons/${SEASON_ID}/snapshot`;
const FIRST_VISIT_KEY = `hc_city_game_map_intro_dismissed:${SEASON_ID}`;

function mockSnapshotBody(overrides: Record<string, unknown> = {}) {
  return {
    season_id: SEASON_ID,
    title: "Wake the city",
    window_phase: "open",
    generated_at: "2026-06-07T18:00:00.000Z",
    headlines: ["River Lantern quorum moving"],
    nodes: [
      {
        node_id: "node_04",
        label: "Riverwalk River Lantern",
        district: "river_spine",
        role: "temp_drop",
        lifecycle: "live",
        map_mode: "quorum",
        public_state: "Seed clue live",
        route_open: true,
        scan_url: "https://humanity.llc/c/demo?q=demo",
        chips: [{ kind: "collective", label: "City progress", value: "14 / 20" }],
      },
    ],
    unlock_edges: [],
    finale: {
      node_id: "node_13",
      fragments: { claimed: 1, required: 3, complete: false },
      open: false,
    },
    ...overrides,
  };
}

async function mockSeasonSnapshot(page: Page, body: Record<string, unknown>) {
  await page.route(`**${SNAPSHOT_PATH}`, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "public, max-age=15" },
      body: JSON.stringify(body),
    })
  );
}

async function clearMapFirstVisitBanner(page: Page) {
  await page.addInitScript((key) => {
    sessionStorage.removeItem(key);
  }, FIRST_VISIT_KEY);
}

test.describe("public network player flow (integrator)", () => {
  test("homepage to board to first stop selection", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());
    await clearMapFirstVisitBanner(page);

    await page.goto("/");
    await page
      .locator("#public-networks-results")
      .getByRole("link", { name: "Open board" })
      .click();
    await expect(page).toHaveURL(/\/play\/cedar-rapids\/map\//);

    const banner = page.locator("#city-game-map-first-visit-banner");
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await banner.getByRole("button", { name: "Got it" }).click();

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(board).toHaveAttribute("data-snapshot-loaded", "1");

    await board.locator("#city-game-map-start-callout").click();
    await expect(board.locator("#city-game-map-selection-panel")).toBeVisible();
    await expect(board.locator("#city-game-map-selection-title")).toContainText(
      "Riverwalk River Lantern"
    );
  });

  test("catalog to rules charter to board", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/season/");
    await page
      .locator("#public-networks-results")
      .getByRole("link", { name: "What a scan proves" })
      .click();
    await expect(page).toHaveURL(/\/play\/cedar-rapids\/#rules-prove-title/);
    await expect(page.getByRole("heading", { name: "What a scan proves" })).toBeVisible();

    await page.getByRole("link", { name: "Open public state board" }).click();
    await expect(page).toHaveURL(/\/play\/cedar-rapids\/map\//);
    await expect(page.locator(".player-flow-breadcrumb")).toContainText("Wake the city board");
  });

  test("discover browse footnote returns to catalog and board", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/discover/cedar-rapids-iowa/");
    const footnote = page.locator(".discovery-region-player-footnote");
    await footnote.getByRole("link", { name: "All public networks" }).click();
    await expect(page).toHaveURL(/\/play\/season\//);

    await page.goto("/discover/cedar-rapids-iowa/");
    await footnote.getByRole("link", { name: "Open board" }).click();
    await expect(page).toHaveURL(/\/play\/cedar-rapids\/map\//);
    await expect(page.locator(".city-game-map-board")).toBeVisible({ timeout: 15_000 });
  });

  test("homepage what a scan proves opens rules charter section", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "What a scan proves" }).first().click();
    await expect(page).toHaveURL(/\/play\/cedar-rapids\/#rules-prove-title/);
    await expect(page.getByRole("heading", { name: "What a scan proves" })).toBeVisible();
  });

  test("map footnote browse places links to discover region", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());
    await page.goto("/play/cedar-rapids/map/");
    await page
      .locator(".city-game-map-page-footnote")
      .getByRole("link", { name: "Browse places near me" })
      .click();
    await expect(page).toHaveURL(/\/discover\/cedar-rapids-iowa\//);
  });

  test("rules footnote round-trips to board and discover browse", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/cedar-rapids/");
    const footnote = page.locator(".city-game-rules-player-footnote");
    await footnote.getByRole("link", { name: "Open board" }).click();
    await expect(page).toHaveURL(/\/play\/cedar-rapids\/map\//);

    await page.goto("/play/cedar-rapids/");
    await footnote.getByRole("link", { name: "Browse places near me" }).click();
    await expect(page).toHaveURL(/\/discover\/cedar-rapids-iowa\//);
  });

  test("board list row exposes scan link after snapshot load", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());
    await clearMapFirstVisitBanner(page);

    await page.goto("/play/cedar-rapids/map/");
    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(board).toHaveAttribute("data-snapshot-loaded", "1");

    await page.locator("#city-game-map-first-visit-dismiss").click();
    const riverRow = board.locator('.city-game-map-node-row[data-node-id="node_04"]');
    await expect(riverRow.locator("a.city-game-map-scan-link")).toBeVisible();
  });

  test("comprehension hub links player flow field walk", async ({ page }) => {
    await page.goto("/play/cedar-rapids/comprehension/");
    await expect(page.getByRole("heading", { name: /GT comprehension/i })).toBeVisible();
    const fieldWalkLink = page.getByRole("link", { name: /player-flow-field-walk\.html/i });
    await expect(fieldWalkLink).toHaveAttribute("href", /player-flow-field-walk\.html$/);

    await page.goto("/play/cedar-rapids/comprehension/player-flow-field-walk.html");
    await expect(page.getByRole("heading", { name: /Player flow field walk/i })).toBeVisible();
    await expect(page.getByText("PD-1 · Discover network")).toBeVisible();
    await expect(page.getByText("PD-5 · Scan handoff")).toBeVisible();
  });

  test("rules operator link opens player flow field walk", async ({ page }) => {
    await page.goto("/play/cedar-rapids/");
    await page.getByRole("link", { name: "Player flow field walk" }).click();
    await expect(page).toHaveURL(/\/comprehension\/player-flow-field-walk(\.html)?$/);
    await expect(page.getByRole("link", { name: "4 · Open board" })).toHaveAttribute(
      "href",
      /\/play\/cedar-rapids\/map\//
    );
  });

  test("game scan onboarding exposes player flow CTAs (PD-5)", async ({ page }) => {
    await page.goto("/dev/city-game-scan-onboarding/after-season-open.html");
    const onboarding = page.locator(".scan-game-onboarding");
    await expect(onboarding).toBeVisible();
    await expect(onboarding.getByRole("link", { name: "Open board" })).toHaveAttribute(
      "href",
      /\/play\/cedar-rapids\/map\/\?node=node_01/
    );
    await expect(onboarding.getByRole("link", { name: "What a scan proves" })).toHaveAttribute(
      "href",
      /\/play\/cedar-rapids\/#rules-prove-title/
    );
  });
});
