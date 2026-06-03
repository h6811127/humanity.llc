import { describe, expect, it } from "vitest";

import {
  assertCreatedHostedPanelPageHtml,
  revRolloutPlaybookLines,
} from "../scripts/hosted-rev-rollout-core.mjs";

describe("hosted-rev-rollout-core", () => {
  it("playbook includes hosted:rev:pages step", () => {
    const text = revRolloutPlaybookLines().join("\n");
    expect(text).toContain("npm run hosted:rev:pages");
  });

  it("assertCreatedHostedPanelPageHtml requires R2 markers", () => {
    const html = `
      <script src="/js/created-hub.mjs?v=5" type="module"></script>
      <details id="created-hosted-plan" class="settings-disclosure-info created-hosted-plan">
        <summary>Usage &amp; limits</summary>
        <div id="created-hosted-plan-upgrades"></div>
      </details>
    `;
    expect(assertCreatedHostedPanelPageHtml(html).ok).toBe(true);
  });
});
