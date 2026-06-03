/**
 * Rules page draft + publish UI on /created/ (Phase E step 4).
 */

import {
  assessOrganizerRulesPublish,
  buildSelfServePublishedRulesHtml,
  datetimeLocalValueToIso,
  deployChecklistText,
  formatDistrictsDraftText,
  isoToDatetimeLocalValue,
  jsonBasenameFromPublicUrl,
  parseDistrictsDraftText,
  readSeasonPublishDraft,
  seasonSupportsBrowserRulesPublish,
  suggestedRulesDownloadFilename,
  writeSeasonPublishDraft,
} from "./city-game-rules-publish-core.mjs";

/**
 * @param {{
 *   profileId: string;
 *   getSession: () => Record<string, unknown> | null;
 *   showError: (msg: string) => void;
 *   seasonSelect: HTMLSelectElement | null;
 *   getSeasonIndexRow: (seasonId: string) => Record<string, unknown> | null | undefined;
 * }} ctx
 */
export function initCreatedGameNodeRulesPublish(ctx) {
  const details = document.getElementById("child-object-game-node-rules");
  const startsInput = document.getElementById("child-object-game-node-rules-starts");
  const endsInput = document.getElementById("child-object-game-node-rules-ends");
  const statusSelect = document.getElementById("child-object-game-node-rules-season-status");
  const districtsInput = document.getElementById("child-object-game-node-rules-districts");
  const readinessEl = document.getElementById("child-object-game-node-rules-readiness");
  const statusEl = document.getElementById("child-object-game-node-rules-status");
  const openRulesLink = document.getElementById("child-object-game-node-rules-open");
  const previewDraftBtn = document.getElementById("child-object-game-node-rules-preview-draft");
  const previewLaunchBtn = document.getElementById("child-object-game-node-rules-preview-launch");
  const downloadBtn = document.getElementById("child-object-game-node-rules-download");
  const copyStepsBtn = document.getElementById("child-object-game-node-rules-copy-steps");

  if (!details) return null;

  /** @type {Record<string, unknown> | null} */
  let seasonBody = null;
  /** @type {string} */
  let jsonBasename = "";
  /** @type {ReturnType<typeof assessOrganizerRulesPublish> | null} */
  let lastAssessment = null;

  function readDraftFromForm() {
    const window = {
      starts_at: datetimeLocalValueToIso(
        startsInput instanceof HTMLInputElement ? startsInput.value : ""
      ),
      ends_at: datetimeLocalValueToIso(
        endsInput instanceof HTMLInputElement ? endsInput.value : ""
      ),
    };
    const status =
      statusSelect instanceof HTMLSelectElement ? statusSelect.value.trim() : "planned";
    const districts =
      districtsInput instanceof HTMLTextAreaElement
        ? parseDistrictsDraftText(districtsInput.value)
        : [];
    return { window, status, districts };
  }

  function persistDraft(seasonId) {
    if (!seasonId) return;
    writeSeasonPublishDraft(localStorage, ctx.profileId, seasonId, readDraftFromForm());
  }

  function renderReadiness(assessment) {
    if (!readinessEl) return;
    readinessEl.replaceChildren();
    if (!assessment) {
      const li = document.createElement("li");
      li.textContent = "Choose a season to review launch readiness.";
      readinessEl.append(li);
      return;
    }
    if (assessment.ready) {
      const li = document.createElement("li");
      li.className = "is-ready";
      li.textContent = "Ready to prepare launch-ready rules HTML.";
      readinessEl.append(li);
      return;
    }
    for (const issue of assessment.issues) {
      const li = document.createElement("li");
      li.textContent = issue;
      readinessEl.append(li);
    }
  }

  function setActionButtonsEnabled(assessment) {
    const supported =
      seasonBody && seasonSupportsBrowserRulesPublish(seasonBody) && assessment?.draftHtml;
    const canLaunch = supported && assessment?.publishedHtml;
    if (previewDraftBtn instanceof HTMLButtonElement) {
      previewDraftBtn.disabled = !supported;
    }
    if (previewLaunchBtn instanceof HTMLButtonElement) {
      previewLaunchBtn.disabled = !canLaunch;
    }
    if (downloadBtn instanceof HTMLButtonElement) {
      downloadBtn.disabled = !canLaunch;
    }
    if (copyStepsBtn instanceof HTMLButtonElement) {
      copyStepsBtn.disabled = !assessment?.launchCtx;
    }
  }

  function openHtmlPreview(html) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      ctx.showError("Pop-up blocked — allow previews for this site.");
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function refreshForSeason(seasonId) {
    seasonBody = null;
    jsonBasename = "";
    lastAssessment = null;

    if (!seasonId) {
      renderReadiness(null);
      setActionButtonsEnabled(null);
      if (openRulesLink instanceof HTMLAnchorElement) {
        openRulesLink.hidden = true;
      }
      return;
    }

    const indexRow = ctx.getSeasonIndexRow(seasonId);
    const jsonUrl = typeof indexRow?.json_url === "string" ? indexRow.json_url : "";
    jsonBasename = jsonBasenameFromPublicUrl(jsonUrl);

    const storedDraft = readSeasonPublishDraft(localStorage, ctx.profileId, seasonId);

    if (jsonUrl) {
      try {
        const res = await fetch(jsonUrl, { credentials: "omit" });
        if (res.ok) seasonBody = await res.json();
      } catch {
        seasonBody = null;
      }
    }

    if (startsInput instanceof HTMLInputElement) {
      const seasonStarts =
        seasonBody?.window && typeof seasonBody.window === "object"
          ? /** @type {{ starts_at?: string }} */ (seasonBody.window).starts_at
          : null;
      startsInput.value =
        isoToDatetimeLocalValue(storedDraft?.window?.starts_at) ||
        isoToDatetimeLocalValue(seasonStarts) ||
        "";
    }
    if (endsInput instanceof HTMLInputElement) {
      const seasonEnds =
        seasonBody?.window && typeof seasonBody.window === "object"
          ? /** @type {{ ends_at?: string }} */ (seasonBody.window).ends_at
          : null;
      endsInput.value =
        isoToDatetimeLocalValue(storedDraft?.window?.ends_at) ||
        isoToDatetimeLocalValue(seasonEnds) ||
        "";
    }
    if (statusSelect instanceof HTMLSelectElement) {
      statusSelect.value =
        (typeof storedDraft?.status === "string" && storedDraft.status) ||
        (typeof seasonBody?.status === "string" && seasonBody.status) ||
        "planned";
    }
    if (districtsInput instanceof HTMLTextAreaElement) {
      const storedDistricts = Array.isArray(storedDraft?.districts) ? storedDraft.districts : null;
      districtsInput.value =
        storedDistricts !== null
          ? formatDistrictsDraftText(storedDistricts)
          : formatDistrictsDraftText(seasonBody?.districts);
    }

    if (!seasonBody || !jsonBasename) {
      if (readinessEl) {
        readinessEl.replaceChildren();
        const li = document.createElement("li");
        li.textContent = "Could not load season JSON for this season.";
        readinessEl.append(li);
      }
      setActionButtonsEnabled(null);
      return;
    }

    const draft = readDraftFromForm();
    lastAssessment = assessOrganizerRulesPublish(
      seasonBody,
      jsonBasename,
      ctx.profileId,
      draft
    );
    renderReadiness(lastAssessment);
    setActionButtonsEnabled(lastAssessment);

    const rulesPath = lastAssessment.launchCtx?.rulesPath;
    if (openRulesLink instanceof HTMLAnchorElement && rulesPath) {
      openRulesLink.hidden = false;
      openRulesLink.href = rulesPath;
      openRulesLink.textContent = `Open deployed rules page (${rulesPath})`;
    } else if (openRulesLink instanceof HTMLAnchorElement) {
      openRulesLink.hidden = true;
    }

    if (statusEl) {
      statusEl.hidden = false;
      if (!seasonSupportsBrowserRulesPublish(seasonBody)) {
        statusEl.textContent =
          "Self-serve browser publish requires auto_rules_page on the season JSON. Cedar Rapids pilot still uses city-game:launch-surfaces.";
      } else if (lastAssessment.draftHasNoindex) {
        statusEl.textContent =
          "Draft state uses noindex until window dates and active status are set, then prepare launch HTML.";
      } else {
        statusEl.textContent =
          "Season metadata on this device merges your card profile id for publish checks.";
      }
    }
  }

  function onSeasonOrDraftChange() {
    const seasonId =
      ctx.seasonSelect instanceof HTMLSelectElement ? ctx.seasonSelect.value.trim() : "";
    persistDraft(seasonId);
    void refreshForSeason(seasonId);
  }

  ctx.seasonSelect?.addEventListener("change", onSeasonOrDraftChange);
  startsInput?.addEventListener("change", onSeasonOrDraftChange);
  endsInput?.addEventListener("change", onSeasonOrDraftChange);
  statusSelect?.addEventListener("change", onSeasonOrDraftChange);
  districtsInput?.addEventListener("change", onSeasonOrDraftChange);
  districtsInput?.addEventListener("input", onSeasonOrDraftChange);

  previewDraftBtn?.addEventListener("click", () => {
    if (!lastAssessment?.draftHtml) return;
    openHtmlPreview(lastAssessment.draftHtml);
  });

  previewLaunchBtn?.addEventListener("click", () => {
    if (!lastAssessment?.publishedHtml) return;
    openHtmlPreview(lastAssessment.publishedHtml);
  });

  downloadBtn?.addEventListener("click", () => {
    if (!seasonBody || !jsonBasename || !lastAssessment?.publishedHtml) return;
    try {
      const html = buildSelfServePublishedRulesHtml(
        seasonBody,
        jsonBasename,
        ctx.profileId,
        readDraftFromForm()
      );
      const filename = suggestedRulesDownloadFilename(lastAssessment.launchCtx);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = `Downloaded ${filename}. Follow deploy steps below.`;
      }
    } catch (err) {
      ctx.showError(err instanceof Error ? err.message : String(err));
    }
  });

  copyStepsBtn?.addEventListener("click", async () => {
    if (!lastAssessment?.launchCtx) return;
    const text = deployChecklistText(lastAssessment.launchCtx);
    try {
      await navigator.clipboard.writeText(text);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Deploy checklist copied.";
      }
    } catch {
      ctx.showError("Could not copy deploy checklist.");
    }
  });

  return {
    refresh: () => {
      const seasonId =
        ctx.seasonSelect instanceof HTMLSelectElement ? ctx.seasonSelect.value.trim() : "";
      void refreshForSeason(seasonId);
    },
  };
}
