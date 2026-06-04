/**
 * WS-SW summer S3 — weekly bulletin beats (CR-E02 / SW-10).
 * Canon: docs/CITY_GAME_SUMMER_MOMENTUM.md Lane B #3.
 */

/** Hours between Friday-style beats from season open. */
export const SUMMER_S3_FRIDAY_INTERVAL_HOURS = 168;

/** Minimum count of interval-aligned slots (0h, 168h, …) per anchor node. */
export const SUMMER_S3_MIN_WEEKLY_BEATS = 5;

/** Relay nodes with pre-authored rotating bulletins for the whole summer. */
export const SUMMER_S3_BULLETIN_NODE_IDS = [
  "node_01",
  "node_05",
  "node_15",
  "node_21",
  "node_22",
  "node_31",
];

/**
 * Canonical slot rows — source of truth for season JSON `bulletin_schedule`.
 * @type {Record<string, Array<{ after_start_hours: number; controller?: string; relay_status?: string; bulletin: string }>>}
 */
export const SUMMER_S3_BULLETIN_BEATS = {
  node_01: [
    {
      after_start_hours: 0,
      controller: "Red team",
      relay_status: "Open · 18 min",
      bulletin: "Shift west, mural alley stays safe",
    },
    {
      after_start_hours: 6,
      controller: "Red team",
      relay_status: "Open · truce window",
      bulletin: "Regroup at café window — relay stays public",
    },
    {
      after_start_hours: 12,
      controller: "Blue team",
      relay_status: "Open · evening beat",
      bulletin: "Bridge watch tonight — share fragments outward",
    },
    {
      after_start_hours: 168,
      controller: "Red team",
      relay_status: "Open · Friday beat",
      bulletin: "Friday clue — Greene marker may complete fragment two",
    },
    {
      after_start_hours: 336,
      controller: "Blue team",
      relay_status: "Open · mid-season",
      bulletin: "Network swing — Czech cabinet path needs river quorum",
    },
    {
      after_start_hours: 504,
      controller: "Green team",
      relay_status: "Open · contest week",
      bulletin: "Mid-summer truce at sanctuary — contest hot relays elsewhere",
    },
    {
      after_start_hours: 672,
      controller: "Yellow team",
      relay_status: "Open · late season",
      bulletin: "Finale pressure — three fragments before alley arch wakes",
    },
  ],
  node_05: [
    {
      after_start_hours: 0,
      controller: "Neutral",
      relay_status: "Watch · compromised drill ready",
      bulletin: "Bridge bulletin live — trust the rekey path",
    },
    {
      after_start_hours: 168,
      controller: "Neutral",
      relay_status: "Watch · Friday drill",
      bulletin: "Friday beat — compromise copy is public object truth, not a player log",
    },
    {
      after_start_hours: 336,
      controller: "Neutral",
      relay_status: "Open · commons lesson",
      bulletin: "Bridge stays neutral — hot relays carry overharvest warnings",
    },
    {
      after_start_hours: 504,
      controller: "Neutral",
      relay_status: "Watch · mid-season",
      bulletin: "Rekey path stays signed — teams recover without scan history",
    },
    {
      after_start_hours: 672,
      controller: "Neutral",
      relay_status: "Watch · late season",
      bulletin: "Bridge corridor — maintenance truth still wins on care stream",
    },
  ],
  node_15: [
    {
      after_start_hours: 0,
      controller: "Red team",
      relay_status: "Open · market steps",
      bulletin: "Lantern Ward reclaimed — rotate west at dusk",
    },
    {
      after_start_hours: 8,
      controller: "Red team",
      relay_status: "Open · night route",
      bulletin: "Market steps hold — finale fragments need Greene Square",
    },
    {
      after_start_hours: 168,
      controller: "Red team",
      relay_status: "Open · commons watch",
      bulletin: "Friday — market steps are a hot relay; spread captures",
    },
    {
      after_start_hours: 336,
      controller: "Blue team",
      relay_status: "Open · overharvest risk",
      bulletin: "Too many captures here compromises the relay for every faction",
    },
    {
      after_start_hours: 504,
      controller: "Green team",
      relay_status: "Open · reinforce",
      bulletin: "Mid-season — reinforce holds or the steps flip neutral",
    },
    {
      after_start_hours: 672,
      controller: "Yellow team",
      relay_status: "Open · late season",
      bulletin: "Late summer — network points weigh heavy on these steps",
    },
  ],
  node_21: [
    {
      after_start_hours: 0,
      controller: "Unclaimed",
      relay_status: "Rumored · hidden",
      bulletin: "Signal stone rumored — capture reveals this relay on the city board",
    },
    {
      after_start_hours: 168,
      controller: "Unclaimed",
      relay_status: "Rumored · Friday",
      bulletin: "Friday whisper — downtown alley niche may be a hidden relay",
    },
    {
      after_start_hours: 336,
      controller: "Unclaimed",
      relay_status: "Rumored · artifact",
      bulletin: "Still off the public board until a faction captures the stone",
    },
    {
      after_start_hours: 504,
      controller: "Unclaimed",
      relay_status: "Rumored · mid-season",
      bulletin: "Hidden relay artifact — first hold unlocks fog for everyone",
    },
    {
      after_start_hours: 672,
      controller: "Unclaimed",
      relay_status: "Rumored · late",
      bulletin: "Late season rumor — stone may decide a network swing",
    },
  ],
  node_22: [
    {
      after_start_hours: 0,
      controller: "Unclaimed",
      relay_status: "Rare · double weight",
      bulletin: "Glitch coil — holds here count double on the network board",
    },
    {
      after_start_hours: 168,
      controller: "Unclaimed",
      relay_status: "Rare · Friday",
      bulletin: "Friday — fight for the coil before another faction reinforces",
    },
    {
      after_start_hours: 336,
      controller: "Red team",
      relay_status: "Rare · held",
      bulletin: "Double capture live — network totals multiply while the hold stands",
    },
    {
      after_start_hours: 504,
      controller: "Blue team",
      relay_status: "Rare · contest",
      bulletin: "Mid-season prize relay — decay will neutralize without revisits",
    },
    {
      after_start_hours: 672,
      controller: "Green team",
      relay_status: "Rare · late",
      bulletin: "Late summer coil — faction totals visible on the city board",
    },
  ],
  node_31: [
    {
      after_start_hours: 0,
      controller: "Unclaimed",
      relay_status: "Commons · hot gate",
      bulletin: "CSPS gate — capture spam compromises this relay for all teams",
    },
    {
      after_start_hours: 168,
      controller: "Unclaimed",
      relay_status: "Commons · Friday",
      bulletin: "Friday beat — twenty captures max before compromise flips",
    },
    {
      after_start_hours: 336,
      controller: "Red team",
      relay_status: "Open · contested",
      bulletin: "High-traffic gate — reinforce or spread to sister relays",
    },
    {
      after_start_hours: 504,
      controller: "Blue team",
      relay_status: "Open · mid-season",
      bulletin: "Commons tragedy drill — overharvest hurts every faction",
    },
    {
      after_start_hours: 672,
      controller: "Yellow team",
      relay_status: "Open · late",
      bulletin: "Late season gate — location weight ten on network totals",
    },
  ],
};

