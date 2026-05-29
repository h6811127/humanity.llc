/**
 * Setup wizard step policy (pure).
 * @see docs/CREATED_TASKS_TAB_REDESIGN.md · docs/OWNERSHIP_AND_CONTROL_MODEL.md D4
 */

/**
 * Skip Save step UI when ownership is already on device via auto-save.
 * @param {{
 *   savedOnDevice?: boolean,
 *   autoSaveEnabled?: boolean,
 *   autoSaveFailed?: boolean,
 * }} input
 */
export function shouldOmitSetupSaveStep(input) {
  const {
    savedOnDevice = false,
    autoSaveEnabled = true,
    autoSaveFailed = false,
  } = input;
  return savedOnDevice && autoSaveEnabled && !autoSaveFailed;
}

/**
 * @param {boolean} omitSaveStep
 * @returns {number}
 */
export function setupMinStepIndex(omitSaveStep) {
  return omitSaveStep ? 1 : 0;
}

/** @param {boolean} omitSaveStep */
export function setupWizardStepCount(omitSaveStep) {
  return omitSaveStep ? 4 : 5;
}

/**
 * @param {boolean} omitSaveStep
 * @returns {string}
 */
export function setupProgressKicker(omitSaveStep) {
  const n = setupWizardStepCount(omitSaveStep);
  return `${n} steps · ownership stays on this device`;
}
