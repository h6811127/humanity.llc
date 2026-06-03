import { resolverErrorMessage } from "./resolver-user-error-core.mjs";
import {
  decodePrivateKeyBase58,
  generateChildObjectId,
  postChildObjectCreateUrl,
  postChildObjectRevokeUrl,
  postChildObjectUpdateUrl,
  signDocument,
  withProtocolFields,
} from "./hc-sign.mjs";

const PAYLOAD_TYPE_CHILD_OBJECT = "child_object";

/**
 * @param {{
 *   parentProfileId: string;
 *   objectType: string;
 *   publicLabel: string;
 *   publicState: string;
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 *   objectId?: string;
 *   createdAt?: string;
 *   extraFields?: Record<string, unknown>;
 * }} opts
 */
export async function signChildObjectCreate(opts) {
  const {
    parentProfileId,
    objectType,
    publicLabel,
    publicState,
    privateKeyBase58,
    publicKeyBase58,
    objectId = generateChildObjectId(),
    createdAt = new Date().toISOString(),
    extraFields,
  } = opts;
  const privateKey = decodePrivateKeyBase58(privateKeyBase58);
  const updatedAt = createdAt;
  const unsigned = withProtocolFields(
    {
      object_id: objectId,
      parent_profile_id: parentProfileId,
      object_type: objectType,
      public_label: publicLabel,
      public_state: publicState,
      status: "active",
      created_at: createdAt,
      updated_at: updatedAt,
      ...(extraFields && typeof extraFields === "object" ? extraFields : {}),
    },
    PAYLOAD_TYPE_CHILD_OBJECT
  );
  return signDocument(unsigned, privateKey, publicKeyBase58);
}

/**
 * @param {{
 *   profileId: string;
 *   seasonId: string;
 *   publicLabel: string;
 *   nodeRole: string;
 *   district: string | null;
 *   objectId?: string;
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 *   templateRow?: Record<string, unknown>;
 * }} opts
 */
export async function signGameNodeChildObjectCreate(opts) {
  const { buildGameNodeRegisterUnsigned } = await import(
    "./created-child-object-game-node-core.mjs"
  );
  const payload = buildGameNodeRegisterUnsigned({
    profileId: opts.profileId,
    seasonId: opts.seasonId,
    publicLabel: opts.publicLabel,
    nodeRole: opts.nodeRole,
    district: opts.district,
    objectId: opts.objectId,
    templateRow: opts.templateRow,
  });
  const privateKey = decodePrivateKeyBase58(opts.privateKeyBase58);
  return signDocument(
    withProtocolFields(payload, PAYLOAD_TYPE_CHILD_OBJECT),
    privateKey,
    opts.publicKeyBase58
  );
}

/**
 * @param {{
 *   objectId: string;
 *   parentProfileId: string;
 *   objectType: string;
 *   publicLabel: string;
 *   publicState: string;
 *   createdAt: string;
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 *   updatedAt?: string;
 * }} opts
 */
export async function signChildObjectUpdate(opts) {
  const {
    objectId,
    parentProfileId,
    objectType,
    publicLabel,
    publicState,
    createdAt,
    privateKeyBase58,
    publicKeyBase58,
    updatedAt = new Date().toISOString(),
  } = opts;
  const privateKey = decodePrivateKeyBase58(privateKeyBase58);
  const unsigned = withProtocolFields(
    {
      object_id: objectId,
      parent_profile_id: parentProfileId,
      object_type: objectType,
      public_label: publicLabel,
      public_state: publicState,
      status: "active",
      created_at: createdAt,
      updated_at: updatedAt,
    },
    PAYLOAD_TYPE_CHILD_OBJECT
  );
  return signDocument(unsigned, privateKey, publicKeyBase58);
}

/**
 * @param {{
 *   objectId: string;
 *   parentProfileId: string;
 *   objectType: string;
 *   publicLabel: string;
 *   publicState: string;
 *   createdAt: string;
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 *   status?: "disabled" | "revoked";
 *   updatedAt?: string;
 * }} opts
 */
export async function signChildObjectRevoke(opts) {
  const {
    objectId,
    parentProfileId,
    objectType,
    publicLabel,
    publicState,
    createdAt,
    privateKeyBase58,
    publicKeyBase58,
    status = "disabled",
    updatedAt = new Date().toISOString(),
  } = opts;
  const privateKey = decodePrivateKeyBase58(privateKeyBase58);
  const unsigned = withProtocolFields(
    {
      object_id: objectId,
      parent_profile_id: parentProfileId,
      object_type: objectType,
      public_label: publicLabel,
      public_state: publicState,
      status,
      created_at: createdAt,
      updated_at: updatedAt,
    },
    PAYLOAD_TYPE_CHILD_OBJECT
  );
  return signDocument(unsigned, privateKey, publicKeyBase58);
}

/**
 * @param {string} profileId
 * @param {Record<string, unknown>} signedObject
 */
export async function postChildObjectCreate(profileId, signedObject) {
  const url = postChildObjectCreateUrl(profileId);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ object: signedObject }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      resolverErrorMessage(data, {
        status: res.status,
        requestUrl: url,
        fallback: "Could not create child object.",
      })
    );
  }
  return data;
}

/**
 * @param {string} profileId
 * @param {string} objectId
 * @param {Record<string, unknown>} signedObject
 */
export async function postChildObjectUpdate(profileId, objectId, signedObject) {
  const url = postChildObjectUpdateUrl(profileId, objectId);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ object: signedObject }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      resolverErrorMessage(data, {
        status: res.status,
        requestUrl: url,
        fallback: "Could not update child object.",
      })
    );
  }
  return data;
}

/**
 * @param {string} profileId
 * @param {string} objectId
 * @param {Record<string, unknown>} signedObject
 */
export async function postChildObjectRevoke(profileId, objectId, signedObject) {
  const url = postChildObjectRevokeUrl(profileId, objectId);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ object: signedObject }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      resolverErrorMessage(data, {
        status: res.status,
        requestUrl: url,
        fallback: "Could not revoke child object.",
      })
    );
  }
  return data;
}
