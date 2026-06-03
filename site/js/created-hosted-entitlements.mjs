/**
 * /created/ Live tab — render steward + game_season entitlements (WS-REV R2).
 */
import { getTabSession } from "./device-keys.mjs";
import {
  captureStewardAccountIdFromUrl,
  linkStewardAccountWithActiveKeys,
  parseStewardAccountIdFromUrl,
  readPendingStewardAccountId,
  tryActivateSigningKeysForStewardLink,
  writePendingStewardAccountId,
} from "./device-steward-session.mjs";
import { stewardAccountIdForLink } from "./device-steward-session-core.mjs";
import { resolverApiOrigin } from "./hc-sign.mjs";
import {
  HOSTED_STEWARD_PLAN_ID,
  buildCreatedHostedPlanPanelModel,
  hostedPlanSummarySub,
} from "./created-hosted-entitlements-core.mjs";
import {
  STEWARD_ENTITLEMENTS_CHANGED,
  getOrCreateStewardDeviceId,
  getStewardEntitlementsPolicy,
  getStewardEntitlementsResponseBody,
  readStewardSessionToken,
  refreshStewardEntitlements,
} from "./device-steward-entitlements.mjs";

let bound = false;
let billingReturnPollStarted = false;

/**
 * After Stripe success_url: open Manage panel and poll until plan_id updates.
 */
function initHostedBillingReturnUx() {
  const fromCheckout =
    parseStewardAccountIdFromUrl(location.search) || readPendingStewardAccountId();
  if (!fromCheckout) return;

  document.getElementById("created-tab-btn-advanced")?.click();
  const details = document.getElementById("created-hosted-plan");
  if (details instanceof HTMLDetailsElement) details.open = true;

  setHostedPlanLinkStatus(
    "Payment received — linking this device and activating your hosted plan…",
    "info"
  );

  const startPoll = () => {
    if (billingReturnPollStarted) return;
    billingReturnPollStarted = true;
    void pollHostedPlanActivation();
  };

  if (readStewardSessionToken()) startPoll();
  else {
    window.addEventListener("hc-steward-session-linked", startPoll, { once: true });
  }
}

/**
 * @param {number} [maxMs]
 */
async function pollHostedPlanActivation(maxMs = 90_000) {
  const started = Date.now();

  const tick = async () => {
    await refreshStewardEntitlements({ force: true });
    syncCreatedHostedPlanPanel();

    const planId = getStewardEntitlementsPolicy().planId;
    if (planId === HOSTED_STEWARD_PLAN_ID) {
      delete document.getElementById("created-hosted-plan-link-status")?.dataset
        .pinnedMessage;
      setHostedPlanLinkStatus(
        "Hosted steward is active on this account. Your limits below are updated.",
        "ok"
      );
      return;
    }

    if (Date.now() - started >= maxMs) {
      setHostedPlanLinkStatus(
        "Stripe payment succeeded, but this account still shows Reference (free). Set up the Stripe webhook (STRIPE_WEBHOOK_SECRET) and resend subscription events, or wait a minute and refresh.",
        "error"
      );
      return;
    }

    setHostedPlanLinkStatus(
      "Payment received — syncing hosted plan (usually under a minute)…",
      "info"
    );
    window.setTimeout(() => void tick(), 3000);
  };

  await tick();
}

/**
 * @param {import("./created-hosted-entitlements-core.mjs").CreatedHostedPlanPanelModel} model
 */
