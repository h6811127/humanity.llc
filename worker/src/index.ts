/**
 * humanity.llc reference resolver  -  route dispatcher.
 * M1: health + D1. M2: create card. M3: scan trust UI.
 */

import { schemaReady } from "./db";
import { runOrphanPurge } from "./db/orphan-purge";
import {
  clientIp,
  corsHeaders,
  htmlResponse,
  jsonResponse,
  OPERATOR_ID,
  PROTOCOL_VERSION,
  withCors,
} from "./http/resolver";
import { handlePostArtifactIntent, handlePostArtifactIntentAttach } from "./resolver/artifact-intents";
import { handleGetCard, handlePostCards } from "./resolver/create-card";
import {
  handleGetLiveControlChallenge,
  handleGetPendingLiveControlChallenge,
  handlePostLiveControlChallenge,
  handlePostLiveControlResponse,
} from "./resolver/live-control";
import { handlePostRevoke } from "./resolver/revoke";
import { handlePostCardUpdate } from "./resolver/update-card";
import { handlePostIssuePrintArtifactQr } from "./resolver/issue-print-artifact-qr";
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
  handleGetOperatorCapabilities,
  handleGetOperatorPlans,
  handleGetStewardEntitlements,
  handleGetStewardPush,
  handlePostStewardSession,
} from "./resolver/steward-hosted";
import { handlePostShopifyOrdersWebhook } from "./http/shopify-orders-webhook";
import {
  handleGetPrintCatalog,
  handlePostPrintArtifacts,
} from "./print/print-handlers";
import {
  handleGetPrintOrder,
  handlePostPrintOrders,
} from "./print/print-orders-handler";

export interface Env {
  DB: D1Database;
  /** Bearer token for operator-only audit routes; set via wrangler secret. */
  OPERATOR_AUDIT_TOKEN?: string;
  /** HMAC secret for /c/…/out interstitial tokens; defaults to local dev key only. */
  SCAN_OUT_HMAC_SECRET?: string;
  /** E1 hosted steward API (`1` / `true` to enable). */
  HOSTED_STEWARD_ENABLED?: string;
  /** O-001 Shopify webhook HMAC secret. */
  SHOPIFY_WEBHOOK_SECRET?: string;
  /** O-002 Printify personal access token (server-only). */
  PRINTIFY_API_TOKEN?: string;
  /** O-002 Printify shop id for order submit. */
  PRINTIFY_SHOP_ID?: string;
}

export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    if (!env.DB) return;
    try {
      const ready = await schemaReady(env.DB);
      if (!ready) return;
      await runOrphanPurge(env.DB);
    } catch (err) {
      console.error("orphan_purge_failed", err);
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
      return healthResponse(env);
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

    if (path === "/v1/webhooks/shopify/orders" && request.method === "POST") {
      if (!env.DB) {
        return jsonResponse({ error: "database_unconfigured" }, 503);
      }
      return handlePostShopifyOrdersWebhook(request, env, env.DB);
    }

    if (path === "/v1/print/catalog" && request.method === "GET") {
      const res = await handleGetPrintCatalog();
      return withCors(request, res);
    }

    if (path === "/v1/print/artifacts" && request.method === "POST") {
      const res = await handlePostPrintArtifacts(request);
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

    const cardMatch = path.match(
      /^\/\.well-known\/hc\/v1\/cards\/([^/]+)$/
    );
    if (cardMatch && request.method === "GET") {
      if (!env.DB) {
        return jsonResponse({ error: "database_unconfigured" }, 503);
      }
      return handleGetCard(env.DB, cardMatch[1]!, request);
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

async function healthResponse(env: Env): Promise<Response> {
  const body: {
    version: string;
    operator: string;
    status: string;
    database: string;
  } = {
    version: PROTOCOL_VERSION,
    operator: OPERATOR_ID,
    status: "ok",
    database: "unknown",
  };

  if (!env.DB) {
    body.database = "unconfigured";
    body.status = "degraded";
    return jsonResponse(body, 503);
  }

  try {
    const ready = await schemaReady(env.DB);
    body.database = ready ? "ok" : "schema_missing";
    if (!ready) {
      body.status = "degraded";
      return jsonResponse(body, 503);
    }
  } catch {
    body.database = "error";
    body.status = "degraded";
    return jsonResponse(body, 503);
  }

  return jsonResponse(body, 200);
}
