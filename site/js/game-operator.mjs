import { publicKeyFromPrivateKeyBase58, resolverApiOrigin } from "./hc-sign.mjs";
import { childObjectCreatePath, childObjectApiUrl } from "./child-object-api-core.mjs";
import {
  GAME_OPERATOR_PRESETS,
  GAME_NODE_OBJECT_TYPE,
  mergeGameNodeDraft,
  parseUnlockedByInput,
} from "./game-operator-core.mjs";
import { postGameNodeUpdate, signGameNodeUpdate } from "./city-game-update.mjs";

const params = new URLSearchParams(location.search);
const profileInput = document.getElementById("go-profile-id");
const objectInput = document.getElementById("go-object-id");
const objectSelect = document.getElementById("go-object-select");
const keyInput = document.getElementById("go-private-key");
const publicStateInput = document.getElementById("go-public-state");
const compromisedInput = document.getElementById("go-compromised");
const collectiveProgressInput = document.getElementById("go-collective-progress");
const collectiveTargetInput = document.getElementById("go-collective-target");
const scarcityInput = document.getElementById("go-scarcity");
const unlockedByInput = document.getElementById("go-unlocked-by");
const heldFactionInput = document.getElementById("go-held-faction");
const heldUntilInput = document.getElementById("go-held-until");
const confirmInput = document.getElementById("go-confirm");
const loadBtn = document.getElementById("go-load-objects");
const submitBtn = document.getElementById("go-submit");
const statusEl = document.getElementById("go-status");
const presetsEl = document.getElementById("go-presets");

/** @type {Map<string, Record<string, unknown>>} */
const loadedNodes = new Map();

let activeDraft = null;

const profileFromUrl = params.get("profile_id")?.trim();
const objectFromUrl = params.get("object_id")?.trim();
if (profileFromUrl && profileInput) profileInput.value = profileFromUrl;
if (objectFromUrl && objectInput) objectInput.value = objectFromUrl;

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.hidden = !msg;
  statusEl.textContent = msg;
  statusEl.className = isError ? "form-status error" : "form-status";
}

function updateSubmitState() {
  if (!submitBtn) return;
  submitBtn.disabled =
    !keyInput?.value?.trim() ||
    !profileInput?.value?.trim() ||
    !objectInput?.value?.trim() ||
    !activeDraft ||
    !confirmInput?.checked;
}

function readGameMetaFromForm() {
  const progressRaw = collectiveProgressInput?.value?.trim();
  const targetRaw = collectiveTargetInput?.value?.trim();
  const scarcityRaw = scarcityInput?.value?.trim();
  return {
    compromised: !!compromisedInput?.checked,
    collective_progress: progressRaw ? Number(progressRaw) : null,
    collective_target: targetRaw ? Number(targetRaw) : null,
    scarcity_remaining: scarcityRaw ? Number(scarcityRaw) : null,
    unlocked_by: parseUnlockedByInput(unlockedByInput?.value ?? ""),
    vouch_requires: activeDraft?.game_meta?.vouch_requires ?? [],
    visible_until: activeDraft?.game_meta?.visible_until ?? null,
    fragment_id: activeDraft?.game_meta?.fragment_id ?? null,
    held_by_faction: heldFactionInput?.value?.trim()
      ? heldFactionInput.value.trim()
      : activeDraft?.game_meta?.held_by_faction ?? null,
    held_until: heldUntilInput?.value?.trim()
      ? heldUntilInput.value.trim()
      : activeDraft?.game_meta?.held_until ?? null,
  };
}

function applyDraftToForm(draft) {
  activeDraft = draft;
  if (publicStateInput) publicStateInput.value = String(draft.public_state ?? "");
  const meta =
    draft.game_meta && typeof draft.game_meta === "object" ? draft.game_meta : {};
  if (compromisedInput) compromisedInput.checked = !!meta.compromised;
  if (collectiveProgressInput) {
    collectiveProgressInput.value =
      meta.collective_progress != null ? String(meta.collective_progress) : "";
  }
  if (collectiveTargetInput) {
    collectiveTargetInput.value =
      meta.collective_target != null ? String(meta.collective_target) : "";
  }
  if (scarcityInput) {
    scarcityInput.value =
      meta.scarcity_remaining != null ? String(meta.scarcity_remaining) : "";
  }
  if (unlockedByInput) {
    unlockedByInput.value = Array.isArray(meta.unlocked_by)
      ? meta.unlocked_by.join(", ")
      : "";
  }
  if (heldFactionInput) {
    heldFactionInput.value =
      typeof meta.held_by_faction === "string" ? meta.held_by_faction : "";
  }
  if (heldUntilInput) {
    heldUntilInput.value =
      typeof meta.held_until === "string" ? meta.held_until : "";
  }
  updateSubmitState();
}

