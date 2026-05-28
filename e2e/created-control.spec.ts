import { test, expect, type Route } from "@playwright/test";

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

const LIVE_PROOF_CHALLENGE_ID = "e2e_created_live_proof_challenge";

function mockPendingLiveProofChallenge(route: Route) {
  const signUrl = new URL("/created/", "http://127.0.0.1:8788");
  signUrl.searchParams.set("profile_id", SAMPLE.profile_id);
  signUrl.searchParams.set("qr_id", SAMPLE.qr_id);
  signUrl.searchParams.set("live_challenge", LIVE_PROOF_CHALLENGE_ID);
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      status: "pending",
      challenge_id: LIVE_PROOF_CHALLENGE_ID,
      owner_url: signUrl.href,
      return_url: SAMPLE.scan_url,
      expires_at: new Date(Date.now() + 600_000).toISOString(),
    }),
  });
}

async function installLiveProofScrollSpy(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    window.__liveProofScrollIntoViewCalls = 0;
    const orig = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...args) {
      if (this.id === "live-control-proof") {
        window.__liveProofScrollIntoViewCalls += 1;
      }
      return orig.apply(this, args);
    };
  });
}

async function liveProofScrollIntoViewCalls(page: import("@playwright/test").Page) {
  return page.evaluate(() => window.__liveProofScrollIntoViewCalls ?? 0);
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

async function stubResolver(page) {
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

test.describe("/created/ control mode (Live · Manage)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((sample) => {
      localStorage.setItem(
        "hc_setup_done",
        JSON.stringify({ [sample.profile_id]: true })
      );
      localStorage.setItem(
        "hc_wallet",
        JSON.stringify([
          {
            id: "e2e_created_control",
            label: "E2E Control",
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
    await stubResolver(page);
  });

  test("opens control workspace with Live tab cockpit", async ({ page }) => {
    const url = `/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}`;
    await page.goto(url);

    await expect(page.locator("#created-setup-root")).toBeHidden();
    await expect(page.locator("#created-control-root")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your object is live" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Live", selected: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Manage" })).toBeVisible();
    await expect(page.locator("#created-live-setup-memory-wrap")).toBeVisible();
    await expect(page.locator("#created-live-primary-btn")).toBeVisible();
    await expect(page.locator("#created-live-scanners-see")).toBeHidden();
    await expect(page.locator("#created-scanners-see-gate-hint")).toBeVisible();
    await expect(page.locator("#created-deploy-print")).toBeVisible();
    await expect(page.locator("#manifesto-update-panel")).toHaveCount(0);
  });

  test("status plate exposes scanner copy update before revoke", async ({ page }) => {
    await page.addInitScript((sample) => {
      const session = {
        profile_id: sample.profile_id,
        qr_id: sample.qr_id,
        handle: sample.handle,
        manifesto_line: "Studio door\nOpen until 9 PM",
        created_at: "2026-05-25T12:00:00.000Z",
        pilot_template: "status_plate",
        scan_url: sample.scan_url,
        owner_public_key_b58: sample.owner_public_key_b58,
        owner_private_key_b58: sample.owner_private_key_b58,
      };
      sessionStorage.setItem("hc_created", JSON.stringify(session));
      localStorage.setItem(
        "hc_wallet",
        JSON.stringify([{ id: "e2e_status_plate", label: "Studio door", ...session }])
      );
    }, SAMPLE);

    await page.goto(`/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}`);

    await expect(page.getByRole("tab", { name: "Live", selected: true })).toBeVisible();
    await expect(page.locator("#created-live-scanners-see")).toBeVisible();
    await expect(page.locator("#created-scanners-see-gate-hint")).toBeHidden();
    await expect(page.locator("#update-fields-status-plate")).toBeVisible();
    await expect(page.locator("#update-object-label")).toHaveValue("Studio door");
    await expect(page.locator("#update-status-line")).toHaveValue("Open until 9 PM");
  });

  test("#revoke deep link opens Manage revoke panel", async ({ page }) => {
    await page.goto(
      `/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}#revoke`
    );
    await expect(page.getByRole("tab", { name: "Manage", selected: true })).toBeVisible();
    await expect(page.locator("#revoke-details")).toBeVisible();
    await expect(page.locator("#revoke-details")).toHaveAttribute("open");
  });

  test("#update-status deep link focuses Live scanners-see form", async ({ page }) => {
    await page.addInitScript((profileId) => {
      sessionStorage.setItem(
        "hc_created_first_qr_revoke",
        JSON.stringify({ [profileId]: true })
      );
    }, SAMPLE.profile_id);

    await page.goto(
      `/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}#update-status`
    );
    await expect(page.getByRole("tab", { name: "Live", selected: true })).toBeVisible();
    await expect(page.locator("#created-live-scanners-see")).toBeVisible();
    await expect(page.locator("#manifesto-update-form")).toBeVisible();
  });
});

test.describe("/created/ live proof panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((sample) => {
      localStorage.setItem(
        "hc_setup_done",
        JSON.stringify({ [sample.profile_id]: true })
      );
      localStorage.setItem(
        "hc_wallet",
        JSON.stringify([
          {
            id: "e2e_created_control",
            label: "E2E Control",
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
    await stubResolver(page);
    await installLiveProofScrollSpy(page);
  });

  test("live_challenge deep link shows requested state with single body line", async ({
    page,
  }) => {
    await page.goto(
      `/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}&live_challenge=${LIVE_PROOF_CHALLENGE_ID}`
    );

    const panel = page.locator("#live-control-proof");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveClass(/live-control-proof-requested/);
    await expect(page.locator("#live-control-proof-lead")).toBeHidden();
    await expect(page.locator("#live-control-proof-status")).toHaveText(
      /Someone nearby is asking for live proof/
    );
    await expect(page.locator("#live-control-proof-btn")).toHaveText(
      "Prove control now"
    );
    await expect(page.locator("#created-live-primary-btn")).toHaveText(
      "Prove control now"
    );
  });

  test("poll discovery scrolls panel into view when steward scrolled down", async ({
    page,
  }) => {
    let challengePolls = 0;
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) => {
      challengePolls += 1;
      if (challengePolls < 2) {
        return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
      }
      return mockPendingLiveProofChallenge(route);
    });

    await page.goto(`/created/?profile_id=${SAMPLE.profile_id}&qr_id=${SAMPLE.qr_id}`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const panel = page.locator("#live-control-proof");
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel).toHaveClass(/live-control-proof-requested/);
    await expect(page.locator("#live-control-proof-lead")).toBeHidden();

    expect(await liveProofScrollIntoViewCalls(page)).toBeGreaterThanOrEqual(1);
  });
});
