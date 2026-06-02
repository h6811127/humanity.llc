/** Resolver paths for parent-signed child object routes (no signing deps). */

export function childObjectCreatePath(profileId) {
  return `/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/objects`;
}

export function childObjectUpdatePath(profileId, objectId) {
  return `/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/objects/${encodeURIComponent(objectId)}/update`;
}

export function childObjectRevokePath(profileId, objectId) {
  return `/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/objects/${encodeURIComponent(objectId)}/revoke`;
}

export function childObjectIssueQrPath(profileId, objectId) {
  return `/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/objects/${encodeURIComponent(objectId)}/issue-qr`;
}

export function childObjectGameUpdatePath(profileId, objectId) {
  return `/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/objects/${encodeURIComponent(objectId)}/game-update`;
}

export function childObjectGameContributePath(profileId, objectId) {
  return `/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/objects/${encodeURIComponent(objectId)}/game-contribute`;
}

/**
 * @param {string} origin
 * @param {string} path
 */
export function childObjectApiUrl(origin, path) {
  return new URL(path, origin).href;
}
