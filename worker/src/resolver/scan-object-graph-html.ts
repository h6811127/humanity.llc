import type { ScanRelationshipStatus } from "../live-object/relationship-edge-spec";
import {
  incomingWitnessRelationships,
  outgoingWitnessRelationships,
} from "../live-object/scan-object-graph";
import type { ScanViewModel } from "./scan-state";
import {
  SCAN_OBJECT_GRAPH_HEADING,
  SCAN_OBJECT_GRAPH_INTRO,
  SCAN_OBJECT_GRAPH_PEER_UNAVAILABLE_NOTE,
  scanObjectGraphGroupTitle,
  scanObjectGraphNextStep,
  scanObjectGraphPeerLabel,
  scanObjectGraphPeerNameMissing,
  scanObjectGraphProvenanceLine,
  scanObjectGraphStatusLabel,
} from "./scan-object-graph-copy";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderRelationshipRow(row: ScanRelationshipStatus): string {
  const statusClass = row.satisfied
    ? "scan-object-graph-row--live"
    : "scan-object-graph-row--missing";
  const peer = scanObjectGraphPeerLabel(row);
  const peerNote = scanObjectGraphPeerNameMissing(row)
    ? `<p class="scan-object-graph-peer-note">${escapeHtml(SCAN_OBJECT_GRAPH_PEER_UNAVAILABLE_NOTE)}</p>`
    : "";
  return `<li class="scan-object-graph-row ${statusClass}">
  <p class="scan-object-graph-row-head">
    <span class="scan-object-graph-status">${escapeHtml(scanObjectGraphStatusLabel(row.satisfied))}</span>
  </p>
  <p class="scan-object-graph-next">${escapeHtml(scanObjectGraphNextStep(row))}</p>
  <p class="scan-object-graph-label">${escapeHtml(row.label)}</p>
  <p class="scan-object-graph-peer">${escapeHtml(peer)}</p>${peerNote}
</li>`;
}

function renderRelationshipGroup(
  title: string,
  rows: ScanRelationshipStatus[]
): string {
  if (!rows.length) return "";
  const items = rows.map(renderRelationshipRow).join("\n");
  return `<div class="scan-object-graph-group">
  <p class="scan-object-graph-group-title">${escapeHtml(title)}</p>
  <ul class="scan-object-graph-list" aria-label="${escapeHtml(title)}">${items}
  </ul>
</div>`;
}

function renderProvenanceNote(vm: ScanViewModel): string {
  if (!vm.relationshipRules) return "";
  const handle =
    vm.profileId === vm.relationshipRules.steward_profile_id && vm.handle?.trim()
      ? vm.handle.trim()
      : null;
  return `<p class="scan-object-graph-provenance" role="note">${escapeHtml(scanObjectGraphProvenanceLine(handle))}</p>`;
}

/** WS-OBJECT-GRAPH-V1 — signed witness edges on the object scan page. */
export function renderScanObjectGraphBlock(vm: ScanViewModel): string {
  if (!vm.relationships.length) return "";

  const incoming = incomingWitnessRelationships(vm.relationships);
  const outgoing = outgoingWitnessRelationships(vm.relationships);
  const provenance = renderProvenanceNote(vm);

  const groups = [
    renderRelationshipGroup(
      scanObjectGraphGroupTitle("required_by"),
      incoming
    ),
    renderRelationshipGroup(scanObjectGraphGroupTitle("unlocks"), outgoing),
  ]
    .filter(Boolean)
    .join("\n");

  if (!groups) return "";

  return `<section class="scan-object-graph" aria-labelledby="scan-object-graph-heading">
  <h2 class="scan-object-graph-heading" id="scan-object-graph-heading">${escapeHtml(SCAN_OBJECT_GRAPH_HEADING)}</h2>
  <p class="scan-object-graph-intro">${escapeHtml(SCAN_OBJECT_GRAPH_INTRO)}</p>
  ${provenance}
  ${groups}
</section>`;
}
