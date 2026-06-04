import {
  decodePrivateKeyBase58,
  resolverApiOrigin,
  signDocument,
  withProtocolFields,
} from "./hc-sign.mjs";
import {
  postLostItemOfferOwnerUrl,
  postRelayOfferProfileSummaryUrl,
} from "./lost-item-offer-core.mjs";
import { resolverErrorMessage } from "./resolver-user-error-core.mjs";

const OWNER_QUERY_TYPE = "relay_offer_owner_query";
const PROFILE_SUMMARY_TYPE = "relay_offer_profile_summary";

/**
 * @param {{
 *   profileId: string;
 *   objectId: string;
 *   action: import("./lost-item-offer-core.mjs").RelayOfferOwnerAction;
 *   offerId?: string;
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 * }} opts
 */
export async function signRelayOfferOwnerQuery(opts) {
  const privateKey = decodePrivateKeyBase58(opts.privateKeyBase58);
  const unsigned = withProtocolFields(
    {
      profile_id: opts.profileId,
      object_id: opts.objectId,
      action: opts.action,
      created_at: new Date().toISOString(),
      ...(opts.action === "dismiss" && opts.offerId ? { offer_id: opts.offerId } : {}),
    },
    OWNER_QUERY_TYPE
  );
  return signDocument(unsigned, privateKey, opts.publicKeyBase58);
}

/**
 * @param {{
 *   profileId: string;
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 * }} opts
 */
export async function signRelayOfferProfileSummaryQuery(opts) {
  const privateKey = decodePrivateKeyBase58(opts.privateKeyBase58);
  const unsigned = withProtocolFields(
    {
      profile_id: opts.profileId,
      created_at: new Date().toISOString(),
    },
    PROFILE_SUMMARY_TYPE
  );
  return signDocument(unsigned, privateKey, opts.publicKeyBase58);
}

/**
 * @param {{
 *   profileId: string;
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 * }} opts
 */
export async function fetchRelayOfferProfileSummary(opts) {
  const query = await signRelayOfferProfileSummaryQuery(opts);
  const url = new URL(postRelayOfferProfileSummaryUrl(opts.profileId), resolverApiOrigin());
  const res = await fetch(url.href, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(resolverErrorMessage(body, "Could not reach relay offers."));
  }
  return body;
}

/**
 * @param {{
 *   profileId: string;
 *   objectId: string;
 *   action: import("./lost-item-offer-core.mjs").RelayOfferOwnerAction;
 *   offerId?: string;
 *   privateKeyBase58: string;
 *   publicKeyBase58: string;
 * }} opts
 */
export async function postRelayOfferOwnerQuery(opts) {
  const query = await signRelayOfferOwnerQuery(opts);
  const url = new URL(postLostItemOfferOwnerUrl(opts.profileId, opts.objectId), resolverApiOrigin());
  const res = await fetch(url.href, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(resolverErrorMessage(body, "Could not reach relay offers."));
  }
  return body;
}

/**
 * @param {object} opts
 * @param {string} opts.profileId
 * @param {string} opts.objectId
 * @param {string} opts.privateKeyBase58
 * @param {string} opts.publicKeyBase58
 */
export async function listRelayOffers(opts) {
  return postRelayOfferOwnerQuery({ ...opts, action: "list" });
}

/**
 * @param {object} opts
 * @param {string} opts.profileId
 * @param {string} opts.objectId
 * @param {string} opts.offerId
 * @param {string} opts.privateKeyBase58
 * @param {string} opts.publicKeyBase58
 */
export async function dismissRelayOffer(opts) {
  return postRelayOfferOwnerQuery({ ...opts, action: "dismiss" });
}
