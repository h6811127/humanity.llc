import {
  decodePrivateKeyBase58,
  resolverApiOrigin,
  signDocument,
  withProtocolFields,
} from "./hc-sign.mjs";
import {
  buildDelegatedCapabilityIssueUnsigned,
  buildDelegatedCapabilityRevokeUnsigned,
  PAYLOAD_TYPE_DELEGATED_CAPABILITY,
} from "./created-delegated-capability-core.mjs";
import {
  delegatedCapabilityApiUrl,
  delegatedCapabilityListPath,
  delegatedCapabilityRevokePath,
} from "./delegated-capability-api-core.mjs";
import { resolverErrorMessage } from "./resolver-user-error-core.mjs";

/**
 * @param {Record<string, unknown>} issueInput
 * @param {string} privateKeyBase58
 * @param {string} publicKeyBase58 root owner key
 */
export async function signDelegatedCapabilityIssue(issueInput, privateKeyBase58, publicKeyBase58) {
  const unsigned = buildDelegatedCapabilityIssueUnsigned(issueInput);
  const privateKey = decodePrivateKeyBase58(privateKeyBase58);
  return signDocument(
    withProtocolFields(unsigned, PAYLOAD_TYPE_DELEGATED_CAPABILITY),
    privateKey,
    publicKeyBase58
  );
}

/**
 * @param {Record<string, unknown>} activeRow
 * @param {string} parentProfileId
 * @param {string} privateKeyBase58
 * @param {string} publicKeyBase58
 */
export async function signDelegatedCapabilityRevoke(
  activeRow,
  parentProfileId,
  privateKeyBase58,
  publicKeyBase58
) {
  const unsigned = {
    ...buildDelegatedCapabilityRevokeUnsigned({
      ...activeRow,
      parent_profile_id: parentProfileId,
    }),
  };
  const privateKey = decodePrivateKeyBase58(privateKeyBase58);
  return signDocument(
    withProtocolFields(unsigned, PAYLOAD_TYPE_DELEGATED_CAPABILITY),
    privateKey,
    publicKeyBase58
  );
}

/**
 * @param {string} profileId
 * @param {Record<string, unknown>} capabilitySigned
 */
export async function postDelegatedCapabilityIssue(profileId, capabilitySigned) {
  const url = delegatedCapabilityApiUrl(
    resolverApiOrigin(),
    delegatedCapabilityListPath(profileId)
  );
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ capability: capabilitySigned }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      resolverErrorMessage(data, {
        status: res.status,
        requestUrl: url,
        fallback: "Could not issue delegated capability.",
      })
    );
  }
  return data;
}

/**
 * @param {string} profileId
 * @param {string} capabilityId
 * @param {Record<string, unknown>} capabilitySigned
 */
export async function postDelegatedCapabilityRevoke(
  profileId,
  capabilityId,
  capabilitySigned
) {
  const url = delegatedCapabilityApiUrl(
    resolverApiOrigin(),
    delegatedCapabilityRevokePath(profileId, capabilityId)
  );
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ capability: capabilitySigned }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      resolverErrorMessage(data, {
        status: res.status,
        requestUrl: url,
        fallback: "Could not revoke delegated capability.",
      })
    );
  }
  return data;
}

/**
 * @param {string} profileId
 */
export async function fetchDelegatedCapabilityList(profileId) {
  const url = delegatedCapabilityApiUrl(
    resolverApiOrigin(),
    delegatedCapabilityListPath(profileId)
  );
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      resolverErrorMessage(data, {
        status: res.status,
        requestUrl: url,
        fallback: "Could not load delegated capabilities.",
      })
    );
  }
  return data;
}
