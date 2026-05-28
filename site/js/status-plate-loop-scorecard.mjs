/**
 * Local-only habit loop progress for status plate pilots.
 * No network I/O — complements M5 proof loop with recurrence signals.
 * @see docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md § Step 1
 * @see docs/STATUS_PLATE_PILOT.md § Habit loop scorecard
 */

export const STORAGE_KEY = "hc_status_plate_loop_v1";

/** Pilot habit target: stewards who update ≥ this many times are closing the loop. */
export const HABIT_UPDATE_TARGET = 2;

/**
 * @typedef {"printed" | "second_device_scan"} StatusPlateLoopMilestone
 */

/**
 * @typedef {{
 *   updateCount: number;
 *   lastUpdatedAt: string | null;
 *   milestones: Partial<Record<StatusPlateLoopMilestone, boolean>>;
 * }} StatusPlateLoopRecord
 */

/**
 * @returns {StatusPlateLoopRecord}
 */
export function defaultLoopRecord() {
  return { updateCount: 0, lastUpdatedAt: null, milestones: {} };
}

/**
 * @returns {Record<string, StatusPlateLoopRecord>}
 */
function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * @param {Record<string, StatusPlateLoopRecord>} all
 */
function writeAll(all) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * @param {string | null | undefined} profileId
 * @returns {StatusPlateLoopRecord | null}
 */
export function getLoopRecord(profileId) {
  if (!profileId) return null;
  const all = readAll();
  const row = all[profileId];
  if (!row || typeof row !== "object") return defaultLoopRecord();
  return {
    updateCount: Number.isFinite(row.updateCount) ? Math.max(0, row.updateCount) : 0,
    lastUpdatedAt: typeof row.lastUpdatedAt === "string" ? row.lastUpdatedAt : null,
    milestones:
      row.milestones && typeof row.milestones === "object" ? { ...row.milestones } : {},
  };
}

/**
 * @param {string | null | undefined} profileId
 * @param {StatusPlateLoopRecord} record
 */
export function saveLoopRecord(profileId, record) {
  if (!profileId) return;
  const all = readAll();
  all[profileId] = {
    updateCount: Math.max(0, record.updateCount),
    lastUpdatedAt: record.lastUpdatedAt,
    milestones: { ...record.milestones },
  };
  writeAll(all);
}

/**
 * @param {string | null | undefined} profileId
 * @param {string | number | Date} [at]
 * @returns {StatusPlateLoopRecord | null}
 */
export function recordStatusPlateUpdate(profileId, at = new Date()) {
  if (!profileId) return null;
  const prev = getLoopRecord(profileId) || defaultLoopRecord();
  const iso =
    at instanceof Date
      ? at.toISOString()
      : typeof at === "string"
        ? at
        : new Date(at).toISOString();
  const next = {
    ...prev,
    updateCount: prev.updateCount + 1,
    lastUpdatedAt: iso,
  };
  saveLoopRecord(profileId, next);
  return next;
}

/**
 * @param {string | null | undefined} profileId
 * @param {StatusPlateLoopMilestone} milestone
 * @param {boolean} done
 * @returns {StatusPlateLoopRecord | null}
 */
export function setLoopMilestone(profileId, milestone, done) {
  if (!profileId) return null;
  const prev = getLoopRecord(profileId) || defaultLoopRecord();
  const milestones = { ...prev.milestones };
  if (done) milestones[milestone] = true;
  else delete milestones[milestone];
  const next = { ...prev, milestones };
  saveLoopRecord(profileId, next);
  return next;
}

/**
 * @param {StatusPlateLoopRecord | null | undefined} record
 */
export function habitLoopClosed(record) {
  if (!record) return false;
  const { met } = loopUpdateProgress(record);
  const milestones = record.milestones || {};
  return (
    met &&
    milestones.printed === true &&
    milestones.second_device_scan === true
  );
}

/**
 * @param {StatusPlateLoopRecord | null | undefined} record
 */
export function loopUpdateProgress(record) {
  const count = record?.updateCount ?? 0;
  const target = HABIT_UPDATE_TARGET;
  return {
    count,
    target,
    met: count >= target,
    remaining: Math.max(0, target - count),
  };
}

/**
 * @param {StatusPlateLoopRecord | null | undefined} record
 */
export function formatLastUpdated(record) {
  if (!record?.lastUpdatedAt) return null;
  try {
    return new Date(record.lastUpdatedAt).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return record.lastUpdatedAt;
  }
}

/**
 * @param {StatusPlateLoopRecord | null | undefined} record
 * @returns {string}
 */
export function loopProgressHeadline(record) {
  if (habitLoopClosed(record)) {
    return "Pilot habit loop closed on this device.";
  }
  const { count, target, met } = loopUpdateProgress(record);
  if (met) {
    return `Habit loop on track — ${count} status update${count === 1 ? "" : "s"} published.`;
  }
  if (count === 0) {
    return `Publish ${target} status updates on Live to close the pilot habit loop.`;
  }
  return `${count} of ${target} habit updates — publish once more when hours change.`;
}

