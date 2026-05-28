/**
 * humanity.llc reference resolver  -  route dispatcher.
 * M1: health + D1. M2: create card. M3: scan trust UI.
 */

import { schemaReady } from "./db";
import { handleGetResolverHealth } from "./resolver/resolver-health";
import { runOrphanPurge } from "./db/orphan-purge";
import { runPrintifyReconcile } from "./print/printify-reconcile";
import {
  corsHeaders,
  htmlResponse,
  jsonResponse,
  withCors,
} from "./http/resolver";
import { handlePostArtifactIntent, handlePostArtifactIntentAttach, handlePostArtifactIntentPreMint } from "./resolver/artifact-intents";
import { handleGetStoreProduct, handleGetStoreRows } from "./store/store-rows-handler";
import { handleGetStoreOrderStatus } from "./resolver/store-order-status";
import { handlePostStoreOrderMint } from "./resolver/store-order-mint";
import { handleGetCard, handlePostCards } from "./resolver/create-card";
import {
  handleGetLiveControlChallenge,
  handleGetPendingLiveControlChallenge,
  handlePostLiveControlChallenge,
  handlePostLiveControlResponse,
} from "./resolver/live-control";
import { handlePostRevoke } from "./resolver/revoke";
import { handlePostCardUpdate } from "./resolver/update-card";
import {
  handleGetChildObjects,
  handlePostChildObjectCreate,
  handlePostChildObjectRevoke,
  handlePostChildObjectUpdate,
} from "./resolver/child-objects";
import { handlePostIssuePrintArtifactQr } from "./resolver/issue-print-artifact-qr";
import { handlePostIssueChildObjectQr } from "./resolver/issue-child-object-qr";
import { handlePostRotateQr } from "./resolver/rotate-qr";
import { handlePostExtendQr } from "./resolver/extend-qr";
import { handleGetScan } from "./resolver/scan";
import { handleGetScanOut } from "./resolver/scan-out";
import { handleGetQrMetadata } from "./resolver/qr-metadata";
import { handleGetScanStatus } from "./resolver/scan-status";
import { handlePostVouch } from "./resolver/vouch";
import { handleGetVouch, handlePostVouchRevoke } from "./resolver/vouch-revoke";
import {
  handleDeleteVouchAuditFlagDismiss,
  handleGetVouchAuditFlags,
  handlePostVouchAuditFlagDismiss,
} from "./resolver/vouch-audit-flags";
import { handleGetCreateRateMonitor } from "./resolver/create-monitoring";
import {
  handleGetMerchFunnelMonitor,
  handlePostMerchFunnelBeacon,
} from "./http/merch-funnel";
import {
  handleGetOperatorCapabilities,
  handleGetOperatorPlans,
  handleGetStewardEntitlements,
  handleGetStewardPush,
  handlePostStewardSession,
} from "./resolver/steward-hosted";
import { handleGetStewardOpsSnapshot } from "./resolver/steward-ops";
import { handlePostBillingWebhook } from "./http/billing-webhook";
import { handlePostShopifyOrdersWebhook } from "./http/shopify-orders-webhook";
import { handlePostPrintifyWebhook } from "./http/printify-webhook";
import {
  handleGetPrintCatalog,
  handlePostPrintArtifacts,
} from "./print/print-handlers";
import {
  handleGetPrintOrder,
  handlePostPrintOrderMint,
  handlePostPrintOrders,
} from "./print/print-orders-handler";
import { handlePostPrintQuotes } from "./print/print-quotes-handler";
import { handleGetOperatorFulfillmentLookup } from "./operator/fulfillment-lookup";
import { handlePostAiExplainSnapshot } from "./resolver/ai-explain-snapshot";
import { handlePostAiDraftManifesto } from "./resolver/ai-draft-manifesto";

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
  /** AES-256 key (32 bytes, base64) for encrypted fulfillment shipping at rest. */
  FULFILLMENT_PII_ENCRYPTION_KEY?: string;
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
  /** Tier 0 Printify shipping_method id (default 1). */
  TIER0_PRINTIFY_SHIPPING_METHOD?: string;
  /** Tier 1 personalized hoodie Printify product id. */
  PERSONALIZE_HOODIE_PRINTIFY_PRODUCT_ID?: string;
  /** Tier 1 personalized hoodie Printify variant id (integer). */
  PERSONALIZE_HOODIE_PRINTIFY_VARIANT_ID?: string;
  /** Tier 1 personalized hoodie Printify shipping_method id (default 1). */
  PERSONALIZE_HOODIE_PRINTIFY_SHIPPING_METHOD?: string;
  /** Tier 1 personalized sticker Printify product id. */
  PERSONALIZE_STICKER_PRINTIFY_PRODUCT_ID?: string;
  /** Tier 1 personalized sticker Printify variant id (integer). */
  PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID?: string;
  /** Tier 1 personalized sticker Printify shipping_method id (default 1). */
  PERSONALIZE_STICKER_PRINTIFY_SHIPPING_METHOD?: string;
  /** Tier 1 hoodie Printify blueprint id for per-order artwork products. */
  PERSONALIZE_HOODIE_PRINTIFY_BLUEPRINT_ID?: string;
  /** Tier 1 hoodie Printify print provider id. */
  PERSONALIZE_HOODIE_PRINTIFY_PRINT_PROVIDER_ID?: string;
  /** Tier 1 hoodie print placeholder (default front). */
  PERSONALIZE_HOODIE_PRINTIFY_PLACEHOLDER?: string;
  /** Tier 1 sticker Printify blueprint id for per-order artwork products. */
  PERSONALIZE_STICKER_PRINTIFY_BLUEPRINT_ID?: string;
  /** Tier 1 sticker Printify print provider id. */
  PERSONALIZE_STICKER_PRINTIFY_PRINT_PROVIDER_ID?: string;
  /** Tier 1 sticker print placeholder (default front). */
  PERSONALIZE_STICKER_PRINTIFY_PLACEHOLDER?: string;
  /** Tier 0 batch sticker: campaign card profile_id (must exist in D1). */
  TIER0_CAMPAIGN_PROFILE_ID?: string;
  /** Tier 0 batch sticker: comma-separated Shopify variant ids. */
  TIER0_SHOPIFY_VARIANT_IDS?: string;
  /** Tier 0 pre-printed inventory: comma-separated Shopify variant ids (no Printify queue). */
  TIER0_SHOPIFY_INVENTORY_VARIANT_IDS?: string;
  /** Cloudflare Workers AI (L3 explain snapshot). */
  AI?: Ai;
}

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    if (!env.DB) return;
    try {
      const ready = await schemaReady(env.DB);
      if (!ready) return;

      if (event.cron === "0,30 * * * *") {
        await runPrintifyReconcile(env.DB, env);
        return;
      }

      await runOrphanPurge(env.DB);
    } catch (err) {
      console.error("scheduled_job_failed", event.cron, err);
    }
  },

  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/.well-known/hc/v1/health" && request.method === "GET") {
      return handleGetResolverHealth(request, env);
    }

    if (
      path === "/.well-known/hc/v1/operator/capabilities" &&
      request.method === "GET"
    ) {
      const res = await handleGetOperatorCapabilities(request, env);
      return withCors(request, res);
    }

    if (
      path === "/.well-known/hc/v1/operator/plans" &&
      request.method === "GET"
    ) {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handleGetOperatorPlans(request, env, env.DB);
      return withCors(request, res);
    }
    if (
      path === "/.well-known/hc/v1/steward/session" &&
      request.method === "POST"
    ) {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostStewardSession(request, env, env.DB);
      return withCors(request, res);
    }
    if (
      path === "/.well-known/hc/v1/steward/entitlements" &&
      request.method === "GET"
    ) {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handleGetStewardEntitlements(request, env, env.DB);
      return withCors(request, res);
    }
    if (
      path === "/.well-known/hc/v1/steward/push" &&
      request.method === "GET"
    ) {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handleGetStewardPush(request, env, env.DB);
      return withCors(request, res);
    }
    if (
      path === "/.well-known/hc/v1/operator/billing/webhook" &&
      request.method === "POST"
    ) {
      if (!env.DB) {
        return jsonResponse({ error: "database_unconfigured" }, 503);
      }
      return handlePostBillingWebhook(request, env, env.DB);
    }
    if (
      path === "/.well-known/hc/v1/operator/steward-ops" &&
      request.method === "GET"
    ) {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handleGetStewardOpsSnapshot(
        request,
        env,
        env.DB,
        env.OPERATOR_AUDIT_TOKEN
      );
      return withCors(request, res);
    }

    if (
      path === "/.well-known/hc/v1/operator/create-rate-monitor" &&
      request.method === "GET"
    ) {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handleGetCreateRateMonitor(
        request,
        env.DB,
        env.OPERATOR_AUDIT_TOKEN
      );
      return withCors(request, res);
    }

    if (
      path === "/.well-known/hc/v1/metrics/merch-funnel" &&
      request.method === "POST"
    ) {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostMerchFunnelBeacon(request, env.DB);
      return withCors(request, res);
    }

    if (
      path === "/.well-known/hc/v1/operator/merch-funnel-monitor" &&
      request.method === "GET"
    ) {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handleGetMerchFunnelMonitor(
        request,
        env.DB,
        env.OPERATOR_AUDIT_TOKEN
      );
      return withCors(request, res);
    }

    if (
      path === "/.well-known/hc/v1/operator/vouch-audit-flags" &&
      request.method === "GET"
    ) {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handleGetVouchAuditFlags(
        request,
        env.DB,
        env.OPERATOR_AUDIT_TOKEN
      );
      return withCors(request, res);
    }
    if (
      path === "/.well-known/hc/v1/operator/vouch-audit-flags/dismiss" &&
      request.method === "POST"
    ) {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostVouchAuditFlagDismiss(
        request,
        env.DB,
        env.OPERATOR_AUDIT_TOKEN
      );
      return withCors(request, res);
    }
    if (
      path === "/.well-known/hc/v1/operator/vouch-audit-flags/dismiss" &&
      request.method === "DELETE"
    ) {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handleDeleteVouchAuditFlagDismiss(
        request,
        env.DB,
        env.OPERATOR_AUDIT_TOKEN
      );
      return withCors(request, res);
    }

    if (path === "/.well-known/hc/v1/cards" && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostCards(request, env.DB);
      return withCors(request, res);
    }

    if (
      path === "/.well-known/hc/v1/ai/explain-snapshot" &&
      request.method === "POST"
    ) {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      return handlePostAiExplainSnapshot(request, env);
    }

    if (
      path === "/.well-known/hc/v1/ai/draft-manifesto" &&
      request.method === "POST"
    ) {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      return handlePostAiDraftManifesto(request, env);
    }

    const statusMatch = path.match(
      /^\/\.well-known\/hc\/v1\/cards\/([^/]+)\/status$/
    );
    if (statusMatch && request.method === "GET") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handleGetScanStatus(request, env.DB, statusMatch[1]!);
      return withCors(request, res);
    }

    const qrMetadataMatch = path.match(/^\/\.well-known\/hc\/v1\/qr\/([^/]+)$/);
    if (qrMetadataMatch && request.method === "GET") {
      if (!env.DB) {
        return jsonResponse({ error: "database_unconfigured" }, 503);
      }
      return handleGetQrMetadata(request, env.DB, qrMetadataMatch[1]!);
    }

    const revokeMatch = path.match(
      /^\/\.well-known\/hc\/v1\/cards\/([^/]+)\/revoke$/
    );
    if (revokeMatch && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostRevoke(request, env.DB, revokeMatch[1]!);
      return withCors(request, res);
    }

    const qrExtendMatch = path.match(
      /^\/\.well-known\/hc\/v1\/cards\/([^/]+)\/qr\/extend$/
    );
    if (qrExtendMatch && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostExtendQr(request, env.DB, qrExtendMatch[1]!);
      return withCors(request, res);
    }

    const printArtifactQrMatch = path.match(
      /^\/\.well-known\/hc\/v1\/cards\/([^/]+)\/print-artifact-qrs$/
    );
    if (printArtifactQrMatch && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostIssuePrintArtifactQr(
        request,
        env.DB,
        printArtifactQrMatch[1]!
      );
      return withCors(request, res);
    }

    const qrRotateMatch = path.match(
      /^\/\.well-known\/hc\/v1\/cards\/([^/]+)\/qr$/
    );
    if (qrRotateMatch && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostRotateQr(request, env.DB, qrRotateMatch[1]!);
      return withCors(request, res);
    }

    const updateMatch = path.match(
      /^\/\.well-known\/hc\/v1\/cards\/([^/]+)\/update$/
    );
    if (updateMatch && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostCardUpdate(request, env.DB, updateMatch[1]!);
      return withCors(request, res);
    }

    const childObjectCreateMatch = path.match(
      /^\/\.well-known\/hc\/v1\/cards\/([^/]+)\/objects$/
    );
    if (childObjectCreateMatch && request.method === "GET") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handleGetChildObjects(env.DB, childObjectCreateMatch[1]!);
      return withCors(request, res);
    }
    if (childObjectCreateMatch && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostChildObjectCreate(
        request,
        env.DB,
        childObjectCreateMatch[1]!
      );
      return withCors(request, res);
    }

    const childObjectIssueQrMatch = path.match(
      /^\/\.well-known\/hc\/v1\/cards\/([^/]+)\/objects\/([^/]+)\/issue-qr$/
    );
    if (childObjectIssueQrMatch && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostIssueChildObjectQr(
        request,
        env.DB,
        childObjectIssueQrMatch[1]!,
        childObjectIssueQrMatch[2]!
      );
      return withCors(request, res);
    }

    const childObjectActionMatch = path.match(
      /^\/\.well-known\/hc\/v1\/cards\/([^/]+)\/objects\/([^/]+)\/(update|revoke)$/
    );
    if (childObjectActionMatch && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const [, profileId, objectId, action] = childObjectActionMatch;
      const res =
        action === "update"
          ? await handlePostChildObjectUpdate(request, env.DB, profileId!, objectId!)
          : await handlePostChildObjectRevoke(request, env.DB, profileId!, objectId!);
      return withCors(request, res);
    }

    const liveChallengeStatusMatch = path.match(
      /^\/\.well-known\/hc\/v1\/cards\/([^/]+)\/live-control\/challenges\/([^/]+)$/
    );
    if (liveChallengeStatusMatch && request.method === "GET") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handleGetLiveControlChallenge(
        request,
        env.DB,
        liveChallengeStatusMatch[1]!,
        liveChallengeStatusMatch[2]!,
        env
      );
      return withCors(request, res);
    }

    const liveChallengeMatch = path.match(
      /^\/\.well-known\/hc\/v1\/cards\/([^/]+)\/live-control\/challenges$/
    );
    if (liveChallengeMatch && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostLiveControlChallenge(
        request,
        env.DB,
        liveChallengeMatch[1]!,
        { env, executionCtx: ctx }
      );
      return withCors(request, res);
    }

    if (liveChallengeMatch && request.method === "GET") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handleGetPendingLiveControlChallenge(
        request,
        env.DB,
        liveChallengeMatch[1]!,
        env
      );
      return withCors(request, res);
    }

    const liveResponseMatch = path.match(
      /^\/\.well-known\/hc\/v1\/cards\/([^/]+)\/live-control\/responses$/
    );
    if (liveResponseMatch && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostLiveControlResponse(
        request,
        env.DB,
        liveResponseMatch[1]!
      );
      return withCors(request, res);
    }

    const vouchPostPaths = new Set([
      "/v1/verification/vouches",
      "/.well-known/hc/v1/verification/vouches",
    ]);
    if (vouchPostPaths.has(path) && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostVouch(request, env.DB);
      return withCors(request, res);
    }

    const vouchMatch = path.match(
      /^(?:\/v1\/verification\/vouches|\/\.well-known\/hc\/v1\/verification\/vouches)\/([^/]+)$/
    );
    if (vouchMatch && request.method === "GET") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handleGetVouch(env.DB, vouchMatch[1]!);
      return withCors(request, res);
    }

    const vouchRevokeMatch = path.match(
      /^(?:\/v1\/verification\/vouches|\/\.well-known\/hc\/v1\/verification\/vouches)\/([^/]+)\/revoke$/
    );
    if (vouchRevokeMatch && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostVouchRevoke(
        request,
        env.DB,
        vouchRevokeMatch[1]!
      );
      return withCors(request, res);
    }

    if (path === "/v1/store/rows" && request.method === "GET") {
      const res = await handleGetStoreRows();
      return withCors(request, res);
    }

    const storeProductMatch = path.match(/^\/v1\/store\/products\/([^/]+)$/);
    if (storeProductMatch && request.method === "GET") {
      const res = await handleGetStoreProduct(storeProductMatch[1]!);
      return withCors(request, res);
    }

    if (path === "/v1/store/artifact-intents" && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostArtifactIntent(request, env.DB);
      return withCors(request, res);
    }

    if (path === "/v1/store/order-status" && request.method === "GET") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handleGetStoreOrderStatus(request, env.DB);
      return withCors(request, res);
    }

    if (path === "/v1/store/order-mint" && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostStoreOrderMint(request, env.DB);
      return withCors(request, res);
    }

    const artifactIntentAttachMatch = path.match(
      /^\/v1\/store\/artifact-intents\/([^/]+)\/attach$/
    );
    if (artifactIntentAttachMatch && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostArtifactIntentAttach(
        request,
        env.DB,
        artifactIntentAttachMatch[1]!
      );
      return withCors(request, res);
    }

    const artifactIntentPreMintMatch = path.match(
      /^\/v1\/store\/artifact-intents\/([^/]+)\/pre-mint$/
    );
    if (artifactIntentPreMintMatch && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostArtifactIntentPreMint(
        request,
        env.DB,
        artifactIntentPreMintMatch[1]!
      );
      return withCors(request, res);
    }

    if (path === "/v1/webhooks/shopify/orders" && request.method === "POST") {
      if (!env.DB) {
        return jsonResponse({ error: "database_unconfigured" }, 503);
      }
      return handlePostShopifyOrdersWebhook(request, env, env.DB);
    }

    if (path === "/v1/print/webhooks/printify" && request.method === "POST") {
      if (!env.DB) {
        return jsonResponse({ error: "database_unconfigured" }, 503);
      }
      return handlePostPrintifyWebhook(request, env, env.DB);
    }

    if (path === "/v1/print/catalog" && request.method === "GET") {
      const res = await handleGetPrintCatalog();
      return withCors(request, res);
    }

    if (path === "/v1/print/artifacts" && request.method === "POST") {
      const res = await handlePostPrintArtifacts(request);
      return withCors(request, res);
    }

    if (path === "/v1/print/quotes" && request.method === "POST") {
      const res = await handlePostPrintQuotes(request, env);
      return withCors(request, res);
    }

    if (path === "/v1/print/orders" && request.method === "POST") {
      if (!env.DB) {
        return jsonResponse({ error: "database_unconfigured" }, 503);
      }
      const res = await handlePostPrintOrders(request, env, env.DB);
      return res;
    }

    const printOrderMatch = path.match(/^\/v1\/print\/orders\/([^/]+)$/);
    if (printOrderMatch && request.method === "GET") {
      if (!env.DB) {
        return jsonResponse({ error: "database_unconfigured" }, 503);
      }
      return handleGetPrintOrder(request, env, env.DB, printOrderMatch[1]!);
    }

    const printOrderMintMatch = path.match(/^\/v1\/print\/orders\/([^/]+)\/mint$/);
    if (printOrderMintMatch && request.method === "POST") {
      if (!env.DB) {
        return jsonResponse({ error: "database_unconfigured" }, 503);
      }
      return handlePostPrintOrderMint(request, env, env.DB, printOrderMintMatch[1]!);
    }

    if (path === "/v1/operator/fulfillment/lookup" && request.method === "GET") {
      if (!env.DB) {
        return jsonResponse({ error: "database_unconfigured" }, 503);
      }
      return handleGetOperatorFulfillmentLookup(request, env, env.DB);
    }

    const cardMatch = path.match(
      /^\/\.well-known\/hc\/v1\/cards\/([^/]+)$/
    );
    if (cardMatch && request.method === "GET") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handleGetCard(env.DB, cardMatch[1]!, request);
      return withCors(request, res);
    }

    const scanOutMatch = path.match(/^\/c\/([^/]+)\/out$/);
    if (scanOutMatch && request.method === "GET") {
      if (!env.DB) {
        return htmlResponse(
          "<!DOCTYPE html><html><body><p>Resolver database unavailable.</p></body></html>",
          503,
          { "Cache-Control": "no-store" }
        );
      }
      return handleGetScanOut(request, env.DB, scanOutMatch[1]!, env);
    }

    const scanMatch = path.match(/^\/c\/([^/]+)$/);
    if (scanMatch && request.method === "GET") {
      if (!env.DB) {
        return htmlResponse(
          "<!DOCTYPE html><html><body><p>Resolver database unavailable.</p></body></html>",
          503,
          { "Cache-Control": "no-store" }
        );
      }
      return handleGetScan(request, env.DB, scanMatch[1]!);
    }

    return jsonResponse({ error: "not_found", path }, 404);
  },
};
