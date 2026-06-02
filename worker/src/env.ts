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
}
