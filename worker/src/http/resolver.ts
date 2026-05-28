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

function isAllowedCorsOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "humanity.llc" ||
      hostname.endsWith(".humanity.llc") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".pages.dev")
    );
  } catch {
    return false;
  }
}

/** Allow Pages dev, Pages preview (*.pages.dev), and production same-origin create flow. */
export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  if (!origin || !isAllowedCorsOrigin(origin)) return {};
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, If-None-Match, Authorization, X-HC-Device-Id, X-HC-Live-Proof-Manual",
    "Access-Control-Max-Age": "86400",
  };
  if (request.headers.get("Access-Control-Request-Private-Network") === "true") {
    headers["Access-Control-Allow-Private-Network"] = "true";
  }
  return headers;
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

export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return url.origin;
  }
  return RESOLVER_ORIGIN;
}

export function htmlResponse(
  body: string,
  status: number,
  extra?: HeadersInit
): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Resolver-Version": PROTOCOL_VERSION,
      "X-Resolver-Operator": OPERATOR_ID,
      ...extra,
    },
  });
}
