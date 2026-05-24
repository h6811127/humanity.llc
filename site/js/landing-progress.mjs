/**
 * Landing progress strip — highlight the next step from local wallet/pins.
 */
const WALLET_KEY = "hc_wallet";
const PINS_KEY = "hc_device_pins";

function loadWallet() {
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadPins() {
  try {
    const raw = localStorage.getItem(PINS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function applyProgressState() {
  const steps = document.querySelectorAll(".landing-progress-step");
  if (!steps.length) return;

  const hasWallet = loadWallet().length > 0;
  const hasPins = loadPins().length > 0;

  for (const step of steps) {
    step.classList.remove("is-next", "is-done");
  }

  if (!hasWallet && !hasPins) {
    steps[1]?.classList.add("is-next");
    return;
  }

  if (hasWallet && !hasPins) {
    steps[0]?.classList.add("is-done");
    steps[1]?.classList.add("is-done");
    steps[2]?.classList.add("is-next");
    return;
  }

  if (hasWallet && hasPins) {
    steps[0]?.classList.add("is-done");
    steps[1]?.classList.add("is-done");
    steps[2]?.classList.add("is-done");
    steps[3]?.classList.add("is-done");
  }
}

applyProgressState();

window.addEventListener("storage", (e) => {
  if (e.key === WALLET_KEY || e.key === PINS_KEY) applyProgressState();
});

window.addEventListener("hc-device-hub-changed", applyProgressState);
