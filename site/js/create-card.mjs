import { validateCreateFormFields, buildPilotManifestoLine } from "./create-form-validation-core.mjs";
import { syncCreateHeroCopy } from "./create-template-copy.mjs";
import { syncCreateFlowConvergence } from "./create-flow-convergence.mjs";
import {
  defaultTemplateForCreateEntry,
  shouldSkipCreateEntryChooser,
} from "./create-entry-chooser-core.mjs";
import {
  initCreateEntryChooser,
  showCreateEntryChooserPanel,
  showCreateFormPanel,
} from "./create-entry-chooser.mjs";
import { isDeployWizardIntent, resolveDeploySubmitStrategy } from "./create-deploy-wizard-core.mjs";
import { syncCreateDeployWizardUi } from "./create-deploy-wizard.mjs";
import {
  redirectDeployToLiveAddObject,
  runDeployRootAndChildCreate,
} from "./create-deploy-submit.mjs";
import { resolveGameSeasonSubmitStrategy } from "./create-season-fork-core.mjs";
import { syncCreateOrganizerSeasonWizardUi } from "./create-organizer-season-wizard.mjs";
import {
  isGameSeasonCreateIntent,
  gameSeasonBlocksDeviceUnlock,
  pickPreferredGameSeasonRoot,
} from "./create-organizer-season-core.mjs";
import {
  redirectOpenStatusForDeploy,
  redirectOpenStatusForSeason,
  redirectOpenStatusForWear,
} from "./create-handoff-core.mjs";
import {
  listGeneralRootsWithKeys,
  pickPreferredGeneralRoot,
} from "./create-flow-convergence-core.mjs";
import {
  redirectToDeployRootSeasonSetup,
  redirectToGameSeasonSetup,
  runGameSeasonDualSkinCreate,
  runGameSeasonRootCreate,
} from "./create-organizer-season-submit.mjs";
import {
  isWearCreateIntent,
  resolveWearSubmitStrategy,
} from "./create-wear-wizard-core.mjs";
import { syncCreateWearWizardUi } from "./create-wear-wizard.mjs";
import { syncCreateGeneralRoomUi } from "./create-general-room-wizard.mjs";
import {
  redirectToWearPrintOnLive,
  runWearCardCreate,
} from "./create-wear-submit.mjs";
import { formatCreateResolverError } from "./create-resolver-error-core.mjs";
import {
  handoffMerchRefAfterCreate,
  peekMerchCreateRef,
  persistMerchCreateRef,
  readMerchRefFromUrl,
  clearMerchCustomizeHandoff,
  shouldHandoffToCustomize,
} from "./merch-funnel-core.mjs";
import { setLastActiveProfileId } from "./device-quiet-tab-rehydrate-prefs.mjs";
import {
  clearAutoSaveFailed,
  isAutoSaveEnabled,
  markAutoSaveFailed,
} from "./device-auto-save.mjs";
import {
  applySyncAutoSaveResult,
  shouldSyncAutoSaveBeforeCreateNavigate,
} from "./created-device-save-core.mjs";
import { defaultWalletLabel, loadWallet } from "./device-wallet.mjs";
import { saveSessionToWalletWithCustody } from "./device-custody-save.mjs";
import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  CUSTODY_MODE_FULL_KEYS,
  shouldDefaultDeviceUnlockAtCreate,
} from "./device-custody-mode-core.mjs";
import { isDeviceUnlockWebAuthnAvailable } from "./device-custody-webauthn-core.mjs";
import {
  createCustodyModeHintForKey,
  createCustodyModePanelState,
} from "./device-custody-create-core.mjs";
import { validateCreateRecoveryForCustody } from "./device-custody-recovery-gate-core.mjs";
import {
  syncCreateCustodySummary,
  syncCreateRecoveryUi,
} from "./create-trust-stack-ui.mjs";
import {
  CREATE_CUSTODY_GAME_SEASON_FACE_ID_CALLOUT_ACTION,
  CREATE_CUSTODY_GAME_SEASON_FACE_ID_CALLOUT_DETAIL,
  CREATE_CUSTODY_GAME_SEASON_FACE_ID_CALLOUT_EYEBROW,
  CREATE_CUSTODY_GAME_SEASON_FACE_ID_CALLOUT_TITLE,
  CREATE_CUSTODY_ORGANIZER_FACE_ID_CALLOUT_ACTION,
  CREATE_CUSTODY_ORGANIZER_FACE_ID_CALLOUT_DETAIL,
  CREATE_CUSTODY_ORGANIZER_FACE_ID_CALLOUT_EYEBROW,
  CREATE_CUSTODY_ORGANIZER_FACE_ID_CALLOUT_TITLE,
  EPHEMERAL_BROWSING_CREATE_BLOCKED,
  EPHEMERAL_BROWSING_DETAIL,
  EPHEMERAL_BROWSING_EYEBROW,
  EPHEMERAL_BROWSING_TITLE,
} from "./device-ownership-copy-core.mjs";
import { isEphemeralBrowsingStorage } from "./private-browsing-detect-core.mjs";
import { buildObjectStreamsFromFormRows } from "./object-streams-core.mjs";

