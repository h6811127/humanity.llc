/**
 * Interactive Path 2 prototype for docs/SCAN_PAGE_TRUST_UI.md
 */

const PHASES = ["idle", "checking", "resolved", "after"];
const DOT_MODES = ["static", "sync", "loop", "breathe"];

const els = {
  hero: () => document.getElementById("trust-demo-hero"),
  statusLine: () => document.getElementById("trust-demo-status-line"),
  trustRows: () => [...document.querySelectorAll(".trust-demo-trust-row")],
  limits: () => document.getElementById("trust-demo-limits"),
  actorBand: () => document.getElementById("trust-demo-actor-band"),
  dotBtn: () => document.getElementById("trust-demo-dot-btn"),
  dot: () => document.getElementById("trust-demo-dot"),
  phaseLabel: () => document.getElementById("trust-demo-phase-label"),
};

let phase = "idle";
let dotMode = "static";
let operatorBand = false;
let forceReducedMotion = false;
let autoTimer = null;

function readQuery() {
  const q = new URLSearchParams(location.search);
  const p = q.get("phase");
  if (p && PHASES.includes(p)) phase = p;
  const d = q.get("dot");
  if (d && DOT_MODES.includes(d)) dotMode = d;
  if (q.get("operator") === "1") operatorBand = true;
  if (q.get("auto") === "1") queueMicrotask(() => runAutoSequence());
}

function syncUrl() {
  const q = new URLSearchParams();
  q.set("phase", phase);
  q.set("dot", dotMode);
  if (operatorBand) q.set("operator", "1");
  history.replaceState(null, "", `${location.pathname}?${q}`);
}

function clearDotClasses() {
  const btn = els.dotBtn();
  if (!btn) return;
  btn.classList.remove(
    "trust-demo-dot-settle",
    "trust-demo-dot-loop",
    "trust-demo-dot-breathe"
  );
}

function applyDotMode() {
  clearDotClasses();
  const btn = els.dotBtn();
  if (!btn) return;
  if (dotMode === "sync") btn.classList.add("trust-demo-dot-settle");
  if (dotMode === "loop") btn.classList.add("trust-demo-dot-loop");
  if (dotMode === "breathe") btn.classList.add("trust-demo-dot-breathe");
  const labels = {
    static: "humanity.llc home",
    sync: "humanity.llc home",
    loop: "humanity.llc home (looping — Test B bad)",
    breathe: "humanity.llc home (brand breathe)",
  };
  btn.setAttribute("aria-label", labels[dotMode] || labels.static);
}

function setPhase(next) {
  phase = next;
  const hero = els.hero();
  const statusLine = els.statusLine();
  const limits = els.limits();
  const actor = els.actorBand();

  hero?.classList.remove("scan-safety--pulse");
  clearDotClasses();
  applyDotMode();

  for (const row of els.trustRows()) {
    row.classList.remove("is-visible");
    row.hidden = phase === "idle" || phase === "checking";
    if (phase === "checking") {
      row.innerHTML = '<span class="trust-demo-skeleton" style="width:88%"></span>';
    }
  }

  if (phase === "idle") {
    statusLine.textContent = "Live check";
    statusLine.className = "trust-demo-status-line";
    limits?.classList.remove("is-visible");
    actor?.classList.remove("is-visible");
    actor?.setAttribute("hidden", "");
    els.phaseLabel().textContent = "T+0 idle";
    syncPhaseButtons();
    syncUrl();
    return;
  }

  if (phase === "checking") {
    statusLine.textContent = "Checking live status…";
    statusLine.className = "trust-demo-status-line is-checking";
    limits?.classList.remove("is-visible");
    actor?.classList.remove("is-visible");
    actor?.setAttribute("hidden", "");
    els.phaseLabel().textContent = "T+checking";
    syncPhaseButtons();
    syncUrl();
    return;
  }

  statusLine.textContent = "Active";
  statusLine.className = "trust-demo-status-line is-resolved";

  const rowCopy = [
    "Card status: active",
    "This QR: valid",
    "Checked just now",
  ];
  els.trustRows().forEach((row, i) => {
    row.hidden = false;
    row.textContent = rowCopy[i] || row.textContent;
    window.setTimeout(
      () => row.classList.add("is-visible"),
      forceReducedMotion ? 0 : 80 + i * 100
    );
  });

  if (phase === "resolved") {
    hero?.classList.add("scan-safety--pulse");
    if (dotMode === "sync") {
      els.dotBtn()?.classList.add("trust-demo-dot-settle");
    }
    limits?.classList.add("is-visible");
    if (operatorBand) {
      actor?.removeAttribute("hidden");
      window.setTimeout(
        () => actor?.classList.add("is-visible"),
        forceReducedMotion ? 0 : 220
      );
    } else {
      actor?.classList.remove("is-visible");
      actor?.setAttribute("hidden", "");
    }
    els.phaseLabel().textContent = operatorBand
      ? "T+resolved (+ operator band)"
      : "T+resolved";
  }

  if (phase === "after") {
    limits?.classList.add("is-visible");
    if (operatorBand) {
      actor?.removeAttribute("hidden");
      actor?.classList.add("is-visible");
    } else {
      actor?.classList.remove("is-visible");
      actor?.setAttribute("hidden", "");
    }
    els.phaseLabel().textContent = "T+after (still)";
  }

  syncPhaseButtons();
  syncUrl();
}

