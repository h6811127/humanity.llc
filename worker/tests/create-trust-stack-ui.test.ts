import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCustodyModePanelState } from "../../site/js/device-custody-create-core.mjs";
import {
  CREATE_CUSTODY_SUMMARY,
  CREATE_RECOVERY_HINT_DEVICE_UNLOCK,
  CREATE_RECOVERY_HINT_FULL_KEYS,
  CREATE_RECOVERY_LABEL_DEVICE_UNLOCK,
  CREATE_RECOVERY_LABEL_FULL_KEYS,
} from "../../site/js/device-ownership-copy-core.mjs";
import {
  syncCreateCustodySummary,
  syncCreateRecoveryUi,
} from "../../site/js/create-trust-stack-ui.mjs";

/** Minimal checkbox for `instanceof HTMLInputElement` in Node. */
class FakeHTMLInputElement {
  checked = false;
  disabled = false;
}

function mountCreateRecoveryDom(initial: { checked?: boolean; disabled?: boolean } = {}) {
  const cb = new FakeHTMLInputElement();
  cb.checked = initial.checked ?? false;
  cb.disabled = initial.disabled ?? false;
  const label = { textContent: "" };
  const hint = { textContent: "" };
  const summary = { textContent: "" };
  const doc = {
    getElementById(id: string) {
      if (id === "generate-recovery") return cb;
      if (id === "create-recovery-label") return label;
      if (id === "create-recovery-hint") return hint;
      if (id === "create-custody-mode-summary") return summary;
      return null;
    },
  };
  return { cb, label, hint, summary, doc };
}

describe("syncCreateRecoveryUi", () => {
  const origDocument = globalThis.document;
  const origHTMLInputElement = globalThis.HTMLInputElement;

  beforeEach(() => {
    vi.stubGlobal("HTMLInputElement", FakeHTMLInputElement);
  });

  afterEach(() => {
    if (origDocument) {
      vi.stubGlobal("document", origDocument);
    } else {
      // @ts-expect-error test cleanup
      delete globalThis.document;
    }
    if (origHTMLInputElement) {
      vi.stubGlobal("HTMLInputElement", origHTMLInputElement);
    } else {
      // @ts-expect-error test cleanup
      delete globalThis.HTMLInputElement;
    }
  });

  it("locks recovery when device_unlock is mandatory", () => {
    const { cb, label, hint, doc } = mountCreateRecoveryDom({ checked: false, disabled: false });
    vi.stubGlobal("document", doc);

    syncCreateRecoveryUi({ recoveryMandatory: true });

    expect(cb.checked).toBe(true);
    expect(cb.disabled).toBe(true);
    expect(label.textContent).toBe(CREATE_RECOVERY_LABEL_DEVICE_UNLOCK);
    expect(hint.textContent).toBe(CREATE_RECOVERY_HINT_DEVICE_UNLOCK);
  });

  it("enables optional recovery copy for full_keys without forcing unchecked", () => {
    const { cb, label, hint, doc } = mountCreateRecoveryDom({ checked: true, disabled: true });
    vi.stubGlobal("document", doc);

    syncCreateRecoveryUi({ recoveryMandatory: false });

    expect(cb.disabled).toBe(false);
    expect(cb.checked).toBe(true);
    expect(label.textContent).toBe(CREATE_RECOVERY_LABEL_FULL_KEYS);
    expect(hint.textContent).toBe(CREATE_RECOVERY_HINT_FULL_KEYS);
  });

  it("no-ops when trust stack DOM nodes are missing", () => {
    vi.stubGlobal("document", { getElementById: () => null });
    expect(() => syncCreateRecoveryUi({ recoveryMandatory: true })).not.toThrow();
  });

  it("syncs from panel state: device_unlock mandatory, organizer optional", () => {
    const devicePanel = createCustodyModePanelState({ webAuthnAvailable: true });
    expect(devicePanel.recoveryMandatory).toBe(true);

    const { cb: deviceCb, doc: deviceDoc } = mountCreateRecoveryDom();
    vi.stubGlobal("document", deviceDoc);
    syncCreateRecoveryUi(devicePanel);
    expect(deviceCb.disabled).toBe(true);
    expect(deviceCb.checked).toBe(true);

    const organizerPanel = createCustodyModePanelState({
      webAuthnAvailable: true,
      organizerEnabled: true,
    });
    expect(organizerPanel.recoveryMandatory).toBe(false);
    expect(organizerPanel.forceFullKeysRadio).toBe(true);

    const { cb: orgCb, label, hint, doc: orgDoc } = mountCreateRecoveryDom({
      checked: true,
      disabled: true,
    });
    vi.stubGlobal("document", orgDoc);
    syncCreateRecoveryUi(organizerPanel);
    expect(orgCb.disabled).toBe(false);
    expect(label.textContent).toBe(CREATE_RECOVERY_LABEL_FULL_KEYS);
    expect(hint.textContent).toBe(CREATE_RECOVERY_HINT_FULL_KEYS);
  });
});

describe("syncCreateCustodySummary", () => {
  const origDocument = globalThis.document;

  afterEach(() => {
    if (origDocument) {
      vi.stubGlobal("document", origDocument);
    } else {
      // @ts-expect-error test cleanup
      delete globalThis.document;
    }
  });

  it("writes default custody summary copy", () => {
    const summary = { textContent: "" };
    vi.stubGlobal("document", {
      getElementById: (id: string) => (id === "create-custody-mode-summary" ? summary : null),
    });

    syncCreateCustodySummary();

    expect(summary.textContent).toBe(CREATE_CUSTODY_SUMMARY);
  });
});
