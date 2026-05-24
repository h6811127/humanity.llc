/**
 * Static combining-ideas scan demos — QR render + scenario toggles (no network).
 */
import { renderQrToImage } from "./qr-render.mjs";

export async function renderDemoQr() {
  const slot = document.getElementById("pass-qr-slot");
  const url = slot?.dataset?.scanUrl?.trim();
  if (!slot || !url) return;
  let img = slot.querySelector("img");
  if (!img) {
    img = document.createElement("img");
    img.width = 88;
    img.height = 88;
    slot.appendChild(img);
  }
  await renderQrToImage(img, url);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function toggleClass(id, className, on) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle(className, on);
}

function setRowState(rowId, { title, sub, highlight, muted }) {
  const row = document.getElementById(rowId);
  if (!row) return;
  const titleEl = row.querySelector(".list-title");
  const subEl = row.querySelector(".list-sub");
  if (titleEl && title != null) titleEl.textContent = title;
  if (subEl && sub != null) subEl.textContent = sub;
  row.classList.toggle("is-highlight", !!highlight);
  row.classList.toggle("is-muted", !!muted);
}

function initGamesMaintenance() {
  let fixed = false;
  const btn = document.getElementById("demo-games-toggle");
  if (!btn) return;

  const apply = () => {
    setText("demo-games-badge", fixed ? "Route open" : "Paused");
    setText("demo-games-manifesto", fixed ? "Maintainer verified · route 5 unlocked" : "Awaiting maintainer sign-off");
    setHtml(
      "demo-games-trust",
      fixed
        ? '<li class="trust-on">Maintainer OK</li><li class="trust-on">Route unlocked</li><li class="trust-on">+48 discovery</li>'
        : '<li class="trust-warn">Safety paused</li><li>Route locked</li><li class="trust-on">+10 report pts</li>'
    );
    setRowState("demo-game-route", {
      title: fixed ? "Route 5 · North loop" : "Route 5 · locked",
      sub: fixed ? "Unlocked after maintainer sign-off" : "Complete fix verification to unlock",
      highlight: fixed,
      muted: !fixed,
    });
    setRowState("demo-game-points", {
      title: fixed ? "+48 discovery points" : "+10 report credit",
      sub: fixed ? "Checkpoint 4 · filter box node" : "Report submitted · not safety authority",
      highlight: false,
      muted: false,
    });
    setRowState("demo-maint-status", {
      title: fixed ? "In service" : "Out of service",
      sub: fixed ? "Signed today 9:14 AM · parks maintainer" : "Pad expired · do not rely on game copy",
      highlight: fixed,
      muted: !fixed,
    });
    setRowState("demo-maint-next", {
      title: fixed ? "Next check: August" : "Maintenance notified",
      sub: fixed ? "Separate stream from game points" : "Only maintainer key can clear pause",
      highlight: false,
      muted: !fixed,
    });
    btn.textContent = fixed ? "Reset demo" : "Simulate maintainer fix";
    btn.setAttribute("aria-pressed", fixed ? "true" : "false");
  };

  btn.addEventListener("click", () => {
    fixed = !fixed;
    apply();
  });
  apply();
}

function initCrisisFreshness() {
  const tabs = document.querySelectorAll("[data-crisis-tab]");
  const panels = {
    pantry: document.getElementById("demo-crisis-panel-pantry"),
    batch: document.getElementById("demo-crisis-panel-batch"),
  };

  const manifesto = {
    pantry: "Pantry + fridge streams · wallet card",
    batch: "Batch B-12 · kitchen-signed freshness",
  };

  const setTab = (key) => {
    tabs.forEach((tab) => {
      const active = tab.dataset.crisisTab === key;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    Object.entries(panels).forEach(([k, panel]) => {
      if (panel) panel.hidden = k !== key;
    });
    setText("demo-crisis-manifesto", manifesto[key] ?? "");
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setTab(tab.dataset.crisisTab));
  });
  setTab("pantry");
}

function initMarketsSurplus() {
  let surplusOpen = true;
  const btn = document.getElementById("demo-markets-toggle");
  if (!btn) return;

  const apply = () => {
    setText("demo-markets-badge", surplusOpen ? "Market live" : "Stalls only");
    setText(
      "demo-markets-manifesto",
      surplusOpen ? "Menus + surplus window open" : "Menus live · surplus closed"
    );
    setHtml(
      "demo-markets-trust",
      surplusOpen
        ? '<li class="trust-on">3 stalls open</li><li class="trust-on">Surplus tagged</li><li class="trust-on">Vendor menus</li>'
        : '<li class="trust-on">2 stalls open</li><li class="trust-warn">Surplus closed</li><li class="trust-on">Vendor menus</li>'
    );
    setRowState("demo-surplus-row", {
      title: surplusOpen ? "Veg chili · safe to take" : "Surplus window closed",
      sub: surplusOpen
        ? "12 portions · expires 8 PM · prep kitchen signed"
        : "Vendor updates one object — no reprint",
      highlight: surplusOpen,
      muted: !surplusOpen,
    });
    btn.textContent = surplusOpen ? "Close surplus window" : "Open surplus window";
    btn.setAttribute("aria-pressed", surplusOpen ? "true" : "false");
  };

  btn.addEventListener("click", () => {
    surplusOpen = !surplusOpen;
    apply();
  });
  apply();
}

const INIT = {
  games: initGamesMaintenance,
  crisis: initCrisisFreshness,
  markets: initMarketsSurplus,
};

const root = document.documentElement.dataset.combiningDemo;
if (root && INIT[root]) {
  INIT[root]();
  renderDemoQr().catch(() => {});
}
