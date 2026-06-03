/**
 * Phase E step 5 — plain-language custody, backup gate, comprehension, runbook copy.
 * @see docs/CITY_GAME_OPERATOR_CUSTODY.md · docs/CITY_GAME_OPERATOR_RUNBOOK.md
 */

import {
  childObjectBackupGateState,
  countActiveChildObjects,
  rootHasChildObjectBackupSeatbelt,
} from "./child-object-backup-gate-core.mjs";
import {
  buildJamieWayfindingChecks,
  comprehensionPrimaryNodeId,
  resolveComprehensionProbeNodes,
  seasonComprehensionPath,
} from "./city-game-player-guide-core.mjs";
import { seasonLaunchContext } from "./city-game-season-path-shared.mjs";

export const GAME_OPERATOR_CUSTODY_STORAGE_KEY = "hc_city_game_operator_custody_ack_v1";

/** Plain-language GT scorecard (organizer-facing). */
export const GT_COMPREHENSION_SCORECARD = [
  { id: "GT-1", prompt: 'Players say "we unlocked it together," not "I won"' },
  { id: "GT-2", prompt: "Sharing a clue helps the group — hiding it does not" },
  { id: "GT-3", prompt: "Sanctuary spots feel like regroup with no capture" },
  { id: "GT-4", prompt: "Trust paths work without creating an account" },
  { id: "GT-5", prompt: "When care says maintenance pause, game bulletins stay muted" },
  { id: "GT-6", prompt: "No rank, streak, or scan count anywhere" },
  { id: "GT-7", prompt: "City board shows shared world state — not personal GPS or visit history" },
];

/** Custody checklist shown at create + Live setup. */
export const GAME_OPERATOR_CUSTODY_ITEMS = [
  {
    id: "private_offline",
    label: "Game-operator private key saved offline (password manager or hardware)",
  },
  {
    id: "session_paste",
    label: "Paste the private key only at /game-operator/ — never upload it anywhere else",
  },
  {
    id: "owner_recovery",
    label: "Owner + recovery keys saved separately (same custody as any Humanity Card)",
  },
  {
    id: "public_on_card",
    label: "Game-operator public key is registered as issuer on this season root card",
  },
];

/** Runbook patterns in plain language (not terminal procedures). */
export const WEEKEND_RUNBOOK_PLAIN = [
  {
    id: "world_state",
    title: "Flips describe world state, not player rewards",
    body: "Bulletins and route windows change what everyone sees on scan — no leaderboard, XP, or scan counts.",
  },
  {
    id: "care_pause",
    title: "Care pause wins over game copy",
    body: "When a place needs repair or safety closure, update the care stream. Scans mute game bulletins until care clears.",
  },
  {
    id: "compromise",
    title: "Compromise + rekey is public truth only",
    body: "Mark a node compromised, warn on scan, rekey after stewards verify — never publish who scanned.",
  },
  {
    id: "revoke",
    title: "Emergency revoke stays on owner tools",
    body: "Disable one sticker or the whole season from /created/ Manage or /organizer-revoke/ — scans must show paused truth.",
  },
  {
    id: "weekend_console",
    title: "Weekend console",
    body: "Use /game-operator/ for bulletin rotation. Most unlock paths are player-driven via site codes at scan — operators monitor copy, not flip every beat.",
  },
];

/**
 * @param {Storage} storage
 */
