/**
 * Create page hero copy per pilot template.
 * @see docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md § Messaging matrix
 */

/** @typedef {"general" | "status_plate" | "lost_item_relay"} CreatePilotTemplate */

/** @type {Record<CreatePilotTemplate, { title: string; lead: string }>} */
export const CREATE_TEMPLATE_HERO = {
  general: {
    title: "Create a live card",
    lead:
      "One tap registers your card on the network and issues a signed QR to print or share. Scans show live status — active, revoked, or expired — not a frozen link.",
  },
  status_plate: {
    title: "Create a status plate",
    lead:
      "One plate · one question · open or closed right now. Same QR — update the status line on Live without reprinting.",
  },
  lost_item_relay: {
    title: "Create a lost item relay",
    lead:
      "Tag the item — finders see a live return path, not your phone number. Revoke on Manage when recovered.",
  },
};

/**
 * @param {string | null | undefined} template
 * @returns {CreatePilotTemplate}
 */
export function normalizeCreateTemplate(template) {
  if (template === "status_plate" || template === "lost_item_relay") return template;
  return "general";
}

/**
 * @param {string | null | undefined} template
 */
export function createHeroCopyForTemplate(template) {
  return CREATE_TEMPLATE_HERO[normalizeCreateTemplate(template)];
}

/**
 * @param {string | null | undefined} template
 */
export function syncCreateHeroCopy(template) {
  const copy = createHeroCopyForTemplate(template);
  const titleEl = document.getElementById("create-hero-title");
  const leadEl = document.getElementById("create-hero-lead");
  if (titleEl) titleEl.textContent = copy.title;
  if (leadEl) leadEl.textContent = copy.lead;
}
