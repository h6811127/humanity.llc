/**
 * Merge Cedar Rapids local dev vars into worker/.dev.vars without clobbering secrets.
 */

import { normalizeLanHost, patchDevVarsScanOrigins } from "./city-game-lan-hub-core.mjs";

export { patchDevVarsScanOrigins, normalizeLanHost };

const DEFAULT_DEV_VARS = `# Local only — gitignored. Do not commit.
OPERATOR_AUDIT_TOKEN=dev-only-change-me
CITY_GAME_ENABLED=1
CITY_GAME_LOCAL_PLAY_OPEN=1
SCAN_RESOLVER_ORIGIN=http://127.0.0.1:8787
SCAN_PAGES_JS_ORIGIN=http://127.0.0.1:8788
`;

/**
 * @param {string} text
 * @param {string} key
 * @param {string} value
 */
export function upsertDevVarLine(text, key, value) {
  const line = `${key}=${value}`;
  let out = text ?? "";
  const re = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=.*$`, "m");
  if (re.test(out)) {
    return out.replace(re, line);
  }
  if (out.length > 0 && !out.endsWith("\n")) out += "\n";
  return out + line + "\n";
}

/**
 * @param {string | null | undefined} text
 * @param {{ host?: string | null; lan?: boolean }} opts
 * @returns {{ text: string; host: string; resolverOrigin: string; pagesOrigin: string }}
 */
export function ensureCityGameDevVars(text, opts = {}) {
  const host =
    normalizeLanHost(opts.host) ??
    (opts.lan ? null : "127.0.0.1");
  if (!host) {
    throw new Error("LAN host required — could not detect IP");
  }

  let out = text?.trim() ? text : DEFAULT_DEV_VARS;
  out = upsertDevVarLine(out, "CITY_GAME_ENABLED", "1");
  out = upsertDevVarLine(out, "CITY_GAME_LOCAL_PLAY_OPEN", "1");
  if (!/^\s*OPERATOR_AUDIT_TOKEN=/m.test(out)) {
    out = upsertDevVarLine(out, "OPERATOR_AUDIT_TOKEN", "dev-only-change-me");
  }
  out = patchDevVarsScanOrigins(out, host);

  return {
    text: out,
    host,
    resolverOrigin: `http://${host}:8787`,
    pagesOrigin: `http://${host}:8788`,
  };
}
