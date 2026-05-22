/**
 * humanity.llc reference resolver — route dispatcher.
 * M1: health + D1. M2: create card + get card.
 */

import { schemaReady } from "./db";
import {
  clientIp,
  corsHeaders,
  jsonResponse,
  OPERATOR_ID,
  PROTOCOL_VERSION,
  withCors,
} from "./http/resolver";
import { handleGetCard, handlePostCards } from "./resolver/create-card";

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

    const cardMatch = path.match(
      /^\/\.well-known\/hc\/v1\/cards\/([^/]+)$/
    );
    if (cardMatch && request.method === "GET") {
      if (!env.DB) {
        return jsonResponse({ error: "database_unconfigured" }, 503);
      }
      return handleGetCard(env.DB, cardMatch[1]!, request);
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
