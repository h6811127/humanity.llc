/**
 * /created/ Live tab — hosted steward + game season caps display (WS-REV R2).
 * @see docs/HOSTED_TIER_ENTITLEMENTS_AND_METERING.md
 */
import {
  gameSeasonBlockFromEntitlementsResponse,
  gameSeasonMeterUsage,
  gameSeasonMultiSeasonHintFromBody,
  gameSeasonUsageAtLimit,
} from "./city-game-season-entitlements-core.mjs";
import {
  stewardAutoPollUsageFromBody,
  stewardUsageAtLimit,
} from "./device-steward-entitlements-core.mjs";
import {
  hasExplicitGameSeasonContext,
  shouldExpandHostedGameSeasonPanel,
} from "./hub-objects-presentation-core.mjs";

export const HOSTED_STEWARD_PLAN_ID = "hosted_steward_v1";
export const HOSTED_GAME_SEASON_PLAN_ID = "hosted_game_season_v1";
export const REFERENCE_FREE_PLAN_ID = "reference_free";

/** Free-tier game node cap (S1 pilot) — used to suggest game-season upgrade. */
export const REFERENCE_FREE_GAME_NODE_CAP = 15;

const PLAN_LABELS = {
  [REFERENCE_FREE_PLAN_ID]: "Reference (free)",
  [HOSTED_STEWARD_PLAN_ID]: "Hosted steward",
  [HOSTED_GAME_SEASON_PLAN_ID]: "Hosted game season",
};

const GAME_METER_LABELS = {
  "game.contribute": "Contributions today",
  "game.snapshot.get": "Map snapshots today",
  "game.game_update": "Game updates today",
};

/**
 * @typedef {{
 *   term: string,
 *   value: string,
 *   atLimit?: boolean,
 * }} HostedMetricRow
 */

/**
 * @typedef {{
 *   visible: boolean,
 *   title: string,
 *   lead: string,
 *   metrics: HostedMetricRow[],
 *   atLimitMessage: string | null,
 *   upgrades: Array<{
 *     planId: string,
 *     label: string,
 *     needsAccountLink?: boolean,
 *     needsSigningKeys?: boolean,
 *   }>,
 *   gameSeasonTitle: string | null,
 *   gameSeasonMetrics: HostedMetricRow[],
 *   gameSeasonAtLimitMessage: string | null,
 *   multiSeasonHint: string | null,
 *   gameSeasonExpanded: boolean,
 *   gameSeasonCollapsedSummary: string | null,
 * }} CreatedHostedPlanPanelModel
 */

/**
 * @param {string | null | undefined} planId
 */
/** Collapsed summary line on Manage tab. */
export function hostedPlanSummarySub(model) {
  if (model.upgrades?.some((u) => u.needsAccountLink)) {
    return "Link steward account to see upgrades";
  }
  if (model.upgrades?.length) {
    return "Optional paid capacity available";
  }
  return "Reference tier by default · optional hosted capacity";
}

export function hostedPlanLabel(planId) {
  if (!planId) return PLAN_LABELS[REFERENCE_FREE_PLAN_ID];
  return PLAN_LABELS[planId] ?? planId;
}

/**
 * @param {import("./device-steward-entitlements-core.mjs").StewardEntitlementsPolicy} policy
 * @param {Record<string, unknown> | null} body
 * @param {{
 *   hasSession: boolean,
 *   hasSigningKeys?: boolean,
 *   generalRootCount?: number,
 *   explicitSeasonContext?: boolean,
 * }} ctx
 * @returns {CreatedHostedPlanPanelModel}
 */
