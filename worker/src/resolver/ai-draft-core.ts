import { extractAiText } from "./ai-explain-core";
import { AI_DRAFT_LIMIT } from "./trust-copy";
import {
  OBJECT_STREAM_CLASSES,
  OBJECT_STREAM_LABEL_MAX,
  OBJECT_STREAM_MAX_COUNT,
  OBJECT_STREAM_VALUE_MAX,
} from "../validation/object-streams";

export const AI_DRAFT_HINT_MAX = 200;
export const MANIFESTO_LINE_MAX = 280;
export const PILOT_TEMPLATES = ["status_plate", "general", "lost_item_relay"] as const;
export type PilotTemplate = (typeof PILOT_TEMPLATES)[number];

export type DraftObjectStream = {
  label: string;
  value: string;
  class: string;
};

export type ManifestoDraft = {
  object_label?: string;
  status_line?: string;
  manifesto_line?: string;
  relay_item?: string;
  relay_message?: string;
  object_streams?: DraftObjectStream[];
};

export type DraftManifestoRequest = {
  pilot_template: PilotTemplate;
  hint?: string;
  current?: {
    manifesto_line?: string;
    object_streams?: DraftObjectStream[];
  };
};

export const AI_DRAFT_DISCLAIMER = AI_DRAFT_LIMIT;

export const AI_DRAFT_SYSTEM_PROMPT = `You help stewards draft public copy for a revocable physical QR object.
Return ONLY valid JSON (no markdown fences) matching the requested shape.
Rules:
- Plain text only; no HTML.
- Do not invent verification, legal identity, phone numbers, or email unless the hint explicitly provides them for a lost-item return message.
- Stay within character limits given in the user message.
- object_streams are optional short detail rows (label + value), max 2 entries.
- class for each stream must be one of: place, care, narrative, route.`;

export function validateDraftRequest(body: unknown): DraftManifestoRequest | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object." };
  }
  const record = body as Record<string, unknown>;
  const pilot = record.pilot_template;
  if (typeof pilot !== "string" || !PILOT_TEMPLATES.includes(pilot as PilotTemplate)) {
    return { error: "pilot_template must be status_plate, general, or lost_item_relay." };
  }

  let hint: string | undefined;
  if (record.hint !== undefined && record.hint !== null) {
    if (typeof record.hint !== "string") return { error: "hint must be a string." };
    hint = record.hint.trim();
    if (hint.length > AI_DRAFT_HINT_MAX) {
      return { error: `hint must be ${AI_DRAFT_HINT_MAX} characters or fewer.` };
    }
    if (!hint) hint = undefined;
  }

  let current: DraftManifestoRequest["current"];
  if (record.current !== undefined) {
    if (!record.current || typeof record.current !== "object") {
      return { error: "current must be an object when provided." };
    }
    const cur = record.current as Record<string, unknown>;
    current = {};
    if (cur.manifesto_line !== undefined) {
      if (typeof cur.manifesto_line !== "string") {
        return { error: "current.manifesto_line must be a string." };
      }
      current.manifesto_line = cur.manifesto_line.trim() || undefined;
    }
    if (cur.object_streams !== undefined) {
      const streams = normalizeDraftStreams(cur.object_streams, OBJECT_STREAM_MAX_COUNT);
      if ("error" in streams) return streams;
      current.object_streams = streams;
    }
  }

  return { pilot_template: pilot as PilotTemplate, hint, current };
}

function normalizeDraftStreams(
  raw: unknown,
  maxCount = 2
): DraftObjectStream[] | { error: string } {
  if (!Array.isArray(raw)) return { error: "object_streams must be an array." };
  if (raw.length > maxCount) {
    return { error: `object_streams may include at most ${maxCount} entries.` };
  }
  const out: DraftObjectStream[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      return { error: "Each object_streams entry must be an object." };
    }
    const row = item as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const value = typeof row.value === "string" ? row.value.trim() : "";
    const streamClass =
      typeof row.class === "string" && OBJECT_STREAM_CLASSES.includes(row.class)
        ? row.class
        : "place";
    if (!label || !value) continue;
    if (label.length > OBJECT_STREAM_LABEL_MAX || value.length > OBJECT_STREAM_VALUE_MAX) {
      return { error: "Stream label or value exceeds max length." };
    }
    if (/<[^>]+>/.test(label) || /<[^>]+>/.test(value)) {
      return { error: "Streams must be plain text." };
    }
    out.push({ label, value, class: streamClass });
  }
  return out;
}

export function buildDraftUserPrompt(req: DraftManifestoRequest): string {
  const lines = [
    `pilot_template: ${req.pilot_template}`,
    `hint: ${req.hint || "(none)"}`,
  ];
  if (req.current?.manifesto_line) {
    lines.push(`current_manifesto_line: ${req.current.manifesto_line}`);
  }
  if (req.current?.object_streams?.length) {
    lines.push(
      `current_object_streams: ${JSON.stringify(req.current.object_streams)}`
    );
  }

  if (req.pilot_template === "status_plate") {
    lines.push(
      "",
      "Return JSON:",
      '{ "object_label": "string max 120", "status_line": "string max 160", "object_streams": [{ "label": "max 40", "value": "max 120", "class": "place|care|narrative|route" }] }',
      "Combined object_label + newline + status_line must be <= 280 characters."
    );
  } else if (req.pilot_template === "lost_item_relay") {
    lines.push(
      "",
      "Return JSON:",
      '{ "relay_item": "max 120", "relay_message": "max 160" }',
      'Published form is "[relay] {item}\\n{message}" with total length <= 280.'
    );
  } else {
    lines.push(
      "",
      "Return JSON:",
      '{ "manifesto_line": "string max 280", "object_streams": [{ "label", "value", "class" }] }'
    );
  }
  return lines.join("\n");
}

