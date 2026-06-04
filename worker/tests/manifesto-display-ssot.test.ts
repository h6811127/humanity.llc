/**
 * SSOT parity — worker facade, site facade, and core must agree byte-for-byte.
 */
import { describe, expect, it } from "vitest";

import * as workerFacade from "../src/resolver/manifesto-display";
import * as siteFacade from "../../site/js/manifesto-display.mjs";
import * as core from "../../site/js/manifesto-display-core.mjs";

const SHARED_EXPORTS = [
  "LOST_ITEM_RELAY_PREFIX",
  "OBJECT_FORWARD_MANIFESTO_MIN_LEN",
  "OBJECT_FORWARD_SENTENCE_MIN_LEN",
  "parseManifestoDisplay",
  "inferPilotTemplate",
  "isObjectForwardManifesto",
  "childObjectManifestoLine",
  "parseDisplayFromChildObject",
  "scanHeroTemplate",
  "resolveScanHeroDisplay",
  "splitManifestoDisplay",
] as const;

const PARSE_FIXTURES = [
  { label: "empty", input: null, kind: "general" },
  { label: "whitespace", input: "   \n  ", kind: "general" },
  { label: "single line", input: "Open studio all week", kind: "general" },
  {
    label: "status plate two-line",
    input: "Studio door\nOpen until 9 PM",
    kind: "status_plate",
  },
  {
    label: "lost item relay",
    input: `${core.LOST_ITEM_RELAY_PREFIX}Keys\nLost  -  relay active`,
    kind: "lost_item_relay",
  },
  {
    label: "empty first line after split",
    input: "\nSecond only",
    kind: "general",
  },
  {
    label: "empty relay label",
    input: `${core.LOST_ITEM_RELAY_PREFIX}\nMessage only`,
    kind: "status_plate",
  },
  {
    label: "multi newline",
    input: "Label\nLine two\nLine three",
    kind: "status_plate",
  },
];

describe("manifesto-display SSOT exports", () => {
  for (const name of SHARED_EXPORTS) {
    it(`exports ${name} from worker, site, and core facades`, () => {
      expect(typeof (workerFacade as Record<string, unknown>)[name]).not.toBe("undefined");
      expect(typeof (siteFacade as Record<string, unknown>)[name]).not.toBe("undefined");
      expect(typeof (core as Record<string, unknown>)[name]).not.toBe("undefined");
    });
  }

  it("constants match across facades", () => {
    expect(workerFacade.LOST_ITEM_RELAY_PREFIX).toBe(siteFacade.LOST_ITEM_RELAY_PREFIX);
    expect(workerFacade.LOST_ITEM_RELAY_PREFIX).toBe(core.LOST_ITEM_RELAY_PREFIX);
    expect(workerFacade.OBJECT_FORWARD_MANIFESTO_MIN_LEN).toBe(
      core.OBJECT_FORWARD_MANIFESTO_MIN_LEN
    );
  });
});

describe("manifesto-display SSOT parseManifestoDisplay parity", () => {
  for (const fixture of PARSE_FIXTURES) {
    it(`${fixture.label} — worker === site === core`, () => {
      const w = workerFacade.parseManifestoDisplay(fixture.input);
      const s = siteFacade.parseManifestoDisplay(fixture.input);
      const c = core.parseManifestoDisplay(fixture.input);
      expect(w).toEqual(s);
      expect(w).toEqual(c);
      expect(w.kind).toBe(fixture.kind);
    });
  }
});

describe("manifesto-display SSOT inferPilotTemplate parity", () => {
  for (const fixture of PARSE_FIXTURES) {
    it(`${fixture.label} — worker === site === core`, () => {
      const w = workerFacade.inferPilotTemplate(fixture.input);
      const s = siteFacade.inferPilotTemplate(fixture.input);
      const c = core.inferPilotTemplate(fixture.input);
      expect(w).toBe(s);
      expect(w).toBe(c);
    });
  }
});

describe("manifesto-display SSOT scan pipeline parity", () => {
  it("childObjectManifestoLine round-trip", () => {
    const child = {
      object_type: "lost_item_relay",
      public_label: "House keys",
      public_state: "Lost — contact owner through relay",
    };
    const line = workerFacade.childObjectManifestoLine(child);
    expect(siteFacade.childObjectManifestoLine(child)).toBe(line);
    expect(core.childObjectManifestoLine(child)).toBe(line);
    expect(workerFacade.parseManifestoDisplay(line)).toEqual(
      siteFacade.parseManifestoDisplay(line)
    );
  });

  it("resolveScanHeroDisplay prefers child fields", () => {
    const input = {
      manifestoLine: "Old label\nOld state",
      qrScope: "child_object" as const,
      childObjectType: "status_plate",
      childPublicLabel: "Studio door",
      childPublicState: "Closed until Monday",
    };
    const w = workerFacade.resolveScanHeroDisplay(input);
    const s = siteFacade.resolveScanHeroDisplay(input);
    const c = core.resolveScanHeroDisplay(input);
    expect(w).toEqual(s);
    expect(w).toEqual(c);
    expect(w.template).toBe("status_plate");
  });

  it("scanHeroTemplate print_artifact scope", () => {
    const display = workerFacade.parseManifestoDisplay("Open studio");
    const w = workerFacade.scanHeroTemplate(display, "print_artifact");
    const s = siteFacade.scanHeroTemplate(display, "print_artifact");
    const c = core.scanHeroTemplate(display, "print_artifact");
    expect(w).toBe("live_object");
    expect(w).toBe(s);
    expect(w).toBe(c);
  });

  it("splitManifestoDisplay deprecated wrapper parity", () => {
    const input = "Studio door\nOpen until 9 PM";
    expect(workerFacade.splitManifestoDisplay(input)).toEqual(
      siteFacade.splitManifestoDisplay(input)
    );
    expect(workerFacade.splitManifestoDisplay(input)).toEqual(
      core.splitManifestoDisplay(input)
    );
  });
});
