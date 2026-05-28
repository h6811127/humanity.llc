import type { PublicObjectSnapshot } from "./object-snapshot";
import {
  AI_EXPLAIN_LIMIT,
  BEARER_WARNING,
  OBJECT_PUBLIC_SNAPSHOT_LIMIT,
} from "./trust-copy";
import type { ObjectPublicStream } from "../validation/object-streams";

export const AI_EXPLAIN_MAX_FIELDS = 12;
export const AI_EXPLAIN_FIELD_KEY_MAX = 40;
export const AI_EXPLAIN_FIELD_VALUE_MAX = 120;

export const AI_EXPLAIN_SYSTEM_PROMPT = `You summarize signed public object state for someone who just scanned a QR code.
Rules:
- Restate ONLY the fields provided. Do not invent facts, hours, locations, or verification.
- Use 2-3 short, plain sentences maximum.
- Do not claim the reader owns the object, that anyone scanned it, or that the state is legally verified.
- Do not mention AI, models, or the resolver.`;

export type AiExplainSource = "workers_ai" | "deterministic";

export type AgentContextLimits = {
  bearer_warning: string;
  object_snapshot_warning?: string;
  ai_explain_warning: string;
};

export type AgentContextPacket = {
  manifesto_line: string | null;
  object_streams: ObjectPublicStream[];
  public_snapshot: PublicObjectSnapshot;
  limits: AgentContextLimits;
};

export function validateExplainSnapshotInput(
  body: unknown
): PublicObjectSnapshot | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object." };
  }
  const record = body as Record<string, unknown>;
  const raw = record.public_snapshot;
  if (!raw || typeof raw !== "object") {
    return { error: "public_snapshot is required." };
  }
  const snap = raw as Record<string, unknown>;
  const text = snap.text;
  const fields = snap.fields;
  if (typeof text !== "string" || !text.trim()) {
    return { error: "public_snapshot.text is required." };
  }
  if (text.length > 600) {
    return { error: "public_snapshot.text is too long." };
  }
  if (!Array.isArray(fields) || fields.length === 0) {
    return { error: "public_snapshot.fields must be a non-empty array." };
  }
  if (fields.length > AI_EXPLAIN_MAX_FIELDS) {
    return { error: "public_snapshot.fields exceeds allowed count." };
  }

  /** @type {PublicObjectSnapshot["fields"]} */
  const normalized = [];
  for (const item of fields) {
    if (!item || typeof item !== "object") {
      return { error: "Each public_snapshot.fields entry must be an object." };
    }
    const row = item as Record<string, unknown>;
    const key = row.key;
    const value = row.value;
    if (typeof key !== "string" || !key.trim()) {
      return { error: "Each field requires a non-empty key." };
    }
    if (typeof value !== "string" || !value.trim()) {
      return { error: "Each field requires a non-empty value." };
    }
    if (key.length > AI_EXPLAIN_FIELD_KEY_MAX || value.length > AI_EXPLAIN_FIELD_VALUE_MAX) {
      return { error: "Field key or value exceeds max length." };
    }
    if (/<[^>]+>/.test(key) || /<[^>]+>/.test(value)) {
      return { error: "Fields must be plain text." };
    }
    normalized.push({ key: key.trim(), value: value.trim() });
  }

  return { text: text.trim(), fields: normalized };
}

/** Deterministic fallback when Workers AI is unavailable. */
export function deterministicExplainSnapshot(snapshot: PublicObjectSnapshot): string {
  const sentences: string[] = [];
  for (const field of snapshot.fields) {
    if (field.key === "object") {
      sentences.push(`This object is ${field.value}.`);
    } else if (field.key === "status") {
      sentences.push(`Current status: ${field.value}.`);
    } else if (field.key === "statement") {
      sentences.push(field.value.endsWith(".") ? field.value : `${field.value}.`);
    } else {
      sentences.push(`${field.key}: ${field.value}.`);
    }
  }
  return sentences.join(" ").trim();
}

export function buildExplainUserPrompt(snapshot: PublicObjectSnapshot): string {
  const lines = snapshot.fields.map((f) => `${f.key}: ${f.value}`);
  return `Signed public fields:\n${lines.join("\n")}\n\nPlain-language summary:`;
}

export function extractAiText(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const record = response as Record<string, unknown>;
  if (typeof record.response === "string" && record.response.trim()) {
    return record.response.trim();
  }
  if (typeof record.result === "string" && record.result.trim()) {
    return record.result.trim();
  }
  return null;
}

export function buildAgentContextPacket(
  manifestoLine: string | null,
  streams: ObjectPublicStream[],
  snapshot: PublicObjectSnapshot
): AgentContextPacket {
  return {
    manifesto_line: manifestoLine,
    object_streams: streams,
    public_snapshot: snapshot,
    limits: {
      bearer_warning: BEARER_WARNING,
      object_snapshot_warning: OBJECT_PUBLIC_SNAPSHOT_LIMIT,
      ai_explain_warning: AI_EXPLAIN_LIMIT,
    },
  };
}

export const AI_EXPLAIN_DISCLAIMER =
  "AI summary — not signed network state. Only the signed snapshot above is steward-published resolver copy.";

export function aiExplainResponseBody(
  summary: string,
  source: AiExplainSource
): {
  summary: string;
  source: AiExplainSource;
  disclaimer: string;
  limits: { ai_explain_warning: string };
} {
  return {
    summary,
    source,
    disclaimer: AI_EXPLAIN_DISCLAIMER,
    limits: { ai_explain_warning: AI_EXPLAIN_LIMIT },
  };
}
