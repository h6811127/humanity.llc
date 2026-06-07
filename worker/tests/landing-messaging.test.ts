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
  "Public networks for physical places. Live stickers you control from your phone";

describe("landing messaging (Step 3)", () => {
  it("landing meta and OG align with messaging matrix", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain(LANDING_META_SNIPPET);
    expect(html).toContain("No passive scan tracking by default.");
    expect(html).not.toContain("Physical objects with programmable social state");
    expect(html).not.toContain("Live public objects. Not identity, not social media");
  });

  it("landing hero leads with network vision H1 and primitive sticker H2", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain("An internet for physical places and objects.");
    expect(html).toContain("Create public networks in the physical world");
    expect(html).toContain("Public programmable objects");
    expect(html).toContain("The sticker stays.<br />The status changes.");
    expect(html).toContain('id="landing-hero-primitive"');
    expect(html).not.toContain("Live state<br />on real objects.");
    expect(html).not.toContain("A network OS for physical objects");
  });

  it("landing launch section links place, deploy, and wear doors in network-first order", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain('id="launch-doors"');
    expect(html).toContain("Start here");
    expect(html).toContain("/create/?intent=deploy");
    expect(html).toContain("/shop/customize/?product=glitch_hoodie_v1");
    expect(html).toContain("/play/cedar-rapids/");
    expect(html).toContain("Explore a live place");
    expect(html).toContain("Add an object to the network");
    expect(html).toContain("Wear live status");
    expect(html).not.toContain("Three ways in");
    expect(html).not.toContain("Live status on something");
    expect(html).not.toContain("Play the city game");

    const doorsListStart = html.indexOf('class="list list-compact landing-launch-doors-list"');
    const placeIdx = html.indexOf("Explore a live place", doorsListStart);
    const deployIdx = html.indexOf("Add an object to the network", doorsListStart);
    const wearIdx = html.indexOf("Wear live status", doorsListStart);
    expect(placeIdx).toBeGreaterThan(doorsListStart);
    expect(deployIdx).toBeGreaterThan(placeIdx);
    expect(wearIdx).toBeGreaterThan(deployIdx);
  });

  it("landing title and founder note bridge mission and what ships today", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain("humanity.llc · Public networks for live places");
    expect(html).toContain("Why this exists");
    expect(html).toContain("Why humanity.llc?");
    expect(html).toContain("live places instead");
    expect(html).toContain("The building block is simple");
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
    expect(html).toContain("Wearable example");
    expect(html).toContain("/images/landing/navy-glitch-hoodie-transparent-back.jpg");
    expect(html).toContain("transparent QR");
    expect(html).toContain("https://humanity.llc/c/nSVXWPqgRFEhGPjxyRzidF6s?q=qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5");
    expect(html).toContain("/shop/customize/?product=glitch_hoodie_v1");
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
