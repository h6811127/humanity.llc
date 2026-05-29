import { describe, expect, it } from "vitest";
import {
  STATUS_LOAD_ERROR_ARIA_LABEL,
  STATUS_LOAD_ERROR_DISMISS_LABEL,
  STATUS_LOAD_ERROR_EXPLAINER,
  STATUS_LOAD_ERROR_REFRESH_LABEL,
  renderStatusLoadErrorExplainerHtml,
} from "../../site/js/device-status-load-error.mjs";

describe("device-status-load-error", () => {
  it("uses Layer 2 outcome copy without protocol jargon", () => {
    expect(STATUS_LOAD_ERROR_EXPLAINER.now).toMatch(/didn't finish loading/i);
    expect(STATUS_LOAD_ERROR_EXPLAINER.why).toMatch(/download/i);
    expect(STATUS_LOAD_ERROR_EXPLAINER.next).toMatch(/refresh/i);
    expect(STATUS_LOAD_ERROR_EXPLAINER.now).not.toMatch(/device-status\.mjs/i);
  });

  it("renders Now / Why / Next explainer lines and refresh action", () => {
    const html = renderStatusLoadErrorExplainerHtml();
    expect(html).toContain("device-dot-explainer-kicker");
    expect(html).toContain("<strong>Now:</strong>");
    expect(html).toContain("<strong>Why:</strong>");
    expect(html).toContain("<strong>Next:</strong>");
    expect(html).toContain(STATUS_LOAD_ERROR_EXPLAINER.now);
    expect(html).toContain(`data-status-load-error-action="refresh"`);
    expect(html).toContain(STATUS_LOAD_ERROR_REFRESH_LABEL);
  });

  it("renders dismiss action for coach card", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const src = fs.readFileSync(
      path.join(process.cwd(), "site/js/device-status-load-error.mjs"),
      "utf8"
    );
    expect(src).toContain(STATUS_LOAD_ERROR_DISMISS_LABEL);
    expect(src).toContain("scheduleLoadErrorCoachCard");
    expect(src).toContain("device-status-load-error-coachmark");
  });

  it("escapes HTML in explainer copy", () => {
    const html = renderStatusLoadErrorExplainerHtml({
      kicker: "<unsafe>",
      now: "a & b",
      why: "c",
      next: "d",
    });
    expect(html).toContain("&lt;unsafe&gt;");
    expect(html).toContain("a &amp; b");
    expect(html).not.toContain("<unsafe>");
  });

  it("exposes an accessible dot label for load failure", () => {
    expect(STATUS_LOAD_ERROR_ARIA_LABEL).toMatch(/failed to load/i);
    expect(STATUS_LOAD_ERROR_ARIA_LABEL).toMatch(/details below/i);
  });
});
