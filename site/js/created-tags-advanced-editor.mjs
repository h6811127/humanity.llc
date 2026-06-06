/**
 * Mount and sync Advanced editor demotion for Attached QRs (Phase 2B).
 */

import { mountChildObjectAddHubSections } from "./created-child-object-add-hub.mjs";
import { isGameSeasonSetupFlowActive } from "./create-organizer-season-core.mjs";
import {
  CREATED_TAGS_COLLECTION_SYNC_EVENT,
} from "./created-tags-collection-core.mjs";
import { stewardPresentationExtras } from "./steward-active-room-core.mjs";
import {
  CREATED_TAGS_ADVANCED_EDITOR_LEAD,
  CREATED_TAGS_ADVANCED_EDITOR_SUMMARY,
  shouldApplyTagsAdvancedDemotion,
  tagsAdvancedEditorForcedOpen,
  tagsAdvancedEditorOpenStateForProfile,
} from "./created-tags-advanced-editor-core.mjs";

export { expandTagsAdvancedEditor } from "./created-tags-advanced-editor-expand.mjs";

function mountHubIntoAdvancedEditor() {
  const wrapper = document.getElementById("created-tags-advanced-editor");
  const hub = document.getElementById("child-object-add-hub");
  if (!(wrapper instanceof HTMLElement) || !(hub instanceof HTMLElement)) return;
  if (hub.parentElement === wrapper) return;
  wrapper.appendChild(hub);
}

function restoreHubFromAdvancedEditor() {
  const wrapper = document.getElementById("created-tags-advanced-editor");
  const hub = document.getElementById("child-object-add-hub");
  if (!(wrapper instanceof HTMLElement) || !(hub instanceof HTMLElement)) return;
  if (hub.parentElement !== wrapper) return;
  wrapper.insertAdjacentElement("afterend", hub);
}

/**
 * @param {{
 *   profileId: string;
 *   getSession: () => Record<string, unknown> | null;
 * }} ctx
 */
export function initCreatedTagsAdvancedEditor(ctx) {
  const wrapper = document.getElementById("created-tags-advanced-editor");
  const leadEl = document.getElementById("created-tags-advanced-editor-lead");
  const summaryEl = wrapper?.querySelector(".created-tags-advanced-editor-summary");
  if (!wrapper) return null;

  function forcedOpen() {
    return tagsAdvancedEditorForcedOpen(sessionStorage) || isGameSeasonSetupFlowActive();
  }

  function sync() {
    mountChildObjectAddHubSections();
    const session = ctx.getSession();
    const extras = stewardPresentationExtras(ctx.profileId);
    const applyDemotion = shouldApplyTagsAdvancedDemotion(
      new URLSearchParams(location.search),
      localStorage,
      session,
      ctx.profileId,
      extras
    );

    if (!applyDemotion) {
      restoreHubFromAdvancedEditor();
      wrapper.hidden = true;
      if ("open" in wrapper && typeof wrapper.open === "boolean") {
        wrapper.open = false;
      }
      document.body.classList.remove("created-tags-advanced-demotion");
      return;
    }

    mountHubIntoAdvancedEditor();
    wrapper.hidden = false;
    document.body.classList.add("created-tags-advanced-demotion");
    if (summaryEl) summaryEl.textContent = CREATED_TAGS_ADVANCED_EDITOR_SUMMARY;
    if (leadEl) leadEl.textContent = CREATED_TAGS_ADVANCED_EDITOR_LEAD;

    const shouldOpen = tagsAdvancedEditorOpenStateForProfile(localStorage, ctx.profileId, {
      forcedOpen: forcedOpen(),
    });
    if ("open" in wrapper && typeof wrapper.open === "boolean") {
      wrapper.open = shouldOpen;
    }

    const hub = document.getElementById("child-object-add-hub");
    if (hub && typeof hub === "object" && "open" in hub && typeof hub.open === "boolean") {
      hub.open = forcedOpen() ? true : shouldOpen;
    }
  }

  window.addEventListener(CREATED_TAGS_COLLECTION_SYNC_EVENT, sync);
  sync();

  return { sync, refresh: sync };
}
