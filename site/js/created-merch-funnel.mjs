/**
 * /created/ — merch funnel handoff to QR customizer after fresh create.
 * See docs/MERCH_FUNNEL_MVP.md exit checklist · DEVICE_SHELL_E2E_CI_REMEDIATION step 3.
 */
import {
  merchCustomizeUrlFromRef,
  peekMerchCustomizeRef,
  persistMerchCreateRef,
  readMerchRefFromUrl,
  shouldAutoRedirectCreatedToCustomize,
  shouldShowCreatedMerchCustomizeCard,
} from "./merch-funnel-core.mjs";

/**
 * @returns {boolean}
 */
function readCreatedSessionReady() {
  try {
    const raw = sessionStorage.getItem("hc_created");
    if (!raw) return false;
    const data = JSON.parse(raw);
    return Boolean(data?.owner_private_key_b58 && data?.profile_id);
  } catch {
    return false;
  }
}

/**
 * @param {{ fresh?: boolean }} [opts]
 */
export function initCreatedMerchFunnel(opts = {}) {
  const card = document.getElementById("created-merch-customize-card");
  const link = document.getElementById("created-merch-customize-link");
  if (!card || !link) return;

  const urlRef = readMerchRefFromUrl();
  if (urlRef) persistMerchCreateRef(urlRef);

  const merchRef = urlRef || peekMerchCustomizeRef();
  const fresh = opts.fresh ?? new URLSearchParams(location.search).get("fresh") === "1";
  const sessionHasSigningKeys = readCreatedSessionReady();

  const customizeUrl = merchCustomizeUrlFromRef(merchRef, location.origin);
  if (
    customizeUrl &&
    shouldAutoRedirectCreatedToCustomize({ fresh, merchRef, sessionHasSigningKeys })
  ) {
    location.replace(customizeUrl);
    return;
  }

  if (!shouldShowCreatedMerchCustomizeCard({ fresh, merchRef })) {
    card.hidden = true;
    return;
  }

  if (!customizeUrl) {
    card.hidden = true;
    return;
  }

  link.href = customizeUrl;
  card.hidden = false;
}
