/**
 * /shop/thanks/ — post-purchase guidance + order status timeline.
 */
import { resolverApiOrigin } from "./hc-sign.mjs";
import {
  appendMerchRefToCreateUrl,
  persistMerchCreateRef,
  peekMerchCreateRef,
} from "./merch-funnel-core.mjs";
import {
  fetchStoreOrderStatus,
  orderStatusHeadline,
  peekCheckoutIntentId,
  readOrderStatusQuery,
} from "./shop-order-status-core.mjs";

const statusSection = document.getElementById("shop-thanks-status");
const statusHeadline = document.getElementById("shop-thanks-status-headline");
const statusLead = document.getElementById("shop-thanks-status-lead");
const timelineEl = document.getElementById("shop-thanks-timeline");
const statusError = document.getElementById("shop-thanks-status-error");
const lookupForm = document.getElementById("shop-thanks-lookup-form");
const lookupIntentInput = document.getElementById("shop-thanks-lookup-intent");
const lookupOrderInput = document.getElementById("shop-thanks-lookup-order");

function decorateThanksCreateLinks() {
  const ref = peekMerchCreateRef();
  if (!ref) return;
  for (const anchor of document.querySelectorAll('a[href*="/create"]')) {
    anchor.href = appendMerchRefToCreateUrl(anchor.href, ref);
  }
}

function setStatusError(message) {
  if (!statusError) return;
  statusError.hidden = !message;
  statusError.textContent = message || "";
}

function renderTimeline(timeline) {
  if (!timelineEl) return;
  timelineEl.replaceChildren();
  if (!Array.isArray(timeline) || !timeline.length) {
    timelineEl.hidden = true;
    return;
  }
  timelineEl.hidden = false;
  const list = document.createElement("ol");
  list.className = "shop-order-timeline";
  for (const step of timeline) {
    const item = document.createElement("li");
    item.className = `shop-order-timeline__step shop-order-timeline__step--${step.state || "pending"}`;
    const title = document.createElement("p");
    title.className = "shop-order-timeline__label";
    title.textContent = step.label || "Update";
    item.appendChild(title);
    if (step.detail) {
      const detail = document.createElement("p");
      detail.className = "shop-order-timeline__detail";
      detail.textContent = step.detail;
      item.appendChild(detail);
    }
    list.appendChild(item);
  }
  timelineEl.appendChild(list);
}

/**
 * @param {Record<string, unknown>} status
 */
function renderStatus(status) {
  if (!statusSection) return;
  statusSection.hidden = false;
  if (statusHeadline) {
    statusHeadline.textContent = orderStatusHeadline(String(status.commerce_status || ""));
  }
  if (statusLead) {
    const mode =
      status.fulfillment_mode === "personalized"
        ? "Personalized print"
        : status.fulfillment_mode === "tier0_batch"
          ? "Founding sticker"
          : "Merch order";
    const printLabel =
      typeof status.print_status_label === "string" && status.print_status_label.trim()
        ? status.print_status_label.trim()
        : null;
    statusLead.textContent = printLabel ? `${mode} · ${printLabel}` : mode;
  }
  renderTimeline(status.timeline);
}

async function loadStatusFromQuery(query) {
  setStatusError("");
  if (!query) return;
  try {
    const status = await fetchStoreOrderStatus(resolverApiOrigin(), query);
    renderStatus(status);
  } catch (err) {
    if (statusSection) statusSection.hidden = true;
    setStatusError(err instanceof Error ? err.message : "Could not load order status.");
  }
}

function bindLookupForm() {
  if (!lookupForm) return;
  lookupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const intentId = lookupIntentInput?.value?.trim() || "";
    const orderId = lookupOrderInput?.value?.trim() || "";
    if (intentId) {
      void loadStatusFromQuery({ artifact_intent_id: intentId });
      return;
    }
    if (orderId) {
      void loadStatusFromQuery({ shopify_order_id: orderId });
      return;
    }
    setStatusError("Enter your personalization reference or Shopify order number.");
  });
}

async function initThanks() {
  persistMerchCreateRef("tier0_shop");
  decorateThanksCreateLinks();
  bindLookupForm();

  const urlQuery = readOrderStatusQuery();
  if (urlQuery) {
    await loadStatusFromQuery(urlQuery);
    return;
  }

  const sessionIntent = peekCheckoutIntentId();
  if (sessionIntent) {
    await loadStatusFromQuery({ artifact_intent_id: sessionIntent });
  }
}

void initThanks();