export function readGameOperatorCustodyAckMap(storage) {
  try {
    const raw = storage.getItem(GAME_OPERATOR_CUSTODY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * @param {Storage} storage
 * @param {string} profileId
 */
export function readGameOperatorCustodyAck(storage, profileId) {
  const map = readGameOperatorCustodyAckMap(storage);
  const row = map[profileId];
  if (!row || typeof row !== "object") return {};
  return /** @type {Record<string, boolean>} */ (row);
}

/**
 * @param {Storage} storage
 * @param {string} profileId
 * @param {Record<string, boolean>} ack
 */
export function writeGameOperatorCustodyAck(storage, profileId, ack) {
  const map = readGameOperatorCustodyAckMap(storage);
  map[profileId] = ack;
  storage.setItem(GAME_OPERATOR_CUSTODY_STORAGE_KEY, JSON.stringify(map));
}

/**
 * @param {Record<string, boolean>} ack
 */
export function gameOperatorCustodyComplete(ack) {
  return GAME_OPERATOR_CUSTODY_ITEMS.every((item) => ack[item.id] === true);
}

/**
 * @param {{
 *   session: Record<string, unknown> | null | undefined;
 *   childObjectRows: unknown[];
 *   custodyAck: Record<string, boolean>;
 *   registeredGameNodeCount?: number;
 *   rulesPublishReady?: boolean;
 *   season?: Record<string, unknown> | null;
 *   jsonBasename?: string;
 * }} input
 */
export function buildSelfServeSetupChecklist(input) {
  const hasSeatbelt = rootHasChildObjectBackupSeatbelt(input.session);
  const activeCount = countActiveChildObjects(input.childObjectRows);
  const gameNodes =
    input.registeredGameNodeCount ??
    (Array.isArray(input.childObjectRows)
      ? input.childObjectRows.filter(
          (row) =>
            row &&
            typeof row === "object" &&
            /** @type {Record<string, unknown>} */ (row).object_type === "game_node" &&
            /** @type {Record<string, unknown>} */ (row).status !== "disabled" &&
            /** @type {Record<string, unknown>} */ (row).status !== "revoked"
        ).length
      : 0);

  const items = [
    {
      id: "owner_backup",
      label: "Owner recovery or encrypted backup saved on Manage",
      done: hasSeatbelt,
      required: true,
    },
    {
      id: "game_operator_custody",
      label: "Game-operator key custody checklist complete",
      done: gameOperatorCustodyComplete(input.custodyAck),
      required: true,
    },
    {
      id: "season_root_profile",
      label: "Season JSON lists this card as season_root_profile_id (after first nodes)",
      done:
        !!input.season &&
        String(input.season.season_root_profile_id ?? "").trim() ===
          String(input.session?.profile_id ?? "").trim(),
      required: false,
    },
    {
      id: "nodes_registered",
      label: "Game nodes registered with scan links (starter template or one-by-one)",
      done: gameNodes >= 1,
      required: true,
    },
    {
      id: "rules_published",
      label: "Rules page prepared for launch (download + deploy)",
      done: input.rulesPublishReady === true,
      required: false,
    },
    {
      id: "comprehension",
      label: "≥5 un coached comprehension passes (GT-1–GT-7) before marketing",
      done: false,
      required: false,
      humanGate: true,
    },
  ];

  const gate = childObjectBackupGateState({
    activeCount,
    hasSeatbelt,
    adding: 1,
  });

  return {
    items,
    backupGate: gate,
    activeChildCount: activeCount,
    gameNodeCount: gameNodes,
    bulkImportBlocked: gate.blocked,
  };
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} [rulesUrl]
 */
export function buildOrganizerComprehensionBrief(season, rulesUrl) {
  const rules =
    rulesUrl?.trim() ||
    String(season.rules_path ?? "/play/cedar-rapids/").trim() ||
    "/play/cedar-rapids/";
  const comprehensionUrl = seasonComprehensionPath(season);
  const primaryId = comprehensionPrimaryNodeId(season);
  const probes = resolveComprehensionProbeNodes(season);
  const wayfinding = buildJamieWayfindingChecks(season);

  const lines = [
    "City game comprehension brief (give testers the rules page first — no coaching)",
    "",
    `Rules: ${rules}`,
    `Comprehension kit path (when deployed): ${comprehensionUrl}`,
    "",
    "Primary scan node for spot checks:",
    `  ${primaryId}${probes[0]?.label ? ` — ${probes[0].label}` : ""}`,
    "",
    "Wayfinding (Jamie checks):",
    ...wayfinding.map((row) => `  ${row.id}: ${row.prompt}`),
    "",
    "Scorecard (per tester — need ≥5 passes before launch marketing):",
    ...GT_COMPREHENSION_SCORECARD.map((row) => `  ${row.id}: ${row.prompt}`),
    "",
    "Probe nodes for optional spot checks:",
    ...probes.map(
      (row) => `  ${row.node_id}${row.label ? ` (${row.label})` : ""}${row.blurb ? ` — ${row.blurb}` : ""}`
    ),
  ];

  return lines.join("\n");
}

/**
 * Short custody blurb for setup wizard protect/done panels.
 */
export function gameSeasonSetupWizardCustodyCopy() {
  return {
    eyebrow: "City game season root",
    title: "Two keys, two jobs",
    detail:
      "Owner + recovery keys control this card and every game node under it. The game-operator private key flips weekend world state at /game-operator/ only — save it offline and never upload it. Register nodes and publish rules from Live after setup.",
    links: [
      { href: "/game-operator/", label: "Weekend console" },
      { href: "/created/#advanced", label: "Manage · recovery" },
    ],
  };
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} jsonBasename
 */
export function selfServeSeasonLaunchLinks(season, jsonBasename) {
  const ctx = seasonLaunchContext(season, jsonBasename);
  return {
    rulesPath: ctx.rulesPath,
    comprehensionPath: seasonComprehensionPath(season),
    gameOperatorPath: "/game-operator/",
  };
}
