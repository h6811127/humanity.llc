import { validateObjectStreamsField } from "../validation/object-streams";
import {
  GAME_DISTRICTS,
  GAME_NODE_OBJECT_TYPE,
  GAME_SEASON_ID_RE,
  isGameNodeRole,
} from "./constants";

export type GameMeta = {
  visible_until: string | null;
  compromised: boolean;
  collective_progress: number | null;
  collective_target: number | null;
  unlocked_by: string[];
  vouch_requires: string[];
  vouch_active_for: string[];
  scarcity_remaining: number | null;
  fragment_id: string | null;
};

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function readOptionalString(
  obj: Record<string, unknown>,
  field: string,
  maxLen: number
): string | null {
  if (!(field in obj)) return null;
  const value = obj[field];
  if (value === null) return null;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must be a string or null.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLen) {
    throw new Error(`${field} is too long.`);
  }
  return trimmed;
}

function readStringArray(obj: Record<string, unknown>, field: string, maxItems: number): string[] {
  if (!(field in obj)) return [];
  const value = obj[field];
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array.`);
  }
  if (value.length > maxItems) {
    throw new Error(`${field} may include at most ${maxItems} entries.`);
  }
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !item.trim()) {
      throw new Error(`Each ${field} entry must be a non-empty string.`);
    }
    const trimmed = item.trim();
    if (trimmed.length > 80) {
      throw new Error(`${field} entries must be at most 80 characters.`);
    }
    out.push(trimmed);
  }
  return out;
}

function readOptionalInt(
  obj: Record<string, unknown>,
  field: string,
  min: number,
  max: number
): number | null {
  if (!(field in obj)) return null;
  const value = obj[field];
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${field} must be an integer or null.`);
  }
  if (value < min || value > max) {
    throw new Error(`${field} must be between ${min} and ${max}.`);
  }
  return value;
}

function readBoolean(obj: Record<string, unknown>, field: string, defaultValue: boolean): boolean {
  if (!(field in obj)) return defaultValue;
  const value = obj[field];
  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean.`);
  }
  return value;
}

export function normalizeGameMeta(raw: unknown): GameMeta {
  if (raw === undefined || raw === null) {
    return {
      visible_until: null,
      compromised: false,
      collective_progress: null,
      collective_target: null,
      unlocked_by: [],
      vouch_requires: [],
      vouch_active_for: [],
      scarcity_remaining: null,
      fragment_id: null,
    };
  }
  if (!raw || typeof raw !== "object") {
    throw new Error("game_meta must be an object.");
  }
  const obj = raw as Record<string, unknown>;
  const visibleUntil = readOptionalString(obj, "visible_until", 40);
  if (visibleUntil !== null && !ISO_RE.test(visibleUntil)) {
    throw new Error("game_meta.visible_until must be ISO 8601 or null.");
  }
  return {
    visible_until: visibleUntil,
    compromised: readBoolean(obj, "compromised", false),
    collective_progress: readOptionalInt(obj, "collective_progress", 0, 1_000_000),
    collective_target: readOptionalInt(obj, "collective_target", 1, 1_000_000),
    unlocked_by: readStringArray(obj, "unlocked_by", 8),
    vouch_requires: readStringArray(obj, "vouch_requires", 8),
    vouch_active_for: readStringArray(obj, "vouch_active_for", 8),
    scarcity_remaining: readOptionalInt(obj, "scarcity_remaining", 0, 10_000),
    fragment_id: readOptionalString(obj, "fragment_id", 40),
  };
}

const DISTRICT_SLUG_RE = /^[a-z][a-z0-9_]{0,39}$/;

/**
 * @param {string | null} district
 * @param {readonly string[] | null | undefined} allowedDistricts
 */
export function validateGameNodeDistrict(
  district: string | null,
  allowedDistricts?: readonly string[] | null
): void {
  if (!district) return;
  if (!DISTRICT_SLUG_RE.test(district)) {
    throw new Error("district must be a lowercase slug or omitted.");
  }
  if (allowedDistricts?.length && !allowedDistricts.includes(district)) {
    throw new Error("district must match a season district or be omitted.");
  }
}

/** Validate game_node fields on a signed child_object document. */
export function validateGameNodeDocument(
  doc: Record<string, unknown>,
  opts: { allowedDistricts?: readonly string[] | null } = {}
): {
  seasonId: string;
  nodeRole: string;
  district: string | null;
  gameMeta: GameMeta;
} {
  if (doc.object_type !== GAME_NODE_OBJECT_TYPE) {
    throw new Error(`object_type must be ${GAME_NODE_OBJECT_TYPE}.`);
  }

  const seasonId = readOptionalString(doc, "season_id", 48);
  if (!seasonId || !GAME_SEASON_ID_RE.test(seasonId)) {
    throw new Error("season_id is required for game_node objects.");
  }

  const nodeRole = readOptionalString(doc, "node_role", 40);
  if (!nodeRole || !isGameNodeRole(nodeRole)) {
    throw new Error("node_role is required and must be a known game node role.");
  }

  let district: string | null = null;
  if ("district" in doc && doc.district !== null && doc.district !== undefined) {
    district = readOptionalString(doc, "district", 40);
    validateGameNodeDistrict(
      district,
      opts.allowedDistricts?.length ? opts.allowedDistricts : null
    );
  }

  validateObjectStreamsField(doc);
  const gameMeta = normalizeGameMeta(doc.game_meta);

  return { seasonId, nodeRole, district, gameMeta };
}

export function gameMetaFromChildDocumentJson(
  documentJson: string | null | undefined
): GameMeta | null {
  if (!documentJson) return null;
  try {
    const doc = JSON.parse(documentJson) as Record<string, unknown>;
    if (doc.object_type !== GAME_NODE_OBJECT_TYPE) return null;
    return normalizeGameMeta(doc.game_meta);
  } catch {
    return null;
  }
}
