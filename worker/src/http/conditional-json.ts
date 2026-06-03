import { resolverHeaders } from "./resolver";

/** Weak ETag from serialized JSON (Device OS request budget Phase 9). */
export async function weakEtagFromSerializedJson(
  serialized: string
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(serialized)
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `W/"${hex.slice(0, 32)}"`;
}

/** True when the request's If-None-Match matches the response ETag. */
export function ifNoneMatchSatisfied(request: Request, etag: string): boolean {
  const header = request.headers.get("If-None-Match");
  if (!header || !etag) return false;
  const normalized = etag.replace(/^W\//, "").replace(/^"|"$/g, "");
  for (const part of header.split(",")) {
    const tag = part.trim().replace(/^W\//, "").replace(/^"|"$/g, "");
    if (tag === "*" || tag === normalized) return true;
  }
  return false;
}

/**
 * JSON GET with weak ETag and 304 Not Modified when If-None-Match matches.
 * Pass `etagBody` when the response includes volatile fields (e.g. per-request timestamps)
 * that must not bust conditional GET.
 */
export async function jsonResponseWithWeakEtag(
  request: Request,
  body: unknown,
  status: number,
  extraHeaders?: HeadersInit,
  etagBody?: unknown
): Promise<Response> {
  const serialized = JSON.stringify(body);
  const etag = await weakEtagFromSerializedJson(
    JSON.stringify(etagBody ?? body)
  );
  const headers = resolverHeaders({
    ETag: etag,
    ...extraHeaders,
  });
  if (ifNoneMatchSatisfied(request, etag)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(serialized, { status, headers });
}