export function buildCreatedHostedPlanPanelModel(policy, body, ctx) {
  const hasSigningKeys = ctx.hasSigningKeys === true;
  const metrics = /** @type {HostedMetricRow[]} */ ([]);
  const upgrades = /** @type {Array<{ planId: string, label: string }>} */ ([]);
  let atLimitMessage = null;

  const planId = policy.planId ?? REFERENCE_FREE_PLAN_ID;
  const status = policy.status ?? "active";

  metrics.push({
    term: "Plan",
    value: `${hostedPlanLabel(planId)} (${status})`,
  });

  metrics.push({
    term: "Auto live-proof checks",
    value: `Up to ${policy.pollLiveProofAutoDailyCap} / device / UTC day`,
  });

  metrics.push({
    term: "Wallet network checks",
    value: `Up to ${policy.pollNetworkMaxParallel} cards in parallel`,
  });

  if (policy.notifyPushLiveProof) {
    metrics.push({ term: "Live-proof push", value: "Enabled on this plan" });
  }

  const pollUsage = stewardAutoPollUsageFromBody(body);
  if (pollUsage) {
    const atLimit = stewardUsageAtLimit(pollUsage.used, pollUsage.limit);
    metrics.push({
      term: "Auto checks used today",
      value: `${pollUsage.used} / ${pollUsage.limit}${
        pollUsage.periodKey ? ` (${pollUsage.periodKey})` : ""
      }`,
      atLimit,
    });
    if (atLimit) {
      atLimitMessage =
        "Daily automatic live-proof check limit reached for this steward account on this device. Use Check for live proof or try again tomorrow.";
    }
  }

  if (planId === REFERENCE_FREE_PLAN_ID) {
    upgrades.push({
      planId: HOSTED_STEWARD_PLAN_ID,
      label: ctx.hasSession
        ? "Upgrade hosted steward"
        : ctx.hasSigningKeys
          ? "Connect steward account"
          : "Load keys on Live first",
      needsAccountLink: !ctx.hasSession,
      needsSigningKeys: !ctx.hasSigningKeys,
    });
  }

  const multiHint = gameSeasonMultiSeasonHintFromBody(body);
  const gameBlock = gameSeasonBlockFromEntitlementsResponse(body);
  const gameSeasonMetrics = /** @type {HostedMetricRow[]} */ ([]);
  let gameSeasonAtLimitMessage = null;
  let gameSeasonTitle = null;

  const generalRootCount = ctx.generalRootCount ?? 1;
  const explicitSeasonContext =
    ctx.explicitSeasonContext ?? hasExplicitGameSeasonContext("");

  if (multiHint && multiHint.seasonIds.length > 0) {
    return {
      visible: true,
      title: "Usage & limits",
      lead: "This steward account is linked to more than one game season. Pass ?season_id= on entitlements to see per-season usage.",
      metrics,
      atLimitMessage,
      upgrades,
      gameSeasonTitle: null,
      gameSeasonMetrics: [],
      gameSeasonAtLimitMessage: null,
      multiSeasonHint: multiHint.hint || multiHint.seasonIds.join(", "),
      gameSeasonExpanded: true,
      gameSeasonCollapsedSummary: null,
    };
  }

  if (gameBlock) {
    gameSeasonTitle = `City game · ${gameBlock.seasonId}`;
    const nodeCap = gameBlock.limits["game.season.node_cap"];
    if (typeof nodeCap === "number") {
      gameSeasonMetrics.push({
        term: "Active game nodes",
        value: `Up to ${nodeCap} under season root`,
      });
    }

    for (const event of Object.keys(GAME_METER_LABELS)) {
      const row = gameSeasonMeterUsage(gameBlock.usage, event);
      if (!row) continue;
      const atLimit = gameSeasonUsageAtLimit(row.used, row.limit);
      gameSeasonMetrics.push({
        term: GAME_METER_LABELS[event],
        value: `${row.used} / ${row.limit}`,
        atLimit,
      });
      if (atLimit && !gameSeasonAtLimitMessage) {
        gameSeasonAtLimitMessage = `Daily ${GAME_METER_LABELS[event].toLowerCase()} limit reached for this season. Resolver writes pause until the UTC day resets.`;
      }
    }

    if (
      planId !== HOSTED_GAME_SEASON_PLAN_ID &&
      typeof nodeCap === "number" &&
      nodeCap <= REFERENCE_FREE_GAME_NODE_CAP
    ) {
      upgrades.push({
        planId: HOSTED_GAME_SEASON_PLAN_ID,
        label: ctx.hasSession
          ? "Upgrade game season capacity"
          : hasSigningKeys
            ? "Connect steward account"
            : "Load keys on Live first",
        needsAccountLink: !ctx.hasSession,
        needsSigningKeys: !hasSigningKeys,
      });
    }
  }

  const lead = policy.stewardHosted
    ? "Hosted plan active on this device. Higher automatic check budgets. Verification labels are unchanged."
    : ctx.hasSession
      ? "Reference operator limits on this device. Paid plans raise steward and/or city-game capacity. Not card create or public scan."
      : hasSigningKeys
        ? "Keys are loaded on this tab. Use Connect steward account below, then optional paid checkout."
        : "Open the Live tab and load your card keys, then return here to connect a steward account.";

  const hasGameSeasonContent =
    !!gameSeasonTitle || gameSeasonMetrics.length > 0 || !!gameSeasonAtLimitMessage;
  const gameSeasonExpanded = shouldExpandHostedGameSeasonPanel({
    generalRootCount,
    explicitSeasonContext,
    hasGameSeasonContent,
    multiSeasonHint: false,
  });
  const gameSeasonCollapsedSummary =
    hasGameSeasonContent && !gameSeasonExpanded
      ? gameSeasonTitle || "Live season limits"
      : null;

  return {
    visible: true,
    title: "Usage & limits",
    lead,
    metrics,
    atLimitMessage,
    upgrades,
    gameSeasonTitle,
    gameSeasonMetrics,
    gameSeasonAtLimitMessage,
    multiSeasonHint: null,
    gameSeasonExpanded,
    gameSeasonCollapsedSummary,
  };
}
