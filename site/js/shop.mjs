/**
 * Tier 0 shop — checkout handoff or local interest until Shopify URL is set.
 */
import { isTier0CheckoutOpen, loadShopConfig, tier0Display } from "./shop-config.mjs";

const INTEREST_KEY = "hc_shop_drop_interest";

const checkoutSection = document.getElementById("shop-checkout-group");
const interestSection = document.getElementById("shop-interest-group");
const priceEl = document.getElementById("shop-product-price");
const buyBtn = document.getElementById("shop-buy-btn");
const buyBtnFooter = document.getElementById("shop-buy-btn-footer");
const notifyBtn = document.getElementById("shop-notify-btn");
const checkoutNote = document.getElementById("shop-checkout-note");
const heroPrimary = document.getElementById("shop-hero-primary");
const interestForm = document.getElementById("shop-interest-form");
const emailInput = document.getElementById("shop-interest-email");
const interestStatus = document.getElementById("shop-interest-status");

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
      "Saved on this device. Bookmark this page — we will enable checkout when the drop opens."
    );
  });
}

/**
 * @param {ReturnType<typeof tier0Display>} display
 * @param {string} checkoutUrl
 */
function showCheckout(display, checkoutUrl) {
  if (priceEl) {
    priceEl.textContent = display.price || "Available now";
    priceEl.classList.add("shop-product-price--live");
  }
  setBuyButtonsVisible(true, checkoutUrl);
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
  if (checkoutSection) checkoutSection.hidden = false;
  if (interestSection) interestSection.hidden = true;
}

function showInterestPending(display) {
  if (priceEl) {
    priceEl.textContent = display.price ? `${display.price} · checkout soon` : "Checkout opening soon";
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
  if (checkoutSection) checkoutSection.hidden = true;
  if (interestSection) interestSection.hidden = false;
}

async function initShop() {
  bindInterestForm();
  try {
    const config = await loadShopConfig();
    const display = tier0Display(config);
    if (isTier0CheckoutOpen(config)) {
      showCheckout(display, display.checkoutUrl);
      return;
    }
    showInterestPending(display);
  } catch {
    showInterestPending({ title: "Founding signal sticker", price: null, checkoutUrl: "" });
  }
}

void initShop();
