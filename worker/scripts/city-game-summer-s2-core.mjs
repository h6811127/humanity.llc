/**
 * WS-SW summer S2 gamification — artifacts (SW-09) + overharvest (SW-12) on named nodes.
 * Canon: docs/CITY_GAME_SUMMER_MOMENTUM.md · traceability SW-09 / SW-12.
 */

/** @type {Record<string, string>} */
export const SUMMER_S2_ARTIFACT_BY_NODE = {
  node_21: "hidden_relay",
  node_22: "double_capture",
};

/** @type {Record<string, number>} */
export const SUMMER_S2_OVERHARVEST_LIMIT_BY_NODE = {
  node_15: 18,
  node_31: 20,
};

export const SUMMER_S2_RELAY_CAPTURE_ADD = ["node_21", "node_22"];

/**
 * @param {Record<string, unknown>} season
 */
export function validateSeasonSummerS2(season) {
  const issues = [];
  const sw = season.signal_war;
  if (!sw || typeof sw !== "object") {
    issues.push("signal_war block required for summer S2 validation.");
    return { ok: false, issues };
  }
  const s2 = sw.summer_s2;
  if (!s2 || typeof s2 !== "object") {
    issues.push("signal_war.summer_s2 required (artifact_meta + overharvest_limits).");
    return { ok: false, issues };
  }

  const registryIds = new Set(
    (Array.isArray(season.nodes) ? season.nodes : []).map((row) => row.node_id)
  );

  const artifactMeta = s2.artifact_meta ?? {};
  for (const [nodeId, artifactId] of Object.entries(SUMMER_S2_ARTIFACT_BY_NODE)) {
    if (!registryIds.has(nodeId)) continue;
    if (artifactMeta[nodeId] !== artifactId) {
      issues.push(
        `summer_s2.artifact_meta.${nodeId} expected ${artifactId}, got ${String(artifactMeta[nodeId])}.`
      );
    }
  }

  const limits = s2.overharvest_limits ?? {};
  for (const [nodeId, limit] of Object.entries(SUMMER_S2_OVERHARVEST_LIMIT_BY_NODE)) {
    if (!registryIds.has(nodeId)) continue;
    if (limits[nodeId] !== limit) {
      issues.push(
        `summer_s2.overharvest_limits.${nodeId} expected ${limit}, got ${String(limits[nodeId])}.`
      );
    }
  }

  const capture = season.automation?.relay_capture_nodes ?? [];
  for (const nodeId of SUMMER_S2_RELAY_CAPTURE_ADD) {
    if (!registryIds.has(nodeId)) continue;
    if (!capture.includes(nodeId)) {
      issues.push(`automation.relay_capture_nodes must include ${nodeId} for artifact capture.`);
    }
  }
  for (const nodeId of Object.keys(SUMMER_S2_OVERHARVEST_LIMIT_BY_NODE)) {
    if (!registryIds.has(nodeId)) continue;
    if (!capture.includes(nodeId)) {
      issues.push(`automation.relay_capture_nodes must include ${nodeId} for overharvest.`);
    }
  }

  return { ok: issues.length === 0, issues };
}

/** Minimal wave-open rows required for S2 mint-template tests. */
export const SUMMER_S2_NODE_ROWS = [
  {
    node_id: "node_21",
    object_id: "obj_cr_node_21_signal_stone",
    role: "relay_gate",
    node_class: "artifact",
    district: "downtown",
    label: "Signal stone · alley niche",
  },
  {
    node_id: "node_22",
    object_id: "obj_cr_node_22_glitch_coil",
    role: "relay_gate",
    node_class: "artifact",
    district: "newbo",
    label: "Glitch coil · market threshold",
  },
  {
    node_id: "node_31",
    object_id: "obj_cr_node_31_capitol_steps",
    role: "relay_gate",
    node_class: "common_relay",
    district: "downtown",
    label: "Capitol steps · hot relay",
  },
];

/**
 * @param {Record<string, unknown>} season
 */
