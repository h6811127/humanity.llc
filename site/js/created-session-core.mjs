/**
 * Tab session (`hc_created`) persistence rules for /created/ (P0-6).
 * Thin alias over `device-tab-session-core` — single source of truth with `device-keys.mjs`.
 * @see docs/SAFARI_KEYS_CUSTODY.md § R11 / P0-6
 */

export const CREATED_SESSION_STORAGE_KEY = "hc_created";

export {
  tabSessionHasSigningKeys as sessionHasTabSigningKey,
} from "./device-tab-session-core.mjs";

import { tabSessionHasSigningKeys } from "./device-tab-session-core.mjs";

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function shouldPersistCreatedSession(session) {
  return tabSessionHasSigningKeys(session);
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @returns {Record<string, unknown> | null}
 */
export function sanitizeCreatedSessionForStorage(session) {
  return shouldPersistCreatedSession(session) ? session : null;
}
