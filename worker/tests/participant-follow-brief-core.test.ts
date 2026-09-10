import { describe, expect, it } from "vitest";

import {
  PARTICIPANT_BRIEF_EMPTY_LINE,
  PARTICIPANT_BRIEF_MAX_LINES,
  buildFollowBrief,
  buildFollowBriefHtml,
  buildFollowBriefsHtml,
  formatBriefCheckedLabel,
} from "../../site/js/participant-follow-brief-core.mjs";

describe("participant follow brief (L3 slice #2 — device WATCH, 3 lines)", () => {
  const row = {
    season_id: "cr_season_01_wake",
    title: "Wake the city",
    rules_path: "/play/cedar-rapids/",
  };

  it("extracts at most 3 lines from snapshot headlines, in order", () => {
    const snapshot = {
      generated_at: "2026-09-09T20:00:00.000Z",
      headlines: [
        "Riverwalk lantern hit quorum",
        "Cabinet evolved after a finder shared it",
        "Skywalk note stayed hidden",
        "Fourth headline should be dropped",
      ],
    };
    const brief = buildFollowBrief(row, snapshot, new Date("2026-09-09T20:05:00.000Z"));
    expect(brief.lines).toHaveLength(PARTICIPANT_BRIEF_MAX_LINES);
    expect(brief.lines[0]).toContain("Riverwalk lantern");
    expect(brief.lines[2]).toContain("Skywalk note");
    expect(brief.lines[3]).toBeUndefined();
  });

  it("falls back to an honest empty line when a snapshot has no headlines", () => {
    const brief = buildFollowBrief(row, { generated_at: null });
    expect(brief.lines).toEqual([PARTICIPANT_BRIEF_EMPTY_LINE]);
    expect(brief.checkedLabel).toBeNull();
  });

  it("formats the checked-on-this-device label without scan wording", () => {
    const now = new Date("2026-09-09T20:00:00.000Z");
    expect(formatBriefCheckedLabel("2026-09-09T19:59:30.000Z", now)).toContain(
      "Checked on this device · just now"
    );
    expect(formatBriefCheckedLabel("2026-09-09T19:30:00.000Z", now)).toContain(
      "Checked on this device · 30 min ago"
    );
    expect(formatBriefCheckedLabel("2026-09-09T12:00:00.000Z", now)).toContain(
      "Checked on this device · 8 hr ago"
    );
    // Never implies the operator watches the user.
    const label = formatBriefCheckedLabel("2026-09-09T12:00:00.000Z", now);
    expect(label.toLowerCase()).not.toContain("scanned");
    expect(label.toLowerCase()).not.toContain("seen");
  });

  it("renders the brief block with anti-gamification copy", () => {
    const html = buildFollowBriefHtml(row, {
      generated_at: "2026-09-09T20:00:00.000Z",
      headlines: ["Relays claimed"],
    });
    expect(html).toContain("Wake the city");
    expect(html).toContain("Relays claimed");
    expect(html).toContain("/play/cedar-rapids/");
    expect(html).toContain("Open public board");
    expect(html).toContain("Checked on this device");
    const lower = html.toLowerCase();
    expect(lower).not.toContain("your progress");
    expect(lower).not.toContain("scanned you");
    expect(lower).not.toContain("streak");
  });

  it("escapes user/net content in rendered HTML", () => {
    const html = buildFollowBriefHtml(
      { season_id: "a\"b", title: `<img src=x onerror=1>`, rules_path: "/play/x/" },
      { headlines: [`<b>headline</b>`] }
    );
    expect(html).not.toContain(`<img src=x`);
    expect(html).not.toContain(`<b>headline</b>`);
    expect(html).toContain("&lt;b&gt;headline&lt;/b&gt;");
  });

  it("combines many followed networks in order", () => {
    const html = buildFollowBriefsHtml(
      [
        { row, snapshot: { generated_at: null, headlines: ["One"] } },
        {
          row: { season_id: "b", title: "Second", rules_path: "/play/season/" },
          snapshot: { generated_at: null, headlines: ["Two"] },
        },
      ],
      new Date("2026-09-09T20:00:00.000Z")
    );
    expect(html.indexOf("One")).toBeLessThan(html.indexOf("Two"));
  });
});