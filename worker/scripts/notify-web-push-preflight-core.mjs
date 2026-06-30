/**
 * Tier 2 Web Push ops preflight (engineering + optional live API probe).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REQUIRED_PATHS = [
  "worker/migrations/0037_steward_web_push_subscriptions.sql",
  "worker/src/steward/web-push-db.ts",
  "worker/src/steward/web-push-send.ts",
  "worker/src/steward/web-push-send-core.ts",
  "worker/src/steward/web-push-subscribe.ts",
  "site/js/device-steward-web-push.mjs",
  "site/sw-live-proof.mjs",
];

/**
 * @param {string} root
 */
export function assessNotifyWebPushPreflight(root) {
  /** @type {Array<{ id: string, ok: boolean, detail: string }>} */
  const checks = [];

  for (const rel of REQUIRED_PATHS) {
    const ok = existsSync(join(root, rel));
    checks.push({
      id: rel,
      ok,
      detail: ok ? "present" : "missing",
    });
  }

  const wrangler = readFileSync(join(root, "worker/wrangler.toml"), "utf8");
  checks.push({
    id: "wrangler:vapid_docs",
    ok: /STEWARD_VAPID_PUBLIC_KEY/.test(wrangler),
    detail: /STEWARD_VAPID_PUBLIC_KEY/.test(wrangler)
      ? "wrangler.toml documents VAPID vars"
      : "add STEWARD_VAPID_PUBLIC_KEY comment to wrangler.toml",
  });

  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  checks.push({
    id: "npm:notify:web-push:tier2",
    ok: typeof pkg.scripts?.["notify:web-push:tier2"] === "string",
    detail: pkg.scripts?.["notify:web-push:tier2"] ?? "missing script",
  });

  const sw = readFileSync(join(root, "site/sw-live-proof.mjs"), "utf8");
  checks.push({
    id: "sw:push_listener",
    ok: /addEventListener\("push"/.test(sw),
    detail: /addEventListener\("push"/.test(sw)
      ? "SW push handler wired"
      : "missing push listener",
  });

  const push = readFileSync(join(root, "worker/src/steward/push.ts"), "utf8");
  checks.push({
    id: "worker:fan_out",
    ok: /fanOutWebPushLiveProofPending/.test(push),
    detail: /fanOutWebPushLiveProofPending/.test(push)
      ? "notifyLiveProofPending fans out Web Push"
      : "missing fan-out hook",
  });

  const browser = readFileSync(
    join(root, "site/js/device-browser-notifications.mjs"),
    "utf8"
  );
  checks.push({
    id: "client:transport_snapshot",
    ok: /web_push:/.test(browser) && /stewardWebPushTransportSnapshot/.test(browser),
    detail: /web_push:/.test(browser)
      ? "field snapshot includes web_push"
      : "extend notifyTransportFieldSnapshot",
  });

  checks.push({
    id: "worker:unsubscribe_route",
    ok: /method === "DELETE"/.test(readFileSync(join(root, "worker/src/index.ts"), "utf8")) &&
      /handleDeleteStewardWebPushSubscribeRoute/.test(
        readFileSync(join(root, "worker/src/index.ts"), "utf8")
      ),
    detail:
      /handleDeleteStewardWebPushSubscribeRoute/.test(
        readFileSync(join(root, "worker/src/index.ts"), "utf8")
      )
        ? "DELETE push/subscribe wired"
        : "missing DELETE subscribe route",
  });

  const webPushClient = readFileSync(
    join(root, "site/js/device-steward-web-push.mjs"),
    "utf8"
  );
  checks.push({
    id: "client:unsubscribe_cleanup",
    ok: /clearStewardWebPushSubscription/.test(webPushClient),
    detail: /clearStewardWebPushSubscription/.test(webPushClient)
      ? "client clears PushManager + operator row"
      : "missing clearStewardWebPushSubscription",
  });

  return { checks };
}

/**
 * @param {{ checks: Array<{ id: string, ok: boolean, detail: string }> }} report
 */
export function notifyWebPushEngineeringReady(report) {
  return report.checks.every((row) => row.ok);
}

/**
 * @param {{ checks: Array<{ id: string, ok: boolean, detail: string }> }} report
 */
export function formatNotifyWebPushPreflightReport(report) {
  const lines = ["WS-NOTIF Tier 2 Web Push preflight", ""];
  for (const row of report.checks) {
    lines.push(`${row.ok ? "☑" : "☐"} ${row.id} — ${row.detail}`);
  }
  lines.push("");
  lines.push(
    notifyWebPushEngineeringReady(report)
      ? "Engineering ready — configure VAPID keys + apply migration 0037 remote, then run P0-N2-T2 field matrix."
      : "Fix failing checks before operator rollout."
  );
  return lines.join("\n");
}

/**
 * @param {string} apiOrigin e.g. http://127.0.0.1:8787
 */
export async function probeOperatorWebPushCapabilities(apiOrigin) {
  const url = `${apiOrigin.replace(/\/$/, "")}/.well-known/hc/v1/operator/capabilities`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    return { ok: false, detail: `capabilities HTTP ${res.status}` };
  }
  const body = await res.json();
  const vapid =
    body?.extensions?.hosted_steward?.web_push?.vapid_public_key ?? null;
  const subscribe =
    body?.extensions?.hosted_steward?.endpoints?.push_subscribe ?? null;
  if (typeof vapid !== "string" || !vapid.trim()) {
    return {
      ok: false,
      detail: "capabilities missing extensions.hosted_steward.web_push.vapid_public_key",
    };
  }
  if (typeof subscribe !== "string" || !subscribe.includes("push/subscribe")) {
    return { ok: false, detail: "capabilities missing push_subscribe endpoint" };
  }
  return { ok: true, detail: `vapid_public_key present (${vapid.slice(0, 12)}…)` };
}
