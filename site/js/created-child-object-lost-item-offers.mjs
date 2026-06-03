import { dismissRelayOffer, listRelayOffers } from "./lost-item-offer-owner.mjs";

/**
 * @param {Record<string, unknown>} row
 */
export function renderChildObjectRelayOffersSection(row) {
  const details = document.createElement("details");
  details.className = "child-object-relay-offers";
  details.dataset.objectId = String(row.object_id);

  const summary = document.createElement("summary");
  summary.className = "child-object-relay-offers-summary";
  summary.textContent = "Finder messages";
  details.append(summary);

  const intro = document.createElement("p");
  intro.className = "form-hint";
  intro.textContent =
    "Anonymous return notes from scanners who used the offer form. Not linked to scan history.";
  details.append(intro);

  const refreshBtn = document.createElement("button");
  refreshBtn.type = "button";
  refreshBtn.className = "btn-secondary child-object-relay-offers-refresh";
  refreshBtn.textContent = "Refresh messages";
  details.append(refreshBtn);

  const list = document.createElement("ul");
  list.className = "child-object-relay-offers-list";
  list.hidden = true;
  details.append(list);

  const empty = document.createElement("p");
  empty.className = "form-hint child-object-relay-offers-empty";
  empty.hidden = true;
  empty.textContent = "No pending finder messages.";
  details.append(empty);

  const status = document.createElement("p");
  status.className = "form-hint child-object-relay-offers-status";
  status.hidden = true;
  status.setAttribute("role", "status");
  details.append(status);

  return details;
}

/**
 * @param {HTMLElement} section
 * @param {Array<{ offer_id?: string; message?: string; created_at?: string }>} offers
 */
export function renderRelayOffersList(section, offers) {
  const list = section.querySelector(".child-object-relay-offers-list");
  const empty = section.querySelector(".child-object-relay-offers-empty");
  const summary = section.querySelector(".child-object-relay-offers-summary");
  if (!(list instanceof HTMLElement) || !(empty instanceof HTMLElement)) return;

  list.replaceChildren();
  if (!offers.length) {
    list.hidden = true;
    empty.hidden = false;
    if (summary instanceof HTMLElement) summary.textContent = "Finder messages";
    return;
  }

  empty.hidden = true;
  list.hidden = false;
  if (summary instanceof HTMLElement) {
    summary.textContent = `Finder messages (${offers.length} pending)`;
  }

  for (const offer of offers) {
    const li = document.createElement("li");
    li.className = "child-object-relay-offer-row";
    li.dataset.offerId = String(offer.offer_id ?? "");

    const message = document.createElement("p");
    message.className = "child-object-relay-offer-message";
    message.textContent = String(offer.message ?? "");

    const meta = document.createElement("p");
    meta.className = "form-hint child-object-relay-offer-meta";
    meta.textContent =
      typeof offer.created_at === "string"
        ? `Received ${new Date(offer.created_at).toLocaleString()}`
        : "Pending";

    const dismissBtn = document.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.className = "btn-text child-object-relay-offer-dismiss";
    dismissBtn.dataset.offerId = String(offer.offer_id ?? "");
    dismissBtn.textContent = "Dismiss";

    li.append(message, meta, dismissBtn);
    list.append(li);
  }
}

/**
 * @param {{
 *   section: HTMLElement;
 *   profileId: string;
 *   objectId: string;
 *   getSigningKeys: () => { privateKeyBase58: string; publicKeyBase58: string } | null;
 *   showError: (msg: string) => void;
 * }} input
 */
export async function refreshRelayOffersSection(input) {
  const status = input.section.querySelector(".child-object-relay-offers-status");
  const keys = input.getSigningKeys();
  if (!keys) {
    if (status instanceof HTMLElement) {
      status.hidden = false;
      status.textContent = "Unlock owner or recovery key to read finder messages.";
    }
    return;
  }

  if (status instanceof HTMLElement) {
    status.hidden = false;
    status.textContent = "Loading finder messages…";
  }

  try {
    const body = await listRelayOffers({
      profileId: input.profileId,
      objectId: input.objectId,
      privateKeyBase58: keys.privateKeyBase58,
      publicKeyBase58: keys.publicKeyBase58,
    });
    const offers = Array.isArray(body.offers) ? body.offers : [];
    renderRelayOffersList(input.section, offers);
    if (status instanceof HTMLElement) {
      status.textContent = offers.length
        ? `${offers.length} pending message${offers.length === 1 ? "" : "s"}.`
        : "No pending finder messages.";
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (status instanceof HTMLElement) status.textContent = message;
    input.showError(message);
    throw err;
  }
}

/**
 * @param {{
 *   section: HTMLElement;
 *   profileId: string;
 *   objectId: string;
 *   offerId: string;
 *   getSigningKeys: () => { privateKeyBase58: string; publicKeyBase58: string } | null;
 *   showError: (msg: string) => void;
 * }} input
 */
export async function dismissRelayOfferFromSection(input) {
  const keys = input.getSigningKeys();
  if (!keys) {
    input.showError("Unlock owner or recovery key before dismissing messages.");
    return;
  }
  await dismissRelayOffer({
    profileId: input.profileId,
    objectId: input.objectId,
    offerId: input.offerId,
    privateKeyBase58: keys.privateKeyBase58,
    publicKeyBase58: keys.publicKeyBase58,
  });
  await refreshRelayOffersSection({
    section: input.section,
    profileId: input.profileId,
    objectId: input.objectId,
    getSigningKeys: input.getSigningKeys,
    showError: input.showError,
  });
}
