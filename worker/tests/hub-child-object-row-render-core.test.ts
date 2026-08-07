import { describe, expect, it } from "vitest";

import {
  escapeHubRowHtml,
  hubChildObjectRowInnerHtml,
} from "../../site/js/hub-child-object-row-render-core.mjs";

describe("hub-child-object-row-render-core", () => {
  it("escapes HTML special characters in row text", () => {
    expect(escapeHubRowHtml("A & B <C> >")).toBe("A &amp; B &lt;C&gt; &gt;");
  });

  it("does not allow title or status HTML injection into hub rows", () => {
    const html = hubChildObjectRowInnerHtml({
      title: "<img src=x onerror=alert(1)>",
      identity: "obj_1 & peer",
      statusLabel: "Live</span><script>alert(1)</script>",
      statusTone: "ok><img src=x",
      iconHtml: '<span class="icon" aria-hidden="true"></span>',
      actionsHtml: '<button type="button">Manage</button>',
    });

    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("obj_1 &amp; peer");
    expect(html).toContain(
      "Live&lt;/span&gt;&lt;script&gt;alert(1)&lt;/script&gt;"
    );
    expect(html).toContain("hub-card-status--ok&gt;&lt;img src=x");
    expect(html).toContain('<button type="button">Manage</button>');
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("omits actions when actionsHtml is absent", () => {
    const html = hubChildObjectRowInnerHtml({
      title: "Gate",
      identity: "obj_gate",
      statusLabel: "Pending",
      statusTone: "warn",
      iconHtml: "",
    });
    expect(html).toContain("Gate");
    expect(html).not.toContain("<button");
  });
});
