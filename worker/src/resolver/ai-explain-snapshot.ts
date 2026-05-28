import { checkAiExplainRateLimit, hashIp } from "../db/rate-limit";
import { clientIp, errorResponse, jsonResponse, withCors } from "../http/resolver";
import {
  AI_EXPLAIN_SYSTEM_PROMPT,
  aiExplainResponseBody,
  buildExplainUserPrompt,
  deterministicExplainSnapshot,
  extractAiText,
  validateExplainSnapshotInput,
} from "./ai-explain-core";

const WORKERS_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export interface AiExplainEnv {
  DB: D1Database;
  AI?: Ai;
}

async function runWorkersAiExplain(
  ai: Ai,
  snapshot: { text: string; fields: { key: string; value: string }[] }
): Promise<string | null> {
  const response = await ai.run(WORKERS_AI_MODEL, {
    messages: [
      { role: "system", content: AI_EXPLAIN_SYSTEM_PROMPT },
      { role: "user", content: buildExplainUserPrompt(snapshot) },
    ],
    max_tokens: 180,
  });
  return extractAiText(response);
}

/** POST /.well-known/hc/v1/ai/explain-snapshot — L3 P1 opt-in plain-language summary. */
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
        "Too many AI explain requests from this network. Try again later.",
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

  if (env.AI) {
    try {
      const aiText = await runWorkersAiExplain(env.AI, validated);
      if (aiText) {
        return withCors(
          request,
          jsonResponse(aiExplainResponseBody(aiText, "workers_ai"), 200)
        );
      }
    } catch {
      /* fall through to deterministic */
    }
  }

  const summary = deterministicExplainSnapshot(validated);
  return withCors(
    request,
    jsonResponse(aiExplainResponseBody(summary, "deterministic"), 200)
  );
}

export const AI_EXPLAIN_ENDPOINT = "/.well-known/hc/v1/ai/explain-snapshot";
