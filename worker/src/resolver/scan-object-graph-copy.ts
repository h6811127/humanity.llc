import type { ScanRelationshipStatus } from "../live-object/relationship-edge-spec";
import {
  RELATIONSHIP_EDGE_KIND_UNLOCKS,
  RELATIONSHIP_EDGE_KIND_WITNESSES,
} from "../live-object/relationship-edge-spec";

/** WS-OBJECT-GRAPH-PRODUCT-V1 — stranger-facing scan copy (HTML only). */
export const SCAN_OBJECT_GRAPH_HEADING = "How this place connects";
export const SCAN_OBJECT_GRAPH_INTRO =
  "This object is part of a live network.";

export const SCAN_OBJECT_GRAPH_PEER_UNAVAILABLE_NOTE =
  "Public name unavailable — check the city board for this stop.";

export function scanObjectGraphGroupTitle(
  role: ScanRelationshipStatus["role"]
): string {
  return role === "required_by"
    ? "Before you can open this"
    : "Places you help unlock";
}

export function scanObjectGraphStatusLabel(satisfied: boolean): string {
  return satisfied ? "Live" : "Missing";
}

/** Peer label for next-step copy — never expose raw object_id to scanners. */
export function scanObjectGraphPeerLabel(row: ScanRelationshipStatus): string {
  const label = row.peer_public_label?.trim();
  if (label) return label;
  const nodeId =
    row.direction === "incoming" ? row.from_node_id : row.to_node_id;
  if (nodeId?.trim()) return `Nearby place · ${nodeId}`;
  return "Another place in this network";
}

export function scanObjectGraphPeerNameMissing(
  row: ScanRelationshipStatus
): boolean {
  return !row.peer_public_label?.trim();
}

/** One-line next step for Missing / Live rows on the scan page. */
export function scanObjectGraphNextStep(row: ScanRelationshipStatus): string {
  const peer = scanObjectGraphPeerLabel(row);
  if (row.role === "required_by") {
    if (row.kind === RELATIONSHIP_EDGE_KIND_UNLOCKS) {
      return row.satisfied
        ? "You're clear — continue here."
        : `Visit ${peer} and contribute together first, then return here.`;
    }
    return row.satisfied
      ? "You're clear — continue here."
      : `Visit ${peer} first, then return here.`;
  }
  if (row.kind === RELATIONSHIP_EDGE_KIND_UNLOCKS) {
    return row.satisfied
      ? `Collective progress here helped open ${peer}.`
      : `When enough people contribute together, ${peer} opens for everyone.`;
  }
  return row.satisfied
    ? `Your visit here helped open ${peer}.`
    : `Visit here and witness to help open ${peer}.`;
}

/** Who published the season connection routes — no authority/steward jargon. */
export function scanObjectGraphProvenanceLine(handle: string | null): string {
  const who = handle?.trim()
    ? `@${handle.trim().replace(/^@/, "")}`
    : "the season operator";
  return `Connection routes for this season were published by ${who}.`;
}

/** @deprecated Use scanObjectGraphProvenanceLine */
export const scanObjectGraphAuthorityLine = scanObjectGraphProvenanceLine;
