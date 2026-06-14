/**
 * Phase E step 6 — self-serve game season setup on /created/ Live.
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § Phase E · engineering sequence step 6
 */
import { test, expect, type Page } from "@playwright/test";

const GAME_SEASON_ROOT = {
  profile_id: "profE2eGameSeason01",
  qr_id: "qr_e2e_game_season_01",
  handle: "example_game_ops",
  manifesto_line: "City game season: Example City game season root",
  pilot_template: "general",
  issuer_public_key: "gameOpPubKeyTestOnlyxxxxxxxxxx",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  scan_url: "http://127.0.0.1:8787/c/profE2eGameSeason01?q=qr_e2e_game_season_01",
  recovery_key_acknowledged: true,
};

const CHILD_OBJECTS_KEY = `hc_child_objects_v1:${GAME_SEASON_ROOT.profile_id}`;

function cardStatusRoute(sample: typeof GAME_SEASON_ROOT) {
  return {
    version: "1.0",
    resolver: { operator: "humanity.llc", version: "1.0" },
    scan: {
      kind: "active",
      profile_id: sample.profile_id,
      qr_id: sample.qr_id,
      card: {
        status: "active",
        handle: sample.handle,
        manifesto_line: sample.manifesto_line,
      },
      verification: { state: "registered", label: "Registered" },
      human_trust: { label: "Registered", subtitle: "", pill_active: false },
    },
  };
}

async function stubResolver(
  page: Page,
  sample = GAME_SEASON_ROOT,
  objects: unknown[] = []
) {
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
      body: JSON.stringify(cardStatusRoute(sample)),
    })
  );
  await page.route(`**/.well-known/hc/v1/cards/${sample.profile_id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        handle: sample.handle,
        manifesto_line: sample.manifesto_line,
        created_at: "2026-06-01T12:00:00.000Z",
        status: "active",
        issuer_public_key: sample.issuer_public_key,
      }),
    })
  );
  await page.route(`**/.well-known/hc/v1/cards/${sample.profile_id}/objects**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ objects }),
    })
  );
}

async function seedGameSeasonControlSession(
  page: Page,
  sample: typeof GAME_SEASON_ROOT,
  opts: { childObjectRows?: unknown[] } = {}
) {
  await page.addInitScript(
    ({ sampleArg, childObjectsKey, childObjectRows }) => {
      localStorage.setItem(
        "hc_setup_done",
        JSON.stringify({ [sampleArg.profile_id]: true })
      );
      localStorage.setItem(
        "hc_wallet",
        JSON.stringify([
          {
            id: "e2e_game_season_root",
            label: "E2E Game Season",
            ...sampleArg,
          },
        ])
      );
      sessionStorage.setItem("hc_created", JSON.stringify(sampleArg));
      if (childObjectRows?.length) {
        localStorage.setItem(childObjectsKey, JSON.stringify(childObjectRows));
      }
    },
    {
      sampleArg: sample,
      childObjectsKey: CHILD_OBJECTS_KEY,
      childObjectRows: opts.childObjectRows ?? [],
    }
  );
}

async function openGameSeasonLive(page: Page) {
  const url = `/created/?profile_id=${GAME_SEASON_ROOT.profile_id}&qr_id=${GAME_SEASON_ROOT.qr_id}`;
  await page.goto(url);
  await expect(page.locator("#created-control-root")).toBeVisible();
  await expect(page.getByRole("tab", { name: "What opens", selected: true })).toBeVisible();
  await page.getByRole("button", { name: "Add first checkpoint" }).click();
}

async function selectExampleSeason(page: Page) {
  const seasonSelect = page.locator("#child-object-game-node-season");
  await expect(seasonSelect.locator('option[value="example_city_season_01"]')).toHaveCount(1, {
    timeout: 15_000,
  });
  await seasonSelect.selectOption("example_city_season_01");
}

