/** Mirrors worker/src/resolver/manifesto-display.ts for owner UI. */
export const LOST_ITEM_RELAY_PREFIX = "[relay] ";

/**
 * @param {string | null | undefined} manifestoLine
 * @returns {{ kind: "general" | "status_plate" | "lost_item_relay"; line?: string; objectLabel?: string; statusLine?: string }}
 */
export function parseManifestoDisplay(manifestoLine) {
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

/**
 * @param {string | null | undefined} manifestoLine
 * @returns {"general" | "status_plate" | "lost_item_relay"}
 */
export function inferPilotTemplate(manifestoLine) {
  const d = parseManifestoDisplay(manifestoLine);
  if (d.kind === "lost_item_relay") return "lost_item_relay";
  if (d.kind === "status_plate") return "status_plate";
  return "general";
}
