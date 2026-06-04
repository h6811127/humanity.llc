/**
 * Create page entry chooser — steward paths only (deploy + wear carrier).
 * Landing door 3 (Play) is player entry; organizers use ?intent=game or /created/.
 * @see docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md § Front door strategy · Step 11
 */

/** @typedef {"something" | "wear"} CreateEntryDoorId */

/**
 * Steward create doors — not a mirror of landing #launch-doors (no player play path).
 * @type {ReadonlyArray<{
 *   id: CreateEntryDoorId;
 *   title: string;
 *   sub: string;
 *   href: string | null;
 *   intent: string | null;
 * }>}
 */
export const CREATE_ENTRY_DOORS = [
  {
    id: "something",
    title: "Live status on something",
    sub: "Door plate, desk tag, sign — deploy live state you can update without reprinting",
    href: null,
    intent: "deploy",
  },
  {
    id: "wear",
    title: "Live status on you",
    sub: "Glitch hoodie — your QR, your line, change it from Live without reprinting",
    href: "/shop/customize/?product=glitch_hoodie_v1",
    intent: null,
  },
];

/**
 * Skip the chooser when the user arrived with a deep link or funnel context.
 * @param {URLSearchParams} searchParams
 */
export function shouldSkipCreateEntryChooser(searchParams) {
  if (searchParams.get("template")) return true;
  if (searchParams.get("hc_ref")) return true;
  const intent = searchParams.get("intent");
  if (intent === "deploy" || intent === "game" || intent === "general") return true;
  return false;
}

/**
 * Initial create template when the form panel is shown (not chooser).
 * @param {URLSearchParams} searchParams
 * @returns {"general" | "status_plate" | "lost_item_relay"}
 */
export function defaultTemplateForCreateEntry(searchParams) {
  const template = searchParams.get("template");
  if (template === "lost_item") return "lost_item_relay";
  if (template === "status_plate") return "status_plate";
  if (searchParams.get("intent") === "deploy") return "status_plate";
  return "general";
}

/**
 * @param {CreateEntryDoorId} doorId
 */
export function createEntryDoorById(doorId) {
  return CREATE_ENTRY_DOORS.find((door) => door.id === doorId) ?? null;
}
