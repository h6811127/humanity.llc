/**
 * Dogfood screenshots for /created/ tags collection (Phase 1.5 eval).
 *
 * Usage:
 *   npm run pages:dev   # :8788
 *   npm run dogfood:tags-collection
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "site/dev/created-tags-collection-dogfood");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8788";

const DOGFOOD_ROOT = {
  id: "dogfood_tags_root",
  label: "River studio",
  saved_at: "2026-06-05T12:00:00.000Z",
  profile_id: "profDogfoodTagsCollection",
  qr_id: "qr_dogfood_tags_collection",
  handle: "river_studio",
  manifesto_line: "River studio line",
  pilot_template: "general",
  owner_public_key_b58: "AXBxsNjTx7KQXM5DJPFgKEFYZD6vt6TNDueNKrwyfPeT",
  owner_private_key_b58: "5r8oDw5WCtRqxB4FY9bxxZ1qwJBwbdvYtoiq4jNmvoRn",
  scan_url: `${baseURL}/c/profDogfoodTagsCollection?q=qr_dogfood_tags_collection`,
  status: "active",
};

const SIGN_NAMES = ["Front door", "Lobby", "Side entry", "Back hall", "Roof access"];
const TAG_NAMES = ["Blue backpack", "Studio keys", "Merch bin", "Badge clip", "Tool pouch"];

/**
 * @param {number} count
 */
function buildChildRows(count) {
  /** @type {Array<Record<string, unknown>>} */
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const isPlate = i < Math.ceil(count / 2);
    const nameIdx = isPlate ? i : i - Math.ceil(count / 2);
    rows.push({
      object_id: `obj_dogfood_${count}_${i}`,
      object_type: isPlate ? "status_plate" : "lost_item_relay",
      public_label: isPlate ? SIGN_NAMES[nameIdx % SIGN_NAMES.length] : TAG_NAMES[nameIdx % TAG_NAMES.length],
      public_state: isPlate ? "Open until 6" : "If found, text studio",
      status: "active",
      created_at: `2026-06-0${(i % 9) + 1}T12:00:00.000Z`,
      scan_url: `${baseURL}/scan/obj_dogfood_${count}_${i}`,
    });
  }
  return rows;
}

function parseObjectBody(postData) {
  const payload = JSON.parse(postData || "{}");
  return payload.object && typeof payload.object === "object" ? payload.object : payload;
}

/** @type {{ networkObjects: Array<Record<string, unknown>> }} */
const apiState = { networkObjects: [] };

/**
 * @param {import("@playwright/test").Page} page
 */
async function installResolverStubs(page) {
  await page.unroute("**/.well-known/hc/v1/**").catch(() => {});
  await page.route("**/.well-known/hc/v1/**", async (route) => {
    const req = route.request();
    const url = req.url();
    if (url.includes("/health")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", database: "ok" }),
      });
    }
    if (url.includes("/status")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version: "1.0",
          resolver: { operator: "humanity.llc", version: "1.0" },
          scan: {
            kind: "active",
            profile_id: DOGFOOD_ROOT.profile_id,
            qr_id: DOGFOOD_ROOT.qr_id,
            card: {
              status: "active",
              handle: DOGFOOD_ROOT.handle,
              manifesto_line: DOGFOOD_ROOT.manifesto_line,
            },
            verification: { state: "registered", label: "Registered" },
            human_trust: { label: "Registered", subtitle: "", pill_active: false },
          },
        }),
      });
    }
    if (url.endsWith(`/cards/${DOGFOOD_ROOT.profile_id}`) && req.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          handle: DOGFOOD_ROOT.handle,
          manifesto_line: DOGFOOD_ROOT.manifesto_line,
          created_at: "2026-05-25T12:00:00.000Z",
          status: "active",
        }),
      });
    }
    if (url.endsWith(`/cards/${DOGFOOD_ROOT.profile_id}/objects`) && req.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ objects: apiState.networkObjects }),
      });
    }
    if (url.endsWith(`/cards/${DOGFOOD_ROOT.profile_id}/objects`) && req.method() === "POST") {
      const body = parseObjectBody(req.postData());
      const objectId = String(body.object_id || `obj_live_${apiState.networkObjects.length + 1}`);
      const row = {
        object_id: objectId,
        object_type: body.object_type || "status_plate",
        public_label: body.public_label || "New sign",
        public_state: body.public_state || "Open",
        status: body.status || "active",
        created_at: body.created_at || new Date().toISOString(),
        active_qr_id: `qr_${objectId}`,
      };
      apiState.networkObjects.push(row);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ object_id: objectId }),
      });
    }
    const issueMatch = url.match(/\/objects\/([^/]+)\/issue-qr$/);
    if (req.method() === "POST" && issueMatch) {
      const objectId = issueMatch[1];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          qr_id: `qr_${objectId}`,
          scan_url: `${baseURL}/scan/${objectId}`,
        }),
      });
    }
    const revokeMatch = url.match(/\/objects\/([^/]+)\/revoke$/);
    if (req.method() === "POST" && revokeMatch) {
      const objectId = revokeMatch[1];
      apiState.networkObjects = apiState.networkObjects.map((row) =>
        row.object_id === objectId ? { ...row, status: "disabled" } : row
      );
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
    const updateMatch = url.match(/\/objects\/([^/]+)\/update$/);
    if (req.method() === "POST" && updateMatch) {
      const objectId = updateMatch[1];
      const body = parseObjectBody(req.postData());
      apiState.networkObjects = apiState.networkObjects.map((row) =>
        row.object_id === objectId
          ? {
              ...row,
              public_state: body.public_state ?? row.public_state,
              public_label: body.public_label ?? row.public_label,
            }
          : row
      );
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
    return route.continue();
  });
}

