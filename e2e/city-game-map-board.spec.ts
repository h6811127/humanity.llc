import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Rules-page city state board — static M1 shell + snapshot poll (M2/M3).
 * Mocks worker snapshot on :8787; Pages serves board assets on :8788.
 *
 * @see docs/CITY_GAME_MAP_DASHBOARD.md · GT-7 in CITY_GAME_COMPREHENSION_RUNBOOK.md
 */

const SEASON_ID = "cr_season_01_wake";
const SNAPSHOT_PATH = `/.well-known/hc/v1/seasons/${SEASON_ID}/snapshot`;

function mockSnapshotBody(overrides: Record<string, unknown> = {}) {
  return {
    season_id: SEASON_ID,
    title: "Wake the city",
    window_phase: "unset",
    generated_at: "2026-06-07T18:00:00.000Z",
    headlines: ["NewBo relay arch — weekend bulletin slot"],
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
        scan_url: null,
        chips: [{ kind: "collective", label: "City progress", value: "14 / 20" }],
      },
    ],
    unlock_edges: [
      {
        from: "node_04",
        to: "node_07",
        label: "River Lantern unlocks Czech Village cabinet",
        satisfied: false,
      },
    ],
    finale: {
      node_id: "node_13",
      fragments: { claimed: 1, required: 3, complete: false },
      open: false,
    },
    ...overrides,
  };
}

async function mockSeasonSnapshot(page: Page, body: Record<string, unknown>) {
  const fulfill = (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "public, max-age=15" },
      body: JSON.stringify(body),
    });

  await page.route(`**${SNAPSHOT_PATH}`, fulfill);
}

test.describe("city game map board", () => {
  test("dedicated map page loads board and applies snapshot chips", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".city-game-map-loading")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/weekend city board/i);
    await expect(page.locator('a[href="/play/cedar-rapids/"]')).toBeVisible();

    await expect(board.getByText("No visit log")).toBeVisible();
    const riverRow = board.locator('.city-game-map-node-row[data-node-id="node_04"]');
    await expect(riverRow.locator(".city-game-map-chip-value")).toHaveText("14 / 20");
    await expect(board).toHaveAttribute("data-snapshot-loaded", "1");
  });

  test("legacy #city-state hash redirects to dedicated map page", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/cedar-rapids/#city-state");

    await expect(page).toHaveURL(/\/play\/cedar-rapids\/map\/?/, { timeout: 15_000 });
    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(board.getByText("No visit log")).toBeVisible();
  });

  test("mobile viewport keeps district sketch visible below capped place list", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(board.getByRole("heading", { name: "Places by district" })).toBeVisible();
    await expect(board.getByRole("heading", { name: "District sketch" })).toBeVisible();

    const shell = board.locator(".city-game-map-shell");
    const sketch = board.locator("#district-sketch");
    const list = board.locator(".city-game-map-list-panel");

    const shellBox = await shell.boundingBox();
    const sketchBox = await sketch.boundingBox();
    const listBox = await list.boundingBox();

    expect(shellBox?.width ?? 0).toBeGreaterThan(300);
    expect(sketchBox?.width ?? 0).toBeGreaterThan(280);
    expect(listBox?.width ?? 0).toBeGreaterThan(280);

    // Place list precedes sketch; capped list height keeps sketch nearby on phone.
    expect((listBox?.y ?? 0) + (listBox?.height ?? 0)).toBeLessThanOrEqual(
      (sketchBox?.y ?? 0) + 24
    );
    expect(listBox?.height ?? 0).toBeLessThanOrEqual(360);
    expect(sketchBox?.height ?? 0).toBeGreaterThan(80);
    await sketch.scrollIntoViewIfNeeded();
    await expect(sketch).toBeInViewport({ ratio: 0.2 });
  });

  test("shows stale sync banner when snapshot fetch fails", async ({ page }) => {
    await page.route(`**${SNAPSHOT_PATH}`, (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: "{}" })
    );

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });

    await expect(page.locator("#city-game-map-sync")).toHaveClass(/city-game-map-sync--stale/);
    await expect(page.locator("#city-game-map-sync")).toContainText("Board may be stale");
  });
});
