/**
 * WS-REV R5 — production rollout playbook (after R4 governance).
 * @see docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout
 * @see docs/PRODUCT_WORKSTREAM_COORDINATION.md § WS-REV
 */

export const REV_ROLLOUT_DOC_REL = "docs/HOSTED_TIER_G0_READINESS.md";

/** Wrangler / GitHub secrets for revenue path (enable in order). */
export const REV_ROLLOUT_SECRETS = [
  {
    name: "STRIPE_SECRET_KEY",
    step: "Before live checkout",
    required: "R1 checkout API",
  },
  {
    name: "STRIPE_PRICE_HOSTED_STEWARD_V1",
    step: "Before live checkout",
    required: "hosted_steward_v1",
  },
  {
    name: "STRIPE_PRICE_HOSTED_GAME_SEASON_V1",
    step: "Before live checkout",
    required: "hosted_game_season_v1",
  },
  {
    name: "OPERATOR_AUDIT_TOKEN",
    step: "hosted:rollout:step3a",
    required: "E6.2 ops CI",
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    step: "hosted:rollout:step3b (after G8 prod confirm)",
    required: "subscription webhooks → plan_id",
  },
];

/**
 * Ordered production steps (human runs deploy flags between scripted checks).
 * @param {{ apiOrigin?: string }} [opts]
 * @returns {string[]}
 */
export function revRolloutPlaybookLines(opts = {}) {
  const origin = (opts.apiOrigin || "https://humanity.llc").replace(/\/$/, "");
  return [
    "WS-REV R5 — production rollout (gates: G0 ☑ · R4 governance recorded)",
    "",
    "1. Engineering preflight (local)",
    "   npm run hosted:rev:rollout -- --preflight",
    "",
    "2. D1 migrations (local then production) — includes 0031 (hosted_game_season_v1)",
    "   npm run hosted:rollout:step1",
    "   npm run hosted:rev:rollout -- --step1-remote",
    "",
    "3. Deploy worker (HOSTED_STEWARD_ENABLED=1 in wrangler.toml)",
    "   npm run hosted:rev:rollout -- --deploy",
    "   npm run hosted:rollout:step3a   # OPERATOR_AUDIT_TOKEN",
    "",
    "4. WS-REV API smoke on production",
    `   API_ORIGIN=${origin} npm run hosted:rev:prod-smoke -- --api`,
    "",
    "5. Pages deploy (/created/ Manage tab panel — created-hub.mjs?v=5)",
    "   npm run hosted:rev:pages",
    "",
    "6. Stripe test checkout + paid entitlements",
    "   Complete checkout from /created/ upgrade CTA",
    `   STEWARD_SESSION_TOKEN=… EXPECT_PLAN_ID=hosted_steward_v1 npm run hosted:rev:prod-smoke -- --paid`,
    "",
    "7. Post-deploy CI gate (hosted + WS-REV)",
    "   npm run hosted:rollout:post-deploy-smoke -- --verify",
    "",
    "Secrets checklist:",
    ...REV_ROLLOUT_SECRETS.map(
      (s) => `   · ${s.name} — ${s.step} (${s.required})`
    ),
    "",
    "Legal G7 refund copy still pending — does not block steps 1–6.",
  ];
}

/**
 * @param {string} content HOSTED_TIER_PRICING or coordination doc
 */
/** Static markers for R2 `/created/` Live panel (R5 step 5). */
export const CREATED_HOSTED_PANEL_MARKERS = [
  'id="created-hosted-plan"',
  "Usage &amp; limits",
  "settings-disclosure-info created-hosted-plan",
  "created-hub.mjs?v=5",
  "created-hosted-plan-upgrades",
];

/**
 * @param {string} html
 */
export function assertCreatedHostedPanelPageHtml(html) {
  const issues = [];
  for (const marker of CREATED_HOSTED_PANEL_MARKERS) {
    if (!html.includes(marker)) {
      issues.push(`missing: ${marker}`);
    }
  }
  return { ok: issues.length === 0, issues };
}

export function governanceR4Recorded(content) {
  return (
    content.includes("WS-REV R4") &&
    (content.includes("governance sign-off recorded") ||
      content.includes("G11") ||
      !content.includes("WS-REV-R4-SIGNOFF-PENDING"))
  );
}
