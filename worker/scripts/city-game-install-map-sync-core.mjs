/**
 * Sync O2 install map registry rows from season JSON.
 * @see docs/CITY_GAME_NODE_INSTALL_MAP.md
 */

/**
 * @param {{ node_id?: string; label?: string; district?: string; object_id?: string; role?: string; node_class?: string }} node
 */
export function installMapNoteForNode(node) {
  const notes = [];
  if (node.role === "sanctuary") notes.push("Sanctuary");
  if (node.node_class === "faction_hq") notes.push("Faction HQ");
  if (node.node_class === "artifact") notes.push("Artifact");
  if (node.node_class === "world_event") notes.push("World event");
  if (node.role === "witness") notes.push("Witness");
  if (node.role === "temp_drop") notes.push("Temp drop");
  if (node.role === "finale") notes.push("Finale");
  if (node.role === "care_loop") notes.push("Care loop");
  return notes.join(" · ");
}

/**
 * @param {{ node_id?: string; label?: string; district?: string; object_id?: string; role?: string; node_class?: string }} node
 * @param {{ installed?: boolean; qrIssued?: boolean }} [status]
 */
export function formatInstallMapRegistryRow(node, status = {}) {
  const installed = status.installed ? "☑" : "☐";
  const qr = status.qrIssued ? "☑" : "☐";
  const note = installMapNoteForNode(node);
  const label = String(node.label ?? node.node_id ?? "").trim();
  const district = String(node.district ?? "").trim();
  const objectId = String(node.object_id ?? "").trim();
  const nodeId = String(node.node_id ?? "").trim();
  return `| ${nodeId} | ${label} | ${district} | ${objectId} | ${installed} | ${qr} | ${note} |`;
}

/**
 * @param {Array<{ node_id: string; label?: string; district?: string; object_id?: string; role?: string; node_class?: string }>} nodes
 */
export function sortSeasonNodesForInstallMap(nodes) {
  return [...nodes].sort(
    (a, b) =>
      Number(String(a.node_id).replace("node_", "")) -
      Number(String(b.node_id).replace("node_", ""))
  );
}

/**
 * @param {string} content
 * @param {Array<Record<string, unknown>>} seasonNodes
 */
export function syncInstallMapRegistrySection(content, seasonNodes) {
  const start = content.indexOf("## Registry");
  if (start < 0) throw new Error("install_map_missing_registry_section");
  const afterHeader = content.indexOf("\n| node_id |", start);
  if (afterHeader < 0) throw new Error("install_map_missing_registry_table");
  const end = content.indexOf("\n---\n", afterHeader);
  if (end < 0) throw new Error("install_map_missing_registry_footer");

  const existing = new Map();
  for (const line of content.slice(afterHeader, end).split("\n")) {
    const parts = line.split("|").map((p) => p.trim());
    if (!/^node_\d+$/.test(parts[1] ?? "")) continue;
    existing.set(parts[1], {
      installed: (parts[5] ?? "").startsWith("☑"),
      qrIssued: (parts[6] ?? "").startsWith("☑"),
    });
  }

  const sorted = sortSeasonNodesForInstallMap(
    seasonNodes.filter((n) => n && n.node_id)
  );
  const header = content.slice(start, afterHeader).trimEnd();
  const tableHeader = `| node_id | Label | District | object_id | Installed? | QR issued? | Notes |
|---------|-------|----------|-----------|------------|------------|-------|`;
  const rows = sorted.map((node) => {
    const prior = existing.get(String(node.node_id));
    return formatInstallMapRegistryRow(node, prior ?? {});
  });

  const body = [header, "", tableHeader, ...rows, ""].join("\n");
  return content.slice(0, start) + body + content.slice(end);
}

/**
 * @param {string} content
 * @param {number} nodeCount
 */
export function updateInstallMapPhaseCGateLine(content, nodeCount) {
  return content.replace(
    /Engineering registry \(\d+ nodes, object IDs\)/,
    `Engineering registry (${nodeCount} nodes, object IDs)`
  );
}
