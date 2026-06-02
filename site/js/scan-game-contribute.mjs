/**
 * Cedar Rapids city game — voluntary site-code quorum on game_node scans.
 */
import { postGameContributeUrl, resolverApiOrigin } from "./hc-sign.mjs";
import { resolverErrorMessage } from "./resolver-user-error-core.mjs";
import {
  SCARCITY_CEILING_ALREADY_CLAIMED_MESSAGE,
  SCARCITY_CEILING_STORAGE_KEY,
  buildScarcityCeilingRecord,
  deviceHasScarcityClaimToday,
  scarcityCeilingUtcDateKey,
  serializeScarcityCeilingRecord,
} from "./scan-game-scarcity-ceiling-core.mjs";

function scanHero() {
  return document.getElementById("scan-safety-header");
}

function profileIdFromHero() {
  return scanHero()?.dataset.profileId ?? null;
}

function objectIdFromHero() {
  return scanHero()?.dataset.objectId ?? null;
}

function qrIdFromHero() {
  return scanHero()?.dataset.qrId ?? null;
}

function seasonIdFromHero() {
  return scanHero()?.dataset.seasonId ?? null;
}

function isContributePage() {
  return document.querySelector("[data-game-contribute='1']") != null;
}

function setStatus(message, tone = "neutral") {
  const panel = document.getElementById("scan-game-contribute-status-panel");
  const status = document.getElementById("scan-game-contribute-status");
  if (!panel || !status) return;
  panel.hidden = !message;
  status.textContent = message;
  status.dataset.tone = tone;
}

function updateProgress(progress, target) {
  const el = document.getElementById("scan-game-contribute-progress");
  if (!el) return;
  el.textContent = `${progress} / ${target}`;
}

function hideContributeForm() {
  const section = document.getElementById("scan-game-contribute");
  if (!section) return;
  section.classList.add("scan-game-contribute--complete");
  const input = document.getElementById("scan-game-contribute-code");
  const submit = document.getElementById("scan-game-contribute-submit");
  if (input instanceof HTMLInputElement) input.disabled = true;
  if (submit instanceof HTMLButtonElement) submit.disabled = true;
}

function contributeModeFromPage() {
  return scanHero()?.dataset.gameContributeMode ?? "quorum";
}

function updateScarcityRemaining(remaining) {
  const el = document.getElementById("scan-game-contribute-progress");
  if (!el) return;
  el.textContent = String(remaining);
}

function readScarcityCeilingStorage() {
  try {
    return localStorage.getItem(SCARCITY_CEILING_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeScarcityCeilingClaim(seasonId, objectId) {
  if (!seasonId || !objectId) return;
  try {
    const record = buildScarcityCeilingRecord(
      seasonId,
      objectId,
      scarcityCeilingUtcDateKey()
    );
    localStorage.setItem(SCARCITY_CEILING_STORAGE_KEY, serializeScarcityCeilingRecord(record));
  } catch {
    /* private mode / quota — server pool still decremented */
  }
}

function applyScarcityDeviceCeilingIfNeeded() {
  if (contributeModeFromPage() !== "scarcity") return false;

  const seasonId = seasonIdFromHero();
  const objectId = objectIdFromHero();
  if (!seasonId || !objectId) return false;
  if (!deviceHasScarcityClaimToday(readScarcityCeilingStorage(), seasonId, objectId)) {
    return false;
  }

  hideContributeForm();
  setStatus(SCARCITY_CEILING_ALREADY_CLAIMED_MESSAGE, "success");
  return true;
}

function finishScarcityContribute(data) {
  const seasonId = seasonIdFromHero();
  const objectId = objectIdFromHero();
  writeScarcityCeilingClaim(seasonId, objectId);

  if (typeof data.scarcity_remaining === "number") {
    updateScarcityRemaining(data.scarcity_remaining);
  }

  hideContributeForm();

  if (data.witness_depleted) {
    setStatus("Final sunset pass claimed — witness seal closed for the night.", "success");
    return;
  }

  const remaining =
    typeof data.scarcity_remaining === "number" ? data.scarcity_remaining : null;
  const vouch =
    Array.isArray(data.vouch_targets) && data.vouch_targets.length
      ? " Cabinet vouch is live."
      : "";
  setStatus(
    remaining != null
      ? `Pass claimed — ${remaining} remain tonight for everyone.${vouch}`
      : `Pass claimed.${vouch}`,
    "success"
  );
}

async function submitContribute() {
  const profileId = profileIdFromHero();
  const objectId = objectIdFromHero();
  const qrId = qrIdFromHero();
  const input = document.getElementById("scan-game-contribute-code");
  const submit = document.getElementById("scan-game-contribute-submit");

  if (!(input instanceof HTMLInputElement) || !(submit instanceof HTMLButtonElement)) {
    return;
  }
  if (!profileId || !objectId || !qrId) {
    setStatus("This page is missing scan context. Refresh and try again.", "error");
    return;
  }

  const siteCode = input.value.trim();
  if (!siteCode) {
    setStatus("Enter the site code from the sticker or backing card.", "error");
    input.focus();
    return;
  }

  submit.disabled = true;
  setStatus("Sending contribution…", "waiting");

  const url = postGameContributeUrl(profileId, objectId);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr_id: qrId, site_code: siteCode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(
        resolverErrorMessage(data, {
          status: res.status,
          fallback: "Contribution did not go through. Check the site code and try again.",
        }),
        "error"
      );
      submit.disabled = false;
      return;
    }

    const progress = data.collective_progress;
    const target = data.collective_target;
    if (typeof progress === "number" && typeof target === "number") {
      updateProgress(progress, target);
    }

    if (data.contribute_mode === "fragment" || contributeModeFromPage() === "fragment") {
      hideContributeForm();
      const registered =
        typeof data.fragments_registered === "number" &&
        typeof data.fragments_required === "number"
          ? ` ${data.fragments_registered} / ${data.fragments_required} fragments on the lattice.`
          : "";
      const finale =
        data.finale_open && Array.isArray(data.unlocked_nodes) && data.unlocked_nodes.length
          ? " The finale switch is waking."
          : "";
      setStatus(`Fragment registered.${registered}${finale}`, "success");
      return;
    }

    if (data.contribute_mode === "scarcity" || contributeModeFromPage() === "scarcity") {
      finishScarcityContribute(data);
      return;
    }

    if (data.quorum_complete) {
      hideContributeForm();
      const unlocked =
        Array.isArray(data.unlocked_nodes) && data.unlocked_nodes.length
          ? " The next place is waking on the map."
          : "";
      setStatus(`Quorum complete — ${progress} / ${target}.${unlocked}`, "success");
    } else {
      setStatus(`Counted — ${progress} / ${target}. Share the clue outward.`, "success");
      input.value = "";
      submit.disabled = false;
    }
  } catch {
    setStatus("Network error. Check your connection and try again.", "error");
    submit.disabled = false;
  }
}

function init() {
  if (!isContributePage()) return;

  const submit = document.getElementById("scan-game-contribute-submit");
  const input = document.getElementById("scan-game-contribute-code");
  if (!(submit instanceof HTMLButtonElement) || !(input instanceof HTMLInputElement)) {
    return;
  }

  if (applyScarcityDeviceCeilingIfNeeded()) {
    void resolverApiOrigin();
    return;
  }

  submit.addEventListener("click", () => {
    void submitContribute();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void submitContribute();
    }
  });

  /* Warm resolver origin selection (local :8787 vs Pages). */
  void resolverApiOrigin();
}

init();
