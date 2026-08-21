import { describe, expect, it } from "vitest";

import { extractJsonObjectFromAiText } from "../src/resolver/ai-draft-core";

describe("extractJsonObjectFromAiText", () => {
  it("parses a bare JSON object after trimming whitespace", () => {
    expect(extractJsonObjectFromAiText('  {"object_label":"Studio door"}  ')).toEqual({
      object_label: "Studio door",
    });
  });

  it("unwraps a ```json fence even when the model adds surrounding prose", () => {
    const text = [
      "Here is the draft:",
      "```json",
      '{ "status_line": "Open until 6" }',
      "```",
      "Let me know if you want edits.",
    ].join("\n");
    expect(extractJsonObjectFromAiText(text)).toEqual({ status_line: "Open until 6" });
  });

  it("unwraps a fence without a json language tag", () => {
    expect(
      extractJsonObjectFromAiText('```\n{"manifesto_line":"Live on the network"}\n```')
    ).toEqual({ manifesto_line: "Live on the network" });
  });

  it("returns null for invalid JSON, empty text, or an unclosed fence leftover", () => {
    expect(extractJsonObjectFromAiText("")).toBeNull();
    expect(extractJsonObjectFromAiText("not json")).toBeNull();
    expect(extractJsonObjectFromAiText("```json\n{not-json}\n```")).toBeNull();
    expect(extractJsonObjectFromAiText('```json\n{"ok":true}')).toBeNull();
  });
});
