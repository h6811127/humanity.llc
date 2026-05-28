/**
 * Client If-None-Match for resolver GET JSON (Device OS request budget Phase 9).
 */

const ETAG_KEY_PREFIX = "hc_resolver_etag:";

/** @param {string} url */
export function resolverEtagStorageKey(url) {
  return `${ETAG_KEY_PREFIX}${url}`;
}

/**
 * @param {{ get: (key: string) => string | null | undefined, set: (key: string, value: string) => void }} store
 * @param {string} url
 */
export function readResolverEtag(store, url) {
  try {
    return store.get(resolverEtagStorageKey(url)) ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {{ get: (key: string) => string | null | undefined, set: (key: string, value: string) => void }} store
 * @param {string} url
 * @param {string | null} etag
 */
export function writeResolverEtag(store, url, etag) {
  if (!etag) return;
  try {
    store.set(resolverEtagStorageKey(url), etag);
  } catch {
    /* ignore quota */
  }
}

/** Session-backed etag store for document pages. */
export const sessionResolverEtagStore = {
  /** @param {string} key */
  get(key) {
    return sessionStorage.getItem(key);
  },
  /** @param {string} key @param {string} value */
  set(key, value) {
    sessionStorage.setItem(key, value);
  },
};

/**
 * @param {string} url
 * @param {RequestInit} [init]
 * @param {{ get: (key: string) => string | null | undefined, set: (key: string, value: string) => void }} [store]
 * @returns {Promise<{ status: number, body: unknown | null, notModified: boolean, etag: string | null }>}
 */
export async function fetchResolverJson(url, init = {}, store = sessionResolverEtagStore) {
  const headers = new Headers(init.headers || {});
  const prev = readResolverEtag(store, url);
  if (prev && !headers.has("If-None-Match")) {
    headers.set("If-None-Match", prev);
  }
  const res = await fetch(url, { ...init, headers, cache: "no-store" });
  const etag = res.headers.get("ETag");
  if (etag) writeResolverEtag(store, url, etag);
  if (res.status === 304) {
    return { status: 304, body: null, notModified: true, etag: prev ?? etag };
  }
  let body = null;
  const contentType = res.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  }
  return { status: res.status, body, notModified: false, etag };
}
