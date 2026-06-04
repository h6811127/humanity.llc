import type { QrScope } from "../db/types";
export {
  LOST_ITEM_RELAY_PREFIX,
  OBJECT_FORWARD_MANIFESTO_MIN_LEN,
  OBJECT_FORWARD_SENTENCE_MIN_LEN,
  childObjectManifestoLine,
  inferPilotTemplate,
  isObjectForwardManifesto,
  parseDisplayFromChildObject,
  parseManifestoDisplay,
  resolveScanHeroDisplay,
  scanHeroTemplate,
  splitManifestoDisplay,
} from "../../../site/js/manifesto-display-core.mjs";

/** Hero template for active scans (docs/M3_SCAN_PAGE_UI.md § Scan type heroes). */
export type ScanHeroTemplate =
  | "status_plate"
  | "lost_item_relay"
  | "live_object"
  | "personal_card";

export type ManifestoDisplay =
  | { kind: "general"; line: string | null }
  | { kind: "status_plate"; objectLabel: string; statusLine: string }
  | { kind: "lost_item_relay"; objectLabel: string; statusLine: string };

export type ScanHeroDisplayInput = {
  manifestoLine: string | null;
  qrScope: QrScope | null;
  childObjectType?: string | null;
  childPublicLabel?: string | null;
  childPublicState?: string | null;
};
