import { parseManifestoDisplay } from "./manifesto-display";
import type { ObjectPublicStream } from "../validation/object-streams";

export type PublicObjectSnapshotField = {
  key: string;
  value: string;
};

export type PublicObjectSnapshot = {
  text: string;
  fields: PublicObjectSnapshotField[];
};

/**
 * Deterministic read-only assembly of signed public fields for integrators and
 * future read-only agents. Not generative — only repeats resolver state.
 */
export function buildPublicObjectSnapshot(
  manifestoLine: string | null,
  streams: ObjectPublicStream[]
): PublicObjectSnapshot | null {
  if (!streams.length) return null;

  const display = parseManifestoDisplay(manifestoLine);
  /** @type {PublicObjectSnapshotField[]} */
  const fields: PublicObjectSnapshotField[] = [];

  if (display.kind === "status_plate") {
    fields.push({ key: "object", value: display.objectLabel });
    fields.push({ key: "status", value: display.statusLine });
  } else if (display.kind === "general" && display.line) {
    fields.push({ key: "statement", value: display.line });
  } else {
    return null;
  }

  for (const stream of streams) {
    fields.push({ key: stream.label, value: stream.value });
  }

  const text = fields
    .map((field) => {
      if (field.key === "object" || field.key === "status" || field.key === "statement") {
        return field.value;
      }
      return `${field.key}: ${field.value}`;
    })
    .join(" · ");

  return { text, fields };
}