export function extractJsonObjectFromAiText(text: string): unknown | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1]!.trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

export function parseAiDraftPayload(
  raw: unknown,
  pilot: PilotTemplate
): ManifestoDraft | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "AI draft was not a JSON object." };
  }
  const record = raw as Record<string, unknown>;
  const draft: ManifestoDraft = {};

  if (pilot === "status_plate") {
    const objectLabel =
      typeof record.object_label === "string" ? record.object_label.trim() : "";
    const statusLine =
      typeof record.status_line === "string" ? record.status_line.trim() : "";
    if (!objectLabel || !statusLine) {
      return { error: "Draft missing object_label or status_line." };
    }
    if (objectLabel.length > 120 || statusLine.length > 160) {
      return { error: "Draft fields exceed max length." };
    }
    const combined = `${objectLabel}\n${statusLine}`;
    if (combined.length > MANIFESTO_LINE_MAX) {
      return { error: "Combined manifesto exceeds 280 characters." };
    }
    draft.object_label = objectLabel;
    draft.status_line = statusLine;
    draft.manifesto_line = combined;
  } else if (pilot === "lost_item_relay") {
    const relayItem =
      typeof record.relay_item === "string" ? record.relay_item.trim() : "";
    const relayMessage =
      typeof record.relay_message === "string" ? record.relay_message.trim() : "";
    if (!relayItem || !relayMessage) {
      return { error: "Draft missing relay_item or relay_message." };
    }
    const combined = `[relay] ${relayItem}\n${relayMessage}`;
    if (combined.length > MANIFESTO_LINE_MAX) {
      return { error: "Combined relay text exceeds 280 characters." };
    }
    draft.relay_item = relayItem;
    draft.relay_message = relayMessage;
    draft.manifesto_line = combined;
  } else {
    const line =
      typeof record.manifesto_line === "string" ? record.manifesto_line.trim() : "";
    if (!line) return { error: "Draft missing manifesto_line." };
    if (line.length > MANIFESTO_LINE_MAX) {
      return { error: "manifesto_line exceeds 280 characters." };
    }
    draft.manifesto_line = line;
  }

  if (record.object_streams !== undefined) {
    const streams = normalizeDraftStreams(record.object_streams, 2);
    if ("error" in streams) return streams;
    if (streams.length) draft.object_streams = streams;
  }

  return draft;
}

export function deterministicDraftManifesto(
  req: DraftManifestoRequest
): ManifestoDraft {
  const hint = req.hint?.trim();
  const current = req.current;

  if (req.pilot_template === "status_plate") {
    const objectLabel =
      hint?.split(/[.,]/)[0]?.trim().slice(0, 120) ||
      current?.manifesto_line?.split("\n")[0]?.trim().slice(0, 120) ||
      "Studio door";
    const statusLine =
      hint && hint.length > objectLabel.length
        ? hint.slice(objectLabel.length).replace(/^[\s,.-]+/, "").slice(0, 160) ||
          "Open — check scan for current status"
        : current?.manifesto_line?.split("\n")[1]?.trim().slice(0, 160) ||
          "Open — check scan for current status";
    const combined = `${objectLabel}\n${statusLine}`.slice(0, MANIFESTO_LINE_MAX);
    const nl = combined.indexOf("\n");
    return {
      object_label: nl >= 0 ? combined.slice(0, nl) : objectLabel,
      status_line: nl >= 0 ? combined.slice(nl + 1) : statusLine,
      manifesto_line: combined,
      object_streams: current?.object_streams?.length
        ? current.object_streams
        : hint
          ? [{ label: "Note", value: hint.slice(0, OBJECT_STREAM_VALUE_MAX), class: "place" }]
          : undefined,
    };
  }

  if (req.pilot_template === "lost_item_relay") {
    const relayItem = hint?.split(/[.,]/)[0]?.trim().slice(0, 120) || "Keys";
    const relayMessage =
      hint?.includes(",") || hint?.includes(".")
        ? hint.replace(/^[^,.]+[,.]\s*/, "").slice(0, 160) ||
          "Found — thank you for helping return this item."
        : "Found — thank you for helping return this item.";
    const combined = `[relay] ${relayItem}\n${relayMessage}`.slice(0, MANIFESTO_LINE_MAX);
    return {
      relay_item: relayItem,
      relay_message: relayMessage,
      manifesto_line: combined,
    };
  }

  const manifestoLine =
    hint?.slice(0, MANIFESTO_LINE_MAX) ||
    current?.manifesto_line?.slice(0, MANIFESTO_LINE_MAX) ||
    "Live on the network — update this line anytime.";
  return {
    manifesto_line: manifestoLine,
    object_streams: current?.object_streams,
  };
}

export function extractAiDraftFromResponse(response: unknown): ManifestoDraft | null {
  const text = extractAiText(response);
  if (!text) return null;
  const parsed = extractJsonObjectFromAiText(text);
  if (!parsed) return null;
  return parsed as ManifestoDraft;
}

export type AiDraftSource = "workers_ai" | "deterministic";

export function aiDraftResponseBody(
  draft: ManifestoDraft,
  source: AiDraftSource
): {
  draft: ManifestoDraft;
  source: AiDraftSource;
  disclaimer: string;
  limits: { ai_draft_warning: string };
} {
  return {
    draft,
    source,
    disclaimer: AI_DRAFT_DISCLAIMER,
    limits: { ai_draft_warning: AI_DRAFT_LIMIT },
  };
}
