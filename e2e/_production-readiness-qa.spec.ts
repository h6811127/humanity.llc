/**
 * Production readiness QA — stubbed cards API against local pages by default.
 * Set PLAYWRIGHT_BASE_URL=https://humanity.llc and PLAYWRIGHT_SKIP_WEBSERVER=1 for prod smoke.
 */
import { test, expect, type Page } from "@playwright/test";

/** Align with playwright.config.ts — do not default to production. */
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8788";
const CHILD_QR = "qr_prod_qa_child";
const CHILD_OBJECT = "obj_prod_qa_child";

const GENERAL_ROOT = {
  id: "qa_prod_root",
  label: "River studio",
  saved_at: "2026-06-05T12:00:00.000Z",
  profile_id: "profProdQaRoot01",
  qr_id: "qr_prod_qa_root_01",
  handle: "river_studio",
  manifesto_line: "General root for QA",
  pilot_template: "general",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  scan_url: `${BASE}/c/profProdQaRoot01?q=qr_prod_qa_root_01`,
  status: "active",
};

async function stubHealth(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: "ok" }),
    })
  );
}

async function stubCreateResolver(page: Page, objectType = "status_plate") {
  let created: { profileId: string; qrId: string; handle: string } | null = null;
  await page.route(
    (url) => url.href.includes("/.well-known/hc/v1/cards"),
    async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (method === "POST" && /\/cards\/?(\?|$)/.test(url)) {
        const body = route.request().postDataJSON() as {
          card?: { profile_id?: string; handle?: string };
          qr_credential?: { qr_id?: string };
        };
        created = {
          profileId: body?.card?.profile_id ?? "",
          qrId: body?.qr_credential?.qr_id ?? "",
          handle: body?.card?.handle ?? "",
        };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            profile_id: created.profileId,
            qr_id: created.qrId,
            scan_url: `${BASE}/c/${created.profileId}?q=${created.qrId}`,
          }),
        });
        return;
      }
      if (method === "POST" && /\/objects\/[^/]+\/issue-qr/.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            qr_id: CHILD_QR,
            scan_url: `${BASE}/c/e2e_profile?q=${CHILD_QR}`,
          }),
        });
        return;
      }
      if (method === "POST" && /\/objects\/?(\?|$)/.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            object_id: CHILD_OBJECT,
            object_type: objectType,
            public_label: "QA label",
            public_state: "QA state",
          }),
        });
        return;
      }
      if (method === "GET") {
        const profileMatch = url.match(/\/cards\/([^/?]+)/);
        if (!profileMatch) {
          await route.fulfill({ status: 404, body: "NOT_FOUND" });
          return;
        }
        const profileId = decodeURIComponent(profileMatch[1]);
        const statusUrl = new URL(url);
        const qrId =
          statusUrl.searchParams.get("q")?.trim() ||
          statusUrl.searchParams.get("qr_id")?.trim() ||
          created?.qrId ||
          "qr_stub";
        if (url.includes("/status")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              scan: {
                kind: "active",
                profile_id: profileId,
                qr_id: qrId,
                card: { status: "active", handle: created?.handle ?? "e2e" },
              },
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            profile_id: profileId,
            handle: created?.handle ?? "e2e",
            status: "active",
            qr: { active_qr_id: qrId },
            objects: [
              {
                object_id: CHILD_OBJECT,
                object_type: objectType,
                public_label: "QA label",
                public_state: "QA state",
                qr_id: CHILD_QR,
                scan_url: `${BASE}/c/${profileId}?q=${CHILD_QR}`,
                status: "active",
              },
            ],
          }),
        });
        return;
      }
      await route.fulfill({ status: 405, body: "METHOD_NOT_ALLOWED" });
    }
  );
}

async function bootClean(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("__prod_qa_boot")) return;
    sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem("__prod_qa_boot", "1");
  });
}

async function dismissOverlays(page: Page) {
  for (const name of ["Got it", "Not now"]) {
    const btn = page.getByRole("button", { name });
    if (await btn.isVisible().catch(() => false)) await btn.click();
  }
}