function renderHostedPlanPanel(model) {
  const root = document.getElementById("created-hosted-plan");
  if (!root) return;

  root.hidden = !model.visible;

  const lead = document.getElementById("created-hosted-plan-lead");
  const metricsEl = document.getElementById("created-hosted-plan-metrics");
  const atLimit = document.getElementById("created-hosted-plan-at-limit");
  const gameSection = document.getElementById("created-hosted-game-season");
  const gameTitle = document.getElementById("created-hosted-game-season-title");
  const gameMetrics = document.getElementById("created-hosted-game-season-metrics");
  const gameAtLimit = document.getElementById("created-hosted-game-season-at-limit");
  const multiHint = document.getElementById("created-hosted-game-season-hint");
  const upgradesEl = document.getElementById("created-hosted-plan-upgrades");
  const linkStatus = document.getElementById("created-hosted-plan-link-status");

  const summarySub = document.getElementById("created-hosted-plan-summary-sub");
  if (lead) lead.textContent = model.lead;
  if (summarySub) {
    const short =
      model.upgrades.length > 0 && model.upgrades.some((u) => u.needsAccountLink)
        ? "Link steward account to see upgrades"
        : model.upgrades.length > 0
          ? "Optional paid capacity available"
          : hostedPlanSummarySub(model);
    summarySub.textContent = short;
  }

  if (metricsEl) {
    metricsEl.replaceChildren();
    for (const row of model.metrics) {
      const dt = document.createElement("dt");
      dt.textContent = row.term;
      const dd = document.createElement("dd");
      dd.textContent = row.value;
      if (row.atLimit) dd.classList.add("created-hosted-plan-metric--at-limit");
      metricsEl.append(dt, dd);
    }
  }

  if (atLimit) {
    atLimit.hidden = !model.atLimitMessage;
    if (model.atLimitMessage) atLimit.textContent = model.atLimitMessage;
  }

  if (linkStatus && !linkStatus.dataset.pinnedMessage) {
    linkStatus.hidden = true;
  }

  if (multiHint) {
    multiHint.hidden = !model.multiSeasonHint;
    if (model.multiSeasonHint) multiHint.textContent = model.multiSeasonHint;
  }

  if (gameSection) {
    const showGame =
      !!model.gameSeasonTitle ||
      (model.gameSeasonMetrics?.length ?? 0) > 0 ||
      !!model.multiSeasonHint;
    gameSection.hidden = !showGame;
  }

  if (gameTitle) {
    gameTitle.hidden = !model.gameSeasonTitle;
    if (model.gameSeasonTitle) gameTitle.textContent = model.gameSeasonTitle;
  }

  if (gameMetrics) {
    gameMetrics.replaceChildren();
    for (const row of model.gameSeasonMetrics) {
      const dt = document.createElement("dt");
      dt.textContent = row.term;
      const dd = document.createElement("dd");
      dd.textContent = row.value;
      if (row.atLimit) dd.classList.add("created-hosted-plan-metric--at-limit");
      gameMetrics.append(dt, dd);
    }
    gameMetrics.hidden = model.gameSeasonMetrics.length === 0;
  }

  if (gameAtLimit) {
    gameAtLimit.hidden = !model.gameSeasonAtLimitMessage;
    if (model.gameSeasonAtLimitMessage) {
      gameAtLimit.textContent = model.gameSeasonAtLimitMessage;
    }
  }

  if (upgradesEl) {
    upgradesEl.replaceChildren();
    for (const upgrade of model.upgrades) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-secondary created-hosted-plan-upgrade";
      btn.textContent = upgrade.label;
      btn.dataset.hostedPlanId = upgrade.planId;
      btn.addEventListener("click", () => {
        if (upgrade.needsAccountLink) {
          if (upgrade.needsSigningKeys) {
            promptLinkStewardAccountForUpgrade();
            return;
          }
          void connectStewardAccountForUpgrade(btn);
          return;
        }
        void startHostedCheckout(upgrade.planId, btn);
      });
      upgradesEl.append(btn);
    }
    upgradesEl.hidden = model.upgrades.length === 0;
  }
}

