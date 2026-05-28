/**
 * Post-purchase thanks page — Tier 0 vs Tier 1 copy, order status (O-003).
 * @see docs/EPHEMERAL_STATE_AND_MERCH.md
 */
import {
  appendMerchRefToCreateUrl,
  isTier1MerchRef,
  persistMerchCreateRef,
  peekMerchCreateRef,
  peekMerchCustomizeRef,
  readMerchRefFromUrl,
} from "./merch-funnel-core.mjs";
import { reconcileThanksMintPanel } from "./shop-thanks-mint.mjs";

const form = document.getElementById("shop-thanks-status-form");
const resultEl = document.getElementById("shop-thanks-status-result");
const orderInput = document.getElementById("shop-thanks-order");
const emailInput = document.getElementById("shop-thanks-email");
const tier0Block = document.getElementById("shop-thanks-tier0");
const tier1Block = document.getElementById("shop-thanks-tier1");
const tier0NextBlock = document.getElementById("shop-thanks-next-tier0");
const tier1NextBlock = document.getElementById("shop-thanks-next-tier1");

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

function applyThanksTierCopy() {
  const tier1 = resolveTier1Thanks();
  if (tier0Block instanceof HTMLElement) tier0Block.hidden = tier1;
  if (tier1Block instanceof HTMLElement) tier1Block.hidden = !tier1;
  if (tier0NextBlock instanceof HTMLElement) tier0NextBlock.hidden = tier1;
  if (tier1NextBlock instanceof HTMLElement) tier1NextBlock.hidden = !tier1;
  document.title = tier1
    ? "Thanks · Live Object order · humanity.llc"
    : "Thanks · Founding sticker · humanity.llc";
  const meta = document.querySelector('meta[name="description"]');
  if (meta instanceof HTMLMetaElement) {
    meta.content = tier1
      ? "Thanks for your personalized Live Object order. Update what scanners read from your phone — same ink, new meaning."
      : "Thanks for backing the Tier 0 founding signal sticker. Scan before you stick; buying merch does not verify you.";
  }
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
