import { describe, expect, it } from "vitest";

import {
  PARTICIPANT_CHARTER_COPY,
  buildParticipantCharterHtml,
} from "../../site/js/participant-charter-core.mjs";

describe("participant charter (L3 slice #4 — what this device remembers)", () => {
  it("says nothing leaves the device when both stores are empty", () => {
    const html = buildParticipantCharterHtml({ followsCount: 0, pinsCount: 0 });
    expect(html).toContain("What this device keeps");
    expect(html).toContain("Nothing yet — nothing leaves this device.");
    expect(html).not.toContain(PARTICIPANT_CHARTER_COPY.clear_hint);
  });

  it("lists honest counts and the clear-site-data hint", () => {
    const html = buildParticipantCharterHtml({ followsCount: 2, pinsCount: 1 });
    expect(html).toContain("2 followed networks");
    expect(html).toContain("1 pinned board");
    expect(html).toContain("Clear site data to remove them.");
    // Never "your progress" or "scanned you" — the charter is a trust disclosure.
    expect(html.toLowerCase()).not.toContain("your progress");
    expect(html.toLowerCase()).not.toContain("scanned you");
  });

  it("singularizes each count when exactly one exists", () => {
    const html = buildParticipantCharterHtml({ followsCount: 1, pinsCount: 1 });
    expect(html).toContain("1 followed network");
    expect(html).toContain("1 pinned board");
    expect(html).not.toContain("1 followed networks");
    expect(html).not.toContain("1 pinned boards");
  });

  it("names the exact localStorage keys so the promise is verifiable", () => {
    const html = buildParticipantCharterHtml({ followsCount: 1, pinsCount: 1 });
    expect(html).toContain("hc_participant_follows");
    expect(html).toContain("hc_participant_pins");
    expect(html).toContain("Nothing is uploaded or shared");
  });

  it("covers both stores when only one is non-empty", () => {
    const onlyFollows = buildParticipantCharterHtml({ followsCount: 3, pinsCount: 0 });
    expect(onlyFollows).toContain("3 followed networks");
    expect(onlyFollows).not.toContain("0 pinned boards");
    expect(onlyFollows).toContain("Clear site data to remove them.");

    const onlyPins = buildParticipantCharterHtml({ followsCount: 0, pinsCount: 4 });
    expect(onlyPins).toContain("4 pinned boards");
    expect(onlyPins).not.toContain("0 followed networks");
  });

  it("clamps unusable counts before rendering", () => {
    const html = buildParticipantCharterHtml({
      followsCount: -3,
      pinsCount: Number.NaN,
    });
    expect(html.toLowerCase()).not.toContain("-3 followed networks");
    expect(html.toLowerCase()).not.toContain("nan followed networks");
    expect(html).toContain("Nothing yet — nothing leaves this device.");
  });

  it("floors fractional counts so numbers are honest integers", () => {
    const html = buildParticipantCharterHtml({ followsCount: 2.9, pinsCount: 1.7 });
    expect(html).toContain("2 followed networks");
    expect(html).toContain("1 pinned board");
  });

  it("escapes overridden copy (never injects markup)", () => {
    const html = buildParticipantCharterHtml(
      { followsCount: 1, pinsCount: 0 },
      { follows: "<b>f</b>", disclosure: '"><script>alert(1)</script>' }
    );
    expect(html).not.toContain("<b>f</b>");
    expect(html).not.toContain("<script>");
  });

  it("emits a disclosure <details> with an accessible summary", () => {
    const html = buildParticipantCharterHtml({ followsCount: 0, pinsCount: 0 });
    expect(html).toContain('<details class="participant-charter idea-section">');
    expect(html).toContain('<summary class="participant-charter-summary">');
    expect(html).toContain('<ul class="participant-charter-list">');
  });
});