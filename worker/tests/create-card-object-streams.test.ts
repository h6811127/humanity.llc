import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.join(fileURLToPath(new URL("../..", import.meta.url)));
const createCardPath = path.join(repoRoot, "site/js/create-card.mjs");
const createHtmlPath = path.join(repoRoot, "site/create/index.html");

describe("create flow object_streams", () => {
  it("create page includes optional detail rows and deploy wizard", () => {
    const html = fs.readFileSync(createHtmlPath, "utf8");
    expect(html).toContain('id="create-fields-object-streams"');
    expect(html).toContain("Add extra details (optional)");
    expect(html).toMatch(
      /<details[^>]*id="create-fields-object-streams"[^>]*>[\s\S]*id="create-stream-1-label"/
    );
    expect(html).not.toMatch(
      /<fieldset[^>]*id="create-fields-object-streams"/
    );
    expect(html).toContain('id="create-stream-1-label"');
    expect(html).toContain('id="create-stream-2-value"');
    expect(html).toContain('id="create-entry-chooser"');
    expect(html).toContain('id="create-form-panel"');
    expect(html).toContain('id="create-deploy-wizard"');
    expect(html).not.toContain('id="create-template-advanced"');
    expect(html).not.toContain('id="create-flat-pilot-compat"');
    expect(html).not.toContain('id="create-add-object-nudge"');
  });

  it("create-card signs object_streams from form rows on create", () => {
    const src = fs.readFileSync(createCardPath, "utf8");
    expect(src).toContain('import { buildObjectStreamsFromFormRows } from "./object-streams-core.mjs"');
    expect(src).toContain("function buildObjectStreamsForCreate()");
    expect(src).toContain("create-stream-1-label");
    expect(src).toContain("cardFields.object_streams = objectStreams");
    expect(src).toMatch(/objectStreams:\s*input\.objectStreams/);
    expect(src).toMatch(/object_streams:\s*objectStreams/);
  });

  it("create-card blocks flat pilot submit when deploy path is unavailable", () => {
    const src = fs.readFileSync(createCardPath, "utf8");
    expect(src).toContain("Sign and tag create use the deploy path");
    expect(src).not.toContain('id="create-fields-status-plate"');
    expect(src).not.toContain("create-flat-pilot-compat");
  });

  it("create-card toggles stream fieldset for status plate and general only", () => {
    const src = fs.readFileSync(createCardPath, "utf8");
    expect(src).toContain("fieldsObjectStreams");
    expect(src).toMatch(/fieldsObjectStreams\.hidden\s*=\s*!isPlate\s*&&\s*template\s*!==\s*"general"/);
  });
});