/**
 * @param {Record<string, unknown>} season
 */
export function validateSeasonSummerS3(season) {
  const issues = [];
  const s3 = season.signal_war?.summer_s3;
  if (!s3 || typeof s3 !== "object") {
    issues.push("signal_war.summer_s3 required (friday_interval_hours, bulletin_nodes).");
    return { ok: false, issues };
  }

  if (s3.friday_interval_hours !== SUMMER_S3_FRIDAY_INTERVAL_HOURS) {
    issues.push(
      `summer_s3.friday_interval_hours expected ${SUMMER_S3_FRIDAY_INTERVAL_HOURS}.`
    );
  }

  const registryIds = new Set(
    (Array.isArray(season.nodes) ? season.nodes : []).map((row) => row.node_id)
  );

  const nodes = s3.bulletin_nodes ?? [];
  for (const id of SUMMER_S3_BULLETIN_NODE_IDS) {
    if (!registryIds.has(id)) continue;
    if (!nodes.includes(id)) {
      issues.push(`summer_s3.bulletin_nodes must include ${id}.`);
    }
  }

  if (!season.window?.starts_at?.trim()) {
    issues.push("window.starts_at required for after_start_hours bulletin beats.");
  }

  const entries = season.bulletin_schedule?.entries ?? [];
  const byId = new Map(entries.map((e) => [e.node_id, e]));

  for (const nodeId of SUMMER_S3_BULLETIN_NODE_IDS) {
    if (!registryIds.has(nodeId)) continue;
    const expected = SUMMER_S3_BULLETIN_BEATS[nodeId];
    const row = byId.get(nodeId);
    if (!row) {
      issues.push(`bulletin_schedule missing entry for ${nodeId}.`);
      continue;
    }
    if (JSON.stringify(row.slots) !== JSON.stringify(expected)) {
      issues.push(
        `bulletin_schedule.${nodeId} slots drift from city-game-summer-s3-core.mjs — run npm run city-game:merge-summer-s3-bulletins`
      );
    }

    const weekly = (row.slots ?? []).filter(
      (s) =>
        typeof s.after_start_hours === "number" &&
        s.after_start_hours % SUMMER_S3_FRIDAY_INTERVAL_HOURS === 0 &&
        s.bulletin?.trim()
    );
    if (weekly.length < SUMMER_S3_MIN_WEEKLY_BEATS) {
      issues.push(
        `${nodeId}: need ≥${SUMMER_S3_MIN_WEEKLY_BEATS} weekly bulletin slots (0h, 168h, …).`
      );
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * @param {Record<string, unknown>} season
 */
export function mergeSummerS3(season) {
  const merged = mergeSummerS3BulletinSchedule(season);
  if (!merged.signal_war || typeof merged.signal_war !== "object") {
    merged.signal_war = {};
  }
  merged.signal_war.summer_s3 = {
    friday_interval_hours: SUMMER_S3_FRIDAY_INTERVAL_HOURS,
    bulletin_nodes: [...SUMMER_S3_BULLETIN_NODE_IDS],
  };
  return merged;
}

/**
 * @param {Record<string, unknown>} season
 */
export function mergeSummerS3BulletinSchedule(season) {
  const merged = structuredClone(season);
  const entries = [...(merged.bulletin_schedule?.entries ?? [])];
  const byId = new Map(entries.map((e) => [e.node_id, e]));

  for (const nodeId of SUMMER_S3_BULLETIN_NODE_IDS) {
    byId.set(nodeId, {
      node_id: nodeId,
      slots: SUMMER_S3_BULLETIN_BEATS[nodeId],
    });
  }

  const ordered = [...byId.values()].sort((a, b) =>
    a.node_id.localeCompare(b.node_id, undefined, { numeric: true })
  );
  merged.bulletin_schedule = { entries: ordered };
  return merged;
}
