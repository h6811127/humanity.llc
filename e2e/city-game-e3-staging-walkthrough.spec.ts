/**
 * Phase E gate E3 — full self-serve staging walkthrough against local worker (no terminal mint).
 * Run with stack up: PLAYWRIGHT_SKIP_WEBSERVER=1 npm run e2e -- e2e/city-game-e3-staging-walkthrough.spec.ts
 *
 * @see docs/CITY_GAME_LOCAL_DEV.md § E3 self-serve staging
 */
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const EXAMPLE_SEASON = "example_city_season_01";
const SPOT_NODES = ["node_01", "node_04", "node_07"];

async function dismissSetupOverlays(page: import("@playwright/test").Page) {
  const gotIt = page.getByRole("button", { name: "Got it" });
  if (await gotIt.isVisible().catch(() => false)) {
    await gotIt.click();
  }
  const notNow = page.getByRole("button", { name: "Not now" });
  if (await notNow.isVisible().catch(() => false)) {
    await notNow.click();
  }
}

async function completeSetupWizard(page: import("@playwright/test").Page) {
  await expect(page.locator("#created-setup-root")).toBeVisible({ timeout: 20_000 });
  await dismissSetupOverlays(page);

  const saveBtn = page.locator('[data-setup-action="save"]');
  if (await saveBtn.isVisible().catch(() => false)) {
    await saveBtn.click();
    await expect(page.locator("#created-setup-wallet-saved-confirm")).toBeVisible({
      timeout: 10_000,
    });
  }

  for (let i = 0; i < 4; i += 1) {
    const protect = page.locator("#created-setup-panel-protect");
    if (await protect.isVisible().catch(() => false)) break;
    const done = page.locator("#created-setup-panel-done");
    if (await done.isVisible().catch(() => false)) break;
    await page.locator("#created-setup-continue").click();
    await dismissSetupOverlays(page);
  }

  await expect(page.locator("#created-setup-panel-protect")).toBeVisible({ timeout: 15_000 });
  const recoveryConfirm = page.locator("#created-setup-recovery-reveal-confirm");
  if (await recoveryConfirm.isVisible()) {
    await recoveryConfirm.check();
    await page.locator("#created-setup-recovery-reveal-dismiss").click();
  }

  await page.locator("#created-setup-continue").click();
  await expect(page.locator("#created-setup-panel-done")).toBeVisible();
  await page.locator("#created-setup-finish").click();
  await expect(page.locator("#created-control-root")).toBeVisible({ timeout: 15_000 });
}

test.describe("E3 self-serve staging walkthrough (local)", () => {
  test("browser-only 15-node example season on local stack", async ({ page, request }) => {
    test.setTimeout(600_000);

    await page.addInitScript(() => {
      if (sessionStorage.getItem("__e2e_e3_storage_boot")) return;
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem("__e2e_e3_storage_boot", "1");
    });

    const handle = `e3_${Date.now().toString(36).slice(-8)}`;

    await page.goto("/create/");
    await page.locator("#handle").fill(handle);
    await page.locator("#manifesto").fill("E3 self-serve staging walkthrough");
    await page.locator("#create-organizer-details summary").click();
    await page.locator("#enable-organizer-revoke").check();
    await page.locator("#submit").click();

    await page.waitForURL(/\/created\/\?.*profile_id=.*qr_id=.*fresh=1/, {
      timeout: 60_000,
    });

    const session = await page.evaluate(() => {
      const raw = sessionStorage.getItem("hc_created");
      return raw ? JSON.parse(raw) : null;
    });
    expect(session?.profile_id).toBeTruthy();
    expect(
      session?.issuer_public_key ?? session?.organizer_public_key_b58
    ).toBeTruthy();
    const profileId = String(session.profile_id);

    await completeSetupWizard(page);
    await dismissSetupOverlays(page);

    await expect(page.locator("#child-object-add-game-node")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#child-object-game-node-setup-terminal-notice")).toContainText(
      "Browser setup replaces terminal mint"
    );

    const seasonSelect = page.locator("#child-object-game-node-season");
    await expect(seasonSelect.locator(`option[value="${EXAMPLE_SEASON}"]`)).toHaveCount(1, {
      timeout: 15_000,
    });
    await seasonSelect.selectOption(EXAMPLE_SEASON);

    await page.locator("#child-object-game-node-bulk summary").click();
    const bulkSubmit = page.locator("#child-object-game-node-bulk-submit");
    await expect(bulkSubmit).toBeEnabled({ timeout: 15_000 });
    await expect(bulkSubmit).toContainText("Register selected nodes (15)");

    await bulkSubmit.click();
    await expect(page.locator("#child-object-game-node-bulk-status")).toContainText(
      "15 / 15",
      { timeout: 300_000 }
    );

    await page.locator("#child-object-game-node-rules summary").click();
    await page.locator("#child-object-game-node-rules-starts").fill("2026-07-04T10:00");
    await page.locator("#child-object-game-node-rules-ends").fill("2026-07-06T22:00");
    await page.locator("#child-object-game-node-rules-season-status").selectOption("active");
    await page.locator("#child-object-game-node-rules-districts").fill("downtown\nriver\nold_town");
    await page.locator("#child-object-game-node-rules-ends").blur();
    await expect(page.locator("#child-object-game-node-rules-preview-draft")).toBeEnabled({
      timeout: 10_000,
    });

    const objectsRes = await request.get(
      `http://127.0.0.1:8787/.well-known/hc/v1/cards/${profileId}/objects`
    );
    expect(objectsRes.ok()).toBeTruthy();
    const objectsBody = await objectsRes.json();
    const gameNodes = (objectsBody.objects ?? []).filter(
      (row: { object_type?: string; status?: string; qr_id?: string | null }) =>
        row.object_type === "game_node" &&
        row.status !== "revoked" &&
        typeof row.qr_id === "string" &&
        row.qr_id.trim().length > 0
    );
    expect(gameNodes.length).toBeGreaterThanOrEqual(15);

    const seasonJson = await (
      await request.get("http://127.0.0.1:8788/data/city-game-example-season-01.json")
    ).json();
    const nodeById = new Map(
      (seasonJson.nodes ?? []).map((n: { node_id: string; object_id: string }) => [
        n.node_id,
        n.object_id,
      ])
    );

    for (const nodeId of SPOT_NODES) {
      const objectId = nodeById.get(nodeId);
      expect(objectId, `missing template object for ${nodeId}`).toBeTruthy();
      const row = gameNodes.find(
        (n: { object_id?: string }) => n.object_id === objectId
      );
      expect(row?.qr_id, `${nodeId} missing QR`).toBeTruthy();
      const scanRes = await request.get(
        `http://127.0.0.1:8787/c/${profileId}?q=${row.qr_id}`
      );
      expect(scanRes.ok()).toBeTruthy();
      const html = await scanRes.text();
      expect(html.toLowerCase()).toContain("game");
    }

    const outDir = join(process.cwd(), "worker/.local");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, "e3-staging-walkthrough.json"),
      JSON.stringify(
        {
          profile_id: profileId,
          handle,
          season_id: EXAMPLE_SEASON,
          game_node_count: gameNodes.length,
          spot_nodes: SPOT_NODES,
          completed_at: new Date().toISOString(),
        },
        null,
        2
      ) + "\n"
    );
  });
});
