import { test, expect, type Page } from "@playwright/test";

/**
 * Create flow convergence (ROOT_CARD step 14) + Phase 1 topology convergence.
 * @see docs/ROOT_CARD_AND_CHILD_OBJECTS.md § Implementation sequence step 14
 */

const GENERAL_ROOT = {
  id: "e2e_conv_root",
  label: "River studio",
  saved_at: "2026-05-29T12:00:00.000Z",
  profile_id: "profE2eConvRoot01",
  qr_id: "qr_e2e_conv_root_01",
  handle: "river_studio",
  manifesto_line: "General root for convergence",
  pilot_template: "general",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  scan_url: "http://127.0.0.1:8788/c/profE2eConvRoot01?q=qr_e2e_conv_root_01",
  status: "active",
};

async function stubCreateShellHealth(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: "ok" }),
    })
  );
}

async function seedGeneralRootWallet(page: Page) {
  await page.addInitScript((entry) => {
    localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    localStorage.setItem("hc_keys_custody_notice_dismissed", "1");
  }, GENERAL_ROOT);
}

const EXISTING_SIGN_CHILD = {
  object_id: "obj_e2e_existing_sign",
  object_type: "status_plate",
  public_label: "Front door",
  public_state: "Open",
  qr_id: "qr_existing_sign",
  status: "active",
  created_at: "2026-06-05T12:00:00.000Z",
};

const EXISTING_TAG_CHILD = {
  object_id: "obj_e2e_existing_tag",
  object_type: "lost_item_relay",
  public_label: "House keys",
  public_state: "Lost",
  qr_id: "qr_existing_tag",
  status: "active",
  created_at: "2026-06-05T12:00:00.000Z",
};

async function seedGeneralRootControlReady(
  page: Page,
  childRows: Record<string, unknown>[] = []
) {
  await page.addInitScript(
    ({ entry, children }) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      localStorage.setItem("hc_keys_custody_notice_dismissed", "1");
      localStorage.setItem("hc_setup_done", JSON.stringify({ [entry.profile_id]: true }));
      if (children.length) {
        localStorage.setItem(`hc_child_objects_v1:${entry.profile_id}`, JSON.stringify(children));
      }
      sessionStorage.setItem(
        "hc_created",
        JSON.stringify({
          profile_id: entry.profile_id,
          qr_id: entry.qr_id,
          handle: entry.handle,
          owner_public_key_b58: entry.owner_public_key_b58,
          owner_private_key_b58: entry.owner_private_key_b58,
          pilot_template: "general",
        })
      );
    },
    { entry: GENERAL_ROOT, children: childRows }
  );
}

async function stubCreatedCardFetch(page: Page) {
  await page.route("**/.well-known/hc/v1/cards/**", (route) => {
    if (route.request().method() !== "GET") {
      return route.fallback();
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        profile_id: GENERAL_ROOT.profile_id,
        handle: GENERAL_ROOT.handle,
        status: "active",
        qr: { active_qr_id: GENERAL_ROOT.qr_id },
        objects: [],
      }),
    });
  });
}

test.describe("create entry chooser (step 11)", () => {
  test.beforeEach(async ({ page }) => {
    await stubCreateShellHealth(page);
  });

  test("bare /create/ shows steward chooser before the form (no play door)", async ({ page }) => {
    await page.goto("/create/");

    await expect(page.locator("#create-entry-chooser")).toBeVisible();
    await expect(page.locator("#create-form-panel")).toBeHidden();
    await expect(page.getByRole("button", { name: /^Your @handle/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Live status on something/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Live status on you/ })).toBeVisible();
    await expect(page.getByText("Play the city game")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Cedar Rapids city board/i })).toBeVisible();
  });

  test("organize a live season link opens season account fork", async ({ page }) => {
    await page.goto("/create/");

    await page.getByRole("link", { name: /Organize a live season/i }).click();

    await expect(page).toHaveURL(/intent=game/);
    await expect(page.locator("#create-game-season-fork")).toBeVisible();
    await expect(page.locator("#create-game-season-wizard")).toBeHidden();
    await expect(page.locator("#create-hero-title")).toHaveText("Organize a live season");
  });

  test("season fork dedicated path hides season id — names season on Live", async ({ page }) => {
    await page.goto("/create/?intent=game&season_account=dedicated");

    await expect(page.locator("#create-game-season-fork")).toBeHidden();
    await expect(page.locator("#create-game-season-wizard")).toBeVisible();
    await expect(page.locator("#game-season-id-block")).toHaveCount(0);
    await expect(page.locator("#game-season-redirect-hint")).toBeVisible();
    await expect(page.locator("#enable-organizer-revoke")).toBeChecked();
    await expect(page.locator("#submit")).toHaveText(/season @handle/i);
  });

  test("season fork existing path shows entry gate when deploy root exists", async ({ page }) => {
    await seedGeneralRootWallet(page);
    await page.goto("/create/?intent=game&season_account=existing");

    await expect(page.locator("#create-entry-gate")).toBeVisible();
    await expect(page.locator("#game-season-id-block")).toHaveCount(0);
    await expect(page.locator("#create-form-main-fields")).toBeHidden();
    await expect(page.locator("#submit")).toBeHidden();
  });

  test("wear BYOP link opens track chooser before form", async ({ page }) => {
    await page.goto("/create/?intent=wear");

    await expect(page.locator("#create-form-panel")).toBeVisible();
    await expect(page).toHaveURL(/intent=wear/);
    await expect(page.locator("#create-wear-track-chooser")).toBeVisible();
    await expect(page.locator("#create-wear-wizard")).toBeHidden();
    await expect(page.locator("#create-hero-title")).toHaveText("Print your own QR wear");

    await page.getByRole("button", { name: /Print your own \(BYOP\)/i }).click();
    await expect(page.locator("#create-wear-wizard")).toBeVisible();
  });

  test("general account door opens form with intent=general", async ({ page }) => {
    await page.goto("/create/");

    await page.locator('[data-create-door="account"]').click();

    await expect(page.locator("#create-form-panel")).toBeVisible();
    await expect(page.locator("#create-entry-chooser")).toBeHidden();
    await expect(page).toHaveURL(/intent=general/);
    await expect(page.locator("#create-hero-title")).toHaveText("Pick your @handle");
    await expect(page.locator("#manifesto")).toBeVisible();
    await expect(page.locator("#submit")).toHaveText("Create and get QR");
  });

  test("deploy door opens form with intent=deploy", async ({ page }) => {
    await page.goto("/create/");

    await page.locator('[data-create-door="something"]').click();

    await expect(page.locator("#create-form-panel")).toBeVisible();
    await expect(page.locator("#create-entry-chooser")).toBeHidden();
    await expect(page).toHaveURL(/intent=deploy/);
    await expect(page.locator("#create-hero-title")).toHaveText("Make a QR sign");
    await expect(page.locator("#create-hero-lead")).not.toContainText("legacy pilots");
    await expect(page.locator("#create-deploy-wizard")).toBeVisible();
    await expect(page.locator("#create-game-season-wizard")).toBeHidden();
  });

  test("deploy room shows entry gate when general root exists", async ({ page }) => {
    await seedGeneralRootWallet(page);
    await page.goto("/create/?intent=deploy");

    await expect(page.locator("#create-entry-gate")).toBeVisible();
    await expect(page.locator("#create-entry-gate-primary")).toContainText("@river_studio");
    await expect(page.locator("#create-form-main-fields")).toBeHidden();
    await expect(page.locator("#submit")).toBeHidden();
  });
});