async function focusCreatedAddObjectHash(page: Page, hash: string) {
  await page.evaluate((focusHash) => {
    const focus = focusHash.replace(/^#/, "");
    if (location.hash.replace(/^#/, "") !== focus) {
      location.hash = focus;
    }
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, hash);
}

async function stubExistingRootCardFetch(
  page: Page,
  profileId: string,
  handle: string,
  qrId: string,
  objects: Record<string, unknown>[] = []
) {
  await page.route(`**/.well-known/hc/v1/cards/${profileId}**`, (route) => {
    if (route.request().method() !== "GET") {
      return route.fallback();
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        profile_id: profileId,
        handle,
        status: "active",
        qr: { active_qr_id: qrId },
        objects,
      }),
    });
  });
}

async function completeSetupWizard(page: Page) {
  await expect(page.locator("#created-setup-root")).toBeVisible({ timeout: 20_000 });
  await dismissOverlays(page);
  const saveBtn = page.locator('[data-setup-action="save"]');
  if (await saveBtn.isVisible().catch(() => false)) {
    await saveBtn.click();
    await page.waitForTimeout(500);
  }
  for (let i = 0; i < 5; i += 1) {
    if (await page.locator("#created-setup-panel-protect").isVisible().catch(() => false)) break;
    if (await page.locator("#created-setup-panel-done").isVisible().catch(() => false)) break;
    await page.locator("#created-setup-continue").click();
    await dismissOverlays(page);
  }
  const recoveryConfirm = page.locator("#created-setup-recovery-reveal-confirm");
  if (await recoveryConfirm.isVisible().catch(() => false)) {
    await recoveryConfirm.check();
    await page.locator("#created-setup-recovery-reveal-dismiss").click();
  }
  if (await page.locator("#created-setup-continue").isVisible().catch(() => false)) {
    await page.locator("#created-setup-continue").click();
  }
  if (await page.locator("#created-setup-finish").isVisible().catch(() => false)) {
    await page.locator("#created-setup-finish").click();
  }
  await expect(page.locator("#created-control-root")).toBeVisible({ timeout: 20_000 });
}

