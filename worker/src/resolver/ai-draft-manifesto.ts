import { checkAiDraftRateLimit, hashIp } from "../db/rate-limit";
import { clientIp, errorResponse, jsonResponse, withCors } from "../http/resolver";
import { extractAiText } from "./ai-explain-core";
import {
  AI_DRAFT_SYSTEM_PROMPT,
  aiDraftResponseBody,
  buildDraftUserPrompt,
  deterministicDraftManifesto,
  extractJsonObjectFromAiText,
  parseAiDraftPayload,
  validateDraftRequest,
} from "./ai-draft-core";

const WORKERS_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export interface AiDraftEnv {
  DB: D1Database;
  AI?: Ai;
}

async function runWorkersAiDraft(ai: Ai, userPrompt: string): Promise<string | null> {
  const response = await ai.run(WORKERS_AI_MODEL, {
    messages: [
      { role: "system", content: AI_DRAFT_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 320,
  });
  return extractAiText(response);
}

/** POST /.well-known/hc/v1/ai/draft-manifesto — L3 P2 steward authoring assistant. */
export async function handlePostAiDraftManifesto(
  request: Request,
  env: AiDraftEnv
): Promise<Response> {
  if (!env.DB) {
    return withCors(request, jsonResponse({ error: "database_unconfigured" }, 503));
  }

  const ipHash = await hashIp(clientIp(request));
  const rate = await checkAiDraftRateLimit(env.DB, ipHash);
  if (!rate.allowed) {
    return withCors(
      request,
      errorResponse(
        "RATE_LIMITED",
        "Too many AI draft requests from this network. Try again later.",
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

  const validated = validateDraftRequest(body);
  if ("error" in validated) {
    return withCors(request, errorResponse("INVALID_DRAFT_REQUEST", validated.error, 422));
  }

  if (env.AI) {
    try {
      const aiText = await runWorkersAiDraft(env.AI, buildDraftUserPrompt(validated));
      if (aiText) {
        const parsed = extractJsonObjectFromAiText(aiText);
        if (parsed) {
          const draft = parseAiDraftPayload(parsed, validated.pilot_template);
          if (!("error" in draft)) {
            return withCors(
              request,
              jsonResponse(aiDraftResponseBody(draft, "workers_ai"), 200)
            );
          }
        }
      }
    } catch {
      /* fall through to deterministic */
    }
  }

  const draft = deterministicDraftManifesto(validated);
  return withCors(
    request,
    jsonResponse(aiDraftResponseBody(draft, "deterministic"), 200)
  );
}

export const AI_DRAFT_ENDPOINT = "/.well-known/hc/v1/ai/draft-manifesto";
