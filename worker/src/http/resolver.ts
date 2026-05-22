export const OPERATOR_ID = "humanity.llc";
export const PROTOCOL_VERSION = "1.0";
export const RESOLVER_ORIGIN = "https://humanity.llc";

export function resolverHeaders(extra?: HeadersInit): HeadersInit {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "X-Resolver-Version": PROTOCOL_VERSION,
    "X-Resolver-Operator": OPERATOR_ID,
    "Cache-Control": "no-store",
    ...extra,
  };
}

export function jsonResponse(
  body: unknown,
  status: number,
  extra?: HeadersInit
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: resolverHeaders(extra),
  });
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  extra?: HeadersInit
): Response {
  return jsonResponse({ error: code, message }, status, extra);
}

/** Allow Pages dev (different port) and production same-origin create flow. */
export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  if (!origin) return {};
  const allowed =
    origin.includes("humanity.llc") ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1");
  if (!allowed) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export function withCors(request: Request, response: Response): Response {
  const cors = corsHeaders(request);
  if (Object.keys(cors).length === 0) return response;
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors)) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
