/**
 * Post-purchase thanks page — merch funnel attribution + buyer order status (O-003).
 */
import {
  appendMerchRefToCreateUrl,
  persistMerchCreateRef,
  peekMerchCreateRef,
} from "./merch-funnel-core.mjs";

const form = document.getElementById("shop-thanks-status-form");
const resultEl = document.getElementById("shop-thanks-status-result");
const orderInput = document.getElementById("shop-thanks-order");
const emailInput = document.getElementById("shop-thanks-email");

function apiOrigin() {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://127.0.0.1:8787";
  }
  return "https://humanity.llc";
}

function decorateThanksCreateLinks() {
  const ref = peekMerchCreateRef();
  if (!ref) return;
  for (const anchor of document.querySelectorAll('a[href*="/create"]')) {
    anchor.href = appendMerchRefToCreateUrl(anchor.href, ref);
  }
}

function renderStatusResult(payload) {
  if (!resultEl) return;
  resultEl.hidden = false;
  resultEl.innerHTML = `
    <p class="shop-thanks-status-label"><strong>${payload.status_label}</strong></p>
    <p class="shop-thanks-status-message">${payload.message}</p>
    ${
      payload.order_number
        ? `<p class="shop-thanks-status-meta">Order ${payload.order_number}</p>`
        : ""
    }
  `;
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

persistMerchCreateRef("tier0_shop");
decorateThanksCreateLinks();
prefillFromQuery();
