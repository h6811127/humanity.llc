/**
 * Create entry gate UI — Step 20 slice 5 (branch at room entry, not mid-form).
 */

import { loadWallet } from "./device-wallet.mjs";
import { getTabSession } from "./device-keys.mjs";
import { getCrossTabScanSnapshot } from "./device-cross-tab-state.mjs";
import {
  readCreateEntryGateBypass,
  resolveCreateEntryGate,
  writeCreateEntryGateBypass,
} from "./create-entry-state-core.mjs";
import {
  createEntryGateLiveHref,
  createEntryGatePresentation,
} from "./create-entry-state-ui-core.mjs";
import {
  buildCreateHandoffPayload,
  writeCreateHandoff,
} from "./create-handoff-core.mjs";
import { handoffToCreatedForWalletEntry } from "./create-live-handoff.mjs";
import { markGameSeasonSetupFlow } from "./create-organizer-season-core.mjs";
import {
  applyCreateEntryView,
  showCreateFormPanel,
} from "./create-entry-chooser.mjs";

/** @type {boolean} */
let entryGateActive = false;

export function isCreateEntryGateActive() {
  return entryGateActive;
}

function roomChooserOwnsFormVisibility() {
  const seasonFork = document.getElementById("create-game-season-fork");
  if (seasonFork instanceof HTMLElement && !seasonFork.hidden) return true;
  const wearChooser = document.getElementById("create-wear-track-chooser");
  if (wearChooser instanceof HTMLElement && !wearChooser.hidden) return true;
  return false;
}

/**
 * @param {URLSearchParams} searchParams
 * @param {string} template
 * @param {{ ephemeralBrowsing?: boolean }} [opts]
 */
export function resolveCreateEntryGateForPage(searchParams, template, opts = {}) {
  const walletEntries = loadWallet();
  let session = null;
  try {
    session = getTabSession();
  } catch {
    session = null;
  }

  let crossTabProfileIds = [];
  try {
    const snap = getCrossTabScanSnapshot();
    if (snap?.entries?.length) {
      crossTabProfileIds = snap.entries
        .map((row) => (typeof row.profile_id === "string" ? row.profile_id.trim() : ""))
        .filter(Boolean);
    }
  } catch {
    crossTabProfileIds = [];
  }

  const gateBypass = readCreateEntryGateBypass(sessionStorage, searchParams);

  return resolveCreateEntryGate({
    searchParams,
    template,
    walletEntries,
    session,
    ephemeralBrowsing: opts.ephemeralBrowsing ?? false,
    crossTabProfileIds,
    gateBypass,
  });
}

/**
 * @param {URLSearchParams} searchParams
 * @param {string} template
 * @param {{ ephemeralBrowsing?: boolean; onBypass?: () => void }} [opts]
 */
export function syncCreateEntryGate(searchParams, template, opts = {}) {
  const gateEl = document.getElementById("create-entry-gate");
  const formEl = document.getElementById("create-form");
  const mainFields = document.getElementById("create-form-main-fields");
  const submitBtn = document.getElementById("submit");
  const resolved = resolveCreateEntryGateForPage(searchParams, template, opts);

  entryGateActive = resolved.showGate;

  if (!gateEl || !resolved.showGate || !resolved.preferredRoot) {
    if (gateEl) gateEl.hidden = true;
    if (!roomChooserOwnsFormVisibility()) {
      if (mainFields) mainFields.hidden = false;
      if (formEl) formEl.hidden = false;
      if (submitBtn) submitBtn.hidden = false;
      const hero = document.querySelector("#create-form-panel .hero");
      const demoStrip = document.querySelector("#create-form-panel .create-demo-strip");
      if (hero) hero.hidden = false;
      if (demoStrip) demoStrip.hidden = false;
    }
    return resolved;
  }

  const hero = document.querySelector("#create-form-panel .hero");
  const demoStrip = document.querySelector("#create-form-panel .create-demo-strip");
  applyCreateEntryView("gate");
  gateEl.hidden = false;
  if (hero) hero.hidden = true;
  if (demoStrip) demoStrip.hidden = true;
  if (mainFields) mainFields.hidden = true;
  if (formEl) {
    for (const section of formEl.querySelectorAll(
      ".create-deploy-wizard, .create-wear-wizard, .create-game-season-wizard, .create-game-season-fork"
    )) {
      if (section instanceof HTMLElement) section.hidden = true;
    }
  }
  if (submitBtn) submitBtn.hidden = true;

  const presentation = createEntryGatePresentation(
    resolved.gateKind,
    resolved.handoffKind,
    resolved.preferredRoot,
    resolved.template
  );

  const eyebrow = document.getElementById("create-entry-gate-eyebrow");
  const title = document.getElementById("create-entry-gate-title");
  const body = document.getElementById("create-entry-gate-body");
  const primary = document.getElementById("create-entry-gate-primary");
  const secondary = document.getElementById("create-entry-gate-secondary");

  if (eyebrow) eyebrow.textContent = presentation.eyebrow;
  if (title) title.textContent = presentation.title;
  if (body) body.textContent = presentation.body;

  if (primary instanceof HTMLAnchorElement) {
    primary.textContent = presentation.primaryLabel;
    primary.href = presentation.primaryHref || "#";
  }

  if (secondary instanceof HTMLButtonElement) {
    secondary.hidden = !presentation.showFormOnSecondary;
    secondary.textContent = presentation.secondaryLabel;
  }

  gateEl.dataset.entryState = resolved.stateId;
  gateEl.dataset.gateKind = resolved.gateKind || "";

  return resolved;
}

