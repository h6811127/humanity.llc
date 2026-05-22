/**
 * humanity.llc reference resolver — route dispatcher.
 * M1.1: health. M1.2: D1 schema + readiness on health.
 */

import { schemaReady } from "./db";

export interface Env {
  /** Cloudflare D1 — cards, qr_credentials, verification_summaries, revocations */
  DB: D1Database;
}

const OPERATOR_ID = "humanity.llc";
const PROTOCOL_VERSION = "1.0";

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    if (
      request.method === "GET" &&
      url.pathname === "/.well-known/hc/v1/health"
    ) {
      return healthResponse(env);
    }

    return jsonResponse({ error: "not_found", path: url.pathname }, 404);
  },
};

function resolverHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "X-Resolver-Version": PROTOCOL_VERSION,
    "X-Resolver-Operator": OPERATOR_ID,
    "Cache-Control": "no-store",
  };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: resolverHeaders(),
  });
}

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
