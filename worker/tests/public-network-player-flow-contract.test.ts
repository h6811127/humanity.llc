import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  PLAYER_FLOW_CONTRACT_VERSION,
  PLAYER_FLOW_FORBIDDEN_SNIPPETS,
  PLAYER_FLOW_LOCAL_HTML_BY_PATH,
  PLAYER_FLOW_PAGE_CHECKS,
} from "../../site/js/public-network-player-flow-contract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("public network player flow contract", () => {
  it(`contract version is ${PLAYER_FLOW_CONTRACT_VERSION}`, () => {
    expect(PLAYER_FLOW_CONTRACT_VERSION).toBeGreaterThan(0);
  });

  for (const page of PLAYER_FLOW_PAGE_CHECKS) {
    const relPath = PLAYER_FLOW_LOCAL_HTML_BY_PATH[page.path];
    if (!relPath) continue;

    describe(page.label, () => {
      const html = readFileSync(join(root, relPath), "utf8");

      for (const snippet of page.required) {
        it(`requires: ${snippet.slice(0, 56)}${snippet.length > 56 ? "…" : ""}`, () => {
          expect(html).toContain(snippet);
        });
      }

      for (const snippet of page.forbidden ?? []) {
        it(`forbids: ${snippet.slice(0, 56)}${snippet.length > 56 ? "…" : ""}`, () => {
          expect(html).not.toContain(snippet);
        });
      }
    });
  }

  for (const snippet of PLAYER_FLOW_FORBIDDEN_SNIPPETS) {
    it(`global forbid on catalog: ${snippet.slice(0, 48)}`, () => {
      const catalog = readFileSync(join(root, PLAYER_FLOW_LOCAL_HTML_BY_PATH["/play/season/"]), "utf8");
      expect(catalog).not.toContain(snippet);
    });
  }
});
