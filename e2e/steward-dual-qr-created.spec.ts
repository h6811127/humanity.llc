/**
 * S7 dual-QR on /created/ — steward handoff canvas render + Print & share discovery (RC-2).
 * Setup wizard Print step (`?fresh=1#setup-qr`) per CARD_WORKSPACE_UX.md.
 * @see docs/STEWARD_HANDOFF_QR_NOT_DISPLAYING_INVESTIGATION.md
 * @see docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md § S7
 * @see docs/CARD_WORKSPACE_UX.md § Mode gate (fresh=1)
 */
import { test, expect } from "@playwright/test";

const SAMPLE = {
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  qr_id: "qr_E2eWakketTest9",
  handle: "e2etest",
  manifesto_line: "Test line",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_E2eWakketTest9",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
};

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

async function seedCreatedControlSession(page: import("@playwright/test").Page) {
  await page.addInitScript((sample) => {
    localStorage.setItem(
      "hc_setup_done",
      JSON.stringify({ [sample.profile_id]: true })
    );
    localStorage.setItem(
      "hc_wallet",
      JSON.stringify([
        {
          id: "e2e_steward_dual_qr",
          label: "E2E Dual QR",
          profile_id: sample.profile_id,
          qr_id: sample.qr_id,
          handle: sample.handle,
          manifesto_line: sample.manifesto_line,
          scan_url: sample.scan_url,
          owner_public_key_b58: sample.owner_public_key_b58,
          owner_private_key_b58: sample.owner_private_key_b58,
        },
      ])
    );
    sessionStorage.setItem(
      "hc_created",
      JSON.stringify({
        profile_id: sample.profile_id,
        qr_id: sample.qr_id,
        handle: sample.handle,
        manifesto_line: sample.manifesto_line,
        scan_url: sample.scan_url,
        owner_public_key_b58: sample.owner_public_key_b58,
        owner_private_key_b58: sample.owner_private_key_b58,
      })
    );
  }, SAMPLE);
}

/** Post-create setup wizard (`?fresh=1`) with wallet already saved — `#setup-qr` Print step. */
async function seedCreatedSetupFreshSession(page: import("@playwright/test").Page) {
  await page.addInitScript((sample) => {
    localStorage.removeItem("hc_setup_done");
    localStorage.setItem(
      "hc_wallet",
      JSON.stringify([
        {
          id: "e2e_steward_dual_qr_setup",
          label: "E2E Dual QR Setup",
          profile_id: sample.profile_id,
          qr_id: sample.qr_id,
          handle: sample.handle,
          manifesto_line: sample.manifesto_line,
          scan_url: sample.scan_url,
          owner_public_key_b58: sample.owner_public_key_b58,
          owner_private_key_b58: sample.owner_private_key_b58,
        },
      ])
    );
    sessionStorage.setItem(
      "hc_created",
      JSON.stringify({
        profile_id: sample.profile_id,
        qr_id: sample.qr_id,
        handle: sample.handle,
        manifesto_line: sample.manifesto_line,
        scan_url: sample.scan_url,
        owner_public_key_b58: sample.owner_public_key_b58,
        owner_private_key_b58: sample.owner_private_key_b58,
      })
    );
  }, SAMPLE);
}

test.describe("/created/ steward dual-QR (S7)", () => {
  test.beforeEach(async ({ page }) => {
    await seedCreatedControlSession(page);
    await stubResolver(page);
  });

  test("Full-size QR steward handoff img renders with data URL", async ({ page }) => {
    await page.goto(`/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}`);

    await expect(page.locator("#created-control-root")).toBeVisible();

    const publicImg = page.locator("#qr-img");
    const stewardImg = page.locator("#qr-img-steward");
    const stewardCol = page.locator("#created-steward-qr-col");

    await expect(publicImg).toHaveAttribute("src", /^data:image\//, { timeout: 15_000 });
    await expect(stewardImg).toHaveAttribute("src", /^data:image\//, { timeout: 15_000 });
    await expect(stewardImg).not.toHaveAttribute("alt", /Could not generate/i);
    await expect(stewardCol).not.toHaveAttribute("hidden");

    await page.locator("#created-deploy-full-qr summary").click();
    await expect(page.locator("#created-deploy-full-qr")).toHaveAttribute("open", "");
    await expect(stewardCol).toBeVisible();
    await expect(stewardImg).toBeVisible();
  });

  test("Print & share cross-links to Full-size QR when steward handoff is available", async ({
    page,
  }) => {
    await page.goto(`/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}`);

    await expect(page.locator("#qr-img-steward")).toHaveAttribute("src", /^data:image\//, {
      timeout: 15_000,
    });

    await page.locator("#created-deploy-print summary").click();
    await expect(page.locator("#created-print-steward-discovery")).toBeVisible();
    await expect(page.locator("#created-print-steward-cta")).toBeVisible();

    await page.locator("#created-print-steward-cta").click();
    await expect(page.locator("#created-deploy-full-qr")).toHaveAttribute("open", "");
    await expect(page.locator("#qr-img-steward")).toBeVisible();
  });

  test("Copy steward handoff link copies /v/ short URL (P1-PWA-V step 7 · S7)", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}`);

    await expect(page.locator("#qr-img-steward")).toHaveAttribute("src", /^data:image\//, {
      timeout: 15_000,
    });

    await page.locator("#created-deploy-full-qr summary").click();
    await expect(page.locator("#created-deploy-full-qr")).toHaveAttribute("open", "");

    const copyBtn = page.locator("#copy-steward-handoff");
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(copyBtn).toHaveText(/Link copied/i, { timeout: 5000 });

    const copied = await page.evaluate(async () => navigator.clipboard.readText());
    expect(copied).toMatch(/\/v\/[A-Za-z0-9_-]+/);
  });
});

test.describe("/created/ setup wizard Get your QR (fresh=1)", () => {
  test.beforeEach(async ({ page }) => {
    await seedCreatedSetupFreshSession(page);
    await stubResolver(page);
  });

  test("Get your QR step shows public scan preview only", async ({ page }) => {
    const url = `/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}&fresh=1#setup-qr`;
    await page.goto(url);

    await expect(page.locator("body")).toHaveAttribute("data-created-mode", "setup", {
      timeout: 15_000,
    });
    await expect(page.locator("#created-setup-root")).toBeVisible();
    await expect(page.locator("#created-control-root")).toBeHidden();
    await expect(page.locator("#created-setup-panel-qr")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Get your QR" })).toBeVisible();

    const publicPreview = page.locator("#created-setup-qr-preview");
    const publicImg = page.locator("#created-setup-qr-img");

    await expect(publicImg).toHaveAttribute("src", /^data:image\//, { timeout: 15_000 });
    await expect(publicPreview).toBeVisible();
    await expect(page.locator("#created-setup-steward-qr-preview")).toHaveCount(0);
  });
});