test.describe("Production readiness QA", () => {
  test("1. New sign deploy", async ({ page }) => {
    await bootClean(page);
    await stubHealth(page);
    await stubCreateResolver(page, "status_plate");

    await page.goto(`${BASE}/create/?intent=deploy`);
    await dismissOverlays(page);
    await page.locator("#handle").fill(`qa_sign_${Date.now().toString(36).slice(-6)}`);
    await page.locator("#deploy-object-label").fill("Studio door");
    await page.locator("#deploy-scanner-line").fill("Open until 9 PM");
    await page.locator("#submit").click();

    await page.waitForURL(/\/created\/.*fresh=1/, { timeout: 25_000 });
    await expect(page.getByRole("heading", { name: "Your sign is ready." })).toBeVisible({
      timeout: 15_000,
    });
    expect(new URL(page.url()).searchParams.get("qr_id")).toBe(CHILD_QR);

    const profileId = new URL(page.url()).searchParams.get("profile_id")!;
    const controlUrl = await page.evaluate(
      ({ profile, child }) => {
        const setup = JSON.parse(localStorage.getItem("hc_setup_done") || "{}");
        setup[profile] = true;
        localStorage.setItem("hc_setup_done", JSON.stringify(setup));
        const sessionRaw = sessionStorage.getItem("hc_created");
        if (sessionRaw) {
          const session = JSON.parse(sessionRaw);
          localStorage.setItem(
            "hc_wallet",
            JSON.stringify([
              {
                id: "wallet_qa",
                label: `@${session.handle}`,
                saved_at: new Date().toISOString(),
                profile_id: session.profile_id,
                qr_id: session.qr_id,
                handle: session.handle,
                manifesto_line: "Root",
                pilot_template: "general",
                owner_public_key_b58: session.owner_public_key_b58,
                owner_private_key_b58: session.owner_private_key_b58,
                scan_url: `${location.origin}/c/${session.profile_id}?q=${session.qr_id}`,
                status: "active",
              },
            ])
          );
        }
        localStorage.setItem(`hc_child_objects_v1:${profile}`, JSON.stringify([child]));
        localStorage.setItem("hc_keys_custody_notice_dismissed", "1");
        const u = new URL(location.href);
        u.searchParams.delete("fresh");
        return u.pathname + u.search + u.hash;
      },
      {
        profile: profileId,
        child: {
          object_id: CHILD_OBJECT,
          object_type: "status_plate",
          public_label: "Studio door",
          public_state: "Open until 9 PM",
          qr_id: CHILD_QR,
          scan_url: `${BASE}/c/${profileId}?q=${CHILD_QR}`,
          status: "active",
          created_at: new Date().toISOString(),
        },
      }
    );
    await page.goto(`${BASE}${controlUrl}`);

    await dismissOverlays(page);
    await expect(page.locator("#created-control-root")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(`[data-object-id="${CHILD_OBJECT}"]`).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator("#child-object-status-plate-form")).toBeHidden();
    await expect(page.locator("#child-object-add-status-plate-title")).toBeHidden();
  });

  test("2. New lost-item deploy", async ({ page }) => {
    await bootClean(page);
    await stubHealth(page);
    await stubCreateResolver(page, "lost_item_relay");

    await page.goto(`${BASE}/create/?template=lost_item`);
    await dismissOverlays(page);
    await page.locator("#handle").fill(`qa_tag_${Date.now().toString(36).slice(-6)}`);
    await page.locator("#deploy-object-label").fill("House keys");
    await page.locator("#deploy-scanner-line").fill("Lost — contact owner");
    await page.locator("#submit").click();

    await page.waitForURL(/\/created\/.*fresh=1/, { timeout: 25_000 });
    await expect(page.getByRole("heading", { name: "Your tag is ready." })).toBeVisible({
      timeout: 15_000,
    });

    const profileId = new URL(page.url()).searchParams.get("profile_id")!;
    const controlUrl = await page.evaluate(
      ({ profile, child }) => {
        const setup = JSON.parse(localStorage.getItem("hc_setup_done") || "{}");
        setup[profile] = true;
        localStorage.setItem("hc_setup_done", JSON.stringify(setup));
        localStorage.setItem(`hc_child_objects_v1:${profile}`, JSON.stringify([child]));
        localStorage.setItem("hc_keys_custody_notice_dismissed", "1");
        const u = new URL(location.href);
        u.searchParams.delete("fresh");
        return u.pathname + u.search + u.hash;
      },
      {
        profile: profileId,
        child: {
          object_id: CHILD_OBJECT,
          object_type: "lost_item_relay",
          public_label: "House keys",
          public_state: "Lost — contact owner",
          qr_id: CHILD_QR,
          scan_url: `${BASE}/c/${profileId}?q=${CHILD_QR}`,
          status: "active",
          created_at: new Date().toISOString(),
        },
      }
    );
    await page.goto(`${BASE}${controlUrl}`);
    await dismissOverlays(page);
    await expect(page.locator("#created-control-root")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(`[data-object-id="${CHILD_OBJECT}"]`).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator("#child-object-lost-item-form")).toBeHidden();
  });

  test("3. Existing account redirect", async ({ page }) => {
    const existingChild = {
      object_id: "obj_existing_01",
      object_type: "status_plate",
      public_label: "Front door",
      public_state: "Open",
      qr_id: "qr_existing_01",
      status: "active",
      created_at: "2026-06-05T12:00:00.000Z",
    };
    await page.addInitScript(
      ({ entry, child, bucketKey }) => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem("hc_wallet", JSON.stringify([entry]));
        localStorage.setItem("hc_keys_custody_notice_dismissed", "1");
        localStorage.setItem("hc_setup_done", JSON.stringify({ [entry.profile_id]: true }));
        localStorage.setItem(bucketKey, JSON.stringify([child]));
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
      {
        entry: GENERAL_ROOT,
        child: existingChild,
        bucketKey: `hc_child_objects_v1:${GENERAL_ROOT.profile_id}`,
      }
    );
    await stubHealth(page);
    await stubCreateResolver(page);
    await stubExistingRootCardFetch(
      page,
      GENERAL_ROOT.profile_id,
      GENERAL_ROOT.handle,
      GENERAL_ROOT.qr_id,
      [existingChild]
    );

    await page.goto(`${BASE}/create/?intent=deploy`);
    await dismissOverlays(page);
    await expect(page.locator("#submit")).toHaveText(/Open @river_studio to add sign/);
    await page.locator("#deploy-object-label").fill("Another door");
    await page.locator("#deploy-scanner-line").fill("Closed");
    await page.locator("#handle").fill("unused_redirect");
    await page.locator("#submit").click();

    await page.waitForURL(/\/created\/.*profile_id=profProdQaRoot01/, { timeout: 25_000 });
    expect(new URL(page.url()).hash).toBe("#add-status-plate");
    await dismissOverlays(page);
    await expect(page.locator("#created-control-root")).toBeVisible({ timeout: 15_000 });
    await focusCreatedAddObjectHash(page, "#add-status-plate");
    await expect(page.locator("#child-object-add-status-plate")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#child-object-add-status-plate-title")).toHaveText("Add another sign");
    await expect(page.locator("#child-object-status-plate-form")).toBeVisible();
  });

  test("4a. Regression — general", async ({ page }) => {
    await bootClean(page);
    await stubHealth(page);
    await stubCreateResolver(page);
    await page.goto(`${BASE}/create/?intent=general`);
    await dismissOverlays(page);
    await page.locator("#handle").fill(`qa_gen_${Date.now().toString(36).slice(-6)}`);
    await page.locator("#manifesto").fill("One public line");
    await page.locator("#submit").click();
    await page.waitForURL(/\/created\/.*fresh=1/, { timeout: 25_000 });
    await expect(page.getByRole("heading", { name: "Your QR is ready." })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("4b. Regression — wear", async ({ page }) => {
    await bootClean(page);
    await stubHealth(page);
    await stubCreateResolver(page);
    await page.goto(`${BASE}/create/?intent=wear&wear_track=byop`);
    await dismissOverlays(page);
    await page.locator("#handle").fill(`qa_wear_${Date.now().toString(36).slice(-6)}`);
    await page.locator("#manifesto").fill("Live on what I wear");
    await page.locator("#submit").click();
    await page.waitForURL(/\/created\/.*fresh=1/, { timeout: 25_000 });
    await expect(page.getByRole("heading", { name: "Your wearable QR is ready." })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("4c. Regression — season", async ({ page }) => {
    await bootClean(page);
    await stubHealth(page);
    await stubCreateResolver(page);
    await page.goto(`${BASE}/create/?intent=game&season_account=dedicated`);
    await dismissOverlays(page);
    await page.locator("#handle").fill(`qa_season_${Date.now().toString(36).slice(-6)}`);
    await page.locator("#manifesto").fill("Summer season");
    await page.locator("#submit").click();
    await page.waitForURL(/\/created\/.*fresh=1/, { timeout: 25_000 });
    await expect(page.getByRole("heading", { name: "Set up your season" })).toBeVisible({
      timeout: 15_000,
    });
    await page.locator("#child-object-season-when-id").fill("qa_summer_2026");
    await page.locator("#child-object-season-when-id").blur();
    await expect(page.locator("#child-object-season-when-status")).toContainText("qa_summer_2026");
  });

  test("5. LO-1 kit page", async ({ page }) => {
    await page.goto(`${BASE}/dev/ws-live-lo1-comprehension.html`);
    await expect(page.locator("body")).toContainText(/LO-1|deploy wizard|Path A/i, {
      timeout: 10_000,
    });
  });
});
