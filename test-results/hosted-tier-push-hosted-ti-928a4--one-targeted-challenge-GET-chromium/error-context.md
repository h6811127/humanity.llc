# Test info

- Name: hosted tier E4 push (SSE) >> H4 live_proof.pending triggers one targeted challenge GET
- Location: /Users/spencerdavis/Documents/projects/humanity.llc/e2e/hosted-tier-push.spec.ts:275:7

# Error details

```
Error: Timed out 15000ms waiting for expect(locator).not.toHaveClass(expected)

Locator: locator('#device-hub')
Expected pattern: not /device-hub-collapsed/
Received string: "device-hub device-hub-top device-hub--sheet device-hub-collapsed"
Call log:
  - expect.not.toHaveClass with timeout 15000ms
  - waiting for locator('#device-hub')
    19 × locator resolved to <section inert="" id="device-hub" aria-hidden="true" aria-labelledby="device-hub-title" class="device-hub device-hub-top device-hub--sheet device-hub-collapsed">…</section>
       - unexpected value "device-hub device-hub-top device-hub--sheet device-hub-collapsed"

    at openExpandedHub (/Users/spencerdavis/Documents/projects/humanity.llc/e2e/hosted-tier-push.spec.ts:172:49)
    at /Users/spencerdavis/Documents/projects/humanity.llc/e2e/hosted-tier-push.spec.ts:294:5
```

# Page snapshot

```yaml
- 'button "Status: resolver online, saved keys on device."'
- main:
  - region "Shortcuts & settings":
    - heading "Shortcuts & settings" [level=2]
    - list:
      - listitem:
        - button "Appearance Light · default"
      - listitem:
        - button "Browser alerts On · live proof in background" [pressed]
      - listitem:
        - button "Share network checks On · other tabs use the same last check" [pressed]
      - listitem:
        - button "Refresh all tabs One check, then share with open tabs"
      - listitem:
        - link "My cards Saved on this device":
          - /url: /wallet/
      - listitem:
        - link "Revoke & manage Update, revoke, backup":
          - /url: /created/
      - listitem:
        - button "Auto-save On · new cards stay on this device (default)" [pressed]
      - listitem:
        - button "Focus mode On · show intro again" [pressed]
  - list:
    - listitem:
      - link "info@humanity.llc":
        - /url: mailto:info@humanity.llc
- link "Help and guides":
  - /url: /help/
```

# Test source

