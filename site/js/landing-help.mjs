/**
 * Landing floating help — tips for new visitors; optional dismiss for session.
 */
const DISMISS_KEY = "hc_help_dismissed";

const root = document.getElementById("landing-help-root");
const openBtn = document.getElementById("landing-help-open");
const drawer = document.getElementById("landing-help-drawer");
const closeBtn = document.getElementById("landing-help-close");
const dismissBtn = document.getElementById("landing-help-dismiss");

function hasDeviceData() {
  try {
    const wallet = JSON.parse(localStorage.getItem("hc_wallet") || "[]");
    const pins = JSON.parse(localStorage.getItem("hc_device_pins") || "[]");
    return (
      (Array.isArray(wallet) && wallet.length > 0) ||
      (Array.isArray(pins) && pins.length > 0)
    );
  } catch {
    return false;
  }
}

function setExpanded(open) {
  if (!root || !openBtn || !drawer) return;
  root.classList.toggle("is-expanded", open);
  openBtn.setAttribute("aria-expanded", open ? "true" : "false");
  drawer.hidden = !open;
  openBtn.hidden = open;
}

if (sessionStorage.getItem(DISMISS_KEY) === "1" && !hasDeviceData()) {
  root?.classList.add("is-dismissed");
}

openBtn?.addEventListener("click", () => setExpanded(true));
closeBtn?.addEventListener("click", () => setExpanded(false));

dismissBtn?.addEventListener("click", () => {
  sessionStorage.setItem(DISMISS_KEY, "1");
  if (root) root.classList.add("is-dismissed");
  setExpanded(false);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && root?.classList.contains("is-expanded")) {
    setExpanded(false);
  }
});

document.addEventListener("click", (e) => {
  if (!root?.classList.contains("is-expanded")) return;
  const target = e.target;
  if (target instanceof Node && root.contains(target)) return;
  setExpanded(false);
});
