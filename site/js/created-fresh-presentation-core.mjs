/**
 * Path-aware copy for /created/?fresh=1 and create redirect handoffs (P2.1–P2.3).
 */

import { ADD_LOST_ITEM_FOCUS, ADD_STATUS_PLATE_FOCUS } from "./create-flow-convergence-core.mjs";
import { deployEndpointOutcomeFromParams } from "./created-deploy-success-focus-core.mjs";
import {
  CREATE_HANDOFF_BANNER_TITLE,
  createHandoffDetailLine,
} from "./create-handoff-core.mjs";
import {
  GAME_SEASON_SETUP_FOCUS,
  isGameSeasonCustodySession,
  isGameSeasonSetupFlowActive,
} from "./create-organizer-season-core.mjs";
import { WEAR_PRINT_FOCUS } from "./create-wear-wizard-core.mjs";
import { STEWARD_ROOM_SEASON } from "./steward-active-room-core.mjs";

/** @typedef {"account" | "sign" | "tag" | "wear" | "season"} FreshOutcomeKind */
/** @typedef {FreshOutcomeKind} ControlOutcomeKind */
/** @typedef {"setup" | "control" | "view"} CreatedMode */

/**
 * @param {{
 *   searchParams: URLSearchParams;
 *   hash?: string;
 *   session?: Record<string, unknown> | null;
 * }} ctx
 * @returns {FreshOutcomeKind}
 */