/** @param {string} phase @param {Record<string, unknown>} [detail] */
function logCreateSubmit(phase, detail = {}) {
  if (typeof console !== "undefined" && typeof console.debug === "function") {
    console.debug("[hc-create-submit]", phase, detail);
  }
}
import {
  qrExpiryFromIssued,
  encodePrivateKeyBase58,
  generateKeypair,
  generateProfileId,
  generateQrId,
  qrScanUrl,
  postCardsUrl,
  resolverApiOrigin,
  signDocument,
  withProtocolFields,
} from "./hc-sign.mjs";

const form = document.getElementById("create-form");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submit");
const demoBtn = document.getElementById("create-demo-btn");
const ephemeralNoticeEl = document.getElementById("create-ephemeral-browsing-notice");

let ephemeralBrowsing = false;
try {
  ephemeralBrowsing = isEphemeralBrowsingStorage({
    localStorage,
    sessionStorage,
  });
} catch {
  ephemeralBrowsing = true;
}
const fieldsGeneral = document.getElementById("create-fields-general");
const fieldsObjectStreams = document.getElementById("create-fields-object-streams");
const manifestoEl = document.getElementById("manifesto");

let activeTemplate = "general";

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.className = isError ? "form-status error" : "form-status";
}

function randomNonce() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

function randomDemoSuffix() {
  const b = crypto.getRandomValues(new Uint8Array(3));
  return Array.from(b, (x) => (x % 36).toString(36)).join("");
}

function setTemplate(template) {
  activeTemplate = template;
  const isPlate = template === "status_plate";
  const isRelay = template === "lost_item_relay";
  const isPilot = isPlate || isRelay;
  if (fieldsGeneral) fieldsGeneral.hidden = isPilot;
  if (fieldsObjectStreams) {
    fieldsObjectStreams.hidden = !isPlate && template !== "general";
  }
  if (manifestoEl) manifestoEl.required = !isPilot;
  const searchParams = new URLSearchParams(location.search);
  const deployActive = isDeployWizardIntent(searchParams) && isPilot;
  const deployObjectLabel = document.getElementById("deploy-object-label");
  const deployScannerLine = document.getElementById("deploy-scanner-line");
  if (deployObjectLabel) deployObjectLabel.required = deployActive;
  if (deployScannerLine) deployScannerLine.required = deployActive;
  syncCreateHeroCopy(template, searchParams);
  syncCreateFlowConvergence(template);
  syncCreateDeployWizardUi(searchParams, template);
  syncCreateOrganizerSeasonWizardUi(searchParams);
  syncCreateWearWizardUi(searchParams);
  syncCreateGeneralRoomUi(searchParams);
  syncCreateCustodyModeUi({ scrollOrganizerCallout: isGameSeasonCreateIntent(searchParams) });
}

function buildManifestoLine() {
  return buildPilotManifestoLine(activeTemplate, readCreateFormFields());
}

function buildObjectStreamsForCreate() {
  if (activeTemplate !== "status_plate" && activeTemplate !== "general") return [];
  return buildObjectStreamsFromFormRows([
    {
      label: document.getElementById("create-stream-1-label")?.value,
      value: document.getElementById("create-stream-1-value")?.value,
      class: "place",
    },
    {
      label: document.getElementById("create-stream-2-label")?.value,
      value: document.getElementById("create-stream-2-value")?.value,
      class: "care",
    },
  ]);
}

function readOrganizerKeyConfig() {
  const enabled = document.getElementById("enable-organizer-revoke")?.checked ?? false;
  if (!enabled) return { enabled: false };

  const mode = document.querySelector('input[name="organizer_key_mode"]:checked')?.value;
  if (mode === "paste") {
    const pasted = document.getElementById("organizer-public-key")?.value?.trim();
    if (!pasted) {
      throw new Error("Paste the organizer public key, or switch to generate a key.");
    }
    return { enabled: true, issuerPublicKey: pasted };
  }
  return { enabled: true, generate: true };
}

