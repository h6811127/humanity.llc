import type { QrScope } from "../db/types";
import {
  CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
  CHILD_OBJECT_TYPE_STATUS_PLATE,
  isPhaseAChildObjectType,
} from "../live-object/object-types";

/**
 * Pilot manifesto layouts (two lines, line 1 may carry a prefix):
 * - Status plate: "Studio door" + "Open until 9 PM"
 * - Lost item relay: "[relay] Keys" + "Lost  -  contact owner via relay"
 */
export const LOST_ITEM_RELAY_PREFIX = "[relay] ";

/** Hero template for active scans (docs/M3_SCAN_PAGE_UI.md § Scan type heroes). */
export type ScanHeroTemplate =
  | "status_plate"
  | "lost_item_relay"
  | "live_object"
  | "personal_card";

/** Manifesto reads as an object message (sticker / labeled artifact), not a card tagline. */
export const OBJECT_FORWARD_MANIFESTO_MIN_LEN = 56;
export const OBJECT_FORWARD_SENTENCE_MIN_LEN = 28;

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

export function isObjectForwardManifesto(
  qrScope: QrScope | null,
  line: string | null
): boolean {
  if (qrScope === "print_artifact") return true;
  const t = line?.trim();
  if (!t) return false;
  if (t.length >= OBJECT_FORWARD_MANIFESTO_MIN_LEN) return true;
  return t.includes(".") && t.length >= OBJECT_FORWARD_SENTENCE_MIN_LEN;
}

/** Build scan manifesto_line from a child_objects row (lost-item relays need [relay] prefix). */
export function childObjectManifestoLine(child: {
  object_type: string;
  public_label: string;
  public_state: string;
}): string {
  const label =
    child.object_type === CHILD_OBJECT_TYPE_LOST_ITEM_RELAY
      ? `${LOST_ITEM_RELAY_PREFIX}${child.public_label}`
      : child.public_label;
  return `${label}\n${child.public_state}`;
}

/** First-class child object display — preferred over manifesto bridge when type is known. */
export function parseDisplayFromChildObject(child: {
  object_type: string;
  public_label: string;
  public_state: string;
}): ManifestoDisplay | null {
  const objectLabel = child.public_label.trim();
  const statusLine = child.public_state.trim();
  if (!objectLabel || !statusLine) return null;
  if (child.object_type === CHILD_OBJECT_TYPE_LOST_ITEM_RELAY) {
    return { kind: "lost_item_relay", objectLabel, statusLine };
  }
  if (child.object_type === CHILD_OBJECT_TYPE_STATUS_PLATE) {
    return { kind: "status_plate", objectLabel, statusLine };
  }
  return null;
}

export type ScanHeroDisplayInput = {
  manifestoLine: string | null;
  qrScope: QrScope | null;
  childObjectType?: string | null;
  childPublicLabel?: string | null;
  childPublicState?: string | null;
};

/** Resolve hero layout from child object fields when present; else manifesto bridge. */
export function resolveScanHeroDisplay(input: ScanHeroDisplayInput): {
  display: ManifestoDisplay;
  template: ScanHeroTemplate;
} {
  if (
    isPhaseAChildObjectType(input.childObjectType) &&
    input.childPublicLabel?.trim() &&
    input.childPublicState?.trim()
  ) {
    const display = parseDisplayFromChildObject({
      object_type: input.childObjectType,
      public_label: input.childPublicLabel,
      public_state: input.childPublicState,
    });
    if (display) {
      return { display, template: scanHeroTemplate(display, input.qrScope) };
    }
  }
  const display = parseManifestoDisplay(input.manifestoLine);
  return { display, template: scanHeroTemplate(display, input.qrScope) };
}

export function scanHeroTemplate(
  display: ManifestoDisplay,
  qrScope: QrScope | null
): ScanHeroTemplate {
  if (display.kind === "status_plate") return "status_plate";
  if (display.kind === "lost_item_relay") return "lost_item_relay";
  if (display.kind === "general") {
    return isObjectForwardManifesto(qrScope, display.line)
      ? "live_object"
      : "personal_card";
  }
  return "personal_card";
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