/**
 * @param {import("@playwright/test").Page} page
 * @param {Array<Record<string, unknown>>} childRows
 */
async function seedCreatedPage(page, childRows) {
  apiState.networkObjects = childRows.map((row) => ({
    ...row,
    active_qr_id: `qr_${row.object_id}`,
  }));

  await page.addInitScript(({ rootCard, childRows: rows }) => {
    localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    localStorage.setItem("hc_device_hub_intro_seen", "1");
    localStorage.setItem("hc_setup_done", JSON.stringify({ [rootCard.profile_id]: true }));
    localStorage.setItem(`hc_created_control_visited:${rootCard.profile_id}`, "1");
    localStorage.setItem("hc_created_tags_collection", "1");
    localStorage.setItem(`hc_child_objects_v1:${rootCard.profile_id}`, JSON.stringify(rows));
    localStorage.setItem(
      "hc_wallet",
      JSON.stringify([
        {
          id: rootCard.id,
          label: rootCard.label,
          saved_at: rootCard.saved_at,
          profile_id: rootCard.profile_id,
          qr_id: rootCard.qr_id,
          handle: rootCard.handle,
          manifesto_line: rootCard.manifesto_line,
          pilot_template: rootCard.pilot_template,
          scan_url: rootCard.scan_url,
          owner_public_key_b58: rootCard.owner_public_key_b58,
          owner_private_key_b58: rootCard.owner_private_key_b58,
          status: rootCard.status,
        },
      ])
    );
    sessionStorage.setItem(
      "hc_created",
      JSON.stringify({
        profile_id: rootCard.profile_id,
        qr_id: rootCard.qr_id,
        handle: rootCard.handle,
        manifesto_line: rootCard.manifesto_line,
        pilot_template: rootCard.pilot_template,
        scan_url: rootCard.scan_url,
        owner_public_key_b58: rootCard.owner_public_key_b58,
        owner_private_key_b58: rootCard.owner_private_key_b58,
      })
    );
  }, { rootCard: DOGFOOD_ROOT, childRows });

  const url = `${baseURL}/created/?profile_id=${DOGFOOD_ROOT.profile_id}&qr_id=${DOGFOOD_ROOT.qr_id}&tags_collection=1`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#created-control-root:not([hidden])", { timeout: 20_000 });
  await waitForTagsCollectionReady(page);
  await dismissWelcomePopover(page);
}

/**
 * @param {import("@playwright/test").Page} page
 */
async function waitForTagsCollectionReady(page) {
  await page.waitForFunction(
    () => {
      if (document.body.dataset.createdTagsCollection !== "1") return false;
      const lead = document.getElementById("created-tags-lead")?.textContent ?? "";
      return lead.includes("@river_studio");
    },
    null,
    { timeout: 20_000 }
  );
}

/**
 * @param {import("@playwright/test").Page} page
 */
async function dismissWelcomePopover(page) {
  await page.evaluate(() => {
    localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    localStorage.setItem("hc_device_hub_intro_seen", "1");
    const intro = document.getElementById("device-hub-intro-coachmark");
    if (intro instanceof HTMLElement) intro.hidden = true;
    document.body.classList.remove("device-hub-intro-visible");
    document.querySelector(".shell-status-cluster")?.classList.remove("shell-status-cluster--hub-intro");
  });
  const dismiss = page.locator("#device-hub-intro-dismiss");
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
  }
}

/**
 * @param {import("@playwright/test").Page} page
 */
