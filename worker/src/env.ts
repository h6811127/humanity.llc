/** Worker bindings — keep free of route imports to avoid index circular deps. */
export interface Env {
  DB: D1Database;
  /** Bearer token for operator-only audit routes; set via wrangler secret. */
  OPERATOR_AUDIT_TOKEN?: string;
  /** HMAC secret for /c/…/out interstitial tokens; defaults to local dev key only. */
  SCAN_OUT_HMAC_SECRET?: string;
  /** E1 hosted steward API (`1` / `true` to enable). */
  HOSTED_STEWARD_ENABLED?: string;
  /** E5 Stripe webhook signing secret (`whsec_…`). */
  STRIPE_WEBHOOK_SECRET?: string;
  /** E5 Stripe secret key (`sk_test_…` / `sk_live_…`) for Checkout session create. */
  STRIPE_SECRET_KEY?: string;
  /** Stripe Price id for `hosted_steward_v1` (`price_…`). */
  STRIPE_PRICE_HOSTED_STEWARD_V1?: string;
  /** Stripe Price id for `hosted_game_season_v1` (`price_…`). */
  STRIPE_PRICE_HOSTED_GAME_SEASON_V1?: string;
  /** O-001 Shopify webhook HMAC secret. */
  SHOPIFY_WEBHOOK_SECRET?: string;
  /** O-002 Printify personal access token (server-only). */
  PRINTIFY_API_TOKEN?: string;
  /** O-002 Printify shop id for order submit. */
  PRINTIFY_SHOP_ID?: string;
  /** O-002 Set to 1 to enable live Printify order HTTP submit (default off). */
  PRINTIFY_SUBMIT_ENABLED?: string;
  /** O-003 Shared secret for Printify webhook HMAC (X-Pfy-Signature). */
  PRINTIFY_WEBHOOK_SECRET?: string;
  /** Tier 0 Printify product id for batch sticker template. */
  TIER0_PRINTIFY_PRODUCT_ID?: string;
  /** Tier 0 Printify variant id (integer). */
  TIER0_PRINTIFY_VARIANT_ID?: string;
  /** Tier 0 Printify shipping method id (default 1). */
  TIER0_PRINTIFY_SHIPPING_METHOD?: string;
  /** Tier 0 batch sticker: campaign card profile_id (must exist in D1). */
  TIER0_CAMPAIGN_PROFILE_ID?: string;
  /** Tier 0 batch sticker: comma-separated Shopify variant ids. */
  TIER0_SHOPIFY_VARIANT_IDS?: string;
  /** Tier 0 pre-printed inventory (e.g. Glitch hoodie): comma-separated Shopify variant ids — no Printify queue. */
  TIER0_SHOPIFY_INVENTORY_VARIANT_IDS?: string;
  /** Cloudflare Workers AI (L3 explain snapshot). */
  AI?: Ai;
  /** worker:dev — scan page chrome origin when wrangler simulates production routes. */
  SCAN_RESOLVER_ORIGIN?: string;
  /** worker:dev — static `/js` origin (Pages :8788) for scan script tags. */
  SCAN_PAGES_JS_ORIGIN?: string;
  /** Set to `0` to disable operator-wide daily request budget metering. */
  OPERATOR_REQUEST_BUDGET_ENABLED?: string;
  /** UTC-day soft cap; health returns `degraded` at/above this count (default 80000). */
  OPERATOR_REQUEST_SOFT_CAP?: string;
  /** UTC-day hard cap for budget telemetry (default 100000). */
  OPERATOR_REQUEST_HARD_CAP?: string;
}
