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

const LANDING_META_SNIPPET =
  "Public programmable objects. Live, revocable status on physical tags";

describe("landing messaging (Step 3)", () => {
  it("landing meta and OG align with messaging matrix", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain(LANDING_META_SNIPPET);
    expect(html).toContain("No scan tracking.");
    expect(html).not.toContain("Physical objects with programmable social state");
    expect(html).not.toContain("Live public objects. Not identity, not social media");
  });

  it("landing hero uses hook H1 and public programmable kicker", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain("Public programmable objects");
    expect(html).toContain("Live state<br />on real objects.");
    expect(html).not.toContain("A network OS for physical objects");
  });

  it("landing title and founder note bridge mission and what ships today", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain("humanity.llc · Live objects on physical tags");
    expect(html).toContain("Why this exists");
    expect(html).toContain("Why humanity.llc?");
    expect(html).toContain("webpages that are difficult to edit");
    expect(html).toContain("One primitive, many uses");
    expect(html).toContain("hoodie displaying today's mood");
    expect(html).toContain("trust you can check (what the scan shows right now)");
    expect(html).toContain("shared trust layer for the internet");
    expect(html).toContain("portable belonging and vouching at internet scale");
    expect(html).toContain("rules they can inspect");
    expect(html).toContain("one network, many networks, or both");
    expect(html).not.toContain("online social democracy");
    expect(html).not.toContain("one company's feed");
    expect(html).toContain("See what's live");
    expect(html).toContain("Notes on the build");
    expect(html).toContain("Humanity Commons");
    expect(html).toContain("/features-available-now.html");
    expect(html).toContain("/studio/");
  });

  it("create page exposes hero ids for template copy sync", () => {
    const html = readFileSync(join(root, "site/create/index.html"), "utf8");
    expect(html).toContain('id="create-hero-title"');
    expect(html).toContain('id="create-hero-lead"');
    expect(html).toContain("change it later on Live without reprinting");
  });
});

describe("public marketing clarity (AI step 5)", () => {
  it("landing and create copy lead with signed state instead of AI language", () => {
    const landing = readFileSync(join(root, "site/index.html"), "utf8");
    const create = readFileSync(join(root, "site/create/index.html"), "utf8");
    const publicCopy = `${landing}\n${create}`;

    expect(publicCopy).toContain("Public programmable objects");
    expect(publicCopy).toContain("Live state<br />on real objects.");
    expect(publicCopy).toContain("signed QR");
    expect(publicCopy).toContain("No scan tracking.");
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
    expect(copy.lead).toMatch(/Live/);
    expect(CREATE_TEMPLATE_HERO.status_plate.title).toBe("Add a status plate");
  });

  it("general template emphasizes Humanity Card first", () => {
    expect(createHeroCopyForTemplate("general").title).toBe("Create a Humanity Card");
    expect(createHeroCopyForTemplate(undefined).title).toBe("Create a Humanity Card");
  });
});
