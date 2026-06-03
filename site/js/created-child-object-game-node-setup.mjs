/**
 * Phase E step 5 — setup checklist, custody, comprehension, runbook UI on /created/ Live.
 */

import { readChildObjectRows } from "./child-object-store-core.mjs";
import {
  assessOrganizerRulesPublish,
  jsonBasenameFromPublicUrl,
  readSeasonPublishDraft,
} from "./city-game-rules-publish-core.mjs";
import {
  buildOrganizerComprehensionBrief,
  buildSelfServeSetupChecklist,
  GAME_OPERATOR_CUSTODY_ITEMS,
  GT_COMPREHENSION_SCORECARD,
  readGameOperatorCustodyAck,
  selfServeSeasonLaunchLinks,
  WEEKEND_RUNBOOK_PLAIN,
  writeGameOperatorCustodyAck,
} from "./city-game-season-setup-guide-core.mjs";
import { shouldOfferAddGameNode } from "./created-child-object-game-node-core.mjs";

/**
 * @param {HTMLElement} container
 * @param {Array<{ id: string; label: string; done?: boolean; required?: boolean; humanGate?: boolean }>} items
 */
function renderChecklist(container, items) {
  container.replaceChildren();
  const ul = document.createElement("ul");
  ul.className = "created-game-node-setup-checklist";
  for (const item of items) {
    const li = document.createElement("li");
    li.className = item.done ? "is-done" : item.required === false ? "is-optional" : "is-pending";
    if (item.humanGate) li.classList.add("is-human-gate");
    const mark = document.createElement("span");
    mark.className = "created-game-node-setup-check";
    mark.textContent = item.done ? "✓" : item.humanGate ? "○" : "·";
    mark.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = item.label;
    li.append(mark, label);
    ul.append(li);
  }
  container.append(ul);
}

/**
 * @param {{
 *   profileId: string;
 *   getSession: () => Record<string, unknown> | null;
 *   showError: (msg: string) => void;
 *   seasonSelect: HTMLSelectElement | null;
 *   getSeasonIndexRow: (seasonId: string) => Record<string, unknown> | null | undefined;
 * }} ctx
 */
