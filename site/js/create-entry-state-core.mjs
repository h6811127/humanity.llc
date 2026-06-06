/**
 * Create flow Step 20 slice 5 — five steward entry states (branch at room entry only).
 * @see docs/STEWARD_UX_PRESENTATION_TARGET.md § Five steward entry states
 */

import { defaultTemplateForCreateEntry } from "./create-entry-chooser-core.mjs";
import { resolveDeploySubmitStrategy, isDeployWizardIntent } from "./create-deploy-wizard-core.mjs";
import {
  listGeneralRootsWithKeys,
  pickPreferredGeneralRoot,
} from "./create-flow-convergence-core.mjs";
import { resolveGameSeasonSubmitStrategy } from "./create-season-fork-core.mjs";
import {
  isGameSeasonCreateIntent,
  pickPreferredGameSeasonRoot,
} from "./create-organizer-season-core.mjs";
import { resolveWearSubmitStrategy } from "./create-wear-wizard-core.mjs";
import { walletEntryNeedsDeviceUnlock } from "./device-custody-mode-core.mjs";
import {
  tabSessionHasSigningKeys,
  walletEntryHasSigningMaterial,
} from "./device-tab-session-core.mjs";

/** @typedef {"new_device" | "returning_session" | "returning_wallet" | "wrong_context" | "pilot"} CreateEntryStateId */

/** @typedef {"continue_live" | "unlock_wallet" | "wrong_context"} CreateEntryGateKind */

/** @typedef {"deploy_sign" | "deploy_relay" | "wear" | "season"} CreateEntryHandoffKind */

export const CREATE_ENTRY_GATE_BYPASS_KEY = "hc_create_entry_gate_bypass";

/**
 * Field-kit deep link (`?template=`) — state 5 pilot path.
 * @param {URLSearchParams} searchParams
 */
export function isCreatePilotFieldKitEntry(searchParams) {
  return searchParams.has("template");
}

/**
 * @param {URLSearchParams} searchParams
 * @param {string} template
 */
export function createRoomTemplateForEntry(searchParams, template) {
  if (template) return template;
  return defaultTemplateForCreateEntry(searchParams);
}

/**
 * @param {{
 *   searchParams: URLSearchParams;
 *   template: string;
 *   walletEntries: unknown[];
 * }} ctx
 */
