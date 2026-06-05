/**
 * Season create fork UI on /create/?intent=game (step 20 slice 4).
 */

import {
  GAME_SEASON_ACCOUNT_PARAM,
  GAME_SEASON_FORK_DEDICATED,
  GAME_SEASON_FORK_EXISTING,
  gameSeasonForkCardCopy,
  readGameSeasonForkChoice,
  resolveGameSeasonSubmitStrategy,
  shouldShowGameSeasonCreateFork,
} from "./create-season-fork-core.mjs";
import { loadWallet } from "./device-wallet.mjs";

/**
 * @param {typeof GAME_SEASON_FORK_EXISTING | typeof GAME_SEASON_FORK_DEDICATED} fork
 */
function setForkInUrl(fork) {
  const params = new URLSearchParams(location.search);
  params.set(GAME_SEASON_ACCOUNT_PARAM, fork);
  history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
}

/**
 * @param {URLSearchParams} searchParams
 */
export function syncCreateSeasonForkUi(searchParams) {
  const forkPanel = document.getElementById("create-game-season-fork");
  const wizard = document.getElementById("create-game-season-wizard");
  const formMain = document.getElementById("create-form-main-fields");
  const submitBtn = document.getElementById("submit");
  if (!forkPanel) return;

  const strategy = resolveGameSeasonSubmitStrategy({
    searchParams,
    walletEntries: loadWallet(),
  });
  const showFork = shouldShowGameSeasonCreateFork(strategy);
  const selectedFork = readGameSeasonForkChoice(searchParams);

  forkPanel.hidden = !showFork;
  if (wizard instanceof HTMLElement) {
    wizard.hidden = showFork;
  }
  if (formMain instanceof HTMLElement) {
    formMain.hidden = showFork;
  }
  if (submitBtn instanceof HTMLButtonElement) {
    submitBtn.disabled = showFork;
  }

  if (!showFork) return;

  const existingBtn = document.getElementById("create-game-season-fork-existing");
  const dedicatedBtn = document.getElementById("create-game-season-fork-dedicated");
  for (const [fork, btn] of [
    [GAME_SEASON_FORK_EXISTING, existingBtn],
    [GAME_SEASON_FORK_DEDICATED, dedicatedBtn],
  ]) {
    if (!(btn instanceof HTMLButtonElement)) continue;
    const copy = gameSeasonForkCardCopy(fork);
    const titleEl = btn.querySelector(".create-season-fork-title");
    const subEl = btn.querySelector(".create-season-fork-sub");
    const recEl = btn.querySelector(".create-season-fork-rec");
    if (titleEl) titleEl.textContent = copy.title;
    if (subEl) subEl.textContent = copy.sub;
    if (recEl) recEl.textContent = `Recommended · ${copy.recommended}`;
    btn.classList.toggle("is-active", selectedFork === fork);
    btn.setAttribute("aria-pressed", selectedFork === fork ? "true" : "false");
    if (!btn.dataset.forkBound) {
      btn.dataset.forkBound = "1";
      btn.addEventListener("click", () => {
        setForkInUrl(fork);
        window.dispatchEvent(new Event("hc-create-season-fork-changed"));
      });
    }
  }
}
