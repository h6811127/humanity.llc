import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readRepoFile(relPath: string): string {
  const abs = join(repoRoot, relPath);
  expect(existsSync(abs), `${relPath} must exist`).toBe(true);
  return readFileSync(abs, "utf8");
}

describe("WS-NOTIF Tier 2 Web Push transport contract (P2 step 1)", () => {
  it("T2-1: SW handles push events and routes live_proof.pending hints", () => {
    const sw = readRepoFile("site/sw-live-proof.mjs");
    expect(sw).toMatch(/addEventListener\("push"/);
    expect(sw).toMatch(/parseWebPushMessageData/);
    expect(sw).toMatch(/isLiveProofPendingPushPayload/);
    expect(sw).toMatch(/notifyFromPushHint/);
  });

  it("T2-2: page maintains Web Push subscription when entitled", () => {
    const webPush = readRepoFile("site/js/device-steward-web-push.mjs");
    expect(webPush).toMatch(/syncStewardWebPushSubscription/);
    expect(webPush).toMatch(/pushManager\.subscribe/);
    expect(readRepoFile("site/js/device-browser-notifications.mjs")).toMatch(
      /syncStewardWebPushSubscription/
    );
    expect(readRepoFile("site/js/device-steward-push.mjs")).toMatch(
      /syncStewardWebPushSubscription/
    );
  });

  it("T2-3: operator exposes VAPID + subscribe endpoint when configured", () => {
    const hosted = readRepoFile("worker/src/resolver/steward-hosted.ts");
    expect(hosted).toMatch(/push_subscribe/);
    expect(hosted).toMatch(/STEWARD_VAPID_PUBLIC_KEY/);
    expect(hosted).toMatch(/handlePostStewardWebPushSubscribe/);
    expect(readRepoFile("worker/src/index.ts")).toMatch(
      /steward\/push\/subscribe/
    );
  });

  it("T2-4: subscribe persists to D1; fan-out lives in push notify", () => {
    const subscribe = readRepoFile("worker/src/steward/web-push-subscribe.ts");
    expect(subscribe).toMatch(/upsertStewardWebPushSubscription/);
    expect(subscribe).toMatch(/WEB_PUSH_SUBSCRIBE_NOT_ENABLED/);
    expect(readRepoFile("worker/migrations/0037_steward_web_push_subscriptions.sql")).toMatch(
      /steward_web_push_subscriptions/
    );
    expect(readRepoFile("worker/src/steward/push.ts")).toMatch(
      /fanOutWebPushLiveProofPending/
    );
  });

  it("T2-5: field diagnostics + ops preflight for force-quit sign-off", () => {
    const browser = readRepoFile("site/js/device-browser-notifications.mjs");
    expect(browser).toMatch(/web_push:\s*stewardWebPushTransportSnapshot/);
    expect(browser).toMatch(/__hcWebPushSubscriptionEndpoint/);
    expect(readRepoFile("site/js/device-steward-web-push.mjs")).toMatch(
      /stewardWebPushTransportSnapshot/
    );
    expect(readRepoFile("docs/DEVICE_OS_QA.md")).toMatch(/P0-N2-T2/);
    expect(readRepoFile("worker/scripts/notify-web-push-preflight.mjs")).toMatch(
      /assessNotifyWebPushPreflight/
    );
    expect(readRepoFile("worker/scripts/steward-web-push-vapid-keys.mjs")).toMatch(
      /STEWARD_VAPID_PUBLIC_KEY/
    );
  });

  it("T2-6: unsubscribe on alerts off and DELETE subscribe route", () => {
    const webPush = readRepoFile("site/js/device-steward-web-push.mjs");
    expect(webPush).toMatch(/clearStewardWebPushSubscription/);
    expect(readRepoFile("site/js/device-browser-notifications.mjs")).toMatch(
      /clearStewardWebPushSubscription/
    );
    expect(readRepoFile("worker/src/index.ts")).toMatch(/method === "DELETE"/);
    expect(readRepoFile("worker/src/steward/web-push-subscribe.ts")).toMatch(
      /handleDeleteStewardWebPushSubscribe/
    );
  });
});
