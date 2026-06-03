/**
 * Lost-item relay — finder offer form (Layer 2 offer verb).
 */
import { postLostItemOfferUrl } from "./lost-item-offer-core.mjs";
import { normalizeLostItemOfferMessage } from "./lost-item-offer-core.mjs";
import { resolverApiOrigin } from "./hc-sign.mjs";
import { resolverErrorMessage } from "./resolver-user-error-core.mjs";

function scanHero() {
  return document.getElementById("scan-safety-header");
}

function profileIdFromHero() {
  return scanHero()?.dataset.profileId ?? null;
}

function objectIdFromHero() {
  return scanHero()?.dataset.objectId ?? null;
}

function qrIdFromHero() {
  return scanHero()?.dataset.qrId ?? null;
}

function isOfferPage() {
  return document.querySelector("[data-lost-item-offer='1']") != null;
}

function setStatus(message, tone = "neutral") {
  const panel = document.getElementById("scan-lost-item-offer-status-panel");
  const status = document.getElementById("scan-lost-item-offer-status");
  if (!panel || !status) return;
  panel.hidden = !message;
  status.textContent = message;
  status.dataset.tone = tone;
}

async function submitOffer() {
  const profileId = profileIdFromHero();
  const objectId = objectIdFromHero();
  const messageInput = document.getElementById("scan-lost-item-offer-message");
  const submitBtn = document.getElementById("scan-lost-item-offer-submit");
  if (!profileId || !objectId || !(messageInput instanceof HTMLTextAreaElement)) return;

  const message = normalizeLostItemOfferMessage(messageInput.value);
  if (!message) {
    setStatus("Enter a short message for the owner.", "error");
    return;
  }

  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
  setStatus("Sending through relay…", "waiting");

  try {
    const url = new URL(postLostItemOfferUrl(profileId, objectId), resolverApiOrigin());
    const qrId = qrIdFromHero();
    const res = await fetch(url.href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        ...(qrId ? { qr_id: qrId } : {}),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(resolverErrorMessage(body, "Could not send message."));
    }
    messageInput.value = "";
    messageInput.disabled = true;
    setStatus(
      typeof body.message === "string"
        ? body.message
        : "Message sent. The owner can read it on their relay — you stay anonymous.",
      "success"
    );
  } catch (err) {
    const text = err instanceof Error ? err.message : String(err);
    setStatus(text, "error");
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
  }
}

function init() {
  if (!isOfferPage()) return;
  const submitBtn = document.getElementById("scan-lost-item-offer-submit");
  submitBtn?.addEventListener("click", () => {
    submitOffer().catch(() => {});
  });
}

init();
