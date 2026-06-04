/** Resolver paths for root-signed delegated capability routes. */

export function delegatedCapabilityListPath(profileId) {
  return `/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/delegated-capabilities`;
}

export function delegatedCapabilityRevokePath(profileId, capabilityId) {
  return `/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/delegated-capabilities/${encodeURIComponent(capabilityId)}/revoke`;
}

/**
 * @param {string} origin
 * @param {string} path
 */
export function delegatedCapabilityApiUrl(origin, path) {
  return new URL(path, origin).href;
}
