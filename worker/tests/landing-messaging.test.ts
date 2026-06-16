import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  CREATE_TEMPLATE_HERO,
  createHeroCopyForTemplate,
} from "../../site/js/create-template-copy.mjs";
import {
  OBJECT_PUBLIC_SNAPSHOT_LIMIT,
  OBJECT_STREAMS_LIMIT,
} from "../src/resolver/trust-copy";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("landing messaging (Step 3)", () => {
  it("landing meta and OG align with human-first public truth framing", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain("Check what's true right now");
    expect(html).toContain("No scan trails");
    expect(html).not.toContain("Physical objects with programmable social state");
    expect(html).not.toContain("Live public objects. Not identity, not social media");
  });

  it("landing hero leads with human truth line and entry shelves", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain(
      "Check what's true right now before you knock, pick up, or show up."
    );
    expect(html).toContain("Current public truth on real doors, tags, and places");
    expect(html).toContain('id="landing-entry-shelves"');
    expect(html).toContain("Live now");
    expect(html).toContain("Open or paused");
    expect(html).toContain("Return, relay, hours");
    expect(html).toContain("Search live places and boards");
    expect(html).toContain("Public live boards");
    expect(html).toContain('id="public-networks-search"');
    expect(html).toContain('id="public-networks-results"');
    expect(html).toContain('id="landing-start-object-cta"');
    expect(html).toContain("Start with one live object");
    expect(html).toContain('href="/create/"');
    expect(html).toContain("landing-trust-chips");
    expect(html).toContain("No scan surveillance");
    expect(html).toContain("No behavioral dossiers");
    expect(html).not.toContain("<h1>Find public networks</h1>");
    expect(html).not.toContain("Listed networks");
    expect(html).not.toContain("An internet for physical places and objects.");
    expect(html).not.toContain('id="launch-doors"');
    expect(html).not.toContain("Try a live object");
    expect(html).not.toContain("Live state<br />on real objects.");
  });

  it("landing loads public networks portal script and styles", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain("public-networks-portal.css?v=6");
    expect(html).toContain("public-networks-portal.mjs?v=6");
    expect(html).not.toContain("landing-showcase.mjs");
  });

  it("landing title reflects human truth framing not infrastructure headline", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain("humanity.llc · Check what's true right now");
    expect(html).not.toContain("humanity.llc · Find public networks");
    expect(html).not.toContain('id="founder-note-title"');
  });

  it("create page exposes hero ids for template copy sync", () => {
    const html = readFileSync(join(root, "site/create/index.html"), "utf8");
    expect(html).toContain('id="create-hero-title"');
    expect(html).toContain('id="create-hero-lead"');
    expect(html).toContain("Change it later on What opens without reprinting the QR");
  });

  it("create meta describes steward paths only (no player play door)", () => {
    const html = readFileSync(join(root, "site/create/index.html"), "utf8");
    expect(html).toContain("Create your @handle");
    expect(html).toContain("deploy live status on something");
    expect(html).toContain("customize live wear");
    expect(html).not.toMatch(/play the city game/i);
    expect(html).toContain("/create/?intent=game\">Organize a live season</a>");
  });
});

describe("public marketing clarity (AI step 5)", () => {
  it("landing and create copy avoid AI language", () => {
    const landing = readFileSync(join(root, "site/index.html"), "utf8");
    const create = readFileSync(join(root, "site/create/index.html"), "utf8");
    const publicCopy = `${landing}\n${create}`;

    expect(publicCopy).toContain("The sticker stays — the status changes.");
    expect(publicCopy).not.toMatch(/\bAI\b|artificial intelligence|AI profiles|we have AI/i);
  });

  it("scan limit strings describe signed state without AI-as-product language", () => {
    const limits = `${OBJECT_STREAMS_LIMIT}\n${OBJECT_PUBLIC_SNAPSHOT_LIMIT}`;

    expect(limits).toContain("steward-signed public copy");
    expect(limits).toContain("Signed snapshot repeats steward-published fields only");
    expect(limits).not.toMatch(/\bAI\b|model answers|generated answers/i);
  });
});

describe("create-template-copy", () => {
  it("status plate lead recommends Live add under root", () => {
    const copy = createHeroCopyForTemplate("status_plate");
    expect(copy.lead).toMatch(/Live/i);
    expect(CREATE_TEMPLATE_HERO.status_plate.title).toBe("Make a QR sign");
  });

  it("general template emphasizes @handle control line", () => {
    expect(createHeroCopyForTemplate("general").title).toBe("Pick your @handle");
    expect(createHeroCopyForTemplate(undefined).title).toBe("Pick your @handle");
    expect(createHeroCopyForTemplate("general").lead).toMatch(/control line/i);
    expect(createHeroCopyForTemplate("general").lead).not.toMatch(/\bnetwork\b/i);
    expect(createHeroCopyForTemplate("general").lead).not.toMatch(/signed qr/i);
  });
});
