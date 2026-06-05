/**
 * Focus routing for /created/?focus=wear-print (step 15).
 */

import { WEAR_PRINT_FOCUS } from "./create-wear-wizard-core.mjs";
import { CREATED_PANEL_FOCUS } from "./created-tabs.mjs";

/**
 * @param {(tabId: string) => void} select
 * @param {URLSearchParams} [searchParams]
 * @param {string} [hash]
 */
export function applyWearPrintFocus(select, searchParams, hash = location.hash) {
  const params = searchParams ?? new URLSearchParams(location.search);
  const focusParam = params.get("focus");
  const hashKey = String(hash || "").replace(/^#/, "");
  const focusKey =
    focusParam === WEAR_PRINT_FOCUS || hashKey === WEAR_PRINT_FOCUS ? WEAR_PRINT_FOCUS : null;
  if (!focusKey || !CREATED_PANEL_FOCUS[focusKey]) return false;

  select("now");
  requestAnimationFrame(() => {
    const el = document.getElementById(CREATED_PANEL_FOCUS[focusKey]);
    if (!el) return;
    el.hidden = false;
    if (el.tagName === "DETAILS") {
      el.open = true;
    }
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const url = new URL(location.href);
  if (url.searchParams.has("focus")) {
    url.searchParams.delete("focus");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }
  return true;
}