```ts
   72 |       resolver: { operator: "humanity.llc", version: "1.0" },
   73 |       scan: {
   74 |         kind: "active",
   75 |         profile_id: WALLET_ENTRY.profile_id,
   76 |         qr_id: WALLET_ENTRY.qr_id,
   77 |         card: {
   78 |           status: "active",
   79 |           handle: WALLET_ENTRY.handle,
   80 |           manifesto_line: WALLET_ENTRY.manifesto_line,
   81 |         },
   82 |         verification: { state: "registered", label: "Registered" },
   83 |         human_trust: { label: "Registered", subtitle: "", pill_active: false },
   84 |       },
   85 |     }),
   86 |   });
   87 | }
   88 |
   89 | async function installCommonRoutes(page: Page) {
   90 |   await page.route("**/.well-known/hc/v1/health**", mockHealth);
   91 |   await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardStatus);
   92 |   await page.route("**/.well-known/hc/v1/steward/entitlements**", (route) =>
   93 |     route.fulfill({
   94 |       status: 200,
   95 |       contentType: "application/json",
   96 |       headers: { ETag: '"hosted-push-e2e"' },
   97 |       body: JSON.stringify(HOSTED_ENTITLEMENTS_BODY),
   98 |     })
   99 |   );
  100 |   await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) =>
  101 |     route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
  102 |   );
  103 | }
  104 |
  105 | async function installHostedPushFetchMock(page: Page, withSession: boolean) {
  106 |   await page.addInitScript(
  107 |     ({ entry, withStewardSession }) => {
  108 |       localStorage.setItem("hc_wallet", JSON.stringify([entry]));
  109 |       localStorage.setItem("hc_device_id", "device-e2e-push");
  110 |       localStorage.setItem("hc_watch_live_proof", "1");
  111 |       localStorage.setItem("hc_browser_notif", "on");
  112 |       localStorage.setItem("hc_device_hub_intro_dismissed", "1");
  113 |       sessionStorage.setItem(
  114 |         "hc_created",
  115 |         JSON.stringify({
  116 |           profile_id: entry.profile_id,
  117 |           qr_id: entry.qr_id,
  118 |           owner_private_key_b58: entry.owner_private_key_b58,
  119 |           owner_public_key_b58: entry.owner_public_key_b58,
  120 |           handle: entry.handle,
  121 |           manifesto_line: entry.manifesto_line,
  122 |           scan_url: entry.scan_url,
  123 |         })
  124 |       );
  125 |       if (withStewardSession) {
  126 |         sessionStorage.setItem(
  127 |           "hc_steward_session",
  128 |           JSON.stringify({ token: "session-e2e-push" })
  129 |         );
  130 |       } else {
  131 |         sessionStorage.removeItem("hc_steward_session");
  132 |       }
  133 |
  134 |       window.__hcE2ePushFetchCount = 0;
  135 |       const nativeFetch = window.fetch.bind(window);
  136 |       window.fetch = async (input, init) => {
  137 |         const url = typeof input === "string" ? input : input?.url ?? "";
  138 |         if (url.includes("/steward/push")) {
  139 |           window.__hcE2ePushFetchCount += 1;
  140 |           const encoder = new TextEncoder();
  141 |           const stream = new ReadableStream({
  142 |             start(controller) {
  143 |               window.__hcE2ePushController = controller;
  144 |               window.__hcE2ePushEncoder = encoder;
  145 |               controller.enqueue(
  146 |                 encoder.encode(
  147 |                   `event: connection\ndata: ${JSON.stringify({
  148 |                     type: "connection.ack",
  149 |                     version: 1,
  150 |                     operator_id: "humanity.llc",
  151 |                     account_id: "acc_e2e_push",
  152 |                     connection_id: "conn_e2e_push",
  153 |                   })}\n\n`
  154 |                 )
  155 |               );
  156 |             },
  157 |           });
  158 |           return new Response(stream, {
  159 |             status: 200,
  160 |             headers: { "Content-Type": "text/event-stream; charset=utf-8" },
  161 |           });
  162 |         }
  163 |         return nativeFetch(input, init);
  164 |       };
  165 |     },
  166 |     { entry: WALLET_ENTRY, withStewardSession: withSession }
  167 |   );
  168 | }
  169 |
  170 | async function openExpandedHub(page: Page) {
  171 |   await page.locator("#brand-status-dot-btn").click({ timeout: 15_000 });
> 172 |   await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/, {
      |                                                 ^ Error: Timed out 15000ms waiting for expect(locator).not.toHaveClass(expected)
  173 |     timeout: 15_000,
  174 |   });
  175 | }
  176 |
  177 | async function waitForPushHealthy(page: Page) {
  178 |   await expect
  179 |     .poll(async () =>
  180 |       page.evaluate(async () => {
  181 |         const mod = await import("/js/device-steward-push.mjs");
  182 |         return mod.isStewardPushHealthy();
  183 |       })
  184 |     )
  185 |     .toBe(true);
  186 | }
  187 |
  188 | async function readAutoPollShouldRun(page: Page) {
  189 |   return page.evaluate(async () => {
  190 |     const push = await import("/js/device-steward-push.mjs");
  191 |     const scheduler = await import("/js/device-live-control-poll-scheduler.mjs");
  192 |     const network = await import("/js/device-hub-network-tools-core.mjs");
  193 |     const leader = await import("/js/device-live-control-poll-leader.mjs");
  194 |     const wallet = await import("/js/device-wallet-since-visit-gate.mjs");
  195 |     const budgetCore = await import("/js/device-live-control-poll-budget-core.mjs");
  196 |     const entitlements = await import("/js/device-steward-entitlements.mjs");
  197 |     const hubEl = document.getElementById("device-hub");
  198 |     const scopeActive = scheduler.resolveLiveControlPollScope({
  199 |       hubEl,
  200 |       inboxSheetOpen: document.body.classList.contains("device-inbox-sheet-open"),
  201 |       walletPage: document.body.classList.contains("page-wallet"),
  202 |       watchEnabled: network.isWatchLiveProofEnabled(),
  203 |     });
  204 |     let budgetExhausted = false;
  205 |     try {
  206 |       const raw = localStorage.getItem("hc_live_control_auto_poll");
  207 |       const cap = entitlements.getStewardEntitlementsPolicy().pollLiveProofAutoDailyCap;
  208 |       budgetExhausted = budgetCore.isLiveControlAutoPollBudgetExhausted(
  209 |         raw ? JSON.parse(raw) : {},
  210 |         Date.now(),
  211 |         cap
  212 |       );
  213 |     } catch {
  214 |       budgetExhausted = false;
  215 |     }
  216 |     return scheduler.liveControlAutoPollShouldRun({
  217 |       watchEnabled: network.isWatchLiveProofEnabled(),
  218 |       scopeActive,
  219 |       resolverHealth: wallet.getResolverHealthStatus(),
  220 |       budgetExhausted,
  221 |       isPollLeader: leader.isLiveControlPollLeaderTab(),
  222 |       stewardPushHealthy: push.isStewardPushHealthy(),
  223 |     });
  224 |   });
  225 | }
  226 |
  227 | async function waitForPollLeader(page: Page) {
  228 |   await expect
  229 |     .poll(async () =>
  230 |       page.evaluate(async () => {
  231 |         const leader = await import("/js/device-live-control-poll-leader.mjs");
  232 |         return leader.isLiveControlPollLeaderTab();
  233 |       })
  234 |     )
  235 |     .toBe(true);
  236 | }
  237 |
  238 | test.describe("hosted tier E4 push (SSE)", () => {
  239 |   test.beforeEach(async ({ context }) => {
  240 |     await grantBrowserNotifications(context);
  241 |   });
  242 |
  243 |   test("H4 free tier does not open steward push SSE", async ({ page }) => {
  244 |     await installHostedPushFetchMock(page, false);
  245 |     await installCommonRoutes(page);
  246 |
  247 |     await page.goto("/wallet/");
  248 |     await page.waitForTimeout(2000);
  249 |
  250 |     const pushFetchCount = await page.evaluate(() => window.__hcE2ePushFetchCount ?? 0);
  251 |     expect(pushFetchCount).toBe(0);
  252 |   });
  253 |
  254 |   test("H4 healthy push suppresses auto poll while watch is on", async ({ page }) => {
  255 |     await installHostedPushFetchMock(page, true);
  256 |     await installCommonRoutes(page);
  257 |
  258 |     let challengeGets = 0;
  259 |     await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) => {
  260 |       challengeGets += 1;
  261 |       return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  262 |     });
  263 |
  264 |     await page.goto("/");
  265 |     await openExpandedHub(page);
  266 |     await waitForPushHealthy(page);
  267 |
  268 |     expect(await readAutoPollShouldRun(page)).toBe(false);
  269 |
  270 |     const baseline = challengeGets;
  271 |     await page.waitForTimeout(3500);
  272 |     expect(challengeGets).toBe(baseline);
```