function populateSelect() {
  if (!objectSelect) return;
  objectSelect.innerHTML = "";
  if (!loadedNodes.size) {
    objectSelect.disabled = true;
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No game nodes loaded";
    objectSelect.append(opt);
    return;
  }
  objectSelect.disabled = false;
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a node…";
  objectSelect.append(placeholder);
  for (const [objectId, row] of loadedNodes.entries()) {
    const opt = document.createElement("option");
    opt.value = objectId;
    opt.textContent = `${row.public_label ?? objectId} (${row.node_role ?? "game_node"})`;
    objectSelect.append(opt);
  }
}

function renderPresets() {
  if (!presetsEl) return;
  presetsEl.innerHTML = "";
  for (const preset of GAME_OPERATOR_PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-secondary btn-secondary-compact";
    btn.textContent = preset.label;
    btn.addEventListener("click", () => {
      if (!activeDraft) return;
      applyDraftToForm(
        mergeGameNodeDraft(activeDraft, {
          public_state: preset.public_state,
          game_meta: preset.game_meta,
        })
      );
    });
    presetsEl.append(btn);
  }
}

async function loadGameNodes() {
  const profileId = profileInput?.value?.trim();
  if (!profileId) {
    setStatus("Profile ID is required.", true);
    return;
  }
  setStatus("Loading nodes…");
  try {
    const url = childObjectApiUrl(
      resolverApiOrigin(),
      childObjectCreatePath(profileId)
    );
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || data.error || "Could not load objects.");
    }
    loadedNodes.clear();
    for (const row of data.objects ?? []) {
      if (row.object_type !== GAME_NODE_OBJECT_TYPE || row.status !== "active") continue;
      loadedNodes.set(row.object_id, row);
    }
    populateSelect();
    setStatus(
      loadedNodes.size
        ? `Loaded ${loadedNodes.size} active game node(s).`
        : "No active game_node objects on this card."
    );
  } catch (err) {
    setStatus(err.message || String(err), true);
  }
}

objectSelect?.addEventListener("change", () => {
  const objectId = objectSelect.value?.trim();
  if (!objectId || !loadedNodes.has(objectId)) return;
  const row = loadedNodes.get(objectId);
  if (objectInput) objectInput.value = objectId;
  applyDraftToForm({
    object_id: row.object_id,
    parent_profile_id: profileInput?.value?.trim(),
    public_label: row.public_label,
    public_state: row.public_state,
    created_at: row.created_at,
    season_id: row.season_id,
    node_role: row.node_role,
    district: row.district,
    object_streams: row.object_streams ?? [],
    game_meta: row.game_meta ?? {},
  });
});

[
  keyInput,
  profileInput,
  objectInput,
  confirmInput,
  publicStateInput,
  compromisedInput,
  collectiveProgressInput,
  collectiveTargetInput,
  scarcityInput,
  unlockedByInput,
  heldFactionInput,
  heldUntilInput,
].forEach((el) => el?.addEventListener("input", updateSubmitState));
confirmInput?.addEventListener("change", updateSubmitState);
loadBtn?.addEventListener("click", () => void loadGameNodes());

submitBtn?.addEventListener("click", async () => {
  if (!activeDraft || !confirmInput?.checked) return;
  const profileId = profileInput?.value?.trim();
  const objectId = objectInput?.value?.trim();
  const privateKeyBase58 = keyInput?.value?.trim();
  if (!profileId || !objectId || !privateKeyBase58) {
    setStatus("Profile, object, and operator key are required.", true);
    return;
  }

  const draft = mergeGameNodeDraft(activeDraft, {
    parent_profile_id: profileId,
    object_id: objectId,
    public_state: publicStateInput?.value?.trim() ?? activeDraft.public_state,
    game_meta: readGameMetaFromForm(),
  });

  setStatus("Signing…");
  submitBtn.disabled = true;
  try {
    const publicKeyBase58 = await publicKeyFromPrivateKeyBase58(privateKeyBase58);
    const signed = await signGameNodeUpdate({
      draft,
      privateKeyBase58,
      publicKeyBase58,
    });
    setStatus("Publishing…");
    const result = await postGameNodeUpdate(profileId, objectId, signed);
    applyDraftToForm({
      ...draft,
      updated_at: result.updated_at,
    });
    setStatus("Published. Scan the node QR to verify public state.");
    if (confirmInput) confirmInput.checked = false;
  } catch (err) {
    setStatus(err.message || String(err), true);
  } finally {
    updateSubmitState();
  }
});

renderPresets();
updateSubmitState();