export function resolveFreshOutcomeKind(ctx) {
  const hashKey = String(ctx.hash ?? "").replace(/^#/, "");
  const focus = ctx.searchParams.get("focus");
  const room = ctx.searchParams.get("room");

  const deployOutcome = deployEndpointOutcomeFromParams(ctx.searchParams);
  if (deployOutcome) return deployOutcome;

  if (focus === WEAR_PRINT_FOCUS || hashKey === WEAR_PRINT_FOCUS) return "wear";
  if (
    room === STEWARD_ROOM_SEASON ||
    focus === GAME_SEASON_SETUP_FOCUS ||
    focus === "game" ||
    hashKey === GAME_SEASON_SETUP_FOCUS ||
    isGameSeasonSetupFlowActive() ||
    isGameSeasonCustodySession(ctx.session)
  ) {
    return "season";
  }
  if (
    hashKey === ADD_LOST_ITEM_FOCUS ||
    focus === ADD_LOST_ITEM_FOCUS
  ) {
    return "tag";
  }
  if (
    hashKey === ADD_STATUS_PLATE_FOCUS ||
    focus === ADD_STATUS_PLATE_FOCUS
  ) {
    return "sign";
  }
  return "account";
}

/**
 * @param {{
 *   searchParams: URLSearchParams;
 *   hash?: string;
 *   session?: Record<string, unknown> | null;
 * }} ctx
 * @returns {ControlOutcomeKind}
 */
export function resolveControlOutcomeKind(ctx) {
  const pilot =
    typeof ctx.session?.pilot_template === "string"
      ? ctx.session.pilot_template.trim().toLowerCase()
      : "";
  if (pilot === "lost_item_relay") return "tag";
  if (pilot === "status_plate") return "sign";
  const deployOutcome = deployEndpointOutcomeFromParams(ctx.searchParams);
  if (deployOutcome) return deployOutcome;
  return resolveFreshOutcomeKind(ctx);
}

/**
 * @param {ControlOutcomeKind} kind
 * @returns {string}
 */
export function controlHeroTitle(kind) {
  if (kind === "sign") return "Your sign is live";
  if (kind === "tag") return "Your tag is live";
  if (kind === "wear") return "Your wearable QR is live";
  if (kind === "season") return "Your season is live";
  return "Your account is live";
}

/** Hero lead on first control visit for general accounts (P0.2). */
export const CONTROL_ACCOUNT_HERO_LEAD = "Add your first sign or tag.";

/** Contextual next-step leads on control hero (P1.1). */
export const CONTROL_SIGN_HERO_LEAD =
  "Update what scanners see, then print or test your QR.";
export const CONTROL_TAG_HERO_LEAD =
  "Add a return message, then print or test your QR.";
export const CONTROL_WEAR_HERO_LEAD = "Print or customize your wearable QR.";
export const CONTROL_SEASON_HERO_LEAD =
  "Continue setup and add your first checkpoint.";

/** @type {Record<ControlOutcomeKind, string>} */
const CONTROL_HERO_LEADS = {
  account: CONTROL_ACCOUNT_HERO_LEAD,
  sign: CONTROL_SIGN_HERO_LEAD,
  tag: CONTROL_TAG_HERO_LEAD,
  wear: CONTROL_WEAR_HERO_LEAD,
  season: CONTROL_SEASON_HERO_LEAD,
};

/** Primary CTA label — scrolls to sign add section (P0.2). */
export const CREATED_ACCOUNT_FIRST_SIGN_CTA_LABEL = "Add your first sign";

/**
 * @param {ControlOutcomeKind} kind
 * @returns {{ title: string; lead: string | null }}
 */
export function controlHeroCopy(kind) {
  return {
    title: controlHeroTitle(kind),
    lead: CONTROL_HERO_LEADS[kind] ?? null,
  };
}

/**
 * @param {FreshOutcomeKind} kind
 * @param {CreatedMode} mode
 */
export function freshSetupHeroCopy(kind, mode) {
  if (kind === "season" && mode === "setup") {
    return {
      title: "Set up your season",
      lead: "Save control on this device, then add checkpoints and publish rules.",
    };
  }
  if (kind === "sign") {
    return {
      title: "Your sign is ready.",
      lead: "Save control on this device, print the QR, and test a scan.",
    };
  }
  if (kind === "tag") {
    return {
      title: "Your tag is ready.",
      lead: "Save control on this device, print the QR, and test a scan.",
    };
  }
  if (kind === "wear") {
    return {
      title: "Your wearable QR is ready.",
      lead: "Save control on this device, then continue to printing or merch setup.",
    };
  }
  if (kind === "season") {
    return {
      title: "Your season is ready.",
      lead: "Save control, then continue to season setup.",
    };
  }
  return {
    title: "Your account is ready.",
    lead: "Save control, then create your first object.",
  };
}

/**
 * @param {FreshOutcomeKind} kind
 */
export function seasonContinuationHeroCopy(kind) {
  if (kind !== "season") return null;
  return {
    title: "Continue season setup",
    lead: CONTROL_SEASON_HERO_LEAD,
  };
}

/**
 * @param {FreshOutcomeKind} kind
 * @param {boolean} omitSaveStep
 */
export function freshSetupKickerCopy(kind, omitSaveStep) {
  const stepCount = omitSaveStep ? 4 : 5;
  if (kind === "season") {
    return `Season setup · ${stepCount} steps · save on this device`;
  }
  return `${stepCount} steps · save on this device`;
}

/** User-goal save step copy during fresh setup (P2.4). */
export const FRESH_SETUP_SAVE_TITLE = "Save on this device";
export const FRESH_SETUP_SAVE_LEAD =
  "Without save, closing this tab means you cannot update or turn off your codes later.";

/**
 * @param {import("./create-handoff-core.mjs").CreateHandoffKind} kind
 * @param {string} handle
 */
export function createHandoffBannerCopy(kind, handle) {
  return {
    title: CREATE_HANDOFF_BANNER_TITLE,
    detail: createHandoffDetailLine(kind, handle),
  };
}

/**
 * @param {{
 *   freshParam: boolean;
 *   mode: CreatedMode;
 *   searchParams: URLSearchParams;
 *   hash?: string;
 *   session?: Record<string, unknown> | null;
 *   handoff?: ReturnType<typeof import("./create-handoff-core.mjs").readCreateHandoff>;
 *   omitSaveStep?: boolean;
 * }}
 */
export function resolveCreatedFreshPresentation(ctx) {
  const outcomeKind = resolveFreshOutcomeKind(ctx);
  const handoff = ctx.handoff ?? null;

  /** @type {{ title: string; lead: string } | null} */
  let hero = null;
  if (ctx.freshParam && ctx.mode === "setup") {
    hero = freshSetupHeroCopy(outcomeKind, ctx.mode);
  } else if (handoff && outcomeKind === "season" && ctx.mode === "control") {
    hero = seasonContinuationHeroCopy(outcomeKind);
  } else if (handoff && ctx.mode === "control") {
    hero = {
      title: "Continue on your account",
      lead: createHandoffDetailLine(handoff.kind, handoff.handle),
    };
  } else if (ctx.mode === "control" && !isGameSeasonSetupFlowActive()) {
    hero = controlHeroCopy(resolveControlOutcomeKind(ctx));
  }

  const setupKicker =
    ctx.freshParam && ctx.mode === "setup"
      ? freshSetupKickerCopy(outcomeKind, ctx.omitSaveStep ?? false)
      : null;

  const handoffBanner = handoff ? createHandoffBannerCopy(handoff.kind, handoff.handle) : null;

  return {
    outcomeKind,
    hero,
    setupKicker,
    handoffBanner,
    hideProtocolDuringFreshSetup: ctx.freshParam && ctx.mode === "setup",
  };
}
