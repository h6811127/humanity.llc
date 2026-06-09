/**
 * Wear track chooser UI on /create/?intent=wear
 */

import {
  readPersistedWearTrack,
  resolveWearTrackChoice,
  WEAR_TRACK_BYOP,
  WEAR_TRACK_FULFILLED,
  WEAR_TRACK_OPTIONS,
  writePersistedWearTrack,
} from "./create-wear-track-chooser-core.mjs";
import { isWearCreateIntent } from "./create-wear-wizard-core.mjs";

export const WEAR_TRACK_CHOOSER_ID = "create-wear-track-chooser";

/**
 * @param {URLSearchParams} searchParams
 */
export function syncCreateWearTrackChooserUi(searchParams) {
  const active = isWearCreateIntent(searchParams);
  const chooser = document.getElementById(WEAR_TRACK_CHOOSER_ID);
  const wearWizard = document.getElementById("create-wear-wizard");
  const formFields = document.getElementById("create-fields-general");
  const submitBtn = document.getElementById("submit");

  if (!(chooser instanceof HTMLElement)) return null;

  chooser.hidden = !active;
  if (!active) return null;

  const track = resolveWearTrackChoice({ searchParams, storage: sessionStorage });
  const showForm = track === WEAR_TRACK_BYOP;

  if (wearWizard instanceof HTMLElement) wearWizard.hidden = !showForm;
  if (formFields instanceof HTMLElement) formFields.hidden = !showForm;
  if (submitBtn instanceof HTMLButtonElement) submitBtn.hidden = !showForm;

  chooser.querySelectorAll("[data-wear-track]").forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const id = el.getAttribute("data-wear-track");
    el.classList.toggle("is-selected", id === track);
    if (el instanceof HTMLButtonElement) {
      el.setAttribute("aria-pressed", id === track ? "true" : "false");
    }
  });

  if (chooser.dataset.rendered !== "1") {
    chooser.dataset.rendered = "1";
    const list = chooser.querySelector(".create-wear-track-list");
    if (list instanceof HTMLElement) {
      list.replaceChildren(
        ...WEAR_TRACK_OPTIONS.map((opt) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "create-wear-track-card";
          btn.dataset.wearTrack = opt.id;
          btn.setAttribute("aria-pressed", "false");
          const title = document.createElement("span");
          title.className = "create-wear-track-title";
          title.textContent = opt.title;
          const body = document.createElement("span");
          body.className = "create-wear-track-body";
          body.textContent = opt.body;
          btn.append(title, body);
          btn.addEventListener("click", () => {
            if (opt.id === WEAR_TRACK_FULFILLED && opt.href) {
              writePersistedWearTrack(sessionStorage, WEAR_TRACK_FULFILLED);
              location.assign(opt.href);
              return;
            }
            writePersistedWearTrack(sessionStorage, WEAR_TRACK_BYOP);
            const url = new URL(location.href);
            url.searchParams.set("wear_track", WEAR_TRACK_BYOP);
            history.replaceState(null, "", `${url.pathname}${url.search}`);
            syncCreateWearTrackChooserUi(new URLSearchParams(location.search));
          });
          return btn;
        })
      );
    }
  }

  const hint = chooser.querySelector(".create-wear-track-prompt");
  if (hint instanceof HTMLElement) hint.hidden = Boolean(track);

  return { track, showForm };
}

/**
 * @param {URLSearchParams} searchParams
 */
export function wearTrackBlocksSubmit(searchParams) {
  if (!isWearCreateIntent(searchParams)) return false;
  const track = resolveWearTrackChoice({ searchParams, storage: sessionStorage });
  return !track || track !== WEAR_TRACK_BYOP;
}
