/**
 * Pre-checkout signing for planned print_artifact QRs (Tier 1 merch).
 * Credentials are stored on the artifact intent and minted after Shopify payment.
 */
import {
  decodePrivateKeyBase58,
  resolverApiOrigin,
  signDocument,
  withProtocolFields,
} from "./hc-sign.mjs";
import { buildPlannedItemScanUrl } from "./shop-customize-core.mjs";

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < 16; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/**
 * @param {string} [siteOrigin]
 */
function resolvePrintOrigin(siteOrigin) {
  if (typeof siteOrigin === "string" && siteOrigin.trim()) {
    return siteOrigin.trim().replace(/\/$/, "");
  }
  const apiOrigin = resolverApiOrigin();
  return apiOrigin.includes("127.0.0.1") || apiOrigin.includes("localhost")
    ? apiOrigin.replace(/\/$/, "")
    : "https://humanity.llc";
}

/**
 * @param {{
 *   profileId: string;
 *   plannedItemQrIds: string[];
 *   plannedPrintArtifactIds: string[];
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 *   siteOrigin?: string;
 * }} opts
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function signPlannedPrintArtifactCredentials(opts) {
  const {
    profileId,
    plannedItemQrIds,
    plannedPrintArtifactIds,
    privateKeyBase58,
    publicKeyBase58,
    siteOrigin,
  } = opts;
  if (plannedItemQrIds.length !== plannedPrintArtifactIds.length) {
    throw new Error("Planned QR ids are incomplete.");
  }
  const privateKey = decodePrivateKeyBase58(privateKeyBase58);
  const origin = resolvePrintOrigin(siteOrigin);
  const issuedAt = new Date().toISOString();
  /** @type {Record<string, unknown>[]} */
  const credentials = [];

  for (let i = 0; i < plannedItemQrIds.length; i++) {
    const qrId = plannedItemQrIds[i];
    const printArtifactId = plannedPrintArtifactIds[i];
    if (!qrId || !printArtifactId) {
      throw new Error("Planned QR ids are incomplete.");
    }
    const scanUrl = buildPlannedItemScanUrl(profileId, qrId, origin);
    const unsigned = withProtocolFields(
      {
        qr_id: qrId,
        profile_id: profileId,
        nonce: `nonce_${randomNonce()}`,
        epoch: 1,
        scope: "print_artifact",
        print_artifact_id: printArtifactId,
        resolver_hint: origin,
        issued_at: issuedAt,
        expires_at: null,
        status: "active",
        payload: scanUrl,
      },
      "qr_credential"
    );
    credentials.push(await signDocument(unsigned, privateKey, publicKeyBase58));
  }

  return credentials;
}

/**
 * @param {string} artifactIntentId
 * @param {Record<string, unknown>[]} qrCredentials
 */
export async function postArtifactIntentPreMint(artifactIntentId, qrCredentials) {
  const origin = resolverApiOrigin();
  const res = await fetch(
    `${origin}/v1/store/artifact-intents/${encodeURIComponent(artifactIntentId)}/pre-mint`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ qr_credentials: qrCredentials }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : "Could not prepare print credentials.";
    throw new Error(msg);
  }
  return data;
}