/**
 * @param {string | null | undefined} profileId
 * @param {string | null | undefined} handle
 * @param {StatusPlateLoopRecord | null | undefined} record
 */
export function buildPilotSummaryPayload(profileId, handle, record) {
  const rec = record || defaultLoopRecord();
  return {
    kind: "humanity_status_plate_pilot_summary_v1",
    profile_id: profileId ?? null,
    handle: handle ?? null,
    exported_at: new Date().toISOString(),
    update_count: rec.updateCount,
    update_target: HABIT_UPDATE_TARGET,
    last_updated_at: rec.lastUpdatedAt,
    milestones: { ...rec.milestones },
    habit_loop_closed: habitLoopClosed(rec),
  };
}

/**
 * @param {ReturnType<typeof buildPilotSummaryPayload>} payload
 */
export function formatPilotSummaryForExport(payload) {
  return JSON.stringify(payload, null, 2);
}

/**
 * @param {string | null | undefined} profileId
 * @param {string | null | undefined} handle
 * @param {StatusPlateLoopRecord | null | undefined} [record]
 * @returns {Promise<string>}
 */
export async function copyPilotSummaryToClipboard(profileId, handle, record = getLoopRecord(profileId)) {
  const text = formatPilotSummaryForExport(
    buildPilotSummaryPayload(profileId, handle, record)
  );
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return text;
  }
  throw new Error("Clipboard unavailable");
}

/**
 * @param {string | null | undefined} profileId
 * @param {StatusPlateLoopRecord | null | undefined} [record]
 * @param {string | null | undefined} [handle]
 */
export function syncStatusPlateLoopScorecardDom(
  profileId,
  record = getLoopRecord(profileId),
  handle = null
) {
  const root = document.getElementById("status-plate-loop-scorecard");
  if (!root || !profileId) return;

  const progressEl = document.getElementById("status-plate-loop-progress");
  const lastEl = document.getElementById("status-plate-loop-last");
  const printedEl = document.getElementById("status-plate-loop-printed");
  const secondEl = document.getElementById("status-plate-loop-second-scan");
  const exportBtn = document.getElementById("status-plate-loop-export");

  const rec = record || defaultLoopRecord();
  const { count, target, met } = loopUpdateProgress(rec);
  const closed = habitLoopClosed(rec);

  if (progressEl) {
    progressEl.textContent = loopProgressHeadline(rec);
    progressEl.dataset.met = met ? "true" : "false";
    progressEl.dataset.closed = closed ? "true" : "false";
  }
  if (lastEl) {
    const formatted = formatLastUpdated(rec);
    lastEl.textContent = formatted
      ? `Last published: ${formatted}`
      : "No status updates published on this device yet.";
    lastEl.hidden = false;
  }

  const milestones = rec.milestones || {};
  if (printedEl) printedEl.checked = milestones.printed === true;
  if (secondEl) secondEl.checked = milestones.second_device_scan === true;

  root.dataset.updateCount = String(count);
  root.dataset.updateTarget = String(target);
  root.dataset.closed = closed ? "true" : "false";
  root.hidden = false;

  if (exportBtn) {
    exportBtn.hidden = false;
    exportBtn.dataset.handle = handle ?? "";
  }
}

/**
 * @param {string | null | undefined} profileId
 * @param {string | null | undefined} [handle]
 */
export function bindStatusPlateLoopScorecard(profileId, handle = null) {
  if (!profileId) return;

  const printedEl = document.getElementById("status-plate-loop-printed");
  const secondEl = document.getElementById("status-plate-loop-second-scan");
  const exportBtn = document.getElementById("status-plate-loop-export");

  printedEl?.addEventListener("change", () => {
    const next = setLoopMilestone(profileId, "printed", printedEl.checked);
    syncStatusPlateLoopScorecardDom(profileId, next, handle);
  });
  secondEl?.addEventListener("change", () => {
    const next = setLoopMilestone(profileId, "second_device_scan", secondEl.checked);
    syncStatusPlateLoopScorecardDom(profileId, next, handle);
  });

  exportBtn?.addEventListener("click", () => {
    const prev = exportBtn.textContent;
    void copyPilotSummaryToClipboard(profileId, handle)
      .then(() => {
        exportBtn.textContent = "Copied";
        window.setTimeout(() => {
          exportBtn.textContent = prev;
        }, 2000);
      })
      .catch(() => {
        exportBtn.textContent = "Copy failed";
        window.setTimeout(() => {
          exportBtn.textContent = prev;
        }, 2000);
      });
  });

  syncStatusPlateLoopScorecardDom(profileId, getLoopRecord(profileId), handle);
}