/**
 * @param {{ handle: string, manifesto: string, wantRecovery: boolean, pilotTemplate?: string, qrValidityDays?: number, organizer?: ReturnType<typeof readOrganizerKeyConfig>, objectStreams?: Array<{ id: string, class: string, label: string, value: string }> }} input
 */
function readQrValidityDays() {
  const raw = document.getElementById("qr-validity-days")?.value;
  const days = Number.parseInt(String(raw ?? "365"), 10);
  if (!Number.isFinite(days) || days < 1 || days > 3650) {
    return 365;
  }
  return days;
}

function readCreateCustodyMode() {
  const urlParam = new URLSearchParams(location.search).get("custody");
  if (urlParam === CUSTODY_MODE_FULL_KEYS) return CUSTODY_MODE_FULL_KEYS;
  const selected = document.querySelector('input[name="custody_mode"]:checked')?.value;
  if (selected === CUSTODY_MODE_FULL_KEYS || selected === CUSTODY_MODE_DEVICE_UNLOCK) {
    return selected;
  }
  return CUSTODY_MODE_DEVICE_UNLOCK;
}

function focusOrganizerRevokeSetting() {
  const details = document.getElementById("create-organizer-details");
  if (details instanceof HTMLDetailsElement) details.open = true;
  const checkbox = document.getElementById("enable-organizer-revoke");
  checkbox?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  if (checkbox instanceof HTMLInputElement) checkbox.focus();
}

function syncCreateCustodyOrganizerCallout(reason) {
  const callout = document.getElementById("create-custody-organizer-callout");
  if (!callout) return;
  callout.hidden = !reason;
  if (!reason) return;
  const eyebrow = document.getElementById("create-custody-organizer-callout-eyebrow");
  const title = document.getElementById("create-custody-organizer-callout-title");
  const detail = document.getElementById("create-custody-organizer-callout-detail");
  const action = document.getElementById("create-custody-organizer-callout-action");
  if (reason === "game_season") {
    if (eyebrow) eyebrow.textContent = CREATE_CUSTODY_GAME_SEASON_FACE_ID_CALLOUT_EYEBROW;
    if (title) title.textContent = CREATE_CUSTODY_GAME_SEASON_FACE_ID_CALLOUT_TITLE;
    if (detail) detail.textContent = CREATE_CUSTODY_GAME_SEASON_FACE_ID_CALLOUT_DETAIL;
    if (action) action.textContent = CREATE_CUSTODY_GAME_SEASON_FACE_ID_CALLOUT_ACTION;
    return;
  }
  if (eyebrow) eyebrow.textContent = CREATE_CUSTODY_ORGANIZER_FACE_ID_CALLOUT_EYEBROW;
  if (title) title.textContent = CREATE_CUSTODY_ORGANIZER_FACE_ID_CALLOUT_TITLE;
  if (detail) detail.textContent = CREATE_CUSTODY_ORGANIZER_FACE_ID_CALLOUT_DETAIL;
  if (action) action.textContent = CREATE_CUSTODY_ORGANIZER_FACE_ID_CALLOUT_ACTION;
}

function focusFullKeysCustodyRadio() {
  const fullRadio = document.querySelector('input[name="custody_mode"][value="full_keys"]');
  if (fullRadio instanceof HTMLInputElement) {
    fullRadio.checked = true;
    fullRadio.focus();
  }
  syncCreateCustodyModeUi();
}

