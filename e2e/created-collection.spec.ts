import { test, expect } from "@playwright/test";

const SAMPLE = {
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  qr_id: "qr_E2eCollectionTest1",
  handle: "e2ecollection",
  manifesto_line: "Studio account",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_E2eCollectionTest1",
  owner_public_key_b58: "AXBxsNjTx7KQXM5DJPFgKEFYZD6vt6TNDueNKrwyfPeT",
  owner_private_key_b58: "5r8oDw5WCtRqxB4FY9bxxZ1qwJBwbdvYtoiq4jNmvoRn",
};

const CHILD_ROWS = [
  {
    object_id: "obj_e2e_plate_a",
    object_type: "status_plate",
    public_label: "Front door",
    public_state: "Open",
    status: "active",
    created_at: "2026-06-01T12:00:00.000Z",
    scan_url: "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_child_a",
  },
  {
    object_id: "obj_e2e_plate_b",
    object_type: "status_plate",
    public_label: "Side door",
    public_state: "Closed",
    status: "active",
    created_at: "2026-06-02T12:00:00.000Z",
    scan_url: "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_child_b",
  },
];

const SINGLE_CHILD = [CHILD_ROWS[1]!];

async function enableCollectionFlag(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem("hc_created_collection", "1");
  });
}

async function dismissHubIntroIfPresent(page: import("@playwright/test").Page) {
  const dismiss = page.locator("#device-hub-intro-dismiss");
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
  }
}

function cardStatusRoute() {
  return {
    version: "1.0",
    resolver: { operator: "humanity.llc", version: "1.0" },
    scan: {
      kind: "active",
      profile_id: SAMPLE.profile_id,
      qr_id: SAMPLE.qr_id,
      card: {
        status: "active",
        handle: SAMPLE.handle,
        manifesto_line: SAMPLE.manifesto_line,
      },
      verification: { state: "registered", label: "Registered" },
      human_trust: { label: "Registered", subtitle: "", pill_active: false },
    },
  };
}

async function stubResolver(page: import("@playwright/test").Page) {
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
      body: JSON.stringify(cardStatusRoute()),
    })
  );
  await page.route(`**/.well-known/hc/v1/cards/${SAMPLE.profile_id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        handle: SAMPLE.handle,
        manifesto_line: SAMPLE.manifesto_line,
        created_at: "2026-05-25T12:00:00.000Z",
        status: "active",
      }),
    })
  );
}

async function installControlSession(
  page: import("@playwright/test").Page,
  childRows: typeof CHILD_ROWS = CHILD_ROWS,
  withSigningKeys = true
) {
  await page.addInitScript(({ sample, childRows: rows, withSigningKeys: includeKeys }) => {
    localStorage.setItem(
      "hc_setup_done",
      JSON.stringify({ [sample.profile_id]: true })
    );
    localStorage.setItem(
      `hc_created_control_visited:${sample.profile_id}`,
      "1"
    );
    const walletEntry = {
      id: "e2e_created_collection",
      label: "E2E Collection",
      profile_id: sample.profile_id,
      qr_id: sample.qr_id,
      handle: sample.handle,
      manifesto_line: sample.manifesto_line,
      pilot_template: "general",
      scan_url: sample.scan_url,
      saved_at: "2026-06-01T12:00:00.000Z",
      ...(includeKeys
        ? {
            owner_public_key_b58: sample.owner_public_key_b58,
            owner_private_key_b58: sample.owner_private_key_b58,
          }
        : {}),
    };
    localStorage.setItem("hc_wallet", JSON.stringify([walletEntry]));
    localStorage.setItem(
      `hc_child_objects_v1:${sample.profile_id}`,
      JSON.stringify(rows)
    );
    sessionStorage.setItem(
      "hc_created",
      JSON.stringify({
        profile_id: sample.profile_id,
        qr_id: sample.qr_id,
        handle: sample.handle,
        manifesto_line: sample.manifesto_line,
        pilot_template: "general",
        scan_url: sample.scan_url,
        ...(includeKeys
          ? {
              owner_public_key_b58: sample.owner_public_key_b58,
              owner_private_key_b58: sample.owner_private_key_b58,
            }
          : {}),
      })
    );
  }, { sample: SAMPLE, childRows, withSigningKeys });
}

async function gotoCreated(
  page: import("@playwright/test").Page,
  query = "",
  childRows: typeof CHILD_ROWS = CHILD_ROWS,
  withSigningKeys = true,
  hash = ""
) {
  await installControlSession(page, childRows, withSigningKeys);
  await stubResolver(page);
  const url = `/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}${query}`;
  const hashSuffix = hash ? `#${hash.replace(/^#/, "")}` : "";
  await page.goto(`${url}${hashSuffix}`);
  await expect(page.locator("#created-control-root")).toBeVisible({ timeout: 15_000 });
  if (!withSigningKeys) {
    await expect(page.getByRole("heading", { name: "View this card" })).toBeVisible({
      timeout: 15_000,
    });
  }
}