export function initCreatedGameNodeSetupGuide(ctx) {
  const details = document.getElementById("child-object-game-node-setup");
  const checklistEl = document.getElementById("child-object-game-node-setup-checklist");
  const custodyEl = document.getElementById("child-object-game-node-setup-custody");
  const runbookEl = document.getElementById("child-object-game-node-setup-runbook");
  const scorecardEl = document.getElementById("child-object-game-node-setup-scorecard");
  const linksEl = document.getElementById("child-object-game-node-setup-links");
  const statusEl = document.getElementById("child-object-game-node-setup-status");
  const copyBriefBtn = document.getElementById("child-object-game-node-setup-copy-brief");

  if (!details) return null;

  /** @type {Record<string, unknown> | null} */
  let seasonBody = null;
  let jsonBasename = "";

  function renderCustodyCheckboxes() {
    if (!custodyEl) return;
    const ack = readGameOperatorCustodyAck(localStorage, ctx.profileId);
    custodyEl.replaceChildren();
    const fieldset = document.createElement("fieldset");
    fieldset.className = "created-game-node-setup-custody-fieldset";
    const legend = document.createElement("legend");
    legend.className = "form-label";
    legend.textContent = "Game-operator key custody";
    fieldset.append(legend);

    for (const item of GAME_OPERATOR_CUSTODY_ITEMS) {
      const label = document.createElement("label");
      label.className = "created-game-node-setup-custody-row";
      const check = document.createElement("input");
      check.type = "checkbox";
      check.name = "game-operator-custody";
      check.value = item.id;
      check.checked = ack[item.id] === true;
      check.addEventListener("change", () => {
        const next = readGameOperatorCustodyAck(localStorage, ctx.profileId);
        next[item.id] = check.checked;
        writeGameOperatorCustodyAck(localStorage, ctx.profileId, next);
        void refresh();
      });
      const text = document.createElement("span");
      text.textContent = item.label;
      label.append(check, text);
      fieldset.append(label);
    }
    custodyEl.append(fieldset);
  }

  function renderRunbookCards() {
    if (!runbookEl) return;
    runbookEl.replaceChildren(
      ...WEEKEND_RUNBOOK_PLAIN.map((card) => {
        const article = document.createElement("article");
        article.className = "created-game-node-setup-runbook-card";
        const h = document.createElement("h4");
        h.textContent = card.title;
        const p = document.createElement("p");
        p.textContent = card.body;
        article.append(h, p);
        return article;
      })
    );
  }

  function renderScorecard() {
    if (!scorecardEl) return;
    const ol = document.createElement("ol");
    ol.className = "created-game-node-setup-scorecard";
    for (const row of GT_COMPREHENSION_SCORECARD) {
      const li = document.createElement("li");
      li.textContent = `${row.id}: ${row.prompt}`;
      ol.append(li);
    }
    scorecardEl.replaceChildren(ol);
  }

  async function refresh() {
    if (!shouldOfferAddGameNode(ctx.getSession())) {
      details.hidden = true;
      return;
    }
    details.hidden = false;

    renderCustodyCheckboxes();
    renderRunbookCards();
    renderScorecard();

    const seasonId =
      ctx.seasonSelect instanceof HTMLSelectElement ? ctx.seasonSelect.value.trim() : "";
    const indexRow = seasonId ? ctx.getSeasonIndexRow(seasonId) : null;
    const jsonUrl = typeof indexRow?.json_url === "string" ? indexRow.json_url : "";
    jsonBasename = jsonBasenameFromPublicUrl(jsonUrl);
    seasonBody = null;

    if (jsonUrl) {
      try {
        const res = await fetch(jsonUrl, { credentials: "omit" });
        if (res.ok) seasonBody = await res.json();
      } catch {
        seasonBody = null;
      }
    }

    const draft = seasonId
      ? readSeasonPublishDraft(localStorage, ctx.profileId, seasonId)
      : null;
    let rulesPublishReady = false;
    if (seasonBody && jsonBasename) {
      const assessment = assessOrganizerRulesPublish(
        seasonBody,
        jsonBasename,
        ctx.profileId,
        draft
      );
      rulesPublishReady = assessment.ready;
    }

    const rows = readChildObjectRows(localStorage, ctx.profileId);
    const session = ctx.getSession();
    const checklist = buildSelfServeSetupChecklist({
      session,
      childObjectRows: rows,
      custodyAck: readGameOperatorCustodyAck(localStorage, ctx.profileId),
      rulesPublishReady,
      season: seasonBody,
    });

    if (checklistEl) {
      renderChecklist(checklistEl, checklist.items);
    }

    if (linksEl && seasonBody && jsonBasename) {
      const links = selfServeSeasonLaunchLinks(seasonBody, jsonBasename);
      linksEl.replaceChildren();
      const rules = document.createElement("a");
      rules.className = "btn-text";
      rules.href = links.rulesPath;
      rules.target = "_blank";
      rules.rel = "noopener noreferrer";
      rules.textContent = "Rules page";
      const comprehension = document.createElement("a");
      comprehension.className = "btn-text";
      comprehension.href = links.comprehensionPath;
      comprehension.target = "_blank";
      comprehension.rel = "noopener noreferrer";
      comprehension.textContent = "Comprehension kit path";
      const consoleLink = document.createElement("a");
      consoleLink.className = "btn-text";
      consoleLink.href = links.gameOperatorPath;
      consoleLink.textContent = "Weekend console";
      linksEl.append(rules, comprehension, consoleLink);
    } else if (linksEl) {
      linksEl.replaceChildren();
      const hint = document.createElement("p");
      hint.className = "form-hint";
      hint.textContent = "Choose a season above to show rules and comprehension links.";
      linksEl.append(hint);
    }

    if (statusEl) {
      statusEl.hidden = false;
      if (checklist.bulkImportBlocked) {
        statusEl.textContent =
          "Bulk import stays blocked until owner recovery or encrypted backup is saved on Manage.";
      } else if (!checklist.items.find((item) => item.id === "game_operator_custody")?.done) {
        statusEl.textContent =
          "Confirm game-operator custody before handing testers the rules page.";
      } else {
        statusEl.textContent =
          "Run ≥5 un coached comprehension passes (GT-1–GT-7) before marketing your season.";
      }
    }
  }

  copyBriefBtn?.addEventListener("click", async () => {
    if (!seasonBody) {
      ctx.showError("Choose a season and load season JSON first.");
      return;
    }
    const links = jsonBasename ? selfServeSeasonLaunchLinks(seasonBody, jsonBasename) : null;
    const text = buildOrganizerComprehensionBrief(seasonBody, links?.rulesPath);
    try {
      await navigator.clipboard.writeText(text);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Comprehension brief copied — send rules first, then spot-scan.";
      }
    } catch {
      ctx.showError("Could not copy comprehension brief.");
    }
  });

  ctx.seasonSelect?.addEventListener("change", () => {
    void refresh();
  });

  void refresh();

  return { refresh: () => void refresh() };
}

/**
 * Show game-season custody card on setup wizard protect/done panels.
 * @param {Record<string, unknown> | null | undefined} session
 */
export function syncCreatedSetupGameSeasonCustody(session) {
  const protectMount = document.getElementById("created-setup-game-season-protect");
  const doneMount = document.getElementById("created-setup-game-season-done");
  const issuer =
    typeof session?.issuer_public_key === "string" ? session.issuer_public_key.trim() : "";
  const show = issuer.length > 0;

  for (const mount of [protectMount, doneMount]) {
    if (!(mount instanceof HTMLElement)) continue;
    mount.hidden = !show;
    if (!show) {
      mount.replaceChildren();
      continue;
    }
    if (mount.dataset.rendered === "1") continue;
    mount.dataset.rendered = "1";
    mount.className =
      "hc-emphasis-card hc-emphasis-card--info created-setup-game-season";
    mount.innerHTML = `
      <div class="hc-emphasis-card__main">
        <span class="hc-emphasis-card__dot hc-emphasis-card__dot--info" aria-hidden="true"></span>
        <div class="hc-emphasis-card__copy">
          <p class="hc-emphasis-card__eyebrow">City game season root</p>
          <p class="hc-emphasis-card__title">Two keys, two jobs</p>
          <p class="hc-emphasis-card__detail">Owner + recovery keys control this card and every game node under it. The game-operator private key flips weekend world state at <a href="/game-operator/">/game-operator/</a> only — save it offline and never upload it. After setup, register nodes and publish rules from <strong>Live</strong>.</p>
        </div>
      </div>`;
  }
}
