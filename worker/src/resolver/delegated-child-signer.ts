import { CRYPTO_ERROR } from "../crypto";
import type { ChildObjectParentRow } from "../db/child-objects";
import {
  delegatedCapabilityDocumentFromRow,
  getActiveDelegatedCapability,
} from "../db/delegated-capabilities";
import {
  evaluateDelegatedCapabilityAccess,
  type DelegatedChildObjectRoute,
} from "../live-object/delegation-spec";

export type SignerAuthKind = "owner" | "recovery" | "delegated";

export function isParentOrRecoverySigner(
  signerKey: string,
  parent: Pick<ChildObjectParentRow, "public_key" | "recovery_public_key">
): boolean {
  if (signerKey === parent.public_key) return true;
  return Boolean(parent.recovery_public_key && signerKey === parent.recovery_public_key);
}

function mapDelegationDenial(reason: string): {
  code: string;
  message: string;
  httpStatus: number;
} {
  switch (reason) {
    case "capability_expired":
      return {
        code: "DELEGATION_EXPIRED",
        message: "Delegated capability has expired.",
        httpStatus: 403,
      };
    case "capability_revoked":
      return {
        code: "DELEGATION_REVOKED",
        message: "Delegated capability is revoked.",
        httpStatus: 403,
      };
    case "operation_not_granted":
      return {
        code: "DELEGATION_OPERATION_DENIED",
        message: "Delegated capability does not allow this operation.",
        httpStatus: 403,
      };
    case "object_out_of_scope":
      return {
        code: "DELEGATION_OBJECT_DENIED",
        message: "Child object is outside delegated capability scope.",
        httpStatus: 403,
      };
    case "object_id_required":
      return {
        code: "DELEGATION_OBJECT_REQUIRED",
        message: "object_id is required for this delegated operation.",
        httpStatus: 422,
      };
    case "print_artifact_out_of_scope":
      return {
        code: "DELEGATION_PRINT_ARTIFACT_DENIED",
        message: "print_artifact_id is outside delegated capability scope.",
        httpStatus: 403,
      };
    case "print_artifact_id_required":
      return {
        code: "DELEGATION_PRINT_ARTIFACT_REQUIRED",
        message: "print_artifact_id is required for this delegated operation.",
        httpStatus: 422,
      };
    case "parent_card_inactive":
      return {
        code: "CARD_NOT_ACTIVE",
        message: "Parent card is not active.",
        httpStatus: 410,
      };
    default:
      return {
        code: "DELEGATION_DENIED",
        message: "Delegated capability does not authorize this request.",
        httpStatus: 403,
      };
  }
}

/**
 * Authorize child-object or scoped QR routes for root, recovery, or delegated signer.
 * @see docs/DELEGATED_CHILD_CAPABILITY_SCHEMA.md § Resolver verification
 */
export async function authorizeDelegatedChildRoute(
  db: D1Database,
  parentProfileId: string,
  parent: ChildObjectParentRow,
  signerPublicKey: string,
  route: DelegatedChildObjectRoute,
  scope: { objectId?: string | null; printArtifactId?: string | null }
): Promise<
  | { ok: true; kind: SignerAuthKind }
  | { ok: false; code: string; message: string; httpStatus: number }
> {
  if (signerPublicKey === parent.public_key) {
    return { ok: true, kind: "owner" };
  }
  if (parent.recovery_public_key && signerPublicKey === parent.recovery_public_key) {
    return { ok: true, kind: "recovery" };
  }

  const row = await getActiveDelegatedCapability(db, parentProfileId, signerPublicKey);
  if (!row) {
    return {
      ok: false,
      code: CRYPTO_ERROR.INVALID_SIGNATURE,
      message:
        "Request must be signed by the root owner, recovery key, or an active delegated capability.",
      httpStatus: 401,
    };
  }

  const capability = delegatedCapabilityDocumentFromRow(row);
  if (!capability) {
    return {
      ok: false,
      code: "DELEGATION_INVALID",
      message: "Stored delegated capability document is invalid.",
      httpStatus: 500,
    };
  }

  const access = evaluateDelegatedCapabilityAccess({
    capability,
    route,
    objectId: scope.objectId,
    printArtifactId: scope.printArtifactId,
    parentCardActive: parent.status === "active",
  });

  if (!access.allowed) {
    const denial = mapDelegationDenial(access.reason);
    return { ok: false, ...denial };
  }

  return { ok: true, kind: "delegated" };
}

/** Card-scoped QR mint must still use the root owner key on the credential (recovery unchanged). */
export function qrCredentialMustMatchOwnerKey(
  authKind: SignerAuthKind,
  credentialSignerKey: string,
  ownerPublicKey: string
): boolean {
  if (authKind === "delegated") return true;
  return credentialSignerKey === ownerPublicKey;
}