async function readCollectionAudit(page) {
  return page.evaluate(() => {
    const section = document.getElementById("created-tags-collection");
    const title = document.getElementById("created-tags-count")?.textContent?.trim() ?? "";
    const lead = document.getElementById("created-tags-lead")?.textContent?.trim() ?? "";
    const addLabel = document.getElementById("created-tags-add-btn")?.textContent?.trim() ?? "";
    const rows = [...document.querySelectorAll(".created-tags-collection-row")];
    const identities = rows.map((row) => row.querySelector(".hub-card-identity")?.textContent?.trim() ?? "");
    const rowActions = document.querySelectorAll(
      ".created-tags-collection-row .hub-card-actions"
    ).length;
    const plateForms = document.querySelectorAll(
      "#child-object-status-plate-list .child-object-plate-update-form"
    ).length;
    const relayForms = document.querySelectorAll(
      "#child-object-lost-item-list .child-object-relay-update-form"
    ).length;
    return {
      collectionVisible: section instanceof HTMLElement && !section.hidden,
      title,
      lead,
      addLabel,
      rowCount: rows.length,
      identities,
      rowActions,
      legacyPlateForms: plateForms,
      legacyRelayForms: relayForms,
      welcomeHidden: document.getElementById("device-hub-intro-coachmark")?.hidden !== false,
    };
  });
}

/**
 * @param {import("@playwright/test").Page} page
 * @param {string} prefix
 */
async function capturePair(page, prefix) {
  const collection = page.locator("#created-tags-collection");
  await collection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await collection.screenshot({ path: join(outDir, `${prefix}-tags-collection.png`) });

  const legacyTarget =
    (await page.locator("#child-object-status-plate-list:not([hidden])").count()) > 0
      ? page.locator("#child-object-status-plate-list")
      : (await page.locator("#child-object-lost-item-list:not([hidden])").count()) > 0
        ? page.locator("#child-object-lost-item-list")
        : page.locator("#child-object-add-hub");
  await legacyTarget.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(outDir, `${prefix}-tags-legacy-below.png`), fullPage: false });
}

/**
 * @param {ReturnType<typeof readCollectionAudit> extends Promise<infer T> ? T : never} audit
 * @param {number} expectedCount
 */
function validateAudit(audit, expectedCount) {
  const errors = [];
  if (!audit.collectionVisible) errors.push("collection hidden");
  if (!audit.title.startsWith("Attached QRs")) errors.push(`title=${audit.title}`);
  if (!audit.lead.includes("@river_studio's root QR")) errors.push(`lead=${audit.lead}`);
  if (audit.addLabel !== "Add QR") errors.push(`add=${audit.addLabel}`);
  if (audit.rowCount !== expectedCount) errors.push(`rows=${audit.rowCount} expected ${expectedCount}`);
  if (audit.rowActions !== 0) errors.push(`rowActions=${audit.rowActions}`);
  if (!audit.welcomeHidden) errors.push("welcome popover visible");
  for (const identity of audit.identities) {
    if (!identity.includes("· under @river_studio")) {
      errors.push(`identity=${identity}`);
    }
  }
  if (expectedCount > 0 && audit.legacyPlateForms + audit.legacyRelayForms === 0) {
    errors.push("legacy inline editors missing");
  }
  return errors;
}

/**
 * @param {import("@playwright/test").Page} page
 */
/** Open Advanced editor so legacy inline controls are visible (Phase 2B demotion). */
async function expandAdvancedEditor(page) {
  await page.evaluate(() => {
    const advanced = document.getElementById("created-tags-advanced-editor");
    const hub = document.getElementById("child-object-add-hub");
    if (advanced instanceof HTMLDetailsElement) advanced.open = true;
    if (hub instanceof HTMLDetailsElement) hub.open = true;
  });
  await page.waitForSelector(".child-object-plate-disable", { state: "visible", timeout: 10_000 });
}

async function readAdvancedAudit(page) {
  return page.evaluate(() => {
    const advanced = document.getElementById("created-tags-advanced-editor");
    const hub = document.getElementById("child-object-add-hub");
    return {
      demotionActive: document.body.classList.contains("created-tags-advanced-demotion"),
      advancedVisible: advanced instanceof HTMLElement && !advanced.hidden,
      advancedOpen: advanced instanceof HTMLDetailsElement ? advanced.open : null,
      hubOpen: hub instanceof HTMLDetailsElement ? hub.open : null,
      hubInsideAdvanced: hub?.parentElement?.id === "created-tags-advanced-editor",
      legacyPlateForms: document.querySelectorAll(
        "#child-object-status-plate-list .child-object-plate-update-form"
      ).length,
      legacyRelayForms: document.querySelectorAll(
        "#child-object-lost-item-list .child-object-relay-update-form"
      ).length,
    };
  });
}

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("dialog", (dialog) => dialog.accept());
await installResolverStubs(page);

