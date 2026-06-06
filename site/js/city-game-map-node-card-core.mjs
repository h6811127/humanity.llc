/**
 * City board node row card copy — what / why (via effect line) / scan slots.
 * @see docs/CITY_GAME_MAP_DASHBOARD.md
 */

/** @typedef {{ what?: string; why?: string; scan?: string }} NodeCardCopy */

/** Plain-language role framing — city state, not personal progress. */
export const ROLE_NODE_CARD_COPY = {
  relay_gate: {
    what: "Relay gate — a district hold the city can claim together.",
    scan: "Scan reads the relay hold and bulletin — same view for everyone.",
  },
  lore_archive: {
    what: "Story archive — lore unlocks when the city opens the route.",
    scan: "Scan shows the chapter and any fragment the city registered.",
  },
  sanctuary: {
    what: "Sanctuary — a regroup spot with no capture pressure.",
    scan: "Scan shows sanctuary state and rumors — no account needed.",
  },
  temp_drop: {
    what: "Clue drop — signals here count toward shared city progress.",
    scan: "Scan can add one signal; the board updates for the whole city.",
  },
  witness: {
    what: "Witness spot — shared sunset window and vouch capacity.",
    scan: "Scan shows witness counts and paths open for the city.",
  },
  route_splitter: {
    what: "Route choice — the city picks which branch wakes next.",
    scan: "Scan reveals which route branch is live for everyone.",
  },
  finale: {
    what: "Finale switch — dormant until enough fragments heal the city.",
    scan: "Scan shows whether the finale is open for the city.",
  },
  care_loop: {
    what: "Care spot — maintenance truth can pause game copy.",
    scan: "Scan shows care state before game bulletins count.",
  },
  mobile_lore: {
    what: "Moving story — a rumored slot without a fixed pin.",
    scan: "Scan the sticker when you find it — city-visible status only.",
  },
};

export const MYSTERY_NODE_CARD_SCAN =
  "Find the sticker on site — scan shows city-visible state only.";

const FORBIDDEN_CARD_COPY = /\b(your progress|you visited|gps|geolocation|player id|scan count|streak|rank|leaderboard|heatmap)\b/i;

/**
 * @param {string} text
 */
export function nodeCardCopyIsPublicSafe(text) {
  return !FORBIDDEN_CARD_COPY.test(String(text ?? ""));
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} nodeId
 * @returns {Partial<NodeCardCopy> | null}
 */
export function resolveNodeCardOverride(season, nodeId) {
  const mapBoard = season?.map_board;
  if (!mapBoard || typeof mapBoard !== "object") return null;
  const overrides = /** @type {Record<string, unknown>} */ (mapBoard).node_card_overrides;
  if (!overrides || typeof overrides !== "object") return null;
  const row = overrides[nodeId];
  if (!row || typeof row !== "object") return null;
  return /** @type {Partial<NodeCardCopy>} */ (row);
}

/**
 * @param {string | null | undefined} role
 */
export function defaultRoleNodeCardCopy(role) {
  const roleId = String(role ?? "").trim();
  if (!roleId) {
    return {
      what: "Game place — live state on a real sticker.",
      scan: "Scan shows what the city knows — not a private checklist.",
    };
  }
  const base = ROLE_NODE_CARD_COPY[roleId];
  if (base) return { ...base };
  return {
    what: "Game place — part of the weekend city board.",
    scan: "Scan the sticker for live city-visible state.",
  };
}

/**
 * @param {string | null | undefined} role
 * @param {Record<string, unknown>} season
 * @param {{ nodeId?: string; why?: string; mysteryTitle?: string }} [opts]
 * @returns {NodeCardCopy}
 */
export function buildNodeCardCopy(role, season, opts = {}) {
  const roleId = String(role ?? "").trim();
  const id = String(opts.nodeId ?? "").trim();
  const override = id ? resolveNodeCardOverride(season, id) : null;
  const why = opts.why?.trim() || "";

  if (opts.mysteryTitle?.trim()) {
    return mergeNodeCardCopy(
      {
        what: "",
        why,
        scan: MYSTERY_NODE_CARD_SCAN,
      },
      override
    );
  }

  const roleCopy = defaultRoleNodeCardCopy(roleId);
  return mergeNodeCardCopy({ ...roleCopy, why }, override);
}

/**
 * @param {NodeCardCopy} base
 * @param {Partial<NodeCardCopy> | null | undefined} override
 * @returns {NodeCardCopy}
 */
export function mergeNodeCardCopy(base, override) {
  const merged = {
    what: override?.what?.trim() || base.what?.trim() || "",
    why: override?.why?.trim() || base.why?.trim() || "",
    scan: override?.scan?.trim() || base.scan?.trim() || "",
  };
  for (const value of Object.values(merged)) {
    if (value && !nodeCardCopyIsPublicSafe(value)) {
      throw new Error(`Node card copy violates public board policy: ${value}`);
    }
  }
  return merged;
}

/**
 * @param {string} value
 */
function escapeMapHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {NodeCardCopy} copy
 * @returns {string}
 */
export function buildMapNodeCardSlotsHtml(copy) {
  const what = copy.what?.trim();
  const scan = copy.scan?.trim();
  if (!what && !scan) return "";

  const whatHtml = what
    ? `<p class="city-game-map-node-card-line city-game-map-node-card-what"><span class="city-game-map-node-card-label">What</span><span class="city-game-map-node-card-text" data-node-card-what>${escapeMapHtml(what)}</span></p>`
    : "";
  const scanHtml = scan
    ? `<p class="city-game-map-node-card-line city-game-map-node-card-scan"><span class="city-game-map-node-card-label">Scan</span><span class="city-game-map-node-card-text" data-node-card-scan>${escapeMapHtml(scan)}</span></p>`
    : "";

  return `<div class="city-game-map-node-card">${whatHtml}${scanHtml}</div>`;
}