export function resolveCreateLiveRedirectContext(ctx) {
  const { searchParams, template, walletEntries } = ctx;

  if (isGameSeasonCreateIntent(searchParams)) {
    const gameStrategy = resolveGameSeasonSubmitStrategy({ searchParams, walletEntries });
    if (gameStrategy === "redirect_live") {
      const root = pickPreferredGameSeasonRoot(walletEntries);
      return root
        ? { strategy: gameStrategy, preferredRoot: root, handoffKind: "season" }
        : { strategy: gameStrategy, preferredRoot: null, handoffKind: null };
    }
    if (gameStrategy === "use_existing_account") {
      const root = pickPreferredGeneralRoot(listGeneralRootsWithKeys(walletEntries));
      return root
        ? { strategy: gameStrategy, preferredRoot: root, handoffKind: "season" }
        : { strategy: gameStrategy, preferredRoot: null, handoffKind: null };
    }
    return { strategy: gameStrategy, preferredRoot: null, handoffKind: null };
  }

  if (resolveWearSubmitStrategy({ searchParams, walletEntries }) === "redirect_live") {
    const root = pickPreferredGeneralRoot(listGeneralRootsWithKeys(walletEntries));
    return root
      ? { strategy: "redirect_live", preferredRoot: root, handoffKind: "wear" }
      : { strategy: "redirect_live", preferredRoot: null, handoffKind: null };
  }

  const deployStrategy = resolveDeploySubmitStrategy({
    searchParams,
    template,
    walletEntries,
  });
  if (deployStrategy === "redirect_live") {
    const root = pickPreferredGeneralRoot(listGeneralRootsWithKeys(walletEntries));
    const handoffKind = template === "lost_item_relay" ? "deploy_relay" : "deploy_sign";
    return root
      ? { strategy: deployStrategy, preferredRoot: root, handoffKind }
      : { strategy: deployStrategy, preferredRoot: null, handoffKind: null };
  }

  return { strategy: "standard", preferredRoot: null, handoffKind: null };
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {Record<string, unknown> | null | undefined} preferredRoot
 */
export function sessionHasKeysForPreferredRoot(session, preferredRoot) {
  if (!preferredRoot || typeof preferredRoot !== "object") return false;
  const pid = typeof preferredRoot.profile_id === "string" ? preferredRoot.profile_id.trim() : "";
  if (!pid) return false;
  const sessionPid = typeof session?.profile_id === "string" ? session.profile_id.trim() : "";
  return sessionPid === pid && tabSessionHasSigningKeys(session);
}

/**
 * @param {Record<string, unknown> | null | undefined} preferredRoot
 * @param {string[]} crossTabProfileIds
 */
export function preferredRootKeysOpenInOtherTab(preferredRoot, crossTabProfileIds) {
  if (!preferredRoot || typeof preferredRoot !== "object") return false;
  const pid = typeof preferredRoot.profile_id === "string" ? preferredRoot.profile_id.trim() : "";
  if (!pid) return false;
  return crossTabProfileIds.includes(pid);
}

/**
 * @param {Record<string, unknown> | null | undefined} preferredRoot
 * @param {unknown[]} walletEntries
 */
export function walletHasRowForPreferredRoot(preferredRoot, walletEntries) {
  if (!preferredRoot || typeof preferredRoot !== "object") return false;
  const pid = typeof preferredRoot.profile_id === "string" ? preferredRoot.profile_id.trim() : "";
  if (!pid || !Array.isArray(walletEntries)) return false;
  return walletEntries.some(
    (row) =>
      row &&
      typeof row === "object" &&
      typeof row.profile_id === "string" &&
      row.profile_id.trim() === pid
  );
}

/**
 * @param {{
 *   preferredRoot: Record<string, unknown>;
 *   session: Record<string, unknown> | null | undefined;
 *   walletEntries: unknown[];
 *   crossTabProfileIds: string[];
 * }} ctx
 * @returns {CreateEntryStateId}
 */
function classifyReturningState(ctx) {
  const { preferredRoot, session, walletEntries, crossTabProfileIds } = ctx;

  if (sessionHasKeysForPreferredRoot(session, preferredRoot)) {
    return "returning_session";
  }

  const hasMaterial = walletEntryHasSigningMaterial(preferredRoot);
  const inCrossTab = preferredRootKeysOpenInOtherTab(preferredRoot, crossTabProfileIds);
  const hasWalletRow = walletHasRowForPreferredRoot(preferredRoot, walletEntries);

  if (!hasMaterial && (inCrossTab || hasWalletRow)) {
    return "wrong_context";
  }

  if (hasMaterial || walletEntryNeedsDeviceUnlock(preferredRoot)) {
    return "returning_wallet";
  }

  if (inCrossTab) return "wrong_context";

  return "returning_wallet";
}

/**
 * @param {{
 *   searchParams: URLSearchParams;
 *   template?: string;
 *   walletEntries: unknown[];
 *   session: Record<string, unknown> | null | undefined;
 *   ephemeralBrowsing?: boolean;
 *   crossTabProfileIds?: string[];
 *   gateBypass?: boolean;
 * }} input
 * @returns {CreateEntryStateId}
 */
export function resolveCreateEntryStateId(input) {
  const {
    searchParams,
    template: templateInput,
    walletEntries,
    session,
    ephemeralBrowsing = false,
    crossTabProfileIds = [],
    gateBypass = false,
  } = input;

  if (ephemeralBrowsing) return "wrong_context";

  const template = createRoomTemplateForEntry(searchParams, templateInput ?? "");

  const redirect = resolveCreateLiveRedirectContext({ searchParams, template, walletEntries });
  const shouldClassifyReturning =
    !gateBypass &&
    redirect.preferredRoot &&
    (isCreatePilotFieldKitEntry(searchParams) ||
      isDeployWizardIntent(searchParams) ||
      searchParams.get("intent") === "wear" ||
      isGameSeasonCreateIntent(searchParams));

  if (shouldClassifyReturning) {
    return classifyReturningState({
      preferredRoot: redirect.preferredRoot,
      session,
      walletEntries,
      crossTabProfileIds,
    });
  }

  if (isCreateRoomEntryIntent(searchParams)) {
    const crossTabRoot = findCrossTabBlockedRoot({
      walletEntries,
      crossTabProfileIds,
      session,
    });
    if (crossTabRoot) return "wrong_context";
  }

  if (isCreatePilotFieldKitEntry(searchParams)) return "pilot";

  return "new_device";
}

/**
 * @param {URLSearchParams} searchParams
 */
export function isCreateRoomEntryIntent(searchParams) {
  return (
    isDeployWizardIntent(searchParams) ||
    searchParams.get("intent") === "wear" ||
    isGameSeasonCreateIntent(searchParams)
  );
}

/**
 * Wallet row exists but signing keys live in another tab.
 * @param {{
 *   walletEntries: unknown[];
 *   crossTabProfileIds: string[];
 *   session: Record<string, unknown> | null | undefined;
 * }} input
 * @returns {Record<string, unknown> | null}
 */
export function findCrossTabBlockedRoot(input) {
  const { walletEntries, crossTabProfileIds, session } = input;
  if (!crossTabProfileIds.length || !Array.isArray(walletEntries)) return null;

  for (const pid of crossTabProfileIds) {
    const row = walletEntries.find(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof entry.profile_id === "string" &&
        entry.profile_id.trim() === pid
    );
    if (!row || typeof row !== "object") continue;
    if (sessionHasKeysForPreferredRoot(session, row)) continue;
    if (!walletEntryHasSigningMaterial(row)) {
      return row;
    }
  }
  return null;
}

/**
 * @param {{
 *   searchParams: URLSearchParams;
 *   template?: string;
 *   walletEntries: unknown[];
 *   session: Record<string, unknown> | null | undefined;
 *   ephemeralBrowsing?: boolean;
 *   crossTabProfileIds?: string[];
 *   gateBypass?: boolean;
 * }} input
 */
export function resolveCreateEntryGate(input) {
  const template = createRoomTemplateForEntry(
    input.searchParams,
    input.template ?? defaultTemplateForCreateEntry(input.searchParams)
  );
  const stateId = resolveCreateEntryStateId({ ...input, template });
  const redirect = resolveCreateLiveRedirectContext({
    searchParams: input.searchParams,
    template,
    walletEntries: input.walletEntries,
  });

  if (input.gateBypass) {
    return {
      showGate: false,
      stateId,
      gateKind: null,
      preferredRoot: null,
      handoffKind: null,
      template,
    };
  }

  const crossTabRoot =
    !redirect.preferredRoot && isCreateRoomEntryIntent(input.searchParams)
      ? findCrossTabBlockedRoot({
          walletEntries: input.walletEntries,
          crossTabProfileIds: input.crossTabProfileIds ?? [],
          session: input.session,
        })
      : null;

  const preferredRoot = redirect.preferredRoot ?? crossTabRoot;
  const handoffKind =
    redirect.handoffKind ??
    (crossTabRoot
      ? input.searchParams.get("intent") === "wear"
        ? "wear"
        : "deploy_sign"
      : null);

  if (!preferredRoot) {
    return {
      showGate: false,
      stateId,
      gateKind: null,
      preferredRoot: null,
      handoffKind: null,
      template,
    };
  }

  if (stateId === "new_device" && crossTabRoot) {
    return {
      showGate: true,
      stateId: "wrong_context",
      gateKind: "wrong_context",
      preferredRoot: crossTabRoot,
      handoffKind,
      template,
    };
  }

  if (stateId === "new_device" || stateId === "pilot") {
    return {
      showGate: false,
      stateId,
      gateKind: null,
      preferredRoot: null,
      handoffKind: null,
      template,
    };
  }

  if (stateId === "returning_session" || stateId === "returning_wallet") {
    return {
      showGate: true,
      stateId,
      gateKind: stateId === "returning_session" ? "continue_live" : "unlock_wallet",
      preferredRoot: redirect.preferredRoot,
      handoffKind: redirect.handoffKind,
      template,
    };
  }

  return {
    showGate: true,
    stateId: "wrong_context",
    gateKind: "wrong_context",
    preferredRoot: redirect.preferredRoot,
    handoffKind: redirect.handoffKind,
    template,
  };
}

/**
 * @param {Pick<Storage, "getItem">} storage
 * @param {URLSearchParams} searchParams
 */
export function readCreateEntryGateBypass(storage, searchParams) {
  try {
    const raw = storage?.getItem(CREATE_ENTRY_GATE_BYPASS_KEY);
    if (!raw) return false;
    const intent = searchParams.get("intent") || "";
    const template = searchParams.get("template") || "";
    return raw === `${intent}|${template}`;
  } catch {
    return false;
  }
}

/**
 * @param {Pick<Storage, "setItem">} storage
 * @param {URLSearchParams} searchParams
 */
export function writeCreateEntryGateBypass(storage, searchParams) {
  try {
    const intent = searchParams.get("intent") || "";
    const template = searchParams.get("template") || "";
    storage.setItem(CREATE_ENTRY_GATE_BYPASS_KEY, `${intent}|${template}`);
  } catch {
    /* ignore */
  }
}