function syncCreateCustodyModeUi(opts = {}) {
  const fieldset = document.getElementById("create-custody-mode");
  const hint = document.getElementById("create-custody-mode-hint");
  const deviceRadio = document.querySelector(
    'input[name="custody_mode"][value="device_unlock"]'
  );
  const fullRadio = document.querySelector('input[name="custody_mode"][value="full_keys"]');
  if (!fieldset) return;

  const organizerOn = enableOrganizerEl?.checked ?? false;
  const gameSeasonIntent = isGameSeasonCreateIntent(new URLSearchParams(location.search));
  const webAuthnAvailable = isDeviceUnlockWebAuthnAvailable();
  const panel = createCustodyModePanelState({
    webAuthnAvailable,
    organizerEnabled: organizerOn,
    gameSeasonIntent,
    ephemeralBrowsing,
    urlCustodyParam: new URLSearchParams(location.search).get("custody"),
    selectedCustodyMode: document.querySelector('input[name="custody_mode"]:checked')?.value ?? null,
  });

  fieldset.hidden = !panel.showFieldset;
  if (deviceRadio instanceof HTMLInputElement) {
    deviceRadio.disabled = !panel.deviceUnlockSelectable;
  }
  if (fullRadio instanceof HTMLInputElement && panel.forceFullKeysRadio) {
    fullRadio.checked = true;
  } else if (
    deviceRadio instanceof HTMLInputElement &&
    panel.preferDeviceRadio &&
    !(fullRadio instanceof HTMLInputElement && fullRadio.checked)
  ) {
    deviceRadio.checked = true;
  }

  if (hint) {
    hint.textContent = createCustodyModeHintForKey(panel.hintKey);
  }
  syncCreateCustodySummary();
  syncCreateRecoveryUi(panel);
  syncCreateCustodyOrganizerCallout(panel.faceIdBlockedReason);

  if (opts.scrollOrganizerCallout && panel.showOrganizerBlocksFaceIdCallout) {
    document
      .getElementById("create-custody-organizer-callout")
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

export async function runCreateCard(input) {
  const {
    handle,
    manifesto,
    wantRecovery,
    pilotTemplate = "general",
    qrValidityDays = 365,
    organizer = { enabled: false },
    objectStreams = [],
    sampleCard = false,
    navigate = true,
  } = input;
  const { privateKey, publicKeyBase58 } = await generateKeypair();
  let recoveryPrivateKey = null;
  let recoveryPublicKeyBase58 = null;
  if (wantRecovery) {
    const recovery = await generateKeypair();
    recoveryPrivateKey = recovery.privateKey;
    recoveryPublicKeyBase58 = recovery.publicKeyBase58;
  }
  let organizerPrivateKey = null;
  let organizerPublicKeyBase58 = null;
  if (organizer.enabled) {
    if (organizer.generate) {
      const org = await generateKeypair();
      organizerPrivateKey = org.privateKey;
      organizerPublicKeyBase58 = org.publicKeyBase58;
    } else {
      organizerPublicKeyBase58 = organizer.issuerPublicKey;
    }
  }
  const profileId = generateProfileId();
  const qrId = generateQrId();
  const now = new Date().toISOString();
  const apiOrigin = resolverApiOrigin();
  const origin =
    apiOrigin.includes("127.0.0.1") || apiOrigin.includes("localhost")
      ? apiOrigin
      : "https://humanity.llc";
  const scanUrl = qrScanUrl(profileId, qrId, origin);
  const expiresAt = qrExpiryFromIssued(now, qrValidityDays);

  const cardFields = {
    profile_id: profileId,
    public_key: publicKeyBase58,
    handle,
    manifesto_line: manifesto,
    created_at: now,
    updated_at: now,
    status: "active",
    verification: {
      level: 1,
      label: "Registered",
      method: "registered",
      verified_at: now,
      vouch_count: 0,
      latest_accepted_vouch_at: null,
    },
    badges: [],
    qr: { active_qr_id: qrId, epoch: 1 },
    links: {
      standards: "https://humanity.llc/standards/v1",
      data_policy: "https://humanity.llc/data-policy.html",
    },
  };
  if (recoveryPublicKeyBase58) {
    cardFields.recovery_public_key = recoveryPublicKeyBase58;
  }
  if (organizerPublicKeyBase58) {
    cardFields.issuer_public_key = organizerPublicKeyBase58;
  }
  if (objectStreams.length) {
    cardFields.object_streams = objectStreams;
  }

  const cardUnsigned = withProtocolFields(cardFields, "humanity_card");

  const qrUnsigned = withProtocolFields(
    {
      qr_id: qrId,
      profile_id: profileId,
      nonce: `nonce_${randomNonce()}`,
      epoch: 1,
      scope: "card",
      resolver_hint: origin,
      issued_at: now,
      expires_at: expiresAt,
      status: "active",
      payload: scanUrl,
    },
    "qr_credential"
  );

  const card = await signDocument(cardUnsigned, privateKey, publicKeyBase58);
  const qr_credential = await signDocument(qrUnsigned, privateKey, publicKeyBase58);

  setStatus("Finishing up…");
  const attributionRef = sampleCard ? null : peekMerchCreateRef();
  /** @type {{ card: typeof card, qr_credential: typeof qr_credential, attribution_ref?: string }} */
  const payload = { card, qr_credential };
  if (attributionRef) payload.attribution_ref = attributionRef;

  const cardsUrl = postCardsUrl();
  logCreateSubmit("resolver:post:start", { url: cardsUrl });
  const res = await fetch(cardsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  logCreateSubmit("resolver:post:done", {
    ok: res.ok,
    status: res.status,
    profileId: typeof data?.profile_id === "string" ? data.profile_id : undefined,
  });
  if (!res.ok) {
    const msg = formatCreateResolverError(data, res.status, postCardsUrl());
    if (String(data.message || data.error || "").includes("recovery_public_key")) {
      throw new Error(
        "Resolver database needs an update (recovery key column). Try again in a minute or contact support."
      );
    }
    if (String(data.message || data.error || "").includes("issuer_public_key")) {
      throw new Error(
        "Resolver database needs an update (organizer key column). Apply migration 0005 and redeploy."
      );
    }
    throw new Error(msg);
  }

  if (attributionRef) handoffMerchRefAfterCreate(attributionRef);

  const session = {
    ...data,
    manifesto_line: manifesto,
    pilot_template: pilotTemplate,
    qr_expires_at: expiresAt,
    qr_validity_days: qrValidityDays,
    has_organizer_revoke: !!organizerPublicKeyBase58,
    ...(organizerPublicKeyBase58 ? { issuer_public_key: organizerPublicKeyBase58 } : {}),
    ...(organizerPrivateKey
      ? {
          organizer_private_key_b58: encodePrivateKeyBase58(organizerPrivateKey),
          organizer_public_key_b58: organizerPublicKeyBase58,
        }
      : organizerPublicKeyBase58
        ? { organizer_public_key_b58: organizerPublicKeyBase58 }
        : {}),
    owner_public_key_b58: publicKeyBase58,
    owner_private_key_b58: encodePrivateKeyBase58(privateKey),
    ...(recoveryPublicKeyBase58
      ? {
          recovery_public_key_b58: recoveryPublicKeyBase58,
          recovery_private_key_b58: encodePrivateKeyBase58(recoveryPrivateKey),
        }
      : {}),
    private_key_warning: true,
    created_at: now,
    handle,
    ...(objectStreams.length ? { object_streams: objectStreams } : {}),
    ...(sampleCard ? { sample_card: true } : {}),
  };

  sessionStorage.setItem("hc_created", JSON.stringify(session));
  setLastActiveProfileId(profileId);

  const custodyMode = readCreateCustodyMode();
  const useDeviceUnlock = shouldDefaultDeviceUnlockAtCreate({
    custodyMode,
    webAuthnAvailable: isDeviceUnlockWebAuthnAvailable(),
    organizerEnabled: Boolean(organizerPrivateKey),
    gameSeasonFlow: gameSeasonBlocksDeviceUnlock({
      gameSeasonCreateIntent: isGameSeasonCreateIntent(new URLSearchParams(location.search)),
    }),
    ephemeralBrowsing,
  });
  session.custody_mode = useDeviceUnlock
    ? CUSTODY_MODE_DEVICE_UNLOCK
    : CUSTODY_MODE_FULL_KEYS;
  sessionStorage.setItem("hc_created", JSON.stringify(session));

  if (shouldSyncAutoSaveBeforeCreateNavigate({ autoSaveEnabled: isAutoSaveEnabled(), session })) {
    logCreateSubmit("autosave:before-navigate:start", {
      sessionCustody: session.custody_mode,
      saveCustody: CUSTODY_MODE_FULL_KEYS,
    });
    const saveResult = await saveSessionToWalletWithCustody(
      session,
      defaultWalletLabel(session),
      { custodyMode: CUSTODY_MODE_FULL_KEYS }
    );
    logCreateSubmit("autosave:before-navigate:done", {
      ok: !("error" in saveResult),
      error: "error" in saveResult ? saveResult.error : undefined,
    });
    applySyncAutoSaveResult(session, saveResult, {
      markFailed: markAutoSaveFailed,
      clearFailed: clearAutoSaveFailed,
    });
  }

  const result = { session, profileId, qrId, attributionRef };
  if (!navigate) {
    logCreateSubmit("create:complete", { profileId, qrId, navigate: false });
    return result;
  }

  const created = new URL("/created/", location.origin);
  created.searchParams.set("profile_id", profileId);
  created.searchParams.set("qr_id", qrId);
  created.searchParams.set("fresh", "1");
  if (attributionRef && shouldHandoffToCustomize(attributionRef)) {
    created.searchParams.set("hc_ref", attributionRef);
  }
  logCreateSubmit("navigate:created", { profileId, qrId, href: created.href });
  location.replace(created.href);
  return result;
}

function deployWizardFieldsActive() {
  const deployWizard = document.getElementById("create-deploy-wizard");
  return Boolean(deployWizard && !deployWizard.hidden);
}

function readCreateFormFields() {
  if (deployWizardFieldsActive()) {
    const objectName = document.getElementById("deploy-object-label")?.value ?? "";
    const scannerLine = document.getElementById("deploy-scanner-line")?.value ?? "";
    return {
      objectLabel: objectName,
      statusLine: scannerLine,
      relayItem: objectName,
      relayMessage: scannerLine,
      manifesto: manifestoEl?.value ?? "",
      useDeployFieldIds: true,
    };
  }
  return {
    objectLabel: "",
    statusLine: "",
    relayItem: "",
    relayMessage: "",
    manifesto: manifestoEl?.value ?? "",
    useDeployFieldIds: false,
  };
}

function applyCreateFieldValidity(missingFieldIds, message) {
  const ids = new Set(missingFieldIds);
  for (const id of [
    "handle",
    "deploy-object-label",
    "deploy-scanner-line",
    "manifesto",
  ]) {
    const el = document.getElementById(id);
    if (!el || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      continue;
    }
    if (ids.has(id)) {
      el.setCustomValidity(message);
      if (id === missingFieldIds[0]) {
        el.reportValidity();
      }
    } else {
      el.setCustomValidity("");
    }
  }
}

function readValidatedCreateInput() {
  const handleEl = document.getElementById("handle");
  const fields = readCreateFormFields();
  const validation = validateCreateFormFields(activeTemplate, handleEl?.value ?? "", fields);
  if (!validation.ok) {
    applyCreateFieldValidity(validation.missingFieldIds, validation.message);
    throw new Error(validation.message);
  }
  applyCreateFieldValidity([], "");
  if (handleEl && handleEl.value !== validation.handle) {
    handleEl.value = validation.handle;
  }
  const { manifesto, pilotTemplate } = buildManifestoLine();
  const objectStreams = buildObjectStreamsForCreate();
  const custodyMode = readCreateCustodyMode();
  const wantRecovery = document.getElementById("generate-recovery")?.checked ?? true;
  const recoveryCheck = validateCreateRecoveryForCustody({ custodyMode, wantRecovery });
  if (!recoveryCheck.ok) {
    throw new Error(recoveryCheck.error ?? "Backup is required for this device.");
  }
  return {
    handle: validation.handle,
    manifesto,
    pilotTemplate,
    objectStreams,
    wantRecovery,
    qrValidityDays: readQrValidityDays(),
    organizer: readOrganizerKeyConfig(),
  };
}

async function submitCreate(e, opts = {}) {
  e?.preventDefault();
  if (ephemeralBrowsing) {
    setStatus(EPHEMERAL_BROWSING_CREATE_BLOCKED, true);
    return;
  }
  if (submitBtn) submitBtn.disabled = true;
  if (demoBtn) demoBtn.disabled = true;

  try {
    logCreateSubmit("submit:start", { path: location.pathname + location.search });
    const input = readValidatedCreateInput();
    const searchParams = new URLSearchParams(location.search);
    const gameStrategy = resolveGameSeasonSubmitStrategy({
      searchParams,
      walletEntries: loadWallet(),
    });

    if (gameStrategy === "fork_choose") {
      throw new Error("Choose how this season should live on the network first.");
    }

    if (gameStrategy === "redirect_live" || gameStrategy === "use_existing_account") {
      const walletEntries = loadWallet();
      const seasonRoot =
        gameStrategy === "use_existing_account"
          ? pickPreferredGeneralRoot(listGeneralRootsWithKeys(walletEntries))
          : pickPreferredGameSeasonRoot(walletEntries);
      setStatus(redirectOpenStatusForSeason(seasonRoot));
      if (gameStrategy === "use_existing_account") {
        await redirectToDeployRootSeasonSetup();
      } else {
        await redirectToGameSeasonSetup();
      }
      return;
    }

    if (gameStrategy === "create_dual_skin_root") {
      setStatus("Setting up your account…");
      await runGameSeasonDualSkinCreate({
        handle: input.handle,
        wantRecovery: input.wantRecovery,
        qrValidityDays: input.qrValidityDays,
        runCreateCard,
      });
      return;
    }

    if (gameStrategy === "create_season_only_root") {
      setStatus("Setting up season account…");
      const seasonId = document.getElementById("game-season-id")?.value ?? "";
      await runGameSeasonRootCreate({
        handle: input.handle,
        seasonId,
        wantRecovery: input.wantRecovery,
        qrValidityDays: input.qrValidityDays,
        runCreateCard,
      });
      return;
    }

    const wearStrategy = resolveWearSubmitStrategy({
      searchParams,
      walletEntries: loadWallet(),
    });

    if (wearStrategy === "redirect_live") {
      const wearRoot = pickPreferredGeneralRoot(listGeneralRootsWithKeys(loadWallet()));
      setStatus(redirectOpenStatusForWear(wearRoot));
      await redirectToWearPrintOnLive();
      return;
    }

    if (wearStrategy === "create_wear_card") {
      setStatus("Creating…");
      await runWearCardCreate({
        handle: input.handle,
        manifesto: input.manifesto,
        wantRecovery: input.wantRecovery,
        qrValidityDays: input.qrValidityDays,
        runCreateCard,
      });
      return;
    }

    const strategy = resolveDeploySubmitStrategy({
      searchParams,
      template: activeTemplate,
      walletEntries: loadWallet(),
    });

    if (strategy === "redirect_live") {
      const deployRoot = pickPreferredGeneralRoot(listGeneralRootsWithKeys(loadWallet()));
      setStatus(redirectOpenStatusForDeploy(activeTemplate, deployRoot));
      await redirectDeployToLiveAddObject(activeTemplate);
      return;
    }

    if (strategy === "root_and_child") {
      setStatus(
        activeTemplate === "lost_item_relay" ? "Creating your tag…" : "Creating your sign…"
      );
      const fields = readCreateFormFields();
      await runDeployRootAndChildCreate(activeTemplate, fields, {
        handle: input.handle,
        wantRecovery: input.wantRecovery,
        qrValidityDays: input.qrValidityDays,
        organizer: input.organizer,
        runCreateCard,
      });
      return;
    }

    if (
      input.pilotTemplate === "status_plate" ||
      input.pilotTemplate === "lost_item_relay"
    ) {
      throw new Error(
        "Sign and tag create use the deploy path. Open Live status on something from Create."
      );
    }

    setStatus("Creating…");
    logCreateSubmit("submit:run-create-card", { pilotTemplate: input.pilotTemplate });
    await runCreateCard({
      handle: input.handle,
      manifesto: input.manifesto,
      wantRecovery: input.wantRecovery,
      pilotTemplate: input.pilotTemplate,
      objectStreams: input.objectStreams,
      qrValidityDays: input.qrValidityDays,
      organizer: input.organizer,
      sampleCard: !!opts.sampleCard,
    });
  } catch (err) {
    logCreateSubmit("submit:error", {
      message: err instanceof Error ? err.message : String(err),
    });
    setStatus(err.message || String(err), true);
    if (submitBtn) submitBtn.disabled = false;
    if (demoBtn) demoBtn.disabled = false;
  }
}

form?.addEventListener("submit", submitCreate);

document.getElementById("handle")?.addEventListener("input", (ev) => {
  const el = ev.currentTarget;
  if (el instanceof HTMLInputElement) el.setCustomValidity("");
});

const enableOrganizerEl = document.getElementById("enable-organizer-revoke");
const organizerFieldsEl = document.getElementById("organizer-key-fields");
const organizerPublicKeyEl = document.getElementById("organizer-public-key");

function syncOrganizerFieldsUi() {
  const on = enableOrganizerEl?.checked ?? false;
  if (organizerFieldsEl) organizerFieldsEl.hidden = !on;
  const pasteMode =
    document.querySelector('input[name="organizer_key_mode"][value="paste"]')?.checked ?? false;
  if (organizerPublicKeyEl) organizerPublicKeyEl.disabled = !on || !pasteMode;
}

let lastOrganizerRevokeOn = enableOrganizerEl?.checked ?? false;

enableOrganizerEl?.addEventListener("change", () => {
  const organizerOn = enableOrganizerEl?.checked ?? false;
  syncOrganizerFieldsUi();
  syncCreateCustodyModeUi({
    scrollOrganizerCallout: organizerOn && !lastOrganizerRevokeOn,
  });
  lastOrganizerRevokeOn = organizerOn;
});

document
  .getElementById("create-custody-organizer-callout-action")
  ?.addEventListener("click", () => {
    const gameSeasonIntent = isGameSeasonCreateIntent(new URLSearchParams(location.search));
    if (gameSeasonIntent) {
      focusFullKeysCustodyRadio();
      return;
    }
    focusOrganizerRevokeSetting();
  });

document.querySelectorAll('input[name="organizer_key_mode"]').forEach((el) => {
  el.addEventListener("change", syncOrganizerFieldsUi);
});
document.querySelectorAll('input[name="custody_mode"]').forEach((el) => {
  el.addEventListener("change", () => syncCreateCustodyModeUi());
});
syncOrganizerFieldsUi();
syncCreateCustodyModeUi();

const createSearchParams = new URLSearchParams(location.search);

const urlMerchRef = readMerchRefFromUrl();
if (urlMerchRef) {
  persistMerchCreateRef(urlMerchRef);
} else {
  clearMerchCustomizeHandoff();
}

function openDeploySomethingForm() {
  showCreateFormPanel();
  const url = new URL(location.href);
  url.searchParams.delete("template");
  url.searchParams.set("intent", "deploy");
  history.replaceState(null, "", `${url.pathname}${url.search}`);
  setTemplate("status_plate");
}

function openGeneralAccountForm() {
  showCreateFormPanel();
  const url = new URL(location.href);
  url.searchParams.delete("template");
  url.searchParams.set("intent", "general");
  history.replaceState(null, "", `${url.pathname}${url.search}`);
  setTemplate("general");
}

function bootstrapCreateEntry() {
  if (shouldSkipCreateEntryChooser(createSearchParams)) {
    showCreateFormPanel();
    setTemplate(defaultTemplateForCreateEntry(createSearchParams));
    return;
  }

  showCreateEntryChooserPanel();
  initCreateEntryChooser({
    onDeploySomething: openDeploySomethingForm,
    onOpenGeneralAccount: openGeneralAccountForm,
  });
}

bootstrapCreateEntry();

window.addEventListener("hc-device-hub-changed", () => {
  const searchParams = new URLSearchParams(location.search);
  if (isGameSeasonCreateIntent(searchParams)) {
    syncCreateOrganizerSeasonWizardUi(searchParams);
  }
  if (isWearCreateIntent(searchParams)) {
    syncCreateWearWizardUi(searchParams);
  }
});

window.addEventListener("hc-create-season-fork-changed", () => {
  syncCreateOrganizerSeasonWizardUi(new URLSearchParams(location.search));
});

function initEphemeralBrowsingGate() {
  if (!ephemeralBrowsing) return;
  if (submitBtn) submitBtn.disabled = true;
  if (demoBtn) demoBtn.disabled = true;
  if (!ephemeralNoticeEl) return;
  ephemeralNoticeEl.hidden = false;
  ephemeralNoticeEl.className =
    "hc-emphasis-card hc-emphasis-card--urgent flow-form-warning create-ephemeral-browsing-notice";
  ephemeralNoticeEl.setAttribute("role", "alert");
  ephemeralNoticeEl.innerHTML = `<div class="hc-emphasis-card__main">
    <span class="hc-emphasis-card__dot hc-emphasis-card__dot--urgent" aria-hidden="true"></span>
    <div class="hc-emphasis-card__copy">
      <p class="hc-emphasis-card__eyebrow">${EPHEMERAL_BROWSING_EYEBROW}</p>
      <p class="hc-emphasis-card__title">${EPHEMERAL_BROWSING_TITLE}</p>
      <p class="hc-emphasis-card__detail">${EPHEMERAL_BROWSING_DETAIL}</p>
    </div>
  </div>`;
}

initEphemeralBrowsingGate();

demoBtn?.addEventListener("click", async () => {
  const handleEl = document.getElementById("handle");
  const suffix = randomDemoSuffix();
  setTemplate("general");
  if (handleEl) handleEl.value = `demo_${suffix}`;
  if (manifestoEl) {
    manifestoEl.value =
      "Neighborhood tool library · Closed for inventory until Tuesday";
  }
  await submitCreate(new Event("submit"), { sampleCard: true });
});
