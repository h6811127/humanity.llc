/**
 * Hydrate `#landing-try-live-object` from showcase-status-plate.json (WS-LAND-DEMO).
 * Soft-fail: keep section hidden if pointer missing or fetch fails.
 */
import {
  LANDING_TRY_LIVE_OBJECT_DATA_URL,
  LANDING_TRY_LIVE_OBJECT_LEAD,
  LANDING_TRY_LIVE_OBJECT_TITLE,
  resolveLandingTryLiveObject,
  shouldShowLandingTryLiveObjectQr,
} from "./landing-try-live-object-core.mjs";

/**
 * @param {ParentNode | Document} [root]
 */
export async function hydrateLandingTryLiveObject(root = document) {
  const section = root.querySelector("#landing-try-live-object");
  const link = root.querySelector("#landing-try-live-object-link");
  const lead = root.querySelector("#landing-try-live-object-lead");
  const title = root.querySelector("#landing-try-live-object-title");
  const labelEl = root.querySelector("#landing-try-live-object-label");
  const qrWrap = root.querySelector("#landing-try-live-object-qr");
  const qrImg = root.querySelector("#landing-try-live-object-qr-img");
  if (!(section instanceof HTMLElement) || !(link instanceof HTMLAnchorElement)) {
    return false;
  }

  section.hidden = true;

  try {
    const res = await fetch(LANDING_TRY_LIVE_OBJECT_DATA_URL, { cache: "no-store" });
    if (!res.ok) return false;
    const resolved = resolveLandingTryLiveObject(await res.json());
    if (!resolved) return false;

    link.href = resolved.scanUrl;
    link.textContent = LANDING_TRY_LIVE_OBJECT_TITLE;
    if (title instanceof HTMLElement) {
      title.textContent = LANDING_TRY_LIVE_OBJECT_TITLE;
    }
    if (lead instanceof HTMLElement) {
      lead.textContent = LANDING_TRY_LIVE_OBJECT_LEAD;
    }
    if (labelEl instanceof HTMLElement) {
      if (resolved.label) {
        labelEl.hidden = false;
        labelEl.textContent = `Demo · ${resolved.label}`;
      } else {
        labelEl.hidden = true;
        labelEl.textContent = "";
      }
    }

    const showQr =
      shouldShowLandingTryLiveObjectQr() &&
      qrWrap instanceof HTMLElement &&
      qrImg instanceof HTMLImageElement;
    if (showQr) {
      try {
        const { renderQrToImage } = await import("./qr-render.mjs");
        await renderQrToImage(qrImg, resolved.scanUrl);
        qrWrap.hidden = false;
      } catch {
        qrWrap.hidden = true;
      }
    } else if (qrWrap instanceof HTMLElement) {
      qrWrap.hidden = true;
    }

    section.hidden = false;
    return true;
  } catch {
    section.hidden = true;
    return false;
  }
}

void hydrateLandingTryLiveObject(document);
