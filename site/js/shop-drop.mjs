/**
 * Tier 0 drop — local interest list until Shopify checkout is wired.
 * Stored in localStorage only; operator reads via DevTools (see SHOP_TIER0_IMPLEMENTATION.md).
 */
const STORAGE_KEY = "hc_shop_drop_interest";

function loadInterest() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveInterest(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 200)));
}

const form = document.getElementById("shop-interest-form");
const emailInput = document.getElementById("shop-interest-email");
const statusEl = document.getElementById("shop-interest-status");

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.hidden = !msg;
  statusEl.textContent = msg;
  statusEl.className = isError ? "form-status error" : "form-status";
}

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = emailInput?.value?.trim() || "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("Enter a valid email or leave blank.", true);
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
    setStatus(
      "Saved on this device. We will wire checkout next — bookmark this page or leave an email for a one-time ping when the drop opens."
    );
  });
}
