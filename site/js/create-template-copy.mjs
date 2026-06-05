/**
 * Create page hero copy per pilot template.
 * @see docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md § Messaging matrix
 */

/** @typedef {"general" | "status_plate" | "lost_item_relay"} CreatePilotTemplate */

/** @type {Record<CreatePilotTemplate, { title: string; lead: string }>} */
export const CREATE_TEMPLATE_HERO = {
  general: {
    title: "Pick your @handle",
    lead:
      "Your @handle is your control line. Signs, tags, wearables, and other live objects can be added from Live later.",
  },
  status_plate: {
    title: "Make a QR sign",
    lead:
      "Say what it's on and what scanners should read. Add more signs from Live after.",
  },
  lost_item_relay: {
    title: "Make a return tag",
    lead:
      "Say what's lost and what finders should read. Add more tags from Live after.",
  },
};

/** Hero copy when `?intent=deploy` (deploy room — no taxonomy tabs). */
export const CREATE_DEPLOY_ROOM_HERO = {
  status_plate: {
    title: "Make a QR sign",
    lead:
      "Say what it's on and what scanners should read. Pick a @handle if you don't have one yet.",
  },
  lost_item_relay: {
    title: "Make a return tag",
    lead:
      "Say what's lost and what finders should read. Pick a @handle if you don't have one yet.",
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
 * @param {URLSearchParams} [searchParams]
 */
export function createHeroCopyForTemplate(template, searchParams) {
  const normalized = normalizeCreateTemplate(template);
  if (searchParams?.get("intent") === "deploy") {
    return CREATE_DEPLOY_ROOM_HERO[normalized] ?? CREATE_DEPLOY_ROOM_HERO.status_plate;
  }
  return CREATE_TEMPLATE_HERO[normalized];
}

/**
 * @param {string | null | undefined} template
 * @param {URLSearchParams} [searchParams]
 */
export function syncCreateHeroCopy(template, searchParams = new URLSearchParams(location.search)) {
  const copy = createHeroCopyForTemplate(template, searchParams);
  const titleEl = document.getElementById("create-hero-title");
  const leadEl = document.getElementById("create-hero-lead");
  if (titleEl) titleEl.textContent = copy.title;
  if (leadEl) leadEl.textContent = copy.lead;
}
