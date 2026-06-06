/**
 * Copy + actions for create entry gate (Step 20 slice 5).
 */

import { generalRootDisplayLabel } from "./create-flow-convergence-core.mjs";
import { createdLiveAddObjectHref } from "./create-deploy-wizard-core.mjs";
import { createdWearPrintHref } from "./create-wear-wizard-core.mjs";
import { createdGameSeasonSetupHref } from "./create-organizer-season-core.mjs";
import { STEWARD_ROOM_SEASON } from "./steward-active-room-core.mjs";

/**
 * @param {import("./create-entry-state-core.mjs").CreateEntryGateKind} gateKind
 * @param {import("./create-entry-state-core.mjs").CreateEntryHandoffKind | null} handoffKind
 * @param {Record<string, unknown> | null | undefined} preferredRoot
 * @param {string} template
 */
export function createEntryGatePresentation(gateKind, handoffKind, preferredRoot, template) {
  const handle = preferredRoot ? generalRootDisplayLabel(preferredRoot) : "your account";

  if (gateKind === "wrong_context") {
    return {
      eyebrow: "Control is open elsewhere",
      title: "Finish on the tab that already has your keys",
      body: `${handle} is active in another tab or browser window on this device. Open that tab to add scan points — or start a new @handle below if you meant a separate account.`,
      primaryLabel: "Open saved cards",
      primaryHref: "/wallet/",
      secondaryLabel: "Create a new @handle instead",
      showFormOnSecondary: true,
    };
  }

  if (gateKind === "unlock_wallet") {
    const objectLabel =
      handoffKind === "deploy_relay"
        ? "return tag"
        : handoffKind === "wear"
          ? "wearable QR"
          : handoffKind === "season"
            ? "season setup"
            : "sign";
    return {
      eyebrow: "Already on this device",
      title: `Load ${handle} on this tab`,
      body: `Your @handle is saved here. Load it once, then add your ${objectLabel} on Live — no second account needed.`,
      primaryLabel: `Continue with ${handle}`,
      primaryHref: null,
      secondaryLabel: "Create a new @handle instead",
      showFormOnSecondary: true,
    };
  }

  if (gateKind === "continue_live") {
    if (handoffKind === "wear") {
      return {
        eyebrow: "Already set up",
        title: `${handle} is ready on this tab`,
        body: "Continue on Live to add or print your wearable QR.",
        primaryLabel: `Open ${handle} on Live`,
        primaryHref: null,
        secondaryLabel: "Create a new @handle instead",
        showFormOnSecondary: true,
      };
    }
    if (handoffKind === "season") {
      return {
        eyebrow: "Already set up",
        title: `${handle} is ready on this tab`,
        body: "Continue on Live to set up season scan points and rules.",
        primaryLabel: `Open ${handle} for season setup`,
        primaryHref: null,
        secondaryLabel: "Create a new @handle instead",
        showFormOnSecondary: true,
      };
    }
    const objectLabel = template === "lost_item_relay" ? "return tag" : "sign";
    return {
      eyebrow: "Already set up",
      title: `${handle} is ready on this tab`,
      body: `Continue on Live to add your ${objectLabel} there — no second @handle needed.`,
      primaryLabel: `Open ${handle} to add ${objectLabel}`,
      primaryHref: null,
      secondaryLabel: "Create a new @handle instead",
      showFormOnSecondary: true,
    };
  }

  return {
    eyebrow: "",
    title: "",
    body: "",
    primaryLabel: "",
    primaryHref: null,
    secondaryLabel: "",
    showFormOnSecondary: false,
  };
}

/**
 * @param {Record<string, unknown>} preferredRoot
 * @param {import("./create-entry-state-core.mjs").CreateEntryHandoffKind | null} handoffKind
 * @param {string} template
 * @param {string} [origin]
 */
export function createEntryGateLiveHref(preferredRoot, handoffKind, template, origin = "https://humanity.llc") {
  if (handoffKind === "wear") {
    return createdWearPrintHref(preferredRoot, origin, { fresh: false });
  }
  if (handoffKind === "season") {
    const href = createdGameSeasonSetupHref(preferredRoot, origin);
    if (!href) return null;
    const url = new URL(href, origin);
    url.searchParams.set("room", STEWARD_ROOM_SEASON);
    return `${url.pathname}${url.search}`;
  }
  return createdLiveAddObjectHref(preferredRoot, template, origin);
}
