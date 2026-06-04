#!/usr/bin/env node
/**
 * WS-REV R5 step 6 — Stripe checkout closeout (probe + local checkout URL).
 *
 *   npm run hosted:rev:stripe-closeout
 *   npm run hosted:rev:stripe-closeout -- --api
 *   npm run hosted:rev:stripe-closeout -- --local
 *   STEWARD_SESSION_TOKEN=… npm run hosted:rev:stripe-closeout -- --checkout hosted_steward_v1
 *
 * @see docs/PRODUCT_WORKSTREAM_COORDINATION.md § WS-REV R5
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchJson } from "./hosted-rollout-step4.mjs";
import {
  classifyBillingCheckoutConfigured,
  hostedRevApiPaths,
} from "./hosted-rev-prod-smoke-core.mjs";
import {
  BILLING_WEBHOOK_PATH,
  classifyWebhookEndpoint,
  parseDevVarsStripeKeys,
  stripeCloseoutPlaybookLines,
  summarizeDevVarsStripeKeys,
} from "./hosted-rev-stripe-closeout-core.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const devVarsPath = path.join(repoRoot, "worker/.dev.vars");

const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
const siteOrigin = (process.env.SITE_ORIGIN || apiOrigin).replace(/\/$/, "");

/**
 * @param {string} origin
 */
async function probeStripeSurfaces(origin) {
  const paths = hostedRevApiPaths(origin);
  const webhookUrl = `${origin.replace(/\/$/, "")}${BILLING_WEBHOOK_PATH}`;

  console.log(`\n▶ Probe billing/checkout (${paths.billingCheckout})`);
  const fakeToken = "test_session_token_for_checkout_probe_only";
  const { res: checkoutRes, body: checkoutBody } = await fetchJson(paths.billingCheckout, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${fakeToken}`,
    },
    body: JSON.stringify({ plan_id: "hosted_steward_v1", site_origin: siteOrigin }),
  });
  const checkout = classifyBillingCheckoutConfigured(checkoutRes.status, checkoutBody);
  if (!checkout.ok) {
    throw new Error(checkout.message);
  }
  if (checkout.configured) {
    console.log("checkout OK — Stripe secret + price ids configured");
  } else {
    console.log("checkout not configured — set STRIPE_SECRET_KEY + STRIPE_PRICE_* on worker");
  }

  console.log(`\n▶ Probe billing webhook (${webhookUrl})`);
  const { res: webhookRes, body: webhookBody } = await fetchJson(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: "{}",
  });
  const webhook = classifyWebhookEndpoint(webhookRes.status, webhookBody);
  if (!webhook.ok) {
    throw new Error(webhook.message);
  }
  console.log(
    webhook.configured
      ? `webhook OK — ${webhook.message}`
      : `webhook not configured — ${webhook.message}`
  );

  return { checkoutConfigured: Boolean(checkout.configured), webhookConfigured: webhook.configured };
}

function probeLocalDevVars() {
  console.log(`\n▶ Local dev vars (${devVarsPath})`);
  if (!existsSync(devVarsPath)) {
    console.log("worker/.dev.vars missing — copy worker/.dev.vars.example and add Stripe test keys");
    return summarizeDevVarsStripeKeys({});
  }

  const keys = parseDevVarsStripeKeys(readFileSync(devVarsPath, "utf8"));
  const summary = summarizeDevVarsStripeKeys(keys);
  for (const name of Object.keys(keys)) {
    console.log(`  ${keys[name] ? "☑" : "☐"} ${name}`);
  }
  if (summary.missing.length) {
    console.log(`\nMissing for full local checkout loop: ${summary.missing.join(", ")}`);
  } else {
    console.log("\nAll Stripe dev vars present in worker/.dev.vars");
  }
  return summary;
}

/**
 * @param {string} planId
 */
async function startCheckout(planId) {
  const token = process.env.STEWARD_SESSION_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "STEWARD_SESSION_TOKEN is required for --checkout (npm run hosted:steward-session-local)"
    );
  }

  const paths = hostedRevApiPaths(apiOrigin);
  const deviceId = process.env.STEWARD_DEVICE_ID?.trim() || "devRevStripeCloseout";
  const returnPath =
    process.env.CHECKOUT_RETURN_PATH?.trim() ||
    (siteOrigin.includes("8788") ? "/created/" : "/created/");

  console.log(`\n▶ POST billing/checkout (${planId})`);
  const { res, body } = await fetchJson(paths.billingCheckout, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-HC-Device-Id": deviceId,
    },
    body: JSON.stringify({
      plan_id: planId,
      site_origin: siteOrigin,
      return_path: returnPath,
    }),
  });

  if (res.status === 503 && body?.error === "billing_not_configured") {
    throw new Error(
      "Stripe checkout not configured on this origin — set STRIPE_SECRET_KEY + STRIPE_PRICE_* (wrangler secret or worker/.dev.vars)"
    );
  }
  if (!res.ok || typeof body.checkout_url !== "string") {
    throw new Error(
      `Checkout failed (${res.status}): ${JSON.stringify(body).slice(0, 400)}`
    );
  }

  console.log("\nStripe Checkout URL (open in browser, complete with test card 4242…):\n");
  console.log(body.checkout_url);
  console.log("\nAfter payment:");
  console.log(
    `  STEWARD_SESSION_TOKEN=${token.slice(0, 12)}… EXPECT_PLAN_ID=${planId} npm run hosted:rev:prod-smoke -- --paid`
  );
}

async function main() {
  const api = process.argv.includes("--api");
  const local = process.argv.includes("--local");
  const checkoutIdx = process.argv.indexOf("--checkout");
  const checkoutPlan =
    checkoutIdx >= 0 ? process.argv[checkoutIdx + 1]?.trim() : "";

  if (!api && !local && !checkoutPlan) {
    for (const line of stripeCloseoutPlaybookLines({ apiOrigin })) {
      console.log(line);
    }
    return;
  }

  console.log("WS-REV R5 step 6 — Stripe checkout closeout");
  console.log(`API_ORIGIN=${apiOrigin}`);
  console.log(`SITE_ORIGIN=${siteOrigin}\n`);

  if (local) probeLocalDevVars();
  if (api) await probeStripeSurfaces(apiOrigin);
  if (checkoutPlan) await startCheckout(checkoutPlan);

  console.log("\n✅ WS-REV stripe closeout step complete.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