test.describe("/created/ collection shelf", () => {
  test.beforeEach(async ({ page }) => {
    await installControlSession(page);
    await stubResolver(page);
  });

  test("flag off keeps legacy live cockpit visible", async ({ page }) => {
    const url = `/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}`;
    await page.goto(url);

    await expect(page.locator("#created-control-root")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#created-collection-root")).toBeHidden();
    await expect(page.locator(".created-live-cockpit")).toBeVisible();
    await expect(page.locator("#created-live-object-card")).toBeVisible();
  });

  test("flag on with 2+ children shows collection shelf", async ({ page }) => {
    await enableCollectionFlag(page);
    await gotoCreated(page);
    await expect(page.locator("body")).toHaveAttribute("data-created-collection", "1");
    await expect(page.locator("#created-collection-root")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#created-account-strip-heading")).toHaveText(
      "Managing @e2ecollection"
    );
    await expect(page.locator("#created-collection-list .created-collection-row")).toHaveCount(2);
    await expect(page.locator(".created-live-cockpit")).toBeHidden();
    await expect(page.locator("#created-room-switcher-wrap")).toBeVisible();
  });

  test("row tap opens focused object front", async ({ page }) => {
    await enableCollectionFlag(page);
    await gotoCreated(page);

    await expect(page.locator("#created-collection-root")).toBeVisible({ timeout: 15_000 });
    await page.locator('.created-collection-row[data-object-id="obj_e2e_plate_b"]').click();
    await page.waitForURL(/object_id=obj_e2e_plate_b/);

    expect(new URL(page.url()).searchParams.get("object_id")).toBe("obj_e2e_plate_b");
    await expect(page.locator("#created-collection-root")).toBeHidden();
    await expect(page.locator("#created-focused-object-root")).toBeVisible();
    await expect(page.locator("#created-focused-object-title")).toHaveText("Side door");
    await expect(page.locator(".created-live-cockpit")).toBeHidden();
  });

  test("flag on with 1 child lands on focused object", async ({ page }) => {
    await enableCollectionFlag(page);
    await gotoCreated(page, "", SINGLE_CHILD);

    await expect(page.locator("#created-focused-object-root")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#created-focused-object-title")).toHaveText("Side door");
    await expect(page.locator("#created-collection-root")).toBeHidden();
    await expect(page.locator(".created-live-cockpit")).toBeHidden();
  });

  test("publish status_plate update succeeds", async ({ page }) => {
    await enableCollectionFlag(page);
    await page.route(
      `**/.well-known/hc/v1/cards/${SAMPLE.profile_id}/objects/obj_e2e_plate_b/update**`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        })
    );
    await gotoCreated(page, "&object_id=obj_e2e_plate_b", SINGLE_CHILD);

    await expect(page.locator("#created-focused-object-root")).toBeVisible({ timeout: 15_000 });
    await page.locator("#created-focused-field-public_state").fill("Open until 6 PM");
    await page.locator("#created-focused-object-publish").click();
    await expect(page.locator("#created-focused-object-publish-status")).toContainText(
      "Updated on the network."
    );
  });

  test("open scan link and copy scan link are available", async ({ page, context }) => {
    await enableCollectionFlag(page);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await gotoCreated(page, "&object_id=obj_e2e_plate_b", SINGLE_CHILD);

    const openScan = page.locator("#created-focused-object-open-scan");
    await expect(openScan).toBeVisible();
    await expect(openScan).toHaveAttribute("href", /.+/);

    await page.locator("#created-focused-object-copy-scan").click();
    await expect(page.locator("#created-focused-object-publish-status")).toContainText(
      "Scan link copied."
    );
  });

  test("view-only disables publish on focused object", async ({ page }) => {
    await enableCollectionFlag(page);
    await gotoCreated(page, "&object_id=obj_e2e_plate_b", SINGLE_CHILD, false);

    await expect(page.locator("#created-focused-object-root")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#created-focused-object-publish")).toBeHidden();
    await expect(page.locator("#created-focused-object-form")).toBeHidden();
    await expect(page.locator("#created-focused-field-public_state")).toBeDisabled();
  });

  test("invalid object_id shows stale collection state", async ({ page }) => {
    await enableCollectionFlag(page);
    await gotoCreated(page, "&object_id=obj_missing", SINGLE_CHILD);

    await expect(page.locator("#created-collection-root")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#created-collection-stale-banner")).toBeVisible();
    await expect(page.locator("#created-collection-stale-banner")).toContainText(
      "Scan point not found"
    );
    await expect(page.locator("#created-focused-object-root")).toBeHidden();
    await expect(page.locator("#created-focused-object-form")).toBeHidden();
  });

  test("Manage tab still works when collection flag is on", async ({ page }) => {
    await enableCollectionFlag(page);
    await gotoCreated(page);
    await dismissHubIntroIfPresent(page);
    await page.getByRole("tab", { name: "Settings" }).click();
    await expect(page.locator("#created-tab-advanced")).toBeVisible();
    await expect(page.locator("#created-tab-advanced #created-deploy-print")).toBeVisible();
  });
});

test.describe("/created/ hub handoff + update-status redirect", () => {
  test.beforeEach(async ({ page }) => {
    await stubResolver(page);
  });

  test("hub child manage lands with object_id when collection flag is on", async ({ page }) => {
    await enableCollectionFlag(page);
    await installControlSession(page);
    await page.goto("/wallet/");
    await dismissHubIntroIfPresent(page);
    await page
      .locator('.hub-child-manage[data-child-object-id="obj_e2e_plate_b"]')
      .click();
    await expect(page).toHaveURL(/object_id=obj_e2e_plate_b/);
    await expect(page.locator("#created-focused-object-root")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#created-focused-object-title")).toHaveText("Side door");
  });

  test("#update-status with object_id opens focused object", async ({ page }) => {
    await enableCollectionFlag(page);
    await gotoCreated(page, "&object_id=obj_e2e_plate_b", SINGLE_CHILD, true, "update-status");
    await expect(page.locator("#created-focused-object-root")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#manifesto-update-form")).toBeHidden();
  });

  test("#update-status without object_id on 1 child opens focused object", async ({ page }) => {
    await enableCollectionFlag(page);
    await gotoCreated(page, "", SINGLE_CHILD, true, "update-status");
    await expect(page).toHaveURL(/object_id=obj_e2e_plate_b/);
    await expect(page.locator("#created-focused-object-root")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("#update-status without object_id on 2+ children opens collection", async ({ page }) => {
    await enableCollectionFlag(page);
    await gotoCreated(page, "", CHILD_ROWS, true, "update-status");
    await expect(page.locator("#created-collection-root")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#created-focused-object-root")).toBeHidden();
    await expect(page.locator("#manifesto-update-form")).toBeHidden();
  });

  test("flag off #update-status keeps legacy scanners-see form", async ({ page }) => {
    await installControlSession(page);
    await page.goto(
      `/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}#update-status`
    );
    await expect(page.locator("#created-control-root")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#created-live-scanners-see")).toBeVisible();
    await expect(page.locator("#manifesto-update-form")).toBeVisible();
  });

  test("flag off child-object hash keeps legacy route without object_id param", async ({
    page,
  }) => {
    await installControlSession(page, SINGLE_CHILD);
    await page.goto(
      `/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}#child-object-obj_e2e_plate_b`
    );
    await expect(page.locator("#created-control-root")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#created-focused-object-root")).toBeHidden();
    expect(new URL(page.url()).searchParams.get("object_id")).toBeNull();
    expect(new URL(page.url()).hash).toBe("#child-object-obj_e2e_plate_b");
    await expect(page.locator(".created-live-cockpit")).toBeVisible();
  });
});
