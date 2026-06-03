import {
  postChildObjectCreate,
  signChildObjectCreate,
} from "./child-object-update.mjs";
import { postChildObjectIssueQr, signChildObjectIssueQr } from "./child-object-qr.mjs";

/**
 * @param {{
 *   profileId: string;
 *   objectId: string;
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 * }} input
 */
export async function issueChildObjectScanLink(input) {
  const signed = await signChildObjectIssueQr({
    profileId: input.profileId,
    objectId: input.objectId,
    privateKeyBase58: input.privateKeyBase58,
    publicKeyBase58: input.publicKeyBase58,
  });
  const result = await postChildObjectIssueQr(
    input.profileId,
    input.objectId,
    signed.qr_credential
  );
  const scanUrl =
    typeof result.scan_url === "string" && result.scan_url ? result.scan_url : signed.scanUrl;
  const qrId = typeof result.qr_id === "string" && result.qr_id ? result.qr_id : signed.qrId;
  return { scanUrl, qrId };
}

/**
 * Register a child object and issue its first scan credential in one steward flow.
 * If issue-qr fails after create succeeds, returns the registered object without scan metadata.
 * @param {{
 *   profileId: string;
 *   objectType: string;
 *   publicLabel: string;
 *   publicState: string;
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 * }} input
 */
export async function registerChildObjectAndIssueScanLink(input) {
  const signed =
    input.signedCreate ??
    (await signChildObjectCreate({
      parentProfileId: input.profileId,
      objectType: input.objectType,
      publicLabel: input.publicLabel,
      publicState: input.publicState,
      privateKeyBase58: input.privateKeyBase58,
      publicKeyBase58: input.publicKeyBase58,
      objectId: input.objectId,
      createdAt: input.createdAt,
      extraFields: input.extraFields,
    }));
  const createResult = await postChildObjectCreate(input.profileId, signed);
  const objectId = String(createResult.object_id || signed.object_id);
  const createdAt =
    typeof signed.created_at === "string" ? signed.created_at : new Date().toISOString();

  try {
    const { scanUrl, qrId } = await issueChildObjectScanLink({
      profileId: input.profileId,
      objectId,
      privateKeyBase58: input.privateKeyBase58,
      publicKeyBase58: input.publicKeyBase58,
    });
    return {
      objectId,
      createdAt,
      objectType: input.objectType,
      publicLabel: input.publicLabel,
      publicState: input.publicState,
      scanUrl,
      qrId,
      issueFailed: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      objectId,
      createdAt,
      objectType: input.objectType,
      publicLabel: input.publicLabel,
      publicState: input.publicState,
      scanUrl: null,
      qrId: null,
      issueFailed: true,
      issueError: message,
    };
  }
}
