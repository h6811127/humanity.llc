/**
 * Scan page — carry hc_ref to /create/ and fire aggregate scan_landing beacon (M8.4).
 */
import { resolverApiOrigin } from "./hc-sign.mjs";
import {
  appendMerchRefToCreateUrl,
  markMerchBeaconSent,
  merchBeaconAlreadySent,
  peekMerchCreateRef,
  persistMerchCreateRef,
  readMerchRefFromUrl,
} from "./merch-funnel-core.mjs";

function profileIdFromPath() {
  const m = location.pathname.match(/^\/c\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function qrIdFromQuery() {
  try {
    return new URL(location.href).searchParams.get("q");
  } catch {
    return null;
  }
}

function isCardOwnerHere(profileId, qrId) {
  if (!profileId || !qrId) return false;
  try {
    const raw = sessionStorage.getItem("hc_created");
    if (!raw) return false;
    const session = JSON.parse(raw);
    if (!session || session.profile_id !== profileId) return false;
    if (session.qr_id && session.qr_id !== qrId) return false;
    return (
      typeof session.owner_private_key_b58 === "string" ||
      typeof session.recovery_private_key_b58 === "string"
    );
  } catch {
    return false;
  }
}

function decorateCreateLinks(ref) {
  if (!ref) return;
  for (const anchor of document.querySelectorAll('a[href*="/create"]')) {
    anchor.href = appendMerchRefToCreateUrl(anchor.href, ref);
  }
}

async function postScanLandingBeacon(ref) {
  if (merchBeaconAlreadySent(ref)) return;
  markMerchBeaconSent(ref);
  const url = new URL("/.well-known/hc/v1/metrics/merch-funnel", resolverApiOrigin());
  try {
    await fetch(url.href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref, event: "scan_landing" }),
      keepalive: true,
    });
  } catch {
    /* aggregate metric best-effort */
  }
}

function init() {
  const urlRef = readMerchRefFromUrl();
  if (urlRef) persistMerchCreateRef(urlRef);

  const ref = peekMerchCreateRef();
  decorateCreateLinks(ref);

  if (!ref) return;

  const profileId = profileIdFromPath();
  const qrId = qrIdFromQuery();
  if (isCardOwnerHere(profileId, qrId)) return;

  void postScanLandingBeacon(ref);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
