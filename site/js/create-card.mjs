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

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = isError ? "form-status error" : "form-status";
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  setStatus("Generating keys and signing…");

  try {
    const handle = document.getElementById("handle").value;
    const manifesto = document.getElementById("manifesto").value;
    const wantRecovery = document.getElementById("generate-recovery")?.checked ?? true;
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
    const qr_credential = await signDocument(
      qrUnsigned,
      privateKey,
      publicKeyBase58
    );

    setStatus("Submitting to resolver…");

    const res = await fetch(postCardsUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card, qr_credential }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
      data.message || data.error || `HTTP ${res.status} (${postCardsUrl()})`
    );
    }

    sessionStorage.setItem(
      "hc_created",
      JSON.stringify({
        ...data,
        manifesto_line: manifesto,
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
  } catch (err) {
    setStatus(err.message || String(err), true);
    submitBtn.disabled = false;
  }
});

function randomNonce() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
