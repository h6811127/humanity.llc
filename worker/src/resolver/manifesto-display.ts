/**
 * Status-plate pilot: manifesto_line uses two lines — object label, then status detail.
 * Line 1: "Studio door" · Line 2: "Open · Thu–Sun until 9 PM"
 */
export function splitManifestoDisplay(manifestoLine: string | null): {
  isStatusPlate: boolean;
  objectLabel: string | null;
  statusLine: string | null;
} {
  if (!manifestoLine?.trim()) {
    return { isStatusPlate: false, objectLabel: null, statusLine: null };
  }
  const nl = manifestoLine.indexOf("\n");
  if (nl === -1) {
    return { isStatusPlate: false, objectLabel: null, statusLine: manifestoLine.trim() };
  }
  const first = manifestoLine.slice(0, nl).trim();
  const rest = manifestoLine.slice(nl + 1).trim();
  if (!first || !rest) {
    return { isStatusPlate: false, objectLabel: null, statusLine: manifestoLine.trim() };
  }
  return { isStatusPlate: true, objectLabel: first, statusLine: rest };
}
