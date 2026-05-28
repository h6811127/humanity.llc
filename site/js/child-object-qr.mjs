import {
  decodePrivateKeyBase58,
  generateQrId,
  resolverApiOrigin,
  signDocument,
  withProtocolFields,
} from "./hc-sign.mjs";
import { childObjectApiUrl, childObjectIssueQrPath } from "./child-object-api-core.mjs";
import { resolverErrorMessage } from "./resolver-user-error-core.mjs";

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const alphabet =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < 16; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/**
 * @param {string} profileId
 * @param {string} qrId
 * @param {string} [origin]
 */
export function childObjectScanUrl(profileId, qrId, origin) {
  const base =
    origin ||
    (() => {
      const api = resolverApiOrigin();
      return api.includes("127.0.0.1") || api.includes("localhost")
        ? api
        : "https://humanity.llc";
    })();
  return `${base.replace(/\/$/, "")}/c/${encodeURIComponent(profileId)}?q=${encodeURIComponent(qrId)}`;
}

/**
 * @param {{
 *   profileId: string;
 *   objectId: string;
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 *   epoch?: number;
 *   qrId?: string;
 * }} opts
 */
export async function signChildObjectIssueQr(opts) {
  const {
    profileId,
    objectId,
    privateKeyBase58,
    publicKeyBase58,
    epoch = 1,
    qrId = generateQrId(),
  } = opts;
  const privateKey = decodePrivateKeyBase58(privateKeyBase58);
  const issuedAt = new Date().toISOString();
  const apiOrigin = resolverApiOrigin();
  const origin =
    apiOrigin.includes("127.0.0.1") || apiOrigin.includes("localhost")
      ? apiOrigin
      : "https://humanity.llc";
  const scanUrl = childObjectScanUrl(profileId, qrId, origin);
  const unsigned = withProtocolFields(
    {
      qr_id: qrId,
      profile_id: profileId,
      object_id: objectId,
      nonce: `nonce_${randomNonce()}`,
      epoch,
      scope: "child_object",
      resolver_hint: origin,
      issued_at: issuedAt,
      expires_at: null,
      status: "active",
      payload: scanUrl,
    },
    "qr_credential"
  );
  const qr_credential = await signDocument(unsigned, privateKey, publicKeyBase58);
  return { qr_credential, qrId, scanUrl };
}

/**
 * @param {string} profileId
 * @param {string} objectId
 * @param {Record<string, unknown>} qr_credential
 */
export async function postChildObjectIssueQr(profileId, objectId, qr_credential) {
  const url = childObjectApiUrl(
    resolverApiOrigin(),
    childObjectIssueQrPath(profileId, objectId)
  );
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qr_credential }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(resolverErrorMessage(data, res.status));
  }
  return data;
}
