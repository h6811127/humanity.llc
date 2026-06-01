import {
  decodePrivateKeyBase58,
  postGameUpdateUrl,
  signDocument,
  withProtocolFields,
} from "./hc-sign.mjs";
import { buildGameNodeUnsignedPayload } from "./game-operator-core.mjs";
import { resolverErrorMessage } from "./resolver-user-error-core.mjs";

const PAYLOAD_TYPE_CHILD_OBJECT = "child_object";

/**
 * @param {{
 *   draft: Record<string, unknown>;
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 * }} opts
 */
export async function signGameNodeUpdate(opts) {
  const { draft, privateKeyBase58, publicKeyBase58 } = opts;
  const privateKey = decodePrivateKeyBase58(privateKeyBase58);
  const unsigned = withProtocolFields(
    buildGameNodeUnsignedPayload(draft),
    PAYLOAD_TYPE_CHILD_OBJECT
  );
  return signDocument(unsigned, privateKey, publicKeyBase58);
}

/**
 * @param {string} profileId
 * @param {string} objectId
 * @param {Record<string, unknown>} signedObject
 */
export async function postGameNodeUpdate(profileId, objectId, signedObject) {
  const url = postGameUpdateUrl(profileId, objectId);
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
        fallback: "Could not publish game update.",
      })
    );
  }
  return data;
}
