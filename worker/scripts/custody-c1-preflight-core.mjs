/**
 * WS-CUSTODY C1/C2 engineering preflight (wrap modules + unlock copy + create UI).
 * @see docs/CUSTODY_EASY_MODE.md
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  UNLOCK_TO_MANAGE,
  UNLOCK_TO_MANAGE_PROMPT,
  VIEW_ONLY_NO_SESSION_WALLET_DEVICE_UNLOCK,
} from "../../site/js/device-ownership-copy-core.mjs";

/** @typedef {{ id: string, ok: boolean, detail: string }} CustodyC1Check */

const CUSTODY_MODULES = [
  "site/js/device-custody-mode-core.mjs",
  "site/js/device-custody-wrap-core.mjs",
  "site/js/device-custody-webauthn-core.mjs",
  "site/js/device-custody-enroll.mjs",
  "site/js/device-custody-save.mjs",
  "site/js/device-custody-unlock.mjs",
];

const CUSTODY_TESTS = [
  "worker/tests/device-custody-wrap-core.test.ts",
  "worker/tests/device-custody-mode-core.test.ts",
  "worker/tests/device-custody-webauthn-core.test.ts",
];

/**
 * @param {CustodyC1Check[]} checks
 */
export function custodyC1PreflightPassed(checks) {
  return checks.every((check) => check.ok);
}

/**
 * @param {string} root
 * @returns {CustodyC1Check[]}
 */
export function runCustodyC1PreflightChecks(root) {
  const checks = [];
  checks.push(checkCustodyModules(root));
  checks.push(checkCustodyTests(root));
  checks.push(checkCreateCustodyUi(root));
  checks.push(checkCreateCardCustodySave(root));
  checks.push(checkUnlockCopyConstants());
  checks.push(checkQuietRehydrateDeviceUnlockGate(root));
  checks.push(checkCustodyMigrateModule(root));
  checks.push(checkCustodyReenrollModule(root));
  checks.push(checkCustodySupportMacros(root));
  checks.push(checkPackageScripts(root));
  return checks;
}

/**
 * @param {string} root
 */
function checkCustodyModules(root) {
  const missing = CUSTODY_MODULES.filter((rel) => !existsSync(join(root, rel)));
  return {
    id: "custody-modules",
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? `${CUSTODY_MODULES.length} device_unlock modules present`
        : `Missing: ${missing.join(", ")}`,
  };
}

/**
 * @param {string} root
 */
function checkCustodyTests(root) {
  const missing = CUSTODY_TESTS.filter((rel) => !existsSync(join(root, rel)));
  return {
    id: "custody-tests",
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? `${CUSTODY_TESTS.length} custody Vitest files present`
        : `Missing: ${missing.join(", ")}`,
  };
}

/**
 * @param {string} root
 */
function checkCreateCustodyUi(root) {
  const path = join(root, "site/create/index.html");
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return { id: "create-custody-ui", ok: false, detail: "Missing site/create/index.html" };
  }
  const ok =
    text.includes('id="create-custody-mode"') &&
    text.includes('name="custody_mode"') &&
    text.includes('value="device_unlock"') &&
    text.includes('value="full_keys"');
  return {
    id: "create-custody-ui",
    ok,
    detail: ok ? "Create form device control fieldset present" : "Create custody mode UI missing",
  };
}

/**
 * @param {string} root
 */
function checkCreateCardCustodySave(root) {
  const path = join(root, "site/js/create-card.mjs");
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return { id: "create-card-custody", ok: false, detail: "Missing create-card.mjs" };
  }
  const ok =
    text.includes("saveSessionToWalletWithCustody") &&
    text.includes("shouldDefaultDeviceUnlockAtCreate");
  return {
    id: "create-card-custody",
    ok,
    detail: ok ? "Create routes wallet save through hybrid custody" : "create-card custody save missing",
  };
}

