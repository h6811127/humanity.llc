/**
 * Tier 0 shop  -  checkout handoff or local interest until Shopify URL is set.
 */
import {
  isTier0CheckoutOpen,
  loadShopConfig,
  tier0Display,
  tier0ThanksPageUrl,
} from "./shop-config.mjs";
import {
  appendMerchRefToCreateUrl,
  persistMerchCreateRef,
  peekMerchCreateRef,
} from "./merch-funnel-core.mjs";
import {
  SHOP_CHECKOUT_READY_LEAD,
  shopPriceLabelWhenCheckoutClosed,
} from "./shop-copy-core.mjs";

const INTEREST_KEY = "hc_shop_drop_interest";

const checkoutSection = document.getElementById("shop-checkout-group");
const interestSection = document.getElementById("shop-interest-group");
const priceEl = document.getElementById("shop-product-price");
const buyBtn = document.getElementById("shop-buy-btn");
const buyBtnFooter = document.getElementById("shop-buy-btn-footer");
const notifyBtn = document.getElementById("shop-notify-btn");
const checkoutNote = document.getElementById("shop-checkout-note");
const checkoutLead = document.getElementById("shop-checkout-lead");
const heroPrimary = document.getElementById("shop-hero-primary");
const interestForm = document.getElementById("shop-interest-form");
const emailInput = document.getElementById("shop-interest-email");
const interestStatus = document.getElementById("shop-interest-status");
const thanksLink = document.getElementById("shop-thanks-link");
const postPurchaseUrlEl = document.getElementById("shop-post-purchase-url");

function loadInterest() {
  try {
    const raw = localStorage.getItem(INTEREST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveInterest(entries) {
  localStorage.setItem(INTEREST_KEY, JSON.stringify(entries.slice(0, 200)));
}

function setInterestStatus(msg, isError = false) {
  if (!interestStatus) return;
  interestStatus.hidden = !msg;
  interestStatus.textContent = msg;
  interestStatus.className = isError ? "form-status error" : "form-status";
}

function setBuyButtonsVisible(visible, checkoutUrl = "") {
  for (const btn of [buyBtn, buyBtnFooter]) {
    if (!btn) continue;
    if (visible && checkoutUrl) {
      btn.href = checkoutUrl;
      btn.hidden = false;
      btn.removeAttribute("aria-disabled");
    } else {
      btn.removeAttribute("href");
      btn.hidden = true;
      btn.setAttribute("aria-disabled", "true");
    }
  }
}

function bindInterestForm() {
  if (!interestForm) return;
  interestForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = emailInput?.value?.trim() || "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInterestStatus("Enter a valid email or leave blank.", true);
      return;
    }
    const entries = loadInterest();
    entries.unshift({
      email: email || null,
      at: new Date().toISOString(),
      page: location.pathname,
    });
    saveInterest(entries);
    if (emailInput) emailInput.value = "";
    setInterestStatus(
      "Saved on this device. Bookmark this page  -  we will enable checkout when the drop opens."
    );
  });
}

/**
 * @param {ReturnType<typeof tier0Display>} display
 * @param {string} checkoutUrl
 * @param {string} thanksUrl
 */
function showCheckout(display, checkoutUrl, thanksUrl) {
  if (priceEl) {
    priceEl.textContent = display.price || "Available now";
    priceEl.classList.add("shop-product-price--live");
  }
  setBuyButtonsVisible(true, checkoutUrl);
  // One primary buy in the product card; footer CTA duplicates layout when both show.
  if (buyBtnFooter) buyBtnFooter.hidden = true;
  if (checkoutNote) checkoutNote.hidden = false;
  if (notifyBtn) notifyBtn.hidden = true;
  if (heroPrimary) {
    heroPrimary.href = checkoutUrl;
    heroPrimary.textContent = "Buy the founding sticker";
    heroPrimary.target = "_blank";
    heroPrimary.rel = "noopener noreferrer";
    heroPrimary.classList.add("landing-hero-btn-primary");
    heroPrimary.classList.remove("landing-hero-btn-secondary");
  }
  if (thanksLink) thanksLink.href = thanksUrl;
  if (checkoutLead) {
    checkoutLead.textContent = SHOP_CHECKOUT_READY_LEAD;
    checkoutLead.hidden = false;
    checkoutLead.classList.add("shop-checkout-lead-ready");
  }
  if (postPurchaseUrlEl) {
    const code = postPurchaseUrlEl.querySelector(".shop-post-purchase-url__value");
    if (code) code.textContent = thanksUrl;
    postPurchaseUrlEl.hidden = false;
  }
  if (checkoutSection) checkoutSection.hidden = false;
  if (interestSection) interestSection.hidden = true;
}

function showInterestPending(display) {
  if (priceEl) {
    priceEl.textContent = shopPriceLabelWhenCheckoutClosed(display.price);
    priceEl.classList.remove("shop-product-price--live");
  }
  setBuyButtonsVisible(false);
  if (checkoutNote) checkoutNote.hidden = true;
  if (notifyBtn) notifyBtn.hidden = false;
  if (heroPrimary) {
    heroPrimary.href = "#shop-interest-group";
    heroPrimary.textContent = "Notify when checkout opens";
    heroPrimary.removeAttribute("target");
    heroPrimary.removeAttribute("rel");
    heroPrimary.classList.add("landing-hero-btn-primary");
    heroPrimary.classList.remove("landing-hero-btn-secondary");
  }
  if (checkoutLead) {
    checkoutLead.textContent = "";
    checkoutLead.hidden = true;
    checkoutLead.classList.remove("shop-checkout-lead-ready");
  }
  if (postPurchaseUrlEl) postPurchaseUrlEl.hidden = true;
  if (checkoutSection) checkoutSection.hidden = true;
  if (interestSection) interestSection.hidden = false;
}

function decorateShopCreateLinks() {
  const ref = peekMerchCreateRef();
  if (!ref) return;
  for (const anchor of document.querySelectorAll('a[href*="/create"]')) {
    anchor.href = appendMerchRefToCreateUrl(anchor.href, ref);
  }
}

async function initShop() {
  persistMerchCreateRef("tier0_shop");
  decorateShopCreateLinks();
  bindInterestForm();
  try {
    const config = await loadShopConfig();
    const display = tier0Display(config);
    if (isTier0CheckoutOpen(config)) {
      showCheckout(display, display.checkoutUrl, tier0ThanksPageUrl(config, location.origin));
      return;
    }
    showInterestPending(display);
  } catch {
    showInterestPending({ title: "Founding signal sticker", price: null, checkoutUrl: "" });
  }
}

void initShop();