test.describe("city game self-serve setup on /created/", () => {
  test.beforeEach(async ({ page }) => {
    await stubResolver(page);
  });

  test("hides game node cockpit when season root has no issuer key", async ({ page }) => {
    const withoutIssuer = { ...GAME_SEASON_ROOT, issuer_public_key: undefined };
    await seedGameSeasonControlSession(page, withoutIssuer);
    await page.goto(
      `/created/?profile_id=${withoutIssuer.profile_id}&qr_id=${withoutIssuer.qr_id}`
    );
    await expect(page.locator("#child-object-add-game-node")).toBeHidden();
  });

  test("shows setup checklist, rules publish, and bulk import for game season root", async ({
    page,
  }) => {
    await seedGameSeasonControlSession(page, GAME_SEASON_ROOT);
    await openGameSeasonLive(page);

    await expect(page.locator("#child-object-add-game-node")).toBeVisible();
    await expect(page.locator("#child-object-game-node-setup")).toBeVisible();
    await expect(page.locator("#child-object-game-node-setup-terminal-notice")).toContainText(
      "Browser setup replaces terminal mint"
    );
    await expect(page.locator("#child-object-game-node-rules")).toBeVisible();
    await expect(page.locator("#child-object-game-node-bulk")).toBeVisible();
    await expect(page.locator("#child-object-game-node-season")).toBeVisible();
  });

  test("saving When season id selects it for game node registration without reload", async ({
    page,
  }) => {
    await seedGameSeasonControlSession(page, GAME_SEASON_ROOT);
    await openGameSeasonLive(page);

    await page.locator("#child-object-season-when-id").fill("my_city_season_01");
    await page.locator("#child-object-season-when-id").blur();

    const seasonSelect = page.locator("#child-object-game-node-season");
    await expect(seasonSelect.locator('option[value="my_city_season_01"]')).toHaveCount(1);
    await expect(seasonSelect).toHaveValue("my_city_season_01");
  });

  test("loads example season in picker and shows comprehension custody UI", async ({ page }) => {
    await seedGameSeasonControlSession(page, GAME_SEASON_ROOT);
    await openGameSeasonLive(page);

    await selectExampleSeason(page);

    await expect(page.locator("#child-object-game-node-setup-custody")).toContainText(
      "Game-operator key custody"
    );
    await expect(page.locator("#child-object-game-node-setup-runbook")).toContainText(
      "Care pause wins over game copy"
    );
    await expect(page.locator("#child-object-game-node-setup-scorecard")).toContainText("GT-1:");
    await expect(page.locator("#child-object-game-node-setup-links")).toContainText("Rules page");
  });

  test("persists game-operator custody acknowledgements in localStorage", async ({ page }) => {
    await seedGameSeasonControlSession(page, GAME_SEASON_ROOT);
    await openGameSeasonLive(page);

    const firstCheck = page.locator('input[name="game-operator-custody"]').first();
    await firstCheck.evaluate((el) => {
      const input = el as HTMLInputElement;
      input.checked = true;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(firstCheck).toBeChecked();

    await page.reload();
    await expect(page.locator("#child-object-add-game-node")).toBeVisible();
    await expect(page.locator('input[name="game-operator-custody"]').first()).toBeChecked();
  });

  test("game-season backup gate blocks bulk import before recovery seatbelt", async ({ page }) => {
    const networkGameNodes = [
      {
        object_id: "obj_e2eGameNode01",
        object_type: "game_node",
        public_label: "River lantern",
        public_state: "Dormant",
        created_at: "2026-06-01T12:00:00.000Z",
        status: "active",
        qr_id: "qr_e2eGameNode01",
      },
      {
        object_id: "obj_e2eGameNode02",
        object_type: "game_node",
        public_label: "Old town archive",
        public_state: "Dormant",
        created_at: "2026-06-01T12:01:00.000Z",
        status: "active",
        qr_id: "qr_e2eGameNode02",
      },
    ];
    const sampleNoSeatbelt = {
      ...GAME_SEASON_ROOT,
      recovery_key_acknowledged: undefined,
    };
    await stubResolver(page, sampleNoSeatbelt, networkGameNodes);
    await seedGameSeasonControlSession(page, sampleNoSeatbelt);
    await openGameSeasonLive(page);

    await selectExampleSeason(page);
    await page.locator("#child-object-game-node-bulk summary").click();

    await expect(page.locator("#child-object-game-node-bulk-backup-gate")).toContainText(
      /game nodes/i,
      { timeout: 10_000 }
    );
    await expect(page.locator("#child-object-game-node-bulk-submit")).toBeDisabled();
  });

  test("rules publish panel accepts window metadata and enables preview draft", async ({
    page,
  }) => {
    await seedGameSeasonControlSession(page, GAME_SEASON_ROOT);
    await openGameSeasonLive(page);

    await selectExampleSeason(page);

    await page.locator("#child-object-game-node-rules summary").click();
    await page.locator("#child-object-game-node-rules-starts").fill("2026-07-04T10:00");
    await page.locator("#child-object-game-node-rules-ends").fill("2026-07-06T22:00");
    await page.locator("#child-object-game-node-rules-season-status").selectOption("active");
    await page.locator("#child-object-game-node-rules-districts").fill("downtown\nriver\nold_town");
    await page.locator("#child-object-game-node-rules-ends").blur();

    await expect(page.locator("#child-object-game-node-rules-preview-draft")).toBeEnabled({
      timeout: 10_000,
    });
  });
});

test.describe("city game season root setup wizard custody notice", () => {
  test.beforeEach(async ({ page }) => {
    await stubResolver(page);
  });

  test("fresh setup protect step shows Two keys, two jobs card", async ({ page }) => {
    await page.addInitScript((sample) => {
      localStorage.removeItem("hc_setup_done");
      localStorage.setItem(
        "hc_wallet",
        JSON.stringify([
          {
            id: "e2e_game_season_setup",
            label: "E2E Game Season Setup",
            ...sample,
          },
        ])
      );
      sessionStorage.setItem("hc_created", JSON.stringify(sample));
    }, GAME_SEASON_ROOT);

    await page.goto(
      `/created/?profile_id=${GAME_SEASON_ROOT.profile_id}&qr_id=${GAME_SEASON_ROOT.qr_id}&fresh=1#setup-protect`
    );

    await expect(page.locator("#created-setup-root")).toBeVisible();
    await expect(page.locator("#created-setup-game-season-protect")).toBeVisible();
    await expect(page.locator("#created-setup-game-season-protect")).toContainText(
      "Two keys, two jobs"
    );
    await expect(page.locator("#created-setup-game-season-protect")).toContainText("/game-operator/");
  });
});
