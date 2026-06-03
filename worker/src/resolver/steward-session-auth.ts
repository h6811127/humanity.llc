import { errorResponse } from "../http/resolver";
import { getSessionByTokenHash, touchSession } from "../steward/db";
import { STEWARD_SESSION_TTL_MS } from "../steward/config";
import { hashSessionToken, parseBearerToken } from "../steward/session-token";

export async function authenticateStewardSession(
  db: D1Database,
  request: Request
): Promise<
  | { ok: true; account_id: string; device_id: string; token_hash: string }
  | { ok: false; response: Response }
> {
  const token = parseBearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: errorResponse(
        "UNAUTHORIZED",
        "Missing or invalid Authorization bearer token.",
        401
      ),
    };
  }

  const tokenHash = await hashSessionToken(token);
  const session = await getSessionByTokenHash(db, tokenHash);
  if (!session) {
    return {
      ok: false,
      response: errorResponse("UNAUTHORIZED", "Invalid or expired session.", 401),
    };
  }

  const expiresMs = Date.parse(session.expires_at);
  if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
    return {
      ok: false,
      response: errorResponse("UNAUTHORIZED", "Session expired.", 401),
    };
  }

  const headerDevice = request.headers.get("X-HC-Device-Id")?.trim() ?? "";
  const deviceId = session.device_id ?? headerDevice;

  const newExpires = new Date(Date.now() + STEWARD_SESSION_TTL_MS).toISOString();
  await touchSession(db, tokenHash, newExpires);

  return {
    ok: true,
    account_id: session.account_id,
    device_id: deviceId || "",
    token_hash: tokenHash,
  };
}
