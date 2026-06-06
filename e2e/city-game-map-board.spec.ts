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

async function openBoardFilters(board: ReturnType<Page["locator"]>) {
  await board.locator("#city-game-map-filters").evaluate((el) => {
    if (el instanceof HTMLDetailsElement) el.open = true;
  });
}

async function openDistrictSketch(board: ReturnType<Page["locator"]>) {
  await board.locator("#city-game-map-advanced").evaluate((el) => {
    if (el instanceof HTMLDetailsElement) el.open = true;
  });
  await board.locator("#district-sketch").evaluate((el) => {
    if (el instanceof HTMLDetailsElement) el.open = true;
  });
}

async function clickMapPin(pin: ReturnType<ReturnType<Page["locator"]>["locator"]>) {
  await pin.evaluate((el) => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

function districtSketchPin(board: ReturnType<Page["locator"]>, nodeId: string) {
  return board.locator(`#district-sketch .city-game-map-pin[data-node-id="${nodeId}"]`);
}

test.describe("city game map board", () => {
  test("dedicated map page loads board and applies snapshot chips", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".city-game-map-loading")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/wake the city/i);
    await expect(page.getByRole("link", { name: "Rules", exact: true })).toBeVisible();

    await expect(board.getByText("Help wake the city.")).toBeVisible();
    await expect(board.locator("#city-game-map-mission-progress")).toBeVisible();
    await expect(board.getByText("Relays unclaimed · Finale dormant")).toBeVisible();
    await expect(board.locator("#city-game-map-mission .city-game-map-mission-privacy")).toContainText(
      "No account. No GPS. No visit log."
    );
    await expect(board.getByText("Find a live sticker")).toBeVisible();
    await expect(board.getByText("See what changed")).toBeVisible();
    await expect(
      board.getByText("Each place can reveal a different live state or action.")
    ).toBeVisible();
    await expect(board.getByRole("heading", { name: "Riverwalk River Lantern" })).toBeVisible();
    await expect(board.getByText("Find the River Lantern and add one signal.")).toBeVisible();
    await expect(board.locator("#city-game-map-spotlight .city-game-map-spotlight-effect")).toContainText(
      "Unlocks Czech Village cabinet"
    );
    await expect(board.locator("#city-game-map-spotlight .city-game-map-spotlight-hint")).toContainText(
      "Find the River Lantern"
    );
    await expect(board.getByText(/back of the sticker|enter code|Add to the city/i)).toHaveCount(0);
    await expect(board.locator("#city-game-map-places")).toBeVisible();
    await expect(board.locator("#city-game-map-filters")).toBeVisible();
    await expect(board.getByText("Start at Riverwalk River Lantern.")).toBeVisible();

    await expect(board).toHaveAttribute("data-snapshot-loaded", "1");
    await expect(board.locator("#city-game-map-mission-progress")).toHaveText("1 / 3 fragments recovered");
    await expect(board.locator("#city-game-map-spotlight-count")).toHaveText("14 / 20");
    await expect(board.locator("#city-game-map-live-state")).toBeVisible();
    await expect(board.getByText("What changes when the city wakes")).toBeVisible();
    await expect(board.locator("#city-game-map-activity")).toBeVisible();
    await expect(board.locator("#city-game-map-progress")).toHaveText("1 / 3 fragments recovered");
    await expect(board.locator("#city-game-map-live-state")).toContainText("Something is stirring.");
    await expect(board.getByText("Routes waking with the city")).toBeVisible();
    const riverRow = board.locator('.city-game-map-node-row[data-node-id="node_04"]');
    await expect(riverRow).toHaveCount(1);
    await expect(riverRow).toHaveClass(/city-game-map-node-row--spotlight/);
    await expect(riverRow.locator("[data-node-effect]")).toContainText("14 / 20");
  });

  test("type and state filters narrow places and schematic pins", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(board).toHaveAttribute("data-snapshot-loaded", "1");

    await openBoardFilters(board);

    const typeFilter = board.locator(".city-game-map-type-filter");
    await expect(typeFilter.getByRole("button", { name: /Relays 17/ })).toBeVisible();

    await typeFilter.getByRole("button", { name: /Relays 17/ }).click();
    await expect(board).toHaveAttribute("data-active-type", "relay_gate");
    await expect(board.locator('.city-game-map-node-row[data-role="relay_gate"]')).toHaveCount(17);
    await expect(board.locator('.city-game-map-node-row[data-role="relay_gate"]:visible')).toHaveCount(
      17
    );
    await expect(board.locator('.city-game-map-node-row[data-role="lore_archive"]:visible')).toHaveCount(
      0
    );

    await openDistrictSketch(board);
    await expect(
      board.locator('#district-sketch .city-game-map-pin[data-role="relay_gate"]:not([hidden])')
    ).not.toHaveCount(0);
    await expect(
      board.locator('#district-sketch .city-game-map-pin[data-role="lore_archive"]:not([hidden])')
    ).toHaveCount(0);

    const stateFilter = board.locator(".city-game-map-state-filter");
    await stateFilter.getByRole("button", { name: "Needs action" }).click();
    await expect(board).toHaveAttribute("data-active-state", "needs_action");
    await expect(
      board.locator('.city-game-map-node-row[data-role="relay_gate"]:visible')
    ).not.toHaveCount(0);

    await typeFilter.getByRole("button", { name: "All", exact: true }).click();
    await stateFilter.getByRole("button", { name: "All states" }).click();
    await expect(board).toHaveAttribute("data-active-type", "all");
    await expect(board).toHaveAttribute("data-active-state", "all");
    await expect(board.locator(".city-game-map-node-row:visible")).toHaveCount(40);
  });

  test("mobile filter chips show active styling and viewing summary", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(board).toHaveAttribute("data-snapshot-loaded", "1");

    await openBoardFilters(board);

    const typeFilter = board.locator(".city-game-map-type-filter");
    const stateFilter = board.locator(".city-game-map-state-filter");
    const allTypes = typeFilter.getByRole("button", { name: "All", exact: true });
    const allStates = stateFilter.getByRole("button", { name: "All states" });
    await expect(allTypes).toHaveAttribute("aria-pressed", "true");
    await expect(allStates).toHaveAttribute("aria-pressed", "true");
    await expect(allTypes).not.toHaveClass(/city-game-map-filter-btn--active/);
    await expect(allStates).not.toHaveClass(/city-game-map-filter-btn--active/);

    const relayBtn = typeFilter.getByRole("button", { name: /Relays 17/ });
    await relayBtn.click();

    await expect(relayBtn).toHaveAttribute("aria-pressed", "true");
    await expect(relayBtn).toHaveClass(/city-game-map-filter-btn--active/);
    await expect(relayBtn).toHaveCSS("background-color", "rgb(219, 27, 67)");
    await expect(allTypes).toHaveAttribute("aria-pressed", "false");
    await expect(allTypes).not.toHaveClass(/city-game-map-filter-btn--active/);

    const summary = board.locator("#city-game-map-filter-summary");
    await expect(summary).toBeVisible();
    await expect(summary).toContainText("Viewing:");
    await expect(summary.locator("[data-filter-summary-scope]")).toContainText(
      "Relays · 17 places"
    );

    const needsBtn = stateFilter.getByRole("button", { name: "Needs action" });
    await needsBtn.click();
    await expect(needsBtn).toHaveAttribute("aria-pressed", "true");
    await expect(needsBtn).toHaveClass(/city-game-map-filter-btn--active/);
    await expect(summary.locator("[data-filter-summary-scope]")).toContainText(
      /Relays · Needs action · \d+ places/
    );

    await summary.getByRole("button", { name: "Clear filters" }).click();
    await expect(board).toHaveAttribute("data-active-type", "all");
    await expect(board).toHaveAttribute("data-active-state", "all");
    await expect(summary).toBeHidden();
    await expect(relayBtn).toHaveAttribute("aria-pressed", "false");
    await expect(relayBtn).not.toHaveClass(/city-game-map-filter-btn--active/);
    await expect(needsBtn).toHaveAttribute("aria-pressed", "false");
    await expect(needsBtn).not.toHaveClass(/city-game-map-filter-btn--active/);
    await expect(allTypes).toHaveAttribute("aria-pressed", "true");
    await expect(allStates).toHaveAttribute("aria-pressed", "true");
    await expect(allTypes).not.toHaveClass(/city-game-map-filter-btn--active/);
    await expect(allStates).not.toHaveClass(/city-game-map-filter-btn--active/);
  });

  test("mobile place list uses page scroll not nested panel scroll", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(board).toHaveAttribute("data-snapshot-loaded", "1");

    const listScroll = board.locator(".city-game-map-list-scroll");
    const overflow = await listScroll.evaluate((el) => {
      if (!(el instanceof HTMLElement)) return "";
      return getComputedStyle(el).overflowY;
    });
    expect(overflow).not.toBe("auto");
    expect(overflow).not.toBe("scroll");

    const maxHeight = await listScroll.evaluate((el) => {
      if (!(el instanceof HTMLElement)) return 0;
      const value = getComputedStyle(el).maxHeight;
      if (value === "none") return 0;
      return parseFloat(value);
    });
    expect(maxHeight).toBe(0);

    await openBoardFilters(board);
    await board.locator(".city-game-map-type-filter").getByRole("button", { name: /Relays/ }).click();
    const summary = board.locator("#city-game-map-filter-summary");
    await expect(summary).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(summary).toBeVisible();
    await expect(summary.locator("[data-filter-summary-scope]")).toContainText(/Relays · \d+ places/);
  });

  test("?node= deep link highlights scanned location on load", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/cedar-rapids/map/?node=node_04");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(board).toHaveAttribute("data-snapshot-loaded", "1");

    const row = board.locator('.city-game-map-node-row[data-node-id="node_04"]');
    await expect(board).toHaveAttribute("data-highlight-node-id", "node_04");
    await expect(row).toHaveClass(/city-game-map-node-row--highlight/);
    await expect(row).toHaveAttribute("aria-current", "true");
  });

  test("schematic pin click highlights matching place row", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(board).toHaveAttribute("data-snapshot-loaded", "1");

    const pin = districtSketchPin(board, "node_07");
    const row = board.locator('.city-game-map-node-row[data-node-id="node_07"]');
    await openDistrictSketch(board);
    await expect(pin).toBeAttached();
    await clickMapPin(pin);

    await expect(board).toHaveAttribute("data-highlight-node-id", "node_07");
    await expect(pin).toHaveClass(/city-game-map-pin--highlight/);
    await expect(row).toHaveClass(/city-game-map-node-row--highlight/);
    await expect(row).toHaveAttribute("aria-current", "true");
  });

  test("production-like empty snapshot still allows fogged pin click and page scroll", async ({
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

    const pin = districtSketchPin(board, "node_07");
    const row = board.locator('.city-game-map-node-row[data-node-id="node_07"]');

    await openDistrictSketch(board);

    await expect(pin).toHaveClass(/city-game-map-pin--fog-hidden/);
    await expect(pin).not.toHaveAttribute("hidden", "");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await pin.evaluate((el) => {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    await expect(board).toHaveAttribute("data-highlight-node-id", "node_07");
    await expect(pin).toHaveClass(/city-game-map-pin--highlight/);
    await expect(row).toHaveClass(/city-game-map-node-row--highlight/);
    await expect(row).toHaveAttribute("aria-current", "true");

    await row.scrollIntoViewIfNeeded();
    await expect(row).toBeInViewport({ ratio: 0.2 });
  });

  test("repeat pin click clears highlight", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });

    const pin = districtSketchPin(board, "node_04");
    await openDistrictSketch(board);
    await clickMapPin(pin);
    await expect(board).toHaveAttribute("data-highlight-node-id", "node_04");
    await clickMapPin(pin);
    await expect(board).not.toHaveAttribute("data-highlight-node-id", "node_04");
    await expect(pin).not.toHaveClass(/city-game-map-pin--highlight/);
  });

  test("pin click scrolls list when matching row already focused", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });

    const pin = districtSketchPin(board, "node_07");
    const row = board.locator('.city-game-map-node-row[data-node-id="node_07"]');
    await openDistrictSketch(board);

    await row.focus();
    await expect(row).toBeFocused();
    await clickMapPin(pin);

    await expect(board).toHaveAttribute("data-highlight-node-id", "node_07");
    await expect(pin).toHaveClass(/city-game-map-pin--highlight/);
  });

  test("place row click highlights schematic pin", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });

    const pin = districtSketchPin(board, "node_07");
    const row = board.locator('.city-game-map-node-row[data-node-id="node_07"]');
    await openDistrictSketch(board);
    await row.locator(".city-game-map-node-title").click();
    await expect(board).toHaveAttribute("data-highlight-node-id", "node_07");
    await expect(pin).toHaveClass(/city-game-map-pin--highlight/);
    await expect(row).toHaveAttribute("aria-current", "true");
  });

  test("legacy #city-state hash redirects to dedicated map page", async ({ page }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());

    await page.goto("/play/cedar-rapids/#city-state");

    await expect(page).toHaveURL(/\/play\/cedar-rapids\/map\/?/, { timeout: 15_000 });
    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".idea-footnote").getByRole("link", { name: "Data policy" })).toBeVisible();
  });

  test("mobile viewport keeps launch spotlight above places list and mechanics", async ({
    page,
  }) => {
    await mockSeasonSnapshot(page, mockSnapshotBody());
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/play/cedar-rapids/map/");

    const board = page.locator(".city-game-map-board");
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(board.getByRole("heading", { name: "Riverwalk River Lantern" })).toBeVisible();
    await expect(board.getByRole("heading", { name: "Places" })).toBeVisible();
    await expect(board.locator(".city-game-map-mobile-sketch")).toBeVisible();

    const advanced = board.locator("#city-game-map-advanced");
    const sketch = board.locator("#district-sketch");
    await expect(advanced.getByText(/routes & unlocks/i)).toBeVisible();
    await expect(advanced).toHaveJSProperty("open", false);
    await expect(sketch).toHaveJSProperty("open", false);

    const spotlight = board.locator("#city-game-map-spotlight");
    const placesList = board.locator("#city-game-map-places");
    const activity = board.locator("#city-game-map-activity");

    await expect(board.getByRole("heading", { name: "Live city state" })).toBeVisible();
    await expect(board.getByRole("heading", { name: "City activity" })).toBeVisible();
    await expect(activity).toBeVisible();

    const spotlightBox = await spotlight.boundingBox();
    const placesBox = await placesList.boundingBox();
    const activityBox = await activity.boundingBox();
    const advancedBox = await advanced.boundingBox();

    expect(spotlightBox?.width ?? 0).toBeGreaterThan(280);
    expect(placesBox?.width ?? 0).toBeGreaterThan(280);
    expect(activityBox?.width ?? 0).toBeGreaterThan(280);
    expect(advancedBox?.width ?? 0).toBeGreaterThan(280);

    expect((spotlightBox?.y ?? 0) + (spotlightBox?.height ?? 0)).toBeLessThanOrEqual(
      (activityBox?.y ?? 0) + 24
    );
    expect((placesBox?.y ?? 0)).toBeGreaterThan((activityBox?.y ?? 0) - 24);
    expect((activityBox?.y ?? 0) + (activityBox?.height ?? 0)).toBeLessThanOrEqual(
      (advancedBox?.y ?? 0) + 24
    );

    const list = board.locator(".city-game-map-list-scroll");
    const listBox = await list.boundingBox();
    expect(listBox?.height ?? 0).toBeGreaterThan(360);
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
    await expect(districtSketchPin(page.locator(".city-game-map-board"), "node_04")).toBeAttached();
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