function syncPhaseButtons() {
  for (const btn of document.querySelectorAll("[data-trust-phase]")) {
    btn.setAttribute("aria-pressed", btn.dataset.trustPhase === phase ? "true" : "false");
  }
  for (const btn of document.querySelectorAll("[data-trust-dot]")) {
    btn.setAttribute("aria-pressed", btn.dataset.trustDot === dotMode ? "true" : "false");
  }
  const op = document.getElementById("trust-demo-operator-toggle");
  if (op) op.checked = operatorBand;
  const rm = document.getElementById("trust-demo-reduced-toggle");
  if (rm) rm.checked = forceReducedMotion;
}

function runAutoSequence() {
  if (autoTimer) clearTimeout(autoTimer);
  setPhase("idle");
  autoTimer = setTimeout(() => {
    setPhase("checking");
    autoTimer = setTimeout(() => {
      setPhase("resolved");
      autoTimer = setTimeout(() => setPhase("after"), 1200);
    }, 1400);
  }, 400);
}

function bindDevPanel() {
  for (const btn of document.querySelectorAll("[data-trust-phase]")) {
    btn.addEventListener("click", () => {
      if (autoTimer) clearTimeout(autoTimer);
      setPhase(btn.dataset.trustPhase);
    });
  }
  for (const btn of document.querySelectorAll("[data-trust-dot]")) {
    btn.addEventListener("click", () => {
      dotMode = btn.dataset.trustDot;
      applyDotMode();
      syncPhaseButtons();
      syncUrl();
      if (phase === "resolved") setPhase("resolved");
    });
  }
  document.getElementById("trust-demo-operator-toggle")?.addEventListener("change", (e) => {
    operatorBand = e.target.checked;
    syncUrl();
    if (phase === "resolved" || phase === "after") setPhase(phase);
  });
  document.getElementById("trust-demo-reduced-toggle")?.addEventListener("change", (e) => {
    forceReducedMotion = e.target.checked;
    document.body.classList.toggle("trust-demo-force-reduced-motion", forceReducedMotion);
    setPhase(phase);
  });
  document.getElementById("trust-demo-auto")?.addEventListener("click", runAutoSequence);
  document.getElementById("trust-demo-test-a")?.addEventListener("click", () => {
    if (autoTimer) clearTimeout(autoTimer);
    dotMode = "static";
    operatorBand = false;
    setPhase("resolved");
  });
  document.getElementById("trust-demo-test-b-static")?.addEventListener("click", () => {
    if (autoTimer) clearTimeout(autoTimer);
    dotMode = "static";
    operatorBand = false;
    runAutoSequence();
  });
  document.getElementById("trust-demo-test-b-loop")?.addEventListener("click", () => {
    if (autoTimer) clearTimeout(autoTimer);
    dotMode = "loop";
    operatorBand = false;
    runAutoSequence();
  });
}

readQuery();
bindDevPanel();
applyDotMode();
document.body.classList.toggle("trust-demo-force-reduced-motion", forceReducedMotion);
setPhase(phase === "idle" ? "checking" : phase);
