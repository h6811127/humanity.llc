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

/** Optional worker:dev overrides when wrangler simulates production hostnames. */
export type ScanPageOriginEnv = {
  SCAN_PAGES_JS_ORIGIN?: string;
  SCAN_RESOLVER_ORIGIN?: string;
};

function isLocalDevHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function parseOriginEnvOverride(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function localDevOriginFromUrl(url: URL): string | null {
  if (isLocalDevHostname(url.hostname) && url.port === "8787") {
    return url.origin;
  }
  // Wrangler dev quirk: hostname may be `127.0.0.1:8787` with an empty port field.
  if (
    (url.hostname.startsWith("127.0.0.1:") || url.hostname.startsWith("localhost:")) &&
    url.hostname.endsWith(":8787")
  ) {
    return `http://${url.hostname}`;
  }
  return null;
}

/** Worker dev on :8787 — scan HTML local, static `/js` on Pages :8788. */
export function localDevResolverOrigin(request: Request): string | null {
  const originHeader = request.headers.get("Origin") ?? "";
  if (originHeader) {
    try {
      const url = new URL(originHeader);
      const local = localDevOriginFromUrl(url);
      if (local) return local;
    } catch {
      /* fall through */
    }
  }

  const host = request.headers.get("Host")?.trim() ?? "";
  if (host.startsWith("localhost:") || host.startsWith("127.0.0.1:")) {
    return `http://${host}`;
  }

  try {
    return localDevOriginFromUrl(new URL(request.url));
  } catch {
    return null;
  }
}

export function localDevPagesOrigin(request: Request): string | null {
  const resolver = localDevResolverOrigin(request);
  if (!resolver) return null;
  const url = new URL(resolver);
  url.protocol = "http:";
  url.port = "8788";
  return url.origin;
}

export function requestOrigin(request: Request): string {
  return localDevResolverOrigin(request) ?? RESOLVER_ORIGIN;
}

function requestLocalPageOrigin(request: Request | undefined, fallback: string): string {
  if (!request) return fallback;
  const local = localDevResolverOrigin(request);
  if (local) return local;
  try {
    const hostname = new URL(request.url).hostname;
    if (
      (hostname.startsWith("127.0.0.1:") || hostname.startsWith("localhost:")) &&
      hostname.endsWith(":8787")
    ) {
      return `http://${hostname}`;
    }
  } catch {
    /* use fallback */
  }
  return fallback;
}

/** Scan page chrome links (icon, dot home, footer) — resolver origin. */
export function scanPageOrigin(
  fallback: string,
  request?: Request,
  env?: ScanPageOriginEnv
): string {
  const override = parseOriginEnvOverride(env?.SCAN_RESOLVER_ORIGIN);
  if (override) return override;
  return requestLocalPageOrigin(request, fallback);
}

/** Local dev: scan HTML on :8787, static `/js` on Pages :8788. */
export function pagesJsOrigin(
  fallback: string,
  request?: Request,
  env?: ScanPageOriginEnv
): string {
  const override = parseOriginEnvOverride(env?.SCAN_PAGES_JS_ORIGIN);
  if (override) return override;

  if (request) {
    try {
      const hostname = new URL(request.url).hostname;
      if (
        (hostname.startsWith("127.0.0.1:") || hostname.startsWith("localhost:")) &&
        hostname.endsWith(":8787")
      ) {
        return `http://${hostname.replace(/:8787$/, ":8788")}`;
      }
    } catch {
      /* fall through */
    }
    const localPages = localDevPagesOrigin(request);
    if (localPages) return localPages;
  }
  try {
    const url = new URL(fallback);
    if (
      (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
      url.port === "8787"
    ) {
      url.protocol = "http:";
      url.port = "8788";
      return url.origin;
    }
  } catch {
    /* use scan origin */
  }
  return fallback;
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
