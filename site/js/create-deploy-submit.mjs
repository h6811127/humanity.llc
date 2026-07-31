/**
 * Deploy wizard submit — bundled root + child object create.
 */

import { appendChildObjectRow } from "./child-object-store-core.mjs";
import { registerChildObjectAndIssueScanLink } from "./child-object-register-issue.mjs";
import {
  buildDeployIssueFailedCreatedUrl,
  buildDeploySuccessCreatedUrl,
} from "./created-deploy-success-focus-core.mjs";
import {
  childObjectTypeForDeployTemplate,
  createdLiveAddObjectHref,
  generalRootManifestoForDeploy,
  parseDeployChildFields,
} from "./create-deploy-wizard-core.mjs";
import {
  buildCreateHandoffPayload,
  writeCreateHandoff,
} from "./create-handoff-core.mjs";
import { pickPreferredGeneralRoot, listGeneralRootsWithKeys } from "./create-flow-convergence-core.mjs";
import { handoffToCreatedForWalletEntry } from "./create-live-handoff.mjs";
import { loadWallet } from "./device-wallet.mjs";

function normalizeHandleForDeploy(value) {
  return String(value || "").trim().replace(/^@/, "").toLowerCase();
}

/**
 * @param {string} handle
 * @param {Pick<Storage, "getItem">} [storage]
 */
export function readDeployRootSessionForRetry(handle, storage = sessionStorage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem("hc_created");
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || typeof session !== "object") return null;
    if (normalizeHandleForDeploy(session.handle) !== normalizeHandleForDeploy(handle)) return null;
    const profileId =
      typeof session.profile_id === "string" && session.profile_id.trim()
        ? session.profile_id.trim()
        : "";
    const ownerPrivateKey =
      typeof session.owner_private_key_b58 === "string" && session.owner_private_key_b58.trim()
        ? session.owner_private_key_b58.trim()
        : "";
    const ownerPublicKey =
      typeof session.owner_public_key_b58 === "string" && session.owner_public_key_b58.trim()
        ? session.owner_public_key_b58.trim()
        : "";
    if (!profileId || !ownerPrivateKey || !ownerPublicKey) return null;
    return { session, profileId, qrId: null };
  } catch {
    return null;
  }
}

/**
 * @param {string} template
 * @param {ReturnType<typeof import("./create-form-validation-core.mjs").validateCreateFormFields> extends { ok: true } ? never : any} fields
 * @param {{
 *   handle: string;
 *   wantRecovery: boolean;
 *   qrValidityDays: number;
 *   organizer: ReturnType<typeof import("./create-card.mjs").readOrganizerKeyConfig>;
 *   runCreateCard: (input: Record<string, unknown>) => Promise<{ session: Record<string, unknown>, profileId: string, qrId: string }>;
 * }} ctx
 */
export async function runDeployRootAndChildCreate(template, fields, ctx) {
  const { publicLabel, publicState } = parseDeployChildFields(template, fields);
  const objectType = childObjectTypeForDeployTemplate(template);

  const createResult =
    readDeployRootSessionForRetry(ctx.handle) ??
    (await ctx.runCreateCard({
      handle: ctx.handle,
      manifesto: generalRootManifestoForDeploy(ctx.handle),
      wantRecovery: ctx.wantRecovery,
      pilotTemplate: "general",
      qrValidityDays: ctx.qrValidityDays,
      organizer: ctx.organizer,
      objectStreams: [],
      navigate: false,
    }));

  const session = createResult.session;
  const profileId = createResult.profileId;
  const ownerPrivateKey = String(session.owner_private_key_b58 || "");
  const ownerPublicKey = String(session.owner_public_key_b58 || "");
  if (!ownerPrivateKey || !ownerPublicKey) {
    throw new Error("Signing keys missing after create — reload and try again.");
  }

  const childResult = await registerChildObjectAndIssueScanLink({
    profileId,
    objectType,
    publicLabel,
    publicState,
    privateKeyBase58: ownerPrivateKey,
    publicKeyBase58: ownerPublicKey,
  });

  appendChildObjectRow(localStorage, profileId, {
    object_id: childResult.objectId,
    object_type: childResult.objectType,
    public_label: childResult.publicLabel,
    public_state: childResult.publicState,
    created_at: childResult.createdAt,
    ...(childResult.scanUrl && childResult.qrId
      ? { qr_id: childResult.qrId, scan_url: childResult.scanUrl }
      : {}),
  });

  location.replace(
    childResult.issueFailed || !childResult.qrId
      ? buildDeployIssueFailedCreatedUrl({
          origin: location.origin,
          profileId,
          objectId: childResult.objectId,
        })
      : buildDeploySuccessCreatedUrl({
          origin: location.origin,
          profileId,
          qrId: childResult.qrId,
          objectId: childResult.objectId,
          objectType,
        })
  );
}

/**
 * @param {string} template
 */
export async function redirectDeployToLiveAddObject(template) {
  const preferredRoot = pickPreferredGeneralRoot(listGeneralRootsWithKeys(loadWallet()));
  if (!preferredRoot) {
    throw new Error("No saved account with keys on this device — create a root card first.");
  }
  const href = createdLiveAddObjectHref(preferredRoot, template, location.origin);
  if (!href) {
    throw new Error("Could not open Live — open controls on your saved card first.");
  }
  const handoffKind = template === "lost_item_relay" ? "deploy_relay" : "deploy_sign";
  writeCreateHandoff(buildCreateHandoffPayload(handoffKind, preferredRoot));
  await handoffToCreatedForWalletEntry(preferredRoot, href);
}