function promptLinkStewardAccountForUpgrade() {
  setHostedPlanLinkStatus(
    "Open the Live tab, load or import your card keys, then click Connect steward account again.",
    "info"
  );
  window.dispatchEvent(new CustomEvent("hc-created-go-now-tab"));
  window.setTimeout(() => {
    document.getElementById("created-keys-strip")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 120);
}

/**
 * @param {string} message
 * @param {"info" | "ok" | "error"} tone
 */
function setHostedPlanLinkStatus(message, tone = "info") {
  const el = document.getElementById("created-hosted-plan-link-status");
  if (!el) return;
  el.hidden = false;
  el.dataset.pinnedMessage = tone === "error" ? "1" : "";
  el.dataset.tone = tone;
  el.textContent = message;
  el.setAttribute("role", tone === "error" ? "alert" : "status");
}

/**
 * @param {HTMLButtonElement} btn
 */
async function connectStewardAccountForUpgrade(btn) {
  if (!tryActivateSigningKeysForStewardLink()) {
    promptLinkStewardAccountForUpgrade();
    return;
  }

  captureStewardAccountIdFromUrl();
  const accountId = stewardAccountIdForLink(
    parseStewardAccountIdFromUrl(location.search),
    readPendingStewardAccountId()
  );
  writePendingStewardAccountId(accountId);

  const prev = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Connecting…";
  setHostedPlanLinkStatus("Signing link proof and opening steward session…", "info");

  const result = await linkStewardAccountWithActiveKeys(accountId);
  btn.disabled = false;
  btn.textContent = prev;

  if (result.ok) {
    delete document.getElementById("created-hosted-plan-link-status")?.dataset.pinnedMessage;
    setHostedPlanLinkStatus(
      `Steward account linked (${result.account_id}). Usage meters updated — you can upgrade when ready.`,
      "ok"
    );
    window.dispatchEvent(new Event("hc-steward-session-linked"));
    syncCreatedHostedPlanPanel();
    return;
  }

  setHostedPlanLinkStatus(result.message, "error");
}

/**
 * @param {string} planId
 * @param {HTMLButtonElement} btn
 */
async function startHostedCheckout(planId, btn) {
  const token = readStewardSessionToken();
  if (!token) {
    promptLinkStewardAccountForUpgrade();
    return;
  }

  const prev = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Opening checkout…";

  try {
    const res = await fetch(
      `${resolverApiOrigin()}/.well-known/hc/v1/steward/billing/checkout`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-HC-Device-Id": getOrCreateStewardDeviceId(),
        },
        credentials: "omit",
        body: JSON.stringify({
          plan_id: planId,
          site_origin: location.origin,
          return_path: location.pathname,
        }),
      }
    );

    const body = await res.json().catch(() => ({}));
    if (!res.ok || typeof body.checkout_url !== "string") {
      const message =
        typeof body.message === "string"
          ? body.message
          : "Checkout could not start. Try again or contact support.";
      window.alert(message);
      return;
    }
    location.href = body.checkout_url;
  } catch {
    window.alert("Checkout could not start — check your connection and try again.");
  } finally {
    btn.disabled = false;
    btn.textContent = prev;
  }
}

export function syncCreatedHostedPlanPanel() {
  if (!getTabSession()) {
    const root = document.getElementById("created-hosted-plan");
    if (root) root.hidden = true;
    return;
  }

  const policy = getStewardEntitlementsPolicy();
  const body = getStewardEntitlementsResponseBody();
  const model = buildCreatedHostedPlanPanelModel(policy, body, {
    hasSession: !!readStewardSessionToken(),
    hasSigningKeys: !!getTabSession()?.owner_private_key_b58,
  });
  renderHostedPlanPanel(model);
}

/**
 * Idempotent — call from /created/ hub init.
 */
export function initCreatedHostedEntitlements() {
  if (bound) return;
  bound = true;

  const refresh = () => {
    void refreshStewardEntitlements().then(() => syncCreatedHostedPlanPanel());
  };

  window.addEventListener(STEWARD_ENTITLEMENTS_CHANGED, syncCreatedHostedPlanPanel);
  window.addEventListener("hc-steward-session-linked", syncCreatedHostedPlanPanel);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });

  for (const id of ["created-tab-btn-now", "created-tab-btn-advanced"]) {
    document.getElementById(id)?.addEventListener("click", () => refresh());
  }

  window.addEventListener("hc-device-boot-ready", refresh, { once: true });

  void import("./device-steward-session.mjs").then((mod) => {
    mod.initStewardSessionClient();
    initHostedBillingReturnUx();
    refresh();
  });
}
