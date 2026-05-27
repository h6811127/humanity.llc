import { validateCreateFormFields } from "./create-form-validation-core.mjs";
import { formatCreateResolverError } from "./create-resolver-error-core.mjs";
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
const fieldsGeneral = document.getElementById("create-fields-general");
const fieldsStatusPlate = document.getElementById("create-fields-status-plate");
const fieldsLostItem = document.getElementById("create-fields-lost-item");
const manifestoEl = document.getElementById("manifesto");
const templateBtns = document.querySelectorAll(".create-template-btn");

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
  templateBtns.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.template === template);
  });
  const isPlate = template === "status_plate";
  const isRelay = template === "lost_item_relay";
  const isPilot = isPlate || isRelay;
  if (fieldsGeneral) fieldsGeneral.hidden = isPilot;
  if (fieldsStatusPlate) fieldsStatusPlate.hidden = !isPlate;
  if (fieldsLostItem) fieldsLostItem.hidden = !isRelay;
  if (manifestoEl) manifestoEl.required = !isPilot;
  const objectLabel = document.getElementById("object-label");
  const statusLine = document.getElementById("status-line");
  const relayItem = document.getElementById("relay-item");
  const relayMessage = document.getElementById("relay-message");
  if (objectLabel) objectLabel.required = isPlate;
  if (statusLine) statusLine.required = isPlate;
  if (relayItem) relayItem.required = isRelay;
  if (relayMessage) relayMessage.required = isRelay;
}

templateBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.template) setTemplate(btn.dataset.template);
  });
});

function buildManifestoLine() {
  if (activeTemplate === "status_plate") {
    const objectLabel = document.getElementById("object-label")?.value?.trim();
    const statusLine = document.getElementById("status-line")?.value?.trim();
    if (!objectLabel || !statusLine) {
      throw new Error("Object name and status line are required for a status plate.");
    }
    const combined = `${objectLabel}\n${statusLine}`;
    if (combined.length > 280) {
      throw new Error("Combined object name and status line must be 280 characters or fewer.");
    }
    return { manifesto: combined, pilotTemplate: "status_plate" };
  }
  if (activeTemplate === "lost_item_relay") {
    const item = document.getElementById("relay-item")?.value?.trim();
    const message = document.getElementById("relay-message")?.value?.trim();
    if (!item || !message) {
      throw new Error("Item name and return message are required for a lost item relay.");
    }
    const combined = `[relay] ${item}\n${message}`;
    if (combined.length > 280) {
      throw new Error("Combined item name and return message must be 280 characters or fewer.");
    }
    return { manifesto: combined, pilotTemplate: "lost_item_relay" };
  }
  const manifesto = manifestoEl?.value?.trim();
  if (!manifesto) throw new Error("Handle and public statement are required.");
  return { manifesto, pilotTemplate: "general" };
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
 * @param {{ handle: string, manifesto: string, wantRecovery: boolean, pilotTemplate?: string, qrValidityDays?: number, organizer?: ReturnType<typeof readOrganizerKeyConfig> }} input
 */
function readQrValidityDays() {
  const raw = document.getElementById("qr-validity-days")?.value;
  const days = Number.parseInt(String(raw ?? "365"), 10);
  if (!Number.isFinite(days) || days < 1 || days > 3650) {
    return 365;
  }
  return days;
}

export async function runCreateCard(input) {
  const {
    handle,
    manifesto,
    wantRecovery,
    pilotTemplate = "general",
    qrValidityDays = 365,
    organizer = { enabled: false },
    sampleCard = false,
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

  setStatus("Submitting to resolver…");
  const res = await fetch(postCardsUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card, qr_credential }),
  });

  const data = await res.json().catch(() => ({}));
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

  sessionStorage.setItem(
    "hc_created",
    JSON.stringify({
      ...data,
      manifesto_line: manifesto,
      pilot_template: pilotTemplate,
      qr_expires_at: expiresAt,
      qr_validity_days: qrValidityDays,
      has_organizer_revoke: !!organizerPublicKeyBase58,
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
      ...(sampleCard ? { sample_card: true } : {}),
    })
  );

  const created = new URL("/created/", location.origin);
  created.searchParams.set("profile_id", profileId);
  created.searchParams.set("qr_id", qrId);
  created.searchParams.set("fresh", "1");
  location.replace(created.href);
}

function readCreateFormFields() {
  return {
    objectLabel: document.getElementById("object-label")?.value ?? "",
    statusLine: document.getElementById("status-line")?.value ?? "",
    relayItem: document.getElementById("relay-item")?.value ?? "",
    relayMessage: document.getElementById("relay-message")?.value ?? "",
    manifesto: manifestoEl?.value ?? "",
  };
}

function applyCreateFieldValidity(missingFieldIds, message) {
  const ids = new Set(missingFieldIds);
  for (const id of ["handle", "object-label", "status-line", "relay-item", "relay-message", "manifesto"]) {
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
  return {
    handle: handleResult.normalized,
    manifesto,
    pilotTemplate,
    wantRecovery: document.getElementById("generate-recovery")?.checked ?? true,
    qrValidityDays: readQrValidityDays(),
    organizer: readOrganizerKeyConfig(),
  };
}

async function submitCreate(e, opts = {}) {
  e?.preventDefault();
  if (submitBtn) submitBtn.disabled = true;
  if (demoBtn) demoBtn.disabled = true;

  try {
    const input = readValidatedCreateInput();
    setStatus("Generating keys and signing…");
    await runCreateCard({
      handle: input.handle,
      manifesto: input.manifesto,
      wantRecovery: input.wantRecovery,
      pilotTemplate: input.pilotTemplate,
      qrValidityDays: input.qrValidityDays,
      organizer: input.organizer,
      sampleCard: !!opts.sampleCard,
    });
  } catch (err) {
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

enableOrganizerEl?.addEventListener("change", syncOrganizerFieldsUi);
document.querySelectorAll('input[name="organizer_key_mode"]').forEach((el) => {
  el.addEventListener("change", syncOrganizerFieldsUi);
});
syncOrganizerFieldsUi();

const urlTemplate = new URLSearchParams(location.search).get("template");
if (urlTemplate === "status_plate") {
  setTemplate("status_plate");
} else if (urlTemplate === "lost_item") {
  setTemplate("lost_item_relay");
}

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
