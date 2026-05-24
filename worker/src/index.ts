/**
 * humanity.llc reference resolver — route dispatcher.
 * M1: health + D1. M2: create card. M3: scan trust UI.
 */

import { schemaReady } from "./db";
import {
  clientIp,
  corsHeaders,
  htmlResponse,
  jsonResponse,
  OPERATOR_ID,
  PROTOCOL_VERSION,
  withCors,
} from "./http/resolver";
import { handlePostArtifactIntent } from "./resolver/artifact-intents";
import { handleGetCard, handlePostCards } from "./resolver/create-card";
import {
  handleGetLiveControlChallenge,
  handleGetPendingLiveControlChallenge,
  handlePostLiveControlChallenge,
  handlePostLiveControlResponse,
} from "./resolver/live-control";
import { handlePostRevoke } from "./resolver/revoke";
import { handlePostCardUpdate } from "./resolver/update-card";
import { handleGetScan } from "./resolver/scan";
import { handleGetScanStatus } from "./resolver/scan-status";
import { handlePostVouch } from "./resolver/vouch";

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
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
        return jsonResponse({ error: "database_unconfigured" }, 503);
      }
      return handleGetScanStatus(request, env.DB, statusMatch[1]!);
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
        liveChallengeStatusMatch[2]!
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
        liveChallengeMatch[1]!
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
        liveChallengeMatch[1]!
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

    if (path === "/v1/verification/vouches" && request.method === "POST") {
      if (!env.DB) {
        return withCors(
          request,
          jsonResponse({ error: "database_unconfigured" }, 503)
        );
      }
      const res = await handlePostVouch(request, env.DB);
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

    const cardMatch = path.match(
      /^\/\.well-known\/hc\/v1\/cards\/([^/]+)$/
    );
    if (cardMatch && request.method === "GET") {
      if (!env.DB) {
        return jsonResponse({ error: "database_unconfigured" }, 503);
      }
      return handleGetCard(env.DB, cardMatch[1]!, request);
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
