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

async function openDistrictSketch(board: ReturnType<Page["locator"]>) {
  await board.locator("#city-game-map-advanced").evaluate((el) => {
    if (el instanceof HTMLDetailsElement) el.open = true;
  });
  await board.locator("#district-sketch").evaluate((el) => {
    if (el instanceof HTMLDetailsElement) el.open = true;
  });
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

    await expect(board.getByText("1 / 3 fragments recovered")).toBeVisible();
    await expect(board.getByText("Something is stirring.")).toBeVisible();
    const riverRow = board.locator('.city-game-map-node-row[data-node-id="node_04"]');
    await expect(riverRow.locator(".city-game-map-chip-value")).toHaveText("14 / 20");
    await expect(board).toHaveAttribute("data-snapshot-loaded", "1");
  });

  test("schematic pin click highlights matching place row", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(board).toHaveAttribute("data-snapshot-loaded", "1");

    const pin = board.locator('.city-game-map-pin[data-node-id="node_04"]');
    const row = board.locator('.city-game-map-node-row[data-node-id="node_04"]');
    await openDistrictSketch(board);
    await expect(pin).toBeVisible();
    await pin.click();

    await expect(board).toHaveAttribute("data-highlight-node-id", "node_04");
    await expect(pin).toHaveClass(/city-game-map-pin--highlight/);
    await expect(row).toHaveClass(/city-game-map-node-row--highlight/);
    await expect(row).toHaveAttribute("aria-current", "true");
  });

  test("production-like empty snapshot still allows fogged pin click and list scroll", async ({
    page,
  }) => {
    await mockSeasonSnapshot(
      page,
      mockSnapshotBody({
        window_phase: "before",
        map_visibility: "signal_war",
        nodes: [],
        unlock_edges: [],
        signal_war: {
          summary_lines: ["Red · 0 network pts", "Blue · 0 network pts"],
        },
      })
    );

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(board).toHaveAttribute("data-snapshot-loaded", "1");

    const pin = board.locator('.city-game-map-pin[data-node-id="node_04"]');
    const row = board.locator('.city-game-map-node-row[data-node-id="node_04"]');
    const list = board.locator(".city-game-map-list-panel");

    await openDistrictSketch(board);

    await expect(pin).toHaveClass(/city-game-map-pin--fog-hidden/);
    await expect(pin).not.toHaveAttribute("hidden", "");

    await list.evaluate((el) => {
      if (el instanceof HTMLElement) el.scrollTop = el.scrollHeight;
    });

    await pin.evaluate((el) => {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    await expect(board).toHaveAttribute("data-highlight-node-id", "node_04");
    await expect(pin).toHaveClass(/city-game-map-pin--highlight/);
    await expect(row).toHaveClass(/city-game-map-node-row--highlight/);
    await expect(row).toHaveAttribute("aria-current", "true");

    await expect
      .poll(async () =>
        list.evaluate((el, rowEl) => {
          if (!(el instanceof HTMLElement) || !(rowEl instanceof HTMLElement)) return false;
          const top = el.scrollTop;
          const bottom = top + el.clientHeight;
          const rowTop = rowEl.offsetTop;
          const rowBottom = rowTop + rowEl.offsetHeight;
          return rowTop >= top && rowBottom <= bottom;
        }, await row.elementHandle())
      )
      .toBe(true);
  });

  test("repeat pin click clears highlight", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });

    const pin = board.locator('.city-game-map-pin[data-node-id="node_04"]');
    await openDistrictSketch(board);
    await pin.click();
    await expect(board).toHaveAttribute("data-highlight-node-id", "node_04");
    await pin.click();
    await expect(board).not.toHaveAttribute("data-highlight-node-id", "node_04");
    await expect(pin).not.toHaveClass(/city-game-map-pin--highlight/);
  });

  test("pin click scrolls list when matching row already focused", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });

    const pin = board.locator('.city-game-map-pin[data-node-id="node_04"]');
    const row = board.locator('.city-game-map-node-row[data-node-id="node_04"]');
    await openDistrictSketch(board);

    await row.focus();
    await expect(row).toBeFocused();
    await pin.click();

    await expect(board).toHaveAttribute("data-highlight-node-id", "node_04");
    await expect(pin).toHaveClass(/city-game-map-pin--highlight/);
  });

  test("place row click highlights schematic pin", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });

    const pin = board.locator('.city-game-map-pin[data-node-id="node_04"]');
    const row = board.locator('.city-game-map-node-row[data-node-id="node_04"]');
    await openDistrictSketch(board);
    await row.locator(".city-game-map-node-title").click();
    await expect(board).toHaveAttribute("data-highlight-node-id", "node_04");
    await expect(pin).toHaveClass(/city-game-map-pin--highlight/);
    await expect(row).toHaveAttribute("aria-current", "true");
  });

  test("legacy #city-state hash redirects to dedicated map page", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/cedar-rapids/#city-state");

    await expect(page).toHaveURL(/\/play\/cedar-rapids\/map\/?/, { timeout: 15_000 });
    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('a[href="/data-policy.html"]')).toBeVisible();
  });

  test("mobile viewport keeps collapsed sketch summary below capped place list", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(board.getByRole("heading", { name: "Quest log" })).toBeVisible();
    await expect(board.getByRole("heading", { name: "Places" })).toBeVisible();

    const advanced = board.locator("#city-game-map-advanced");
    const sketch = board.locator("#district-sketch");
    await expect(advanced.getByText(/map & mechanics/i)).toBeVisible();
    await expect(advanced).toHaveJSProperty("open", false);
    await expect(sketch).toHaveJSProperty("open", false);

    const lobby = board.locator(".city-game-map-lobby");
    const stateSection = board.locator(".city-game-map-state");
    const placesSection = board.locator(".city-game-map-places");
    const list = board.locator(".city-game-map-list-panel");

    const lobbyBox = await lobby.boundingBox();
    const stateBox = await stateSection.boundingBox();
    const placesBox = await placesSection.boundingBox();
    const advancedBox = await advanced.boundingBox();
    const listBox = await list.boundingBox();

    expect(lobbyBox?.width ?? 0).toBeGreaterThan(280);
    expect(stateBox?.width ?? 0).toBeGreaterThan(280);
    expect(placesBox?.width ?? 0).toBeGreaterThan(280);
    expect(advancedBox?.width ?? 0).toBeGreaterThan(280);
    expect(listBox?.width ?? 0).toBeGreaterThan(280);

    // Progress hook, then places, then quest log; mechanics tucked below the capped list.
    expect((lobbyBox?.y ?? 0) + (lobbyBox?.height ?? 0)).toBeLessThanOrEqual(
      (placesBox?.y ?? 0) + 24
    );
    expect((placesBox?.y ?? 0) + (placesBox?.height ?? 0)).toBeLessThanOrEqual(
      (stateBox?.y ?? 0) + 24
    );
    expect((listBox?.y ?? 0) + (listBox?.height ?? 0)).toBeLessThanOrEqual(
      (advancedBox?.y ?? 0) + 24
    );
    expect(listBox?.height ?? 0).toBeLessThanOrEqual(360);
    await advanced.scrollIntoViewIfNeeded();
    await expect(advanced).toBeInViewport({ ratio: 0.2 });
  });

  test("district sketch stays collapsed on desktop until expanded", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto("/play/cedar-rapids/map/");

    const sketch = page.locator("#district-sketch");
    await expect(sketch).toBeAttached({ timeout: 15_000 });
    await expect(sketch).toHaveJSProperty("open", false);
    await expect(sketch.locator(".city-game-map-sketch-block")).toBeHidden();

    await openDistrictSketch(page.locator(".city-game-map-board"));
    await expect(sketch).toHaveJSProperty("open", true);
    await expect(sketch.locator('.city-game-map-pin[data-node-id="node_04"]')).toBeVisible();
  });

  test("shows stale sync banner when snapshot fetch fails", async ({ page }) => {
    await page.route(`**${SNAPSHOT_PATH}`, (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: "{}" })
    );

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });

    await expect(page.locator("#city-game-map-sync")).toHaveClass(/city-game-map-sync--stale/);
    await expect(page.locator("#city-game-map-sync")).toContainText("Couldn’t refresh");
  });
});
