/**
 * humanity.llc reference resolver — route dispatcher.
 * Milestone M1: health (step 1.1 / 1.3). Card + scan routes follow roadmap §17.
 */

export interface Env {
  // D1, secrets, etc. added in step 1.2+
}

const OPERATOR_ID = "humanity.llc";
const PROTOCOL_VERSION = "1.0";

export default {
  async fetch(
    request: Request,
    _env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    if (
      request.method === "GET" &&
      url.pathname === "/.well-known/hc/v1/health"
    ) {
      return healthResponse();
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

function healthResponse(): Response {
  return jsonResponse(
    {
      version: PROTOCOL_VERSION,
      operator: OPERATOR_ID,
      status: "ok",
    },
    200
  );
}