export function mergeSummerS2(season) {
  const merged = structuredClone(season);
  if (!merged.signal_war || typeof merged.signal_war !== "object") {
    merged.signal_war = {};
  }
  merged.signal_war.summer_s2 = {
    artifact_meta: { ...SUMMER_S2_ARTIFACT_BY_NODE },
    overharvest_limits: { ...SUMMER_S2_OVERHARVEST_LIMIT_BY_NODE },
  };
  const registryIds = new Set(
    (Array.isArray(merged.nodes) ? merged.nodes : []).map((row) => row.node_id)
  );
  const capture = new Set(merged.automation?.relay_capture_nodes ?? []);
  for (const nodeId of SUMMER_S2_RELAY_CAPTURE_ADD) {
    if (registryIds.has(nodeId)) capture.add(nodeId);
  }
  for (const nodeId of Object.keys(SUMMER_S2_OVERHARVEST_LIMIT_BY_NODE)) {
    if (registryIds.has(nodeId)) capture.add(nodeId);
  }
  merged.automation = {
    ...merged.automation,
    relay_capture_nodes: [...capture],
    relay_capture_player_enabled: false,
  };
  return merged;
}

/**
 * Pilot tests: attach wave-open S2 rows without mutating committed 15-node registry.
 * @param {Record<string, unknown>} season
 */
export function seasonWithSummerS2Nodes(season) {
  const merged = mergeSummerS2(season);
  const nodes = Array.isArray(merged.nodes) ? [...merged.nodes] : [];
  const ids = new Set(nodes.map((row) => row.node_id));
  for (const row of SUMMER_S2_NODE_ROWS) {
    if (!ids.has(row.node_id)) {
      nodes.push({ ...row, install_wave: "open" });
      ids.add(row.node_id);
    }
  }
  merged.nodes = nodes;
  return mergeSummerS2(merged);
}

/**
 * Mint-template overrides for summer S2 (**SW-09** / **SW-12**).
 * @param {string} nodeId
 * @returns {Record<string, unknown> | null}
 */
export function summerS2TemplateOverride(nodeId) {
  const artifactId = SUMMER_S2_ARTIFACT_BY_NODE[nodeId];
  const overharvestLimit = SUMMER_S2_OVERHARVEST_LIMIT_BY_NODE[nodeId];
  if (!artifactId && overharvestLimit == null) return null;

  /** @type {Record<string, unknown>} */
  const game_meta = {};
  if (artifactId) game_meta.artifact_id = artifactId;
  if (overharvestLimit != null) {
    game_meta.overharvest_limit = overharvestLimit;
    game_meta.overharvest_count = 0;
  }

  /** @type {Record<string, unknown>} */
  const out = { game_meta };

  if (artifactId === "hidden_relay") {
    out.public_state = "Hidden relay — capture once to reveal on the city board";
    out.streams = [
      { id: "territory", class: "place", label: "Controller", value: "Unclaimed · hidden" },
      { id: "relay", class: "route", label: "Relay status", value: "Rumored only on board" },
      {
        id: "bulletin",
        class: "narrative",
        label: "Artifact",
        value: "Signal stone — first capture reveals this relay",
      },
      { id: "care", class: "care", label: "Site", value: "Clear" },
    ];
  } else if (artifactId === "double_capture") {
    out.public_state = "Glitch coil — next hold counts double on the network board";
    out.streams = [
      { id: "territory", class: "place", label: "Controller", value: "Unclaimed" },
      { id: "relay", class: "route", label: "Relay status", value: "Rare · double weight" },
      {
        id: "bulletin",
        class: "narrative",
        label: "Artifact",
        value: "Double capture — faction totals count this hold ×2",
      },
      { id: "care", class: "care", label: "Site", value: "Clear" },
    ];
  } else if (overharvestLimit != null) {
    out.public_state = "Hot relay — too many captures compromise it for every faction";
    out.streams = [
      { id: "territory", class: "place", label: "Controller", value: "Unclaimed" },
      {
        id: "relay",
        class: "route",
        label: "Relay status",
        value: `Commons · ${overharvestLimit} captures before compromise`,
      },
      {
        id: "bulletin",
        class: "narrative",
        label: "Warning",
        value: "Overharvest flips compromised for all teams — reinforce or spread out",
      },
      { id: "care", class: "care", label: "Site", value: "Clear" },
    ];
  }

  return out;
}
