import { isPhaseAChildObjectType } from "./object-types";

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

/** Public scan disclaimer — possession is not ownership proof. */
export const OBJECT_CUSTODY_DISCLAIMER =
  "Holding this object does not prove you are the card owner.";

export type ObjectCustodyPhase = "unset" | "active" | "expired";

export type ObjectCustody = {
  holder_label: string;
  until: string | null;
  note: string | null;
};

export type ObjectCustodyScanContext = {
  phase: ObjectCustodyPhase;
  holder_label: string | null;
  until: string | null;
  note: string | null;
  scanLine: string | null;
  scanNote: string | null;
  disclaimer: string;
};

function readOptionalString(
  obj: Record<string, unknown>,
  field: string,
  max: number
): string | null {
  const value = obj[field];
  if (value == null) return null;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`custody.${field} must be a non-empty string or null.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new Error(`custody.${field} is too long.`);
  }
  return trimmed;
}

function readRequiredString(
  obj: Record<string, unknown>,
  field: string,
  max: number
): string {
  const value = readOptionalString(obj, field, max);
  if (!value) {
    throw new Error(`custody.${field} is required.`);
  }
  return value;
}

function readOptionalIsoField(
  obj: Record<string, unknown>,
  field: string
): string | null {
  const raw = readOptionalString(obj, field, 40);
  if (raw == null) return null;
  if (!ISO_RE.test(raw)) {
    throw new Error(`custody.${field} must be ISO 8601 or null.`);
  }
  return raw;
}

/** Parse and validate optional `custody` on a signed child object document. */
export function parseObjectCustody(doc: Record<string, unknown>): ObjectCustody | null {
  const raw = doc.custody;
  if (raw == null) return null;
  if (typeof raw !== "object") {
    throw new Error("custody must be an object.");
  }
  const obj = raw as Record<string, unknown>;
  return {
    holder_label: readRequiredString(obj, "holder_label", 80),
    until: readOptionalIsoField(obj, "until"),
    note: readOptionalString(obj, "note", 120),
  };
}

export function validateCustodyForChildDocument(
  doc: Record<string, unknown>,
  objectType: string
): void {
  if (!isPhaseAChildObjectType(objectType)) {
    if (doc.custody != null) {
      throw new Error("custody applies only to status_plate and lost_item_relay.");
    }
    return;
  }
  parseObjectCustody(doc);
}

function parseInstant(raw: string | null | undefined): number | null {
  if (raw == null || !String(raw).trim()) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

export function resolveObjectCustodyPhase(
  custody: ObjectCustody | null,
  now: Date = new Date()
): ObjectCustodyPhase {
  if (!custody) return "unset";
  const untilMs = parseInstant(custody.until);
  if (untilMs != null && now.getTime() > untilMs) {
    return "expired";
  }
  return "active";
}

function formatCustodyUntilLabel(until: string): string | null {
  const ms = parseInstant(until);
  if (ms == null) return null;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

export function objectCustodyScanLine(
  custody: ObjectCustody,
  phase: ObjectCustodyPhase
): string | null {
  if (phase !== "active") return null;
  const parts = [`Held by ${custody.holder_label}`];
  if (custody.until) {
    const untilLabel = formatCustodyUntilLabel(custody.until);
    if (untilLabel) parts.push(`until ${untilLabel}`);
  }
  return parts.join(" · ");
}

export function objectCustodyScanNote(
  custody: ObjectCustody | null,
  phase: ObjectCustodyPhase
): string | null {
  if (!custody || phase === "unset") return null;
  if (phase === "expired") {
    return "The published custody assignment has ended. The object remains under the root steward.";
  }
  const parts = [OBJECT_CUSTODY_DISCLAIMER];
  if (custody.note) {
    parts.unshift(custody.note);
  }
  return parts.join(" ");
}

export function custodyFromChildDocumentJson(
  documentJson: string | null | undefined
): ObjectCustody | null {
  if (!documentJson?.trim()) return null;
  try {
    const doc = JSON.parse(documentJson) as Record<string, unknown>;
    return parseObjectCustody(doc);
  } catch {
    return null;
  }
}

export function resolveChildCustodyContext(input: {
  documentJson: string | null | undefined;
  now?: Date;
}): {
  custody: ObjectCustody | null;
  context: ObjectCustodyScanContext | null;
} {
  let custody: ObjectCustody | null;
  try {
    if (!input.documentJson?.trim()) {
      return { custody: null, context: null };
    }
    const doc = JSON.parse(input.documentJson) as Record<string, unknown>;
    custody = parseObjectCustody(doc);
  } catch {
    return { custody: null, context: null };
  }

  if (!custody) {
    return { custody: null, context: null };
  }

  const now = input.now ?? new Date();
  const phase = resolveObjectCustodyPhase(custody, now);
  return {
    custody,
    context: {
      phase,
      holder_label: custody.holder_label,
      until: custody.until,
      note: custody.note,
      scanLine: objectCustodyScanLine(custody, phase),
      scanNote: objectCustodyScanNote(custody, phase),
      disclaimer: OBJECT_CUSTODY_DISCLAIMER,
    },
  };
}

export function objectCustodyStatusPayload(
  context: ObjectCustodyScanContext | null
): Record<string, unknown> | null {
  if (!context || context.phase === "unset") return null;
  return {
    phase: context.phase,
    holder_label: context.holder_label,
    until: context.until,
    note: context.note,
    disclaimer: context.disclaimer,
  };
}
