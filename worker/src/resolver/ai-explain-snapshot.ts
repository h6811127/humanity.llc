import { checkAiExplainRateLimit, hashIp } from "../db/rate-limit";
import { clientIp, errorResponse, jsonResponse, withCors } from "../http/resolver";
import {
  AI_EXPLAIN_DETERMINISTIC_SOURCE,
  aiExplainResponseBody,
  deterministicExplainSnapshot,
  validateExplainSnapshotInput,
} from "./ai-explain-core";

export interface AiExplainEnv {
  DB: D1Database;
}

/** POST /.well-known/hc/v1/ai/explain-snapshot — L3 P1 opt-in plain-language summary (deterministic-only). */
export async function handlePostAiExplainSnapshot(
  request: Request,
  env: AiExplainEnv
): Promise<Response> {
  if (!env.DB) {
    return withCors(request, jsonResponse({ error: "database_unconfigured" }, 503));
  }

  const ipHash = await hashIp(clientIp(request));
  const rate = await checkAiExplainRateLimit(env.DB, ipHash);
  if (!rate.allowed) {
    return withCors(
      request,
      errorResponse(
        "RATE_LIMITED",
        "Too many plain-language explain requests from this network. Try again later.",
        429,
        rate.retryAfterSec ? { "Retry-After": String(rate.retryAfterSec) } : undefined
      )
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withCors(
      request,
      errorResponse("INVALID_JSON", "Request body must be valid JSON.", 422)
    );
  }

  const validated = validateExplainSnapshotInput(body);
  if ("error" in validated) {
    return withCors(
      request,
      errorResponse("INVALID_SNAPSHOT", validated.error, 422)
    );
  }

  // Reference operator is deterministic-only — no Workers AI binding (2026-09-08).
  // The snapshot is restated from signed fields; no model text ever reaches this response.
  const summary = deterministicExplainSnapshot(validated);
  return withCors(
    request,
    jsonResponse(aiExplainResponseBody(summary, AI_EXPLAIN_DETERMINISTIC_SOURCE), 200)
  );
}

export const AI_EXPLAIN_ENDPOINT = "/.well-known/hc/v1/ai/explain-snapshot";
