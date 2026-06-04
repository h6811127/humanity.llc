/**
 * Device-local faction pledge on sanctuary scans (**SW-02**).
 */
import {
  SIGNAL_WAR_PLEDGE_STORAGE_KEY,
  buildFactionPledgeRecord,
  readFactionPledgeForSeason,
  serializeFactionPledgeRecord,
} from "./city-game-signal-war-core.mjs";

const SAVED_LABEL = "Saved on this device";

function scanHero() {
  return document.getElementById("scan-safety-header");
}

function seasonIdFromHero() {
  return scanHero()?.dataset.seasonId?.trim() ?? null;
}

function isPledgePage() {
  return document.querySelector("[data-game-pledge='1']") != null;
}

function setStatus(message) {
  const el = document.getElementById("scan-game-pledge-status");
  if (!el) return;
  el.hidden = !message;
  el.textContent = message;
}

function preselectFaction(faction) {
  const select = document.getElementById("scan-game-pledge-faction");
  if (!(select instanceof HTMLSelectElement) || !faction) return;
  select.value = faction;
}

function bootPledge() {
  if (!isPledgePage()) return;
  const seasonId = seasonIdFromHero();
  if (!seasonId) return;

  let stored = null;
  try {
    stored = readFactionPledgeForSeason(
      localStorage.getItem(SIGNAL_WAR_PLEDGE_STORAGE_KEY),
      seasonId
    );
  } catch {
    stored = null;
  }
  if (stored?.faction) {
    preselectFaction(stored.faction);
    setStatus(SAVED_LABEL);
  }

  const submit = document.getElementById("scan-game-pledge-submit");
  const select = document.getElementById("scan-game-pledge-faction");
  if (!(submit instanceof HTMLButtonElement) || !(select instanceof HTMLSelectElement)) {
    return;
  }

  submit.addEventListener("click", () => {
    const faction = select.value.trim().toLowerCase();
    if (!["red", "blue", "green", "yellow"].includes(faction)) {
      setStatus("Choose a faction first.");
      return;
    }
    try {
      const record = buildFactionPledgeRecord(seasonId, faction);
      localStorage.setItem(
        SIGNAL_WAR_PLEDGE_STORAGE_KEY,
        serializeFactionPledgeRecord(record)
      );
      setStatus(SAVED_LABEL);
    } catch {
      setStatus("Could not save on this device.");
    }
  });
}

bootPledge();
