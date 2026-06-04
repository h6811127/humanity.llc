/**
 * Organizer season create submit handlers.
 */

import {
  createdGameSeasonSetupHref,
  gameSeasonRootManifesto,
  parseGameSeasonIdField,
  rememberGameSeasonIdForProfile,
} from "./create-organizer-season-core.mjs";
import { pickPreferredGeneralRoot, listGeneralRootsWithKeys } from "./create-flow-convergence-core.mjs";
import { loadWallet } from "./device-wallet.mjs";

/**
 * Open /created/ focused on game season setup for an existing root.
 */
export function redirectToGameSeasonSetup() {
  const preferredRoot = pickPreferredGeneralRoot(listGeneralRootsWithKeys(loadWallet()));
  if (!preferredRoot) {
    throw new Error("No saved account with keys on this device — create a season root first.");
  }
  const href = createdGameSeasonSetupHref(preferredRoot, location.origin);
  if (!href) {
    throw new Error("Could not open Live season setup — open controls on your saved card first.");
  }
  location.href = href;
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
  const seasonId = parseGameSeasonIdField(ctx.seasonId);
  const createResult = await ctx.runCreateCard({
    handle: ctx.handle,
    manifesto: gameSeasonRootManifesto(ctx.handle, seasonId),
    wantRecovery: ctx.wantRecovery,
    pilotTemplate: "general",
    qrValidityDays: ctx.qrValidityDays,
    organizer: { enabled: true, generate: true },
    objectStreams: [],
    navigate: false,
  });

  rememberGameSeasonIdForProfile(createResult.profileId, seasonId);

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
    throw new Error("Season root created but Live handoff failed — open /created/ from My objects.");
  }
  location.replace(href);
}
