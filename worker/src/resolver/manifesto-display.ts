/**
 * Pilot manifesto layouts (two lines, line 1 may carry a prefix):
 * - Status plate: "Studio door" + "Open until 9 PM"
 * - Lost item relay: "[relay] Keys" + "Lost — contact owner via relay"
 */
export const LOST_ITEM_RELAY_PREFIX = "[relay] ";

export type ManifestoDisplay =
  | { kind: "general"; line: string | null }
  | { kind: "status_plate"; objectLabel: string; statusLine: string }
  | { kind: "lost_item_relay"; objectLabel: string; statusLine: string };

export function parseManifestoDisplay(manifestoLine: string | null): ManifestoDisplay {
  if (!manifestoLine?.trim()) {
    return { kind: "general", line: null };
  }
  const nl = manifestoLine.indexOf("\n");
  if (nl === -1) {
    return { kind: "general", line: manifestoLine.trim() };
  }
  const first = manifestoLine.slice(0, nl).trim();
  const rest = manifestoLine.slice(nl + 1).trim();
  if (!first || !rest) {
    return { kind: "general", line: manifestoLine.trim() };
  }
  if (first.startsWith(LOST_ITEM_RELAY_PREFIX)) {
    const objectLabel = first.slice(LOST_ITEM_RELAY_PREFIX.length).trim();
    if (objectLabel) {
      return { kind: "lost_item_relay", objectLabel, statusLine: rest };
    }
  }
  return { kind: "status_plate", objectLabel: first, statusLine: rest };
}

/** @deprecated use parseManifestoDisplay */
export function splitManifestoDisplay(manifestoLine: string | null): {
  isStatusPlate: boolean;
  objectLabel: string | null;
  statusLine: string | null;
} {
  const d = parseManifestoDisplay(manifestoLine);
  if (d.kind === "status_plate") {
    return { isStatusPlate: true, objectLabel: d.objectLabel, statusLine: d.statusLine };
  }
  if (d.kind === "lost_item_relay") {
    return { isStatusPlate: false, objectLabel: d.objectLabel, statusLine: d.statusLine };
  }
  return { isStatusPlate: false, objectLabel: null, statusLine: d.line };
}