test.describe("topology convergence — field-kit deep links", () => {
  test.beforeEach(async ({ page }) => {
    await stubCreateShellHealth(page);
  });

  test("template=status_plate opens deploy wizard (tree path), not flat pilot UI", async ({
    page,
  }) => {
    await page.goto("/create/?template=status_plate");

    await expect(page.locator("#create-deploy-wizard")).toBeVisible();
    await expect(page.locator("#create-flat-pilot-compat")).toHaveCount(0);
    await expect(page.locator("#create-add-object-nudge")).toHaveCount(0);
    await expect(page.locator("#create-template-advanced")).toHaveCount(0);
  });

  test("template=lost_item opens deploy wizard for return tag", async ({ page }) => {
    await page.goto("/create/?template=lost_item");

    await expect(page.locator("#create-deploy-wizard")).toBeVisible();
    await expect(page.locator("#deploy-object-label-title")).toHaveText("What is this tag on?");
  });

  test("template deep link with saved root shows entry gate", async ({ page }) => {
    await seedGeneralRootWallet(page);
    await page.goto("/create/?template=status_plate");

    await expect(page.locator("#create-entry-gate")).toBeVisible();
    await expect(page.locator("#create-form-main-fields")).toBeHidden();
  });
});

test.describe("redirect_live add-object hash focus", () => {
  test.beforeEach(async ({ page }) => {
    await stubCreateShellHealth(page);
    await stubCreatedCardFetch(page);
  });

  test("#add-status-plate opens add hub with sign form", async ({ page }) => {
    await seedGeneralRootControlReady(page, [EXISTING_SIGN_CHILD]);
    await page.goto(
      `/created/?profile_id=${GENERAL_ROOT.profile_id}&qr_id=${GENERAL_ROOT.qr_id}#add-status-plate`
    );

    await expect(page.locator("#created-control-root")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#child-object-add-hub")).toBeVisible();
    await expect(page.locator("#child-object-add-hub")).toHaveAttribute("open", "");
    await expect(page.locator("#child-object-add-status-plate")).toBeVisible();
    await expect(page.locator("#child-object-status-plate-form")).toBeVisible();
    await expect(page.locator("#child-object-add-status-plate-title")).toHaveText(
      "Add another sign"
    );
  });

  test("#add-lost-item opens add hub with tag form", async ({ page }) => {
    await seedGeneralRootControlReady(page, [EXISTING_TAG_CHILD]);
    await page.goto(
      `/created/?profile_id=${GENERAL_ROOT.profile_id}&qr_id=${GENERAL_ROOT.qr_id}#add-lost-item`
    );

    await expect(page.locator("#created-control-root")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#child-object-add-hub")).toBeVisible();
    await expect(page.locator("#child-object-add-hub")).toHaveAttribute("open", "");
    await expect(page.locator("#child-object-add-lost-item")).toBeVisible();
    await expect(page.locator("#child-object-lost-item-form")).toBeVisible();
    await expect(page.locator("#child-object-add-lost-item-title")).toHaveText(
      "Add another lost-item tag"
    );
  });
});