/**
 * @param {import("./create-entry-state-core.mjs").CreateEntryHandoffKind | null} handoffKind
 * @param {Record<string, unknown>} preferredRoot
 * @param {string} template
 */
async function continueFromEntryGate(handoffKind, preferredRoot, template) {
  if (handoffKind === "season") {
    writeCreateHandoff(buildCreateHandoffPayload("season", preferredRoot));
    markGameSeasonSetupFlow();
  } else if (handoffKind === "wear") {
    writeCreateHandoff(buildCreateHandoffPayload("wear", preferredRoot));
  } else {
    const kind = template === "lost_item_relay" ? "deploy_relay" : "deploy_sign";
    writeCreateHandoff(buildCreateHandoffPayload(kind, preferredRoot));
  }

  const href = createEntryGateLiveHref(
    preferredRoot,
    handoffKind,
    template,
    location.origin
  );
  if (!href) {
    throw new Error("Could not open Live — open controls on your saved card first.");
  }

  const gateKind = document.getElementById("create-entry-gate")?.dataset.gateKind;
  if (gateKind === "continue_live") {
    location.href = href;
    return;
  }

  await handoffToCreatedForWalletEntry(preferredRoot, href);
}

let entryGateListenersBound = false;

export function bindCreateEntryGateActions(getActiveContext) {
  if (entryGateListenersBound) return;
  entryGateListenersBound = true;

  document.getElementById("create-entry-gate-primary")?.addEventListener("click", async (ev) => {
    const target = ev.currentTarget;
    if (!(target instanceof HTMLAnchorElement)) return;
    const href = target.getAttribute("href") || "";
    if (href && href !== "#") {
      return;
    }
    ev.preventDefault();
    const ctx = getActiveContext();
    const resolved = resolveCreateEntryGateForPage(ctx.searchParams, ctx.template, ctx);
    if (!resolved.preferredRoot) return;
    try {
      await continueFromEntryGate(
        resolved.handoffKind,
        resolved.preferredRoot,
        resolved.template
      );
    } catch (err) {
      const status = document.getElementById("status");
      if (status) {
        status.textContent = err instanceof Error ? err.message : String(err);
        status.className = "form-status error";
      }
    }
  });

  document.getElementById("create-entry-gate-secondary")?.addEventListener("click", (ev) => {
    ev.preventDefault();
    const ctx = getActiveContext();
    writeCreateEntryGateBypass(sessionStorage, ctx.searchParams);
    entryGateActive = false;
    showCreateFormPanel();
    const gateEl = document.getElementById("create-entry-gate");
    if (gateEl) gateEl.hidden = true;
    const mainFields = document.getElementById("create-form-main-fields");
    if (mainFields) mainFields.hidden = false;
    const submitBtn = document.getElementById("submit");
    if (submitBtn) submitBtn.hidden = false;
    ctx.onBypass?.();
  });
}
