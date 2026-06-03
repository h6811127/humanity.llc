import {
  DEFAULT_TIME_POLICY_TIMEZONE,
  TIME_POLICY_DAY_OPTIONS,
  timePolicyFormDefaults,
} from "./child-object-time-policy-core.mjs";

/**
 * @param {Record<string, unknown>} row
 */
export function renderChildObjectTimePolicySection(row) {
  const defaults = timePolicyFormDefaults(row);
  const details = document.createElement("details");
  details.className = "child-object-time-policy";
  details.open = defaults.enabled;

  const summary = document.createElement("summary");
  summary.className = "child-object-time-policy-summary";
  summary.textContent = defaults.enabled
    ? "Published hours & windows"
    : "Add published hours & windows";
  details.append(summary);

  const form = document.createElement("form");
  form.className = "compact-form child-object-time-policy-form";
  form.noValidate = true;

  const intro = document.createElement("p");
  intro.className = "form-hint";
  intro.textContent =
    "Optional. Scanners still get a 200 response outside these windows — the resolver shows honest time-bound copy.";
  form.append(intro);

  const enableLabel = document.createElement("label");
  enableLabel.className = "form-label child-object-time-policy-enable";
  const enableInput = document.createElement("input");
  enableInput.type = "checkbox";
  enableInput.name = "time_policy_enabled";
  enableInput.value = "1";
  enableInput.checked = defaults.enabled;
  enableLabel.append(enableInput, document.createTextNode(" Publish time policy on this object"));
  form.append(enableLabel);

  const validUntilLabel = document.createElement("label");
  validUntilLabel.className = "form-label";
  validUntilLabel.textContent = "Valid until (local time)";
  const validUntilInput = document.createElement("input");
  validUntilInput.className = "form-input";
  validUntilInput.type = "datetime-local";
  validUntilInput.name = "time_policy_valid_until";
  validUntilInput.value = defaults.valid_until;
  form.append(validUntilLabel, validUntilInput);

  const graceLabel = document.createElement("label");
  graceLabel.className = "form-label";
  graceLabel.textContent = "Recall grace (hours after valid until)";
  const graceInput = document.createElement("input");
  graceInput.className = "form-input";
  graceInput.type = "number";
  graceInput.name = "time_policy_grace_period_hours";
  graceInput.min = "1";
  graceInput.max = "720";
  graceInput.placeholder = "48";
  graceInput.value = defaults.grace_period_hours;
  const graceHint = document.createElement("p");
  graceHint.className = "form-hint";
  graceHint.textContent =
    "Optional. After valid until, scanners see recall grace copy for this many hours before the object archives.";
  form.append(graceLabel, graceInput, graceHint);

  const dormantUntilLabel = document.createElement("label");
  dormantUntilLabel.className = "form-label";
  dormantUntilLabel.textContent = "Asleep until (local time)";
  const dormantUntilInput = document.createElement("input");
  dormantUntilInput.className = "form-input";
  dormantUntilInput.type = "datetime-local";
  dormantUntilInput.name = "time_policy_dormant_until";
  dormantUntilInput.value = defaults.dormant_until;
  form.append(dormantUntilLabel, dormantUntilInput);

  const timezoneLabel = document.createElement("label");
  timezoneLabel.className = "form-label";
  timezoneLabel.textContent = "Timezone for weekly hours";
  const timezoneInput = document.createElement("input");
  timezoneInput.className = "form-input";
  timezoneInput.type = "text";
  timezoneInput.name = "time_policy_timezone";
  timezoneInput.maxLength = 64;
  timezoneInput.placeholder = DEFAULT_TIME_POLICY_TIMEZONE;
  timezoneInput.value = defaults.timezone;
  form.append(timezoneLabel, timezoneInput);

  const scheduleLegend = document.createElement("p");
  scheduleLegend.className = "form-label";
  scheduleLegend.textContent = "Weekly hours (optional)";
  form.append(scheduleLegend);

  const dayLabel = document.createElement("label");
  dayLabel.className = "form-label";
  dayLabel.textContent = "Day";
  const daySelect = document.createElement("select");
  daySelect.className = "form-input";
  daySelect.name = "time_policy_schedule_day";
  for (const option of TIME_POLICY_DAY_OPTIONS) {
    const el = document.createElement("option");
    el.value = option.value;
    el.textContent = option.label;
    if (option.value === defaults.schedule_day) el.selected = true;
    daySelect.append(el);
  }
  form.append(dayLabel, daySelect);

  const hourFromLabel = document.createElement("label");
  hourFromLabel.className = "form-label";
  hourFromLabel.textContent = "Open from hour (0–23)";
  const hourFromInput = document.createElement("input");
  hourFromInput.className = "form-input";
  hourFromInput.type = "number";
  hourFromInput.name = "time_policy_schedule_hour_from";
  hourFromInput.min = "0";
  hourFromInput.max = "23";
  hourFromInput.value = defaults.schedule_hour_from;
  form.append(hourFromLabel, hourFromInput);

  const hourUntilLabel = document.createElement("label");
  hourUntilLabel.className = "form-label";
  hourUntilLabel.textContent = "Open until hour (1–24)";
  const hourUntilInput = document.createElement("input");
  hourUntilInput.className = "form-input";
  hourUntilInput.type = "number";
  hourUntilInput.name = "time_policy_schedule_hour_until";
  hourUntilInput.min = "1";
  hourUntilInput.max = "24";
  hourUntilInput.value = defaults.schedule_hour_until;
  form.append(hourUntilLabel, hourUntilInput);

  const scheduleStateLabel = document.createElement("label");
  scheduleStateLabel.className = "form-label";
  scheduleStateLabel.textContent = "Status line during those hours (optional)";
  const scheduleStateInput = document.createElement("input");
  scheduleStateInput.className = "form-input";
  scheduleStateInput.type = "text";
  scheduleStateInput.name = "time_policy_schedule_public_state";
  scheduleStateInput.maxLength = 240;
  scheduleStateInput.value = defaults.schedule_public_state;
  form.append(scheduleStateLabel, scheduleStateInput);

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn-secondary";
  submit.textContent = defaults.enabled ? "Publish time policy" : "Save time policy";
  form.append(submit);

  const status = document.createElement("p");
  status.className = "form-hint child-object-time-policy-status";
  status.hidden = true;
  status.setAttribute("role", "status");
  form.append(status);

  details.append(form);
  return details;
}
