import {
  defaultQrExpiry,
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

/**
 * @param {{ handle: string, manifesto: string, wantRecovery: boolean, pilotTemplate?: string }} input
 */
export async function runCreateCard(input) {
  const { handle, manifesto, wantRecovery, pilotTemplate = "general" } = input;
  const { privateKey, publicKeyBase58 } = await generateKeypair();
  let recoveryPrivateKey = null;
  let recoveryPublicKeyBase58 = null;
  if (wantRecovery) {
    const recovery = await generateKeypair();
    recoveryPrivateKey = recovery.privateKey;
    recoveryPublicKeyBase58 = recovery.publicKeyBase58;
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
  const expiresAt = defaultQrExpiry(now);

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

  const res = await fetch(postCardsUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card, qr_credential }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.error || `HTTP ${res.status}`;
    if (String(msg).includes("recovery_public_key")) {
      throw new Error(
        "Resolver database needs an update (recovery key column). Try again in a minute or contact support."
      );
    }
    throw new Error(`${msg} (${postCardsUrl()})`);
  }

  sessionStorage.setItem(
    "hc_created",
    JSON.stringify({
      ...data,
      manifesto_line: manifesto,
      pilot_template: pilotTemplate,
      owner_public_key_b58: publicKeyBase58,
      owner_private_key_b58: encodePrivateKeyBase58(privateKey),
      ...(recoveryPublicKeyBase58
        ? {
            recovery_public_key_b58: recoveryPublicKeyBase58,
            recovery_private_key_b58: encodePrivateKeyBase58(recoveryPrivateKey),
          }
        : {}),
      private_key_warning: true,
    })
  );

  const created = new URL("/created/", location.origin);
  created.searchParams.set("profile_id", profileId);
  created.searchParams.set("qr_id", qrId);
  location.replace(created.href);
}

async function submitCreate(e) {
  e?.preventDefault();
  if (submitBtn) submitBtn.disabled = true;
  if (demoBtn) demoBtn.disabled = true;
  setStatus("Generating keys and signing…");

  try {
    const handle = document.getElementById("handle")?.value?.trim();
    const wantRecovery = document.getElementById("generate-recovery")?.checked ?? true;
    if (!handle) throw new Error("Handle is required.");
    const { manifesto, pilotTemplate } = buildManifestoLine();
    setStatus("Submitting to resolver…");
    await runCreateCard({ handle, manifesto, wantRecovery, pilotTemplate });
  } catch (err) {
    setStatus(err.message || String(err), true);
    if (submitBtn) submitBtn.disabled = false;
    if (demoBtn) demoBtn.disabled = false;
  }
}

form?.addEventListener("submit", submitCreate);

demoBtn?.addEventListener("click", async () => {
  const handleEl = document.getElementById("handle");
  const suffix = randomDemoSuffix();
  setTemplate("general");
  if (handleEl) handleEl.value = `live_demo_${suffix}`;
  if (manifestoEl) {
    manifestoEl.value =
      "Live object demo. Scan from another phone, then revoke this QR.";
  }
  await submitCreate(new Event("submit"));
});
