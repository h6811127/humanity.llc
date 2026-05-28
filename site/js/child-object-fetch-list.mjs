import { resolverApiOrigin } from "./hc-sign.mjs";
import { childObjectApiUrl, childObjectCreatePath } from "./child-object-api-core.mjs";
import { resolverErrorMessage } from "./resolver-user-error-core.mjs";

/**
 * @param {string} profileId
 */
export async function fetchChildObjectList(profileId) {
  const url = childObjectApiUrl(resolverApiOrigin(), childObjectCreatePath(profileId));
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      resolverErrorMessage(data, {
        status: res.status,
        requestUrl: url,
        fallback: "Could not load child objects.",
      })
    );
  }
  return data;
}
