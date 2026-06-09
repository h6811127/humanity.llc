/**
 * Organizer season create submit handlers.
 */

import { generalRootManifestoForDeploy } from "./create-deploy-wizard-core.mjs";
import { pickPreferredGeneralRoot } from "./create-flow-convergence-core.mjs";
import {
  createdGameSeasonSetupHref,
  gameSeasonRootManifesto,
  markGameSeasonSetupFlow,
  pickPreferredGameSeasonRoot,
} from "./create-organizer-season-core.mjs";
import { handoffToCreatedForWalletEntry } from "./create-live-handoff.mjs";
import {
  buildCreateHandoffPayload,
  writeCreateHandoff,
} from "./create-handoff-core.mjs";
import { STEWARD_ROOM_SEASON } from "./steward-active-room-core.mjs";
import { markSeasonKeyHonestBeatPending } from "./steward-season-key-honest-beat-core.mjs";
import { loadWallet } from "./device-wallet.mjs";

function gameSeasonSetupHrefWithRoom(entry, room) {
  const href = createdGameSeasonSetupHref(entry, location.origin);
  if (!href) return null;
  const url = new URL(href, location.origin);
  url.searchParams.set("room", room);
  return `${url.pathname}${url.search}`;
}

/**
 * Open /created/ focused on game season setup for an existing season root.
 */
export async function redirectToGameSeasonSetup() {
  const preferredRoot = pickPreferredGameSeasonRoot(loadWallet());
  if (!preferredRoot) {
    throw new Error("No saved season root with organizer key on this device. Create one first.");
  }
  const href = gameSeasonSetupHrefWithRoom(preferredRoot, STEWARD_ROOM_SEASON);
  if (!href) {
    throw new Error("Could not open Live season setup. Open controls on your saved card first.");
  }
  writeCreateHandoff(buildCreateHandoffPayload("season", preferredRoot));
  markGameSeasonSetupFlow();
  await handoffToCreatedForWalletEntry(preferredRoot, href);
}

/**
 * Continue season setup on a saved deploy-style general root (dual skin path).
 */
export async function redirectToDeployRootSeasonSetup() {
  const preferredRoot = pickPreferredGeneralRoot(loadWallet());
  if (!preferredRoot) {
    throw new Error("No saved account on this device. Create one first or pick season-only account.");
  }
  const href = gameSeasonSetupHrefWithRoom(preferredRoot, STEWARD_ROOM_SEASON);
  if (!href) {
    throw new Error("Could not open Live season setup. Open controls on your saved card first.");
  }
  writeCreateHandoff(buildCreateHandoffPayload("season", preferredRoot));
  markGameSeasonSetupFlow();
  await handoffToCreatedForWalletEntry(preferredRoot, href);
}

/**
 * @param {{
 *   handle: string;
 *   seasonId: string;
 *   wantRecovery: boolean;
 *   qrValidityDays: number;
 *   runCreateCard: (input: Record<string, unknown>) => Promise<{
 *     session: Record<string, unknown>;
 *     profileId: string;
 *     qrId: string;
 *   }>;
 * }} ctx
 */
export async function runGameSeasonRootCreate(ctx) {
  const createResult = await ctx.runCreateCard({
    handle: ctx.handle,
    manifesto: gameSeasonRootManifesto(ctx.handle, ""),
    wantRecovery: ctx.wantRecovery,
    pilotTemplate: "general",
    qrValidityDays: ctx.qrValidityDays,
    organizer: { enabled: true, generate: true },
    objectStreams: [],
    navigate: false,
  });

  const href = createdGameSeasonSetupHref(
    {
      profile_id: createResult.profileId,
      qr_id: createResult.qrId,
      scan_url: createResult.session?.scan_url,
    },
    location.origin,
    { fresh: true }
  );
  if (!href) {
    throw new Error("Season root created but Live handoff failed. Open /created/ from My objects.");
  }
  const seasonOnlyUrl = new URL(href, location.origin);
  seasonOnlyUrl.searchParams.set("room", STEWARD_ROOM_SEASON);
  markGameSeasonSetupFlow();
  location.replace(`${seasonOnlyUrl.pathname}${seasonOnlyUrl.search}`);
}

/**
 * Dual-skin root: general manifesto + organizer key; season id deferred to first game node.
 *
 * @param {{
 *   handle: string;
 *   wantRecovery: boolean;
 *   qrValidityDays: number;
 *   runCreateCard: (input: Record<string, unknown>) => Promise<{
 *     session: Record<string, unknown>;
 *     profileId: string;
 *     qrId: string;
 *   }>;
 * }} ctx
 */
export async function runGameSeasonDualSkinCreate(ctx) {
  const createResult = await ctx.runCreateCard({
    handle: ctx.handle,
    manifesto: generalRootManifestoForDeploy(ctx.handle),
    wantRecovery: ctx.wantRecovery,
    pilotTemplate: "general",
    qrValidityDays: ctx.qrValidityDays,
    organizer: { enabled: true, generate: true },
    objectStreams: [],
    navigate: false,
  });

  markSeasonKeyHonestBeatPending(createResult.profileId);

  const href = createdGameSeasonSetupHref(
    {
      profile_id: createResult.profileId,
      qr_id: createResult.qrId,
      scan_url: createResult.session?.scan_url,
    },
    location.origin,
    { fresh: true }
  );
  if (!href) {
    throw new Error("Account created but Live handoff failed. Open /created/ from My objects.");
  }
  const url = new URL(href, location.origin);
  url.searchParams.set("room", STEWARD_ROOM_SEASON);
  markGameSeasonSetupFlow();
  location.replace(`${url.pathname}${url.search}`);
}
