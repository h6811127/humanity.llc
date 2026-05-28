import { resolverErrorMessage } from "./resolver-user-error-core.mjs";
import {
  decodePrivateKeyBase58,
  postCardUpdateUrl,
  signDocument,
  withProtocolFields,
} from "./hc-sign.mjs";

/**
 * @param {{
 *   profileId: string;
 *   handle: string;
 *   createdAt: string;
 *   manifestoLine: string;
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 *   cardExtras?: Record<string, unknown>;
 * }} opts
 */
export async function signCardUpdate(opts) {
  const {
    profileId,
    handle,
    createdAt,
    manifestoLine,
    privateKeyBase58,
    publicKeyBase58,
    cardExtras = {},
  } = opts;
  const privateKey = decodePrivateKeyBase58(privateKeyBase58);
  const updatedAt = new Date().toISOString();
  const unsigned = withProtocolFields(
    {
      profile_id: profileId,
      public_key: publicKeyBase58,
      handle,
      manifesto_line: manifestoLine,
      created_at: createdAt,
      updated_at: updatedAt,
      status: "active",
      ...cardExtras,
    },
    "humanity_card"
  );
  return signDocument(unsigned, privateKey, publicKeyBase58);
}

/**
 * @param {string} profileId
 * @param {Record<string, unknown>} signedCard
 */
export async function postCardUpdate(profileId, signedCard) {
  const res = await fetch(postCardUpdateUrl(profileId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card: signedCard }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const url = postCardUpdateUrl(profileId);
    throw new Error(
      resolverErrorMessage(data, {
        status: res.status,
        requestUrl: url,
        fallback: "Could not update card.",
      })
    );
  }
  return data;
}