/** @type {Record<string, unknown>} */
const report = {
  capturedAt: new Date().toISOString(),
  baseURL,
  handle: DOGFOOD_ROOT.handle,
  counts: {},
  liveSync: {},
};

for (const count of [0, 1, 3, 10]) {
  const childRows = buildChildRows(count);
  await seedCreatedPage(page, childRows);
  const audit = await readCollectionAudit(page);
  const prefix = String(count).padStart(2, "0");
  await capturePair(page, prefix);
  const errors = validateAudit(audit, count);
  report.counts[String(count)] = { ...audit, errors, ok: errors.length === 0 };
}

await seedCreatedPage(page, buildChildRows(1));
await page.locator(".created-tags-collection-row--interactive").first().click();
await page.waitForSelector("#created-tags-manage-panel:not([hidden])", { timeout: 10_000 });
const managePanelCopy = await page.evaluate(() => ({
  title: document.getElementById("created-tags-manage-title")?.textContent?.trim() ?? "",
  subtitle: document.getElementById("created-tags-manage-subtitle")?.textContent?.trim() ?? "",
  name: document.getElementById("created-tags-manage-name")?.textContent?.trim() ?? "",
  openScanVisible: !(document.getElementById("created-tags-manage-open-scan")?.hidden ?? true),
  legacyPlateForms: document.querySelectorAll(
    "#child-object-status-plate-list .child-object-plate-update-form"
  ).length,
}));
await page.locator("#created-tags-manage-panel").screenshot({
  path: join(outDir, "01-tags-manage-panel-open.png"),
});
await page.locator("#created-tags-manage-close").click();
await page.waitForFunction(
  () => document.getElementById("created-tags-manage-root")?.hidden === true,
  null,
  { timeout: 5000 }
);

await seedCreatedPage(page, buildChildRows(1));
await page.goto(
  `${baseURL}/created/?profile_id=${DOGFOOD_ROOT.profile_id}&qr_id=${DOGFOOD_ROOT.qr_id}&tags_collection=1&collection=1`,
  { waitUntil: "domcontentloaded" }
);
await dismissWelcomePopover(page);
await page.waitForFunction(
  () => document.getElementById("created-tags-collection")?.hidden === true,
  null,
  { timeout: 10_000 }
);
const collectionHiddenWithCollectionFlag = true;

report.phase2a = {
  managePanelCopy,
  managePanelErrors: [
    managePanelCopy.title !== "Manage attached QR" ? `title=${managePanelCopy.title}` : null,
    !managePanelCopy.subtitle.includes("· under @river_studio")
      ? `subtitle=${managePanelCopy.subtitle}`
      : null,
    !managePanelCopy.openScanVisible ? "open scan hidden" : null,
    managePanelCopy.legacyPlateForms < 1 ? "legacy editors missing below panel" : null,
  ].filter(Boolean),
  collectionHiddenWithCollectionFlag,
  ok:
    managePanelCopy.title === "Manage attached QR" &&
    managePanelCopy.subtitle.includes("· under @river_studio") &&
    managePanelCopy.openScanVisible &&
    managePanelCopy.legacyPlateForms >= 1 &&
    collectionHiddenWithCollectionFlag,
};

await seedCreatedPage(page, buildChildRows(1));
await page.waitForFunction(
  () => document.body.classList.contains("created-tags-advanced-demotion"),
  null,
  { timeout: 10_000 }
);
const advancedAtN1 = await readAdvancedAudit(page);
await page.locator("#created-tags-advanced-editor").screenshot({
  path: join(outDir, "01-tags-advanced-collapsed.png"),
});

await seedCreatedPage(page, buildChildRows(0));
await page.waitForFunction(
  () => document.body.classList.contains("created-tags-advanced-demotion"),
  null,
  { timeout: 10_000 }
);
const advancedAtN0 = await readAdvancedAudit(page);
await page.locator("#created-tags-advanced-editor").screenshot({
  path: join(outDir, "00-tags-advanced-open-default.png"),
});

await seedCreatedPage(page, []);
await page.locator("#created-tags-add-btn").click();
await page.waitForFunction(
  () => {
    const advanced = document.getElementById("created-tags-advanced-editor");
    return advanced instanceof HTMLDetailsElement && advanced.open;
  },
  null,
  { timeout: 10_000 }
);
await page.locator("#child-object-add-status-plate").screenshot({
  path: join(outDir, "01-tags-advanced-expanded-add.png"),
});
const addQrExpandsAdvanced = await readAdvancedAudit(page);

