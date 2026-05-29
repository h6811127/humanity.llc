/**
 * Thin status bootstrap entry — only static import is load-error wiring.
 * Inner bootstrap loads via dynamic import so static graph failures still
 * surface the red ring + explainer popover.
 * @see docs/STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md § Bootstrap static import gap
 * @see docs/HUB_DOT_DEAD_INVESTIGATION_2026-05-27.md
 */
import { wireStatusLoadErrorDot } from "./device-status-load-error.mjs";

const bootstrapVersion = new URL(import.meta.url).searchParams.get("v");
const innerPath = bootstrapVersion
  ? `./device-status-bootstrap-inner.mjs?v=${bootstrapVersion}`
  : "./device-status-bootstrap-inner.mjs";
const innerUrl = new URL(innerPath, import.meta.url);

import(innerUrl.href).catch((err) => {
  wireStatusLoadErrorDot(err?.message || String(err));
});
