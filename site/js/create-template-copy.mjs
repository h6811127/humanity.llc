/**
 * Create page hero copy per pilot template.
 * @see docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md § Messaging matrix
 */

/** @typedef {"general" | "status_plate" | "lost_item_relay"} CreatePilotTemplate */

/** @type {Record<CreatePilotTemplate, { title: string; lead: string }>} */
export const CREATE_TEMPLATE_HERO = {
  general: {
    title: "Create a Humanity Card",
    lead:
      "One general root card on the network — add status plates, lost-item relays, and more from Live after create. Same signed QR model: live status, not a frozen link.",
  },
  status_plate: {
    title: "Add a status plate",
    lead:
      "Recommended: add under an existing general card on Live — one root key, nested in My cards. Standalone plate cards below stay available for legacy pilots.",
  },
  lost_item_relay: {
    title: "Add a lost-item relay",
    lead:
      "Recommended: add under an existing general card on Live — one root key, no phone number on the tag. Standalone relay cards below stay available for legacy pilots.",
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