function checkUnlockCopyConstants() {
  const ok =
    UNLOCK_TO_MANAGE.includes("Unlock") &&
    UNLOCK_TO_MANAGE_PROMPT.includes("Face ID") &&
    VIEW_ONLY_NO_SESSION_WALLET_DEVICE_UNLOCK.includes("Unlock");
  return {
    id: "unlock-copy",
    ok,
    detail: ok ? "Layer 2 unlock copy constants exported" : "Unlock copy constants incomplete",
  };
}

/**
 * @param {string} root
 */
function checkQuietRehydrateDeviceUnlockGate(root) {
  const path = join(root, "site/js/device-quiet-tab-rehydrate.mjs");
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return { id: "quiet-rehydrate-c2", ok: false, detail: "Missing device-quiet-tab-rehydrate.mjs" };
  }
  const ok =
    text.includes("walletEntryNeedsDeviceUnlock") &&
    text.includes("device_unlock_requires_webauthn");
  return {
    id: "quiet-rehydrate-c2",
    ok,
    detail: ok
      ? "Quiet rehydrate blocks device_unlock silent copy (C2)"
      : "device_unlock quiet rehydrate gate missing",
  };
}

/**
 * @param {string} root
 */
function checkCustodyReenrollModule(root) {
  const paths = [
    "site/js/device-custody-reenroll-core.mjs",
    "site/js/device-custody-reenroll.mjs",
  ];
  const missing = paths.filter((rel) => !existsSync(join(root, rel)));
  const reenrollCore = join(root, "site/js/device-custody-reenroll-core.mjs");
  let reenrollLogic = false;
  try {
    const text = readFileSync(reenrollCore, "utf8");
    reenrollLogic =
      text.includes("stripStaleDeviceUnlockWrapForRecoveryImport") &&
      text.includes("device_unlock_reenroll_pending");
  } catch {
    /* missing */
  }
  const recoveryCore = join(root, "site/js/device-hub-import-recovery-core.mjs");
  let recoveryWired = false;
  try {
    const text = readFileSync(recoveryCore, "utf8");
    recoveryWired = text.includes("stripStaleDeviceUnlockWrapForRecoveryImport");
  } catch {
    /* missing */
  }
  return {
    id: "custody-reenroll-c4",
    ok: missing.length === 0 && reenrollLogic && recoveryWired,
    detail:
      missing.length === 0 && reenrollLogic && recoveryWired
        ? "C4 recovery re-enroll modules + recovery import strip present"
        : missing.length
          ? `Missing: ${missing.join(", ")}`
          : !reenrollLogic
            ? "Re-enroll core logic missing"
            : "Recovery import stale-wrap strip missing",
  };
}

/**
 * @param {string} root
 */
function checkCustodySupportMacros(root) {
  const path = join(root, "docs/CUSTODY_SUPPORT_MACROS.md");
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return { id: "custody-support-g-c4", ok: false, detail: "Missing CUSTODY_SUPPORT_MACROS.md" };
  }
  const ok =
    text.includes("device_unlock") &&
    text.includes("K11") &&
    text.includes("Unlock to manage");
  return {
    id: "custody-support-g-c4",
    ok,
    detail: ok ? "G-C4 support macros doc present" : "Support macros doc incomplete",
  };
}

/**
 * @param {string} root
 */
function checkCustodyMigrateModule(root) {
  const paths = [
    "site/js/device-custody-migrate-core.mjs",
    "site/js/device-custody-migrate.mjs",
    "site/js/created-custody-migrate.mjs",
  ];
  const missing = paths.filter((rel) => !existsSync(join(root, rel)));
  return {
    id: "custody-migrate-c3",
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? "C3 migration bridge modules present"
        : `Missing: ${missing.join(", ")}`,
  };
}

/**
 * @param {string} root
 */
function checkPackageScripts(root) {
  const path = join(root, "package.json");
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return { id: "package-scripts", ok: false, detail: "Missing package.json" };
  }
  const ok =
    text.includes('"worker:test:custody-wrap"') &&
    text.includes('"custody:phase0-preflight"') &&
    text.includes('"custody:c1-preflight"') &&
    text.includes('"e2e:custody-device-unlock"');
  return {
    id: "package-scripts",
    ok,
    detail: ok ? "custody npm scripts registered" : "custody npm scripts missing",
  };
}
