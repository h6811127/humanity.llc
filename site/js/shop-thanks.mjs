/**
 * Post-purchase thanks page — Tier 0 vs Tier 1 copy, order status (O-003).
 * @see docs/EPHEMERAL_STATE_AND_MERCH.md
 */
import {
  appendMerchRefToCreateUrl,
  isTier0GlitchMerchRef,
  isTier1MerchRef,
  persistMerchCreateRef,
  peekMerchCreateRef,
  peekMerchCustomizeRef,
  readMerchRefFromUrl,
} from "./merch-funnel-core.mjs";
import { reconcileThanksMintPanel } from "./shop-thanks-mint.mjs";
import { syncMerchBackupNudgeNotice } from "./merch-backup-nudge.mjs";

const form = document.getElementById("shop-thanks-status-form");
const resultEl = document.getElementById("shop-thanks-status-result");
const orderInput = document.getElementById("shop-thanks-order");
const emailInput = document.getElementById("shop-thanks-email");
const tier0Block = document.getElementById("shop-thanks-tier0");
const tier1Block = document.getElementById("shop-thanks-tier1");
const tier0NextBlock = document.getElementById("shop-thanks-next-tier0");
const tier1NextBlock = document.getElementById("shop-thanks-next-tier1");
const tier0EyebrowEl = document.getElementById("shop-thanks-tier0-eyebrow");
const tier0TitleEl = document.getElementById("shop-thanks-tier0-title");
const tier0LineEl = document.getElementById("shop-thanks-tier0-line");
const tier0PurchaseNoteEl = document.getElementById("shop-thanks-tier0-purchase-note");

/** @type {Record<string, { title: string; meta: string; eyebrow: string; lineHtml: string; purchaseNoteHtml: string }>} */
const TIER0_THANKS_COPY = {
  sticker: {
    eyebrow: "Tier 0 · thanks",
    title: "Your sticker ships  -  your status doesn\u2019t",
    lineHtml:
      "Thanks for backing a physical experiment in human trust. When your sticker arrives, <strong>scan it before you stick it anywhere</strong>. You\u2019ll see live status and plain limits  -  not a verified badge in the mail.",
    meta: "Thanks for backing the Tier 0 founding signal sticker. Scan before you stick; buying merch does not verify you.",
    purchaseNoteHtml:
      "<strong>Buying this sticker did not verify you.</strong> The shared campaign QR points at live status  -  not proof that you hold a card.",
  },
  glitch: {
    eyebrow: "Company drop · thanks",
    title: "Your hoodie ships  -  the live scan is not yours to edit",
    lineHtml:
      "Thanks for backing a founding garment experiment. When it arrives, <strong>scan the shared campaign QR before you wear it</strong>. Strangers read whatever stewards publish on the campaign card  -  buying does not grant control or a vouch.",
    meta: "Thanks for your Glitch LIVE QR hoodie order. Scan when it arrives; buying company merch does not verify you.",
    purchaseNoteHtml:
      "<strong>Buying this hoodie did not verify you.</strong> The printed QR is a shared batch pointer  -  not your personal Humanity Card.",
  },
};

function apiOrigin() {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://127.0.0.1:8787";
  }
  return "https://humanity.llc";
}

/**
 * @returns {boolean}
 */
function resolveTier1Thanks() {
  const urlRef = readMerchRefFromUrl();
  const ref = urlRef || peekMerchCustomizeRef() || peekMerchCreateRef();
  return isTier1MerchRef(ref);
}

function resolveActiveMerchRef() {
  return readMerchRefFromUrl() || peekMerchCustomizeRef() || peekMerchCreateRef();
}

function syncThanksBackupNudge() {
  syncMerchBackupNudgeNotice({
    noticeId: "shop-thanks-backup-nudge",
    phase: "post_checkout",
    enabled: resolveTier1Thanks(),
  });
}

