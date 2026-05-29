# Test info

- Name: device PWA scan handoff (P1-PWA-N) >> standalone test scan opens same tab with return banner
- Location: /Users/spencerdavis/Documents/projects/humanity.llc/e2e/device-pwa-scan-handoff.spec.ts:125:7

# Error details

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://127.0.0.1:8788/created/?profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD5&qr_id=qr_E2ePwaScanHandoff&fresh=1#setup-test", waiting until "domcontentloaded"

    at /Users/spencerdavis/Documents/projects/humanity.llc/e2e/device-pwa-scan-handoff.spec.ts:128:16
```

# Test source

```ts
   28 |     const originalMatchMedia = window.matchMedia.bind(window);
   29 |     window.matchMedia = (query) => {
   30 |       if (query === "(display-mode: standalone)") {
   31 |         return {
   32 |           matches: true,
   33 |           media: query,
   34 |           addEventListener: () => {},
   35 |           removeEventListener: () => {},
   36 |           dispatchEvent: () => true,
   37 |         };
   38 |       }
   39 |       return originalMatchMedia(query);
   40 |     };
   41 |   `;
   42 | }
   43 |
   44 | async function stubCreatedResolver(page: Page) {
   45 |   await page.route("**/.well-known/hc/v1/health**", (route) =>
   46 |     route.fulfill({
   47 |       status: 200,
   48 |       contentType: "application/json",
   49 |       body: JSON.stringify({ status: "ok", database: "ok" }),
   50 |     })
   51 |   );
   52 |   await page.route("**/.well-known/hc/v1/cards/**/status**", (route) =>
   53 |     route.fulfill({
   54 |       status: 200,
   55 |       contentType: "application/json",
   56 |       body: JSON.stringify({
   57 |         version: "1.0",
   58 |         resolver: { operator: "humanity.llc", version: "1.0" },
   59 |         scan: {
   60 |           kind: "active",
   61 |           profile_id: HANDOFF_ENTRY.profile_id,
   62 |           qr_id: HANDOFF_ENTRY.qr_id,
   63 |           card: {
   64 |             status: "active",
   65 |             handle: HANDOFF_ENTRY.handle,
   66 |             manifesto_line: HANDOFF_ENTRY.manifesto_line,
   67 |           },
   68 |           verification: { state: "registered", label: "Registered" },
   69 |           human_trust: { label: "Registered", subtitle: "", pill_active: false },
   70 |         },
   71 |       }),
   72 |     })
   73 |   );
   74 |   await page.route(`**/.well-known/hc/v1/cards/${HANDOFF_ENTRY.profile_id}`, (route) =>
   75 |     route.fulfill({
   76 |       status: 200,
   77 |       contentType: "application/json",
   78 |       body: JSON.stringify({
   79 |         handle: HANDOFF_ENTRY.handle,
   80 |         manifesto_line: HANDOFF_ENTRY.manifesto_line,
   81 |         created_at: "2026-05-29T12:00:00.000Z",
   82 |         status: "active",
   83 |       }),
   84 |     })
   85 |   );
   86 |   await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) =>
   87 |     route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
   88 |   );
   89 | }
   90 |
   91 | async function seedCreatedSetupTestStep(page: Page, standalone: boolean) {
   92 |   if (standalone) {
   93 |     await page.addInitScript(withStandaloneDisplayModeScript());
   94 |   }
   95 |   await page.addInitScript((entry) => {
   96 |     localStorage.removeItem("hc_setup_done");
   97 |     localStorage.setItem("hc_wallet", JSON.stringify([entry]));
   98 |     sessionStorage.setItem(
   99 |       "hc_created",
  100 |       JSON.stringify({
  101 |         profile_id: entry.profile_id,
  102 |         qr_id: entry.qr_id,
  103 |         owner_private_key_b58: entry.owner_private_key_b58,
  104 |         owner_public_key_b58: entry.owner_public_key_b58,
  105 |         handle: entry.handle,
  106 |         manifesto_line: entry.manifesto_line,
  107 |         scan_url: entry.scan_url,
  108 |       })
  109 |     );
  110 |   }, HANDOFF_ENTRY);
  111 | }
  112 |
  113 | function createdSetupTestUrl() {
  114 |   const params = new URLSearchParams({
  115 |     profile_id: HANDOFF_ENTRY.profile_id,
  116 |     qr_id: HANDOFF_ENTRY.qr_id,
  117 |     fresh: "1",
  118 |   });
  119 |   return `/created/?${params.toString()}#setup-test`;
  120 | }
  121 |
  122 | test.describe("device PWA scan handoff (P1-PWA-N)", () => {
  123 |   test.describe.configure({ mode: "serial", timeout: 60_000 });
  124 |
  125 |   test("standalone test scan opens same tab with return banner", async ({ page }) => {
  126 |     await seedCreatedSetupTestStep(page, true);
  127 |     await stubCreatedResolver(page);
> 128 |     await page.goto(createdSetupTestUrl(), { waitUntil: "domcontentloaded" });
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  129 |
  130 |     await expect(page.locator("#created-setup-panel-test")).toBeVisible({ timeout: 20_000 });
  131 |     await page.locator('[data-setup-action="test-scan"]').click();
  132 |
  133 |     await expect(page).toHaveURL(/scan-active\.html/, { timeout: 10_000 });
  134 |     await expect(page).toHaveURL(/hc_return=/);
  135 |     await expect(page.locator("#scan-steward-preview-return")).toBeVisible();
  136 |     await expect(page.locator("#scan-steward-preview-return-link")).toContainText(
  137 |       /Back to setup/i
  138 |     );
  139 |
  140 |     await page.locator("#scan-steward-preview-return-link").click();
  141 |     await expect(page).toHaveURL(/\/created\//);
  142 |     await expect(page.locator("#created-setup-root")).toBeVisible();
  143 |   });
  144 |
  145 |   test("browser tab test scan opens new window (regression)", async ({ page, context }) => {
  146 |     await seedCreatedSetupTestStep(page, false);
  147 |     await stubCreatedResolver(page);
  148 |     await page.goto(createdSetupTestUrl(), { waitUntil: "domcontentloaded" });
  149 |
  150 |     await expect(page.locator("#created-setup-panel-test")).toBeVisible({ timeout: 20_000 });
  151 |
  152 |     const popupPromise = context.waitForEvent("page");
  153 |     await page.locator('[data-setup-action="test-scan"]').click();
  154 |     const popup = await popupPromise;
  155 |
  156 |     await expect(popup).toHaveURL(/scan-active\.html/, { timeout: 10_000 });
  157 |     await expect(page).toHaveURL(/\/created\//);
  158 |     await expect(page).toHaveURL(/#setup-test/);
  159 |     await popup.close();
  160 |   });
  161 | });
  162 |
```