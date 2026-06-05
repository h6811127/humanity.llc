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
    expect(html).toContain("No passive scan tracking by default.");
    expect(html).not.toContain("Physical objects with programmable social state");
    expect(html).not.toContain("Live public objects. Not identity, not social media");
  });

  it("landing hero uses hook H1 and public programmable kicker", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain("Public programmable objects");
    expect(html).toContain("The sticker stays.<br />The status changes.");
    expect(html).not.toContain("Live state<br />on real objects.");
    expect(html).not.toContain("A network OS for physical objects");
  });

  it("landing three-door launch section links status, hoodie, and city game", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain('id="launch-doors"');
    expect(html).toContain("Three ways in");
    expect(html).toContain("/create/?intent=deploy");
    expect(html).toContain("/shop/customize/?product=glitch_hoodie_v1");
    expect(html).toContain("/play/cedar-rapids/");
    expect(html).toContain("Live status on something");
    expect(html).toContain("Live status on you");
    expect(html).toContain("Play the city game");
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
    expect(html).toContain("an experiment in portable trust and revocable public identity");
    expect(html).toContain("belonging and vouching you can inspect");
    expect(html).toContain("one network, many networks, or both");
    expect(html).not.toContain("shared trust layer for the internet");
    expect(html).not.toContain("online social democracy");
    expect(html).not.toContain("one company's feed");
    expect(html).toContain("See what's live");
    expect(html).toContain("Notes on the build");
    expect(html).toContain("Humanity Commons");
    expect(html).toContain("/features-available-now.html");
    expect(html).toContain("/studio/");
  });

  it("landing intro includes navy sweatshirt transparent QR preview after How it works", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    const howIdx = html.indexOf('id="landing-how-it-works-title"');
    const merchIdx = html.indexOf('id="landing-merch-preview-title"');
    const founderIdx = html.indexOf('id="founder-note-title"');
    expect(howIdx).toBeGreaterThan(-1);
    expect(merchIdx).toBeGreaterThan(howIdx);
    expect(founderIdx).toBeGreaterThan(merchIdx);
    expect(html).toContain("landing-merch-preview");
    expect(html).toContain("One use · live object on a sweatshirt");
    expect(html).toContain("/images/landing/navy-glitch-hoodie-transparent-back.jpg");
    expect(html).toContain("transparent QR");
    expect(html).toContain("https://humanity.llc/c/nSVXWPqgRFEhGPjxyRzidF6s?q=qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5");
    expect(html).toContain("/shop/customize/?product=glitch_hoodie_v1");
  });

  it("create page exposes hero ids for template copy sync", () => {
    const html = readFileSync(join(root, "site/create/index.html"), "utf8");
    expect(html).toContain('id="create-hero-title"');
    expect(html).toContain('id="create-hero-lead"');
    expect(html).toContain("Change it later on Live without reprinting the QR");
  });
});

describe("public marketing clarity (AI step 5)", () => {
  it("landing and create copy lead with signed state instead of AI language", () => {
    const landing = readFileSync(join(root, "site/index.html"), "utf8");
    const create = readFileSync(join(root, "site/create/index.html"), "utf8");
    const publicCopy = `${landing}\n${create}`;

    expect(publicCopy).toContain("Public programmable objects");
    expect(publicCopy).toContain("The sticker stays.<br />The status changes.");
    expect(publicCopy).toContain("today\u2019s signed state");
    expect(publicCopy).toContain("No passive scan tracking by default.");
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
  it("status plate lead recommends card page add under root", () => {
    const copy = createHeroCopyForTemplate("status_plate");
    expect(copy.lead).toMatch(/card page/i);
    expect(CREATE_TEMPLATE_HERO.status_plate.title).toBe("Make a QR sign");
  });

  it("general template emphasizes account-first create", () => {
    expect(createHeroCopyForTemplate("general").title).toBe("Create your account");
    expect(createHeroCopyForTemplate(undefined).title).toBe("Create your account");
    expect(createHeroCopyForTemplate("general").lead).not.toMatch(/\bnetwork\b/i);
    expect(createHeroCopyForTemplate("general").lead).not.toMatch(/signed qr/i);
  });
});
