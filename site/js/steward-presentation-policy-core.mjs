import { isGameSeasonCustodySession } from "./create-organizer-season-core.mjs";
import {
  STEWARD_ROOM_DOORS,
  STEWARD_ROOM_SEASON,
  STEWARD_ROOM_WEAR,
} from "./steward-active-room-core.mjs";
import {
  isGeneralRootCardSession,
  shouldOfferAddLostItemRelay,
  shouldOfferAddStatusPlate,
} from "./created-child-object-core.mjs";
import {
  shouldOfferAddGameNode,
  shouldShowGameNodeAddRow,
} from "./created-child-object-game-node-core.mjs";

/** @typedef {"deploy" | "season" | "wear"} StewardPresentationKind */

export const STEWARD_PRESENTATION_KIND_DEPLOY = "deploy";
export const STEWARD_PRESENTATION_KIND_SEASON = "season";
export const STEWARD_PRESENTATION_KIND_WEAR = "wear";

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{ walletEntry?: Record<string, unknown> | null }} [extras]
 */
function presentationSessionView(session, extras = {}) {
  const walletEntry = extras.walletEntry;
  if (walletEntry && typeof walletEntry === "object") {
    return {
      ...(session && typeof session === "object" ? session : {}),
      ...walletEntry,
    };
  }
  return session;
}

/**
 * Inference fallback when no active room is bound (slice 1 compat).
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{ walletEntry?: Record<string, unknown> | null }} [extras]
 * @returns {StewardPresentationKind | null}
 */
export function inferStewardPresentationKind(session, extras = {}) {
  const view = presentationSessionView(session, extras);
  if (!isGeneralRootCardSession(view)) return null;
  if (isGameSeasonCustodySession(view)) return STEWARD_PRESENTATION_KIND_SEASON;
  return STEWARD_PRESENTATION_KIND_DEPLOY;
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{ activeRoom?: string | null; walletEntry?: Record<string, unknown> | null }} [extras]
 * @returns {StewardPresentationKind | null}
 */
export function resolveStewardPresentationKind(session, extras = {}) {
  const room = extras.activeRoom;
  if (room === STEWARD_ROOM_SEASON) return STEWARD_PRESENTATION_KIND_SEASON;
  if (room === STEWARD_ROOM_DOORS) return STEWARD_PRESENTATION_KIND_DEPLOY;
  if (room === STEWARD_ROOM_WEAR) return STEWARD_PRESENTATION_KIND_WEAR;
  return inferStewardPresentationKind(session, extras);
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{ activeRoom?: string | null; walletEntry?: Record<string, unknown> | null }} [extras]
 */
export function shouldOfferAddStatusPlateInDefaultUi(session, extras = {}) {
  if (!shouldOfferAddStatusPlate(session)) return false;
  return resolveStewardPresentationKind(session, extras) === STEWARD_PRESENTATION_KIND_DEPLOY;
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{ activeRoom?: string | null; walletEntry?: Record<string, unknown> | null }} [extras]
 */
export function shouldOfferAddLostItemRelayInDefaultUi(session, extras = {}) {
  if (!shouldOfferAddLostItemRelay(session)) return false;
  return resolveStewardPresentationKind(session, extras) === STEWARD_PRESENTATION_KIND_DEPLOY;
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{ activeRoom?: string | null; walletEntry?: Record<string, unknown> | null }} [extras]
 */
export function shouldOfferAddGameNodeInDefaultUi(session, extras = {}) {
  if (!isGeneralRootCardSession(session)) return false;
  if (resolveStewardPresentationKind(session, extras) !== STEWARD_PRESENTATION_KIND_SEASON) {
    return false;
  }
  return shouldOfferAddGameNode(session);
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{ activeRoom?: string | null; walletEntry?: Record<string, unknown> | null }} [extras]
 */
export function shouldShowGameNodeSetupRowInDefaultUi(session, extras = {}) {
  if (!isGeneralRootCardSession(session)) return false;
  if (resolveStewardPresentationKind(session, extras) !== STEWARD_PRESENTATION_KIND_SEASON) {
    return false;
  }
  return shouldShowGameNodeAddRow(session);
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{ activeRoom?: string | null; walletEntry?: Record<string, unknown> | null }} [extras]
 */
export function shouldShowChildObjectAddHubInDefaultUi(session, extras = {}) {
  const kind = resolveStewardPresentationKind(session, extras);
  if (kind === STEWARD_PRESENTATION_KIND_WEAR) return false;
  return (
    shouldOfferAddStatusPlateInDefaultUi(session, extras) ||
    shouldOfferAddLostItemRelayInDefaultUi(session, extras) ||
    shouldOfferAddGameNodeInDefaultUi(session, extras) ||
    shouldShowGameNodeSetupRowInDefaultUi(session, extras)
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{ activeRoom?: string | null; walletEntry?: Record<string, unknown> | null }} [extras]
 */
export function stewardChildObjectAddHubSummaryTitle(session, extras = {}) {
  const kind = resolveStewardPresentationKind(session, extras);
  if (kind === STEWARD_PRESENTATION_KIND_SEASON) return "Game season scan points";
  if (kind === STEWARD_PRESENTATION_KIND_WEAR) return "Wear on this account";
  return "Your scan points";
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {{ activeRoom?: string | null; walletEntry?: Record<string, unknown> | null }} [extras]
 */
export function stewardChildObjectAddHubSubcopy(session, extras = {}) {
  const kind = resolveStewardPresentationKind(session, extras);
  if (kind === STEWARD_PRESENTATION_KIND_SEASON) {
    if (shouldOfferAddGameNodeInDefaultUi(session, extras)) return "Game season scan points";
    if (shouldShowGameNodeSetupRowInDefaultUi(session, extras)) {
      return "Game season scan points (setup)";
    }
    return "Game season scan points";
  }
  if (kind === STEWARD_PRESENTATION_KIND_WEAR) {
    return "Print QR for your garment";
  }
  /** @type {string[]} */
  const labels = [];
  if (shouldOfferAddStatusPlateInDefaultUi(session, extras)) labels.push("status plates");
  if (shouldOfferAddLostItemRelayInDefaultUi(session, extras)) labels.push("lost items");
  return labels.join(" · ");
}