await seedCreatedPage(page, buildChildRows(1));
await page.locator(".created-tags-collection-row--interactive").first().click();
await page.waitForSelector("#created-tags-manage-panel:not([hidden])", { timeout: 10_000 });
await page.locator("#created-tags-manage-update-status").click();
await page.waitForFunction(
  () => {
    const advanced = document.getElementById("created-tags-advanced-editor");
    const input = document.querySelector(
      '.child-object-plate-update-form input[name="public_state"]'
    );
    return advanced instanceof HTMLDetailsElement && advanced.open && input instanceof HTMLElement;
  },
  null,
  { timeout: 10_000 }
);
await page.locator("#child-object-status-plate-list").screenshot({
  path: join(outDir, "01-tags-advanced-expanded-update.png"),
});
const updateStatusExpandsAdvanced = await readAdvancedAudit(page);

report.phase2b = {
  advancedCollapsedAtN1:
    advancedAtN1.demotionActive &&
    advancedAtN1.advancedVisible &&
    advancedAtN1.advancedOpen === false &&
    advancedAtN1.hubInsideAdvanced,
  advancedOpenAtN0:
    advancedAtN0.demotionActive && advancedAtN0.advancedOpen === true && advancedAtN0.hubOpen === true,
  addQrExpandsAdvanced: addQrExpandsAdvanced.advancedOpen === true && addQrExpandsAdvanced.hubOpen === true,
  updateStatusExpandsAdvanced:
    updateStatusExpandsAdvanced.advancedOpen === true &&
    updateStatusExpandsAdvanced.legacyPlateForms >= 1,
  legacyControlsReachable:
    updateStatusExpandsAdvanced.legacyPlateForms + updateStatusExpandsAdvanced.legacyRelayForms >= 1,
  ok: false,
};
report.phase2b.ok =
  report.phase2b.advancedCollapsedAtN1 &&
  report.phase2b.advancedOpenAtN0 &&
  report.phase2b.addQrExpandsAdvanced &&
  report.phase2b.updateStatusExpandsAdvanced &&
  report.phase2b.legacyControlsReachable;

await seedCreatedPage(page, []);
const beforeAdd = await readCollectionAudit(page);
await page.locator("#created-tags-add-btn").click();
await page.waitForFunction(
  () => {
    const advanced = document.getElementById("created-tags-advanced-editor");
    return advanced instanceof HTMLDetailsElement && advanced.open;
  },
  null,
  { timeout: 10_000 }
);
await page.waitForSelector("#child-object-add-status-plate:not([hidden])", { timeout: 10_000 });
await page.locator("#child-object-plate-label").fill("Courtyard sign");
await page.locator("#child-object-plate-state").fill("Open for tours");
await page.locator("#child-object-status-plate-submit").click();
await page.waitForFunction(
  () => {
    const title = document.querySelector("#created-tags-count")?.textContent ?? "";
    return title.includes("(1)") && document.querySelectorAll(".created-tags-collection-row").length >= 1;
  },
  null,
  { timeout: 20_000 }
);
const afterAdd = await readCollectionAudit(page);
await page.locator("#created-tags-collection").screenshot({
  path: join(outDir, "sync-live-add.png"),
});
await expandAdvancedEditor(page);
await page.locator(".child-object-plate-disable").first().click();
await page.waitForFunction(
  () => document.querySelectorAll(".created-tags-collection-row").length === 0,
  null,
  { timeout: 15_000 }
);
const afterDisable = await readCollectionAudit(page);

report.liveSync = {
  addWithoutReload:
    beforeAdd.rowCount === 0 &&
    afterAdd.rowCount === 1 &&
    afterAdd.title === "Attached QRs (1)" &&
    afterAdd.identities.some((id) => id.startsWith("Sign · under @river_studio")),
  disableWithoutReload: afterDisable.rowCount === 0 && afterDisable.title === "Attached QRs",
  beforeAdd,
  afterAdd,
  afterDisable,
};

await browser.close();

report.ok =
  Object.values(report.counts).every((entry) => entry.ok) &&
  report.liveSync.addWithoutReload &&
  report.liveSync.disableWithoutReload &&
  report.phase2a?.ok === true &&
  report.phase2b?.ok === true;

writeFileSync(join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);

if (!report.ok) {
  console.error("Dogfood capture completed with validation errors — see report.json");
  process.exit(1);
}

console.log(`Saved dogfood screenshots to ${outDir}`);