function applyThanksTierCopy() {
  const tier1 = resolveTier1Thanks();
  const ref = resolveActiveMerchRef();
  const glitch = !tier1 && isTier0GlitchMerchRef(ref);
  const tier0Key = glitch ? "glitch" : "sticker";
  const tier0Copy = TIER0_THANKS_COPY[tier0Key];

  if (tier0Block instanceof HTMLElement) tier0Block.hidden = tier1;
  if (tier1Block instanceof HTMLElement) tier1Block.hidden = !tier1;
  if (tier0NextBlock instanceof HTMLElement) tier0NextBlock.hidden = tier1;
  if (tier1NextBlock instanceof HTMLElement) tier1NextBlock.hidden = !tier1;

  if (!tier1 && tier0Copy) {
    if (tier0EyebrowEl) tier0EyebrowEl.textContent = tier0Copy.eyebrow;
    if (tier0TitleEl) tier0TitleEl.textContent = tier0Copy.title;
    if (tier0LineEl) tier0LineEl.innerHTML = tier0Copy.lineHtml;
    if (tier0PurchaseNoteEl) tier0PurchaseNoteEl.innerHTML = tier0Copy.purchaseNoteHtml;
  }

  document.title = tier1
    ? "Thanks · Live Object order · humanity.llc"
    : glitch
      ? "Thanks · Glitch hoodie · humanity.llc"
      : "Thanks · Founding sticker · humanity.llc";
  const meta = document.querySelector('meta[name="description"]');
  if (meta instanceof HTMLMetaElement) {
    meta.content = tier1
      ? "Thanks for your personalized Live Object order. Update what scanners read from your phone — same ink, new meaning."
      : tier0Copy.meta;
  }
  syncThanksBackupNudge();
}

function decorateThanksCreateLinks() {
  const ref = peekMerchCreateRef() || peekMerchCustomizeRef() || readMerchRefFromUrl();
  if (!ref) return;
  for (const anchor of document.querySelectorAll('a[href*="/create"]')) {
    anchor.href = appendMerchRefToCreateUrl(anchor.href, ref);
  }
}

function renderStatusResult(payload) {
  if (!resultEl) return;
  resultEl.hidden = false;
  const tracking = payload.tracking;
  const trackingHtml =
    tracking && (tracking.tracking_url || tracking.tracking_number)
      ? `<p class="shop-thanks-status-tracking">${
          tracking.tracking_url
            ? `<a href="${tracking.tracking_url}" rel="noopener noreferrer" target="_blank">Track shipment${
                tracking.carrier ? ` (${tracking.carrier})` : ""
              }</a>`
            : `Tracking: ${tracking.tracking_number ?? ""}`
        }</p>`
      : "";
  resultEl.innerHTML = `
    <p class="shop-thanks-status-label"><strong>${payload.status_label}</strong></p>
    <p class="shop-thanks-status-message">${payload.message}</p>
    ${trackingHtml}
    ${
      payload.order_number
        ? `<p class="shop-thanks-status-meta">Order ${payload.order_number}</p>`
        : ""
    }
  `;
  const order =
    orderInput instanceof HTMLInputElement ? orderInput.value.trim().replace(/^#+/, "") : "";
  const email = emailInput instanceof HTMLInputElement ? emailInput.value.trim() : "";
  if (order && email) {
    reconcileThanksMintPanel(payload, resolveTier1Thanks(), order, email);
  }
}

function renderStatusError(message) {
  if (!resultEl) return;
  resultEl.hidden = false;
  resultEl.innerHTML = `<p class="shop-thanks-status-message" role="alert">${message}</p>`;
}

async function fetchOrderStatus(order, email) {
  const params = new URLSearchParams({ order, email });
  const res = await fetch(`${apiOrigin()}/v1/store/order-status?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof json.message === "string"
        ? json.message
        : "Order not found. Check your order number and email.";
    throw new Error(msg);
  }
  return json;
}

function prefillFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const order = params.get("order");
  const email = params.get("email");
  if (order && orderInput instanceof HTMLInputElement) orderInput.value = order;
  if (email && emailInput instanceof HTMLInputElement) emailInput.value = email;
  if (order && email) {
    void fetchOrderStatus(order.replace(/^#+/, ""), email)
      .then(renderStatusResult)
      .catch((err) => renderStatusError(err.message));
  }
}

if (form instanceof HTMLFormElement) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const order =
      orderInput instanceof HTMLInputElement ? orderInput.value.trim().replace(/^#+/, "") : "";
    const email = emailInput instanceof HTMLInputElement ? emailInput.value.trim() : "";
    if (!order || !email) return;
    if (resultEl) resultEl.hidden = true;
    try {
      const status = await fetchOrderStatus(order, email);
      renderStatusResult(status);
    } catch (err) {
      renderStatusError(err instanceof Error ? err.message : "Could not load order status.");
    }
  });
}

const urlRef = readMerchRefFromUrl();
if (urlRef) {
  persistMerchCreateRef(urlRef);
} else if (!peekMerchCreateRef() && !peekMerchCustomizeRef()) {
  persistMerchCreateRef("tier0_shop");
}

applyThanksTierCopy();
decorateThanksCreateLinks();
prefillFromQuery();
window.addEventListener("hc-key-backup-exported", syncThanksBackupNudge);
window.addEventListener("hc-recovery-acknowledged", syncThanksBackupNudge);
