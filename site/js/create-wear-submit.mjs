/**
 * Wear BYOP create submit handlers (step 15).
 */

import {
  createdWearPrintHref,
  wearRootManifesto,
} from "./create-wear-wizard-core.mjs";
import { pickPreferredGeneralRoot, listGeneralRootsWithKeys } from "./create-flow-convergence-core.mjs";
import { handoffToCreatedForWalletEntry } from "./create-live-handoff.mjs";
import { loadWallet } from "./device-wallet.mjs";

/**
 * Open /created/ focused on print QR for an existing root.
 */
export async function redirectToWearPrintOnLive() {
  const preferredRoot = pickPreferredGeneralRoot(listGeneralRootsWithKeys(loadWallet()));
  if (!preferredRoot) {
    throw new Error("No saved account with keys on this device — create a card first.");
  }
  const href = createdWearPrintHref(preferredRoot, location.origin);
  if (!href) {
    throw new Error("Could not open Live — open controls on your saved card first.");
  }
  await handoffToCreatedForWalletEntry(preferredRoot, href);
}

/**
 * @param {{
 *   handle: string;
 *   manifesto: string;
 *   wantRecovery: boolean;
 *   qrValidityDays: number;
 *   runCreateCard: (input: Record<string, unknown>) => Promise<{
 *     session: Record<string, unknown>;
 *     profileId: string;
 *     qrId: string;
 *   }>;
 * }} ctx
 */
export async function runWearCardCreate(ctx) {
  const createResult = await ctx.runCreateCard({
    handle: ctx.handle,
    manifesto: wearRootManifesto(ctx.handle, ctx.manifesto),
    wantRecovery: ctx.wantRecovery,
    pilotTemplate: "general",
    qrValidityDays: ctx.qrValidityDays,
    organizer: { enabled: false, generate: false },
    objectStreams: [],
    navigate: false,
  });

  const href = createdWearPrintHref(
    {
      profile_id: createResult.profileId,
      qr_id: createResult.qrId,
      scan_url: createResult.session?.scan_url,
    },
    location.origin,
    { fresh: true }
  );
  if (!href) {
    throw new Error("Card created but print handoff failed — open /created/ from My objects.");
  }
  location.replace(href);
}
