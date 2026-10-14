/* Controller mapping helpers. Dependency-free; usable in browser and Node tests. */
(function (root) {
  "use strict";

  const BUTTONS = Object.freeze([
    Object.freeze({ index: 0, label: "A" }),
    Object.freeze({ index: 1, label: "B" }),
    Object.freeze({ index: 2, label: "X" }),
    Object.freeze({ index: 3, label: "Y" }),
    Object.freeze({ index: 4, label: "LB" }),
    Object.freeze({ index: 5, label: "RB" }),
    Object.freeze({ index: 6, label: "LT" }),
    Object.freeze({ index: 7, label: "RT" })
  ]);
  const DEFAULTS = Object.freeze({
    firePrimary: 1,
    fireSecondary: 7,
    bombButton: 0,
    overdriveButton: 3,
    stickDeadzone: 0.18
  });

  function indexIsAllowed(index) {
    return Number.isInteger(index) && BUTTONS.some(option => option.index === index);
  }

  function validButton(value, fallback, excluded = []) {
    const n = Number(value);
    if (indexIsAllowed(n) && !excluded.includes(n)) return n;
    return [fallback, ...BUTTONS.map(button => button.index)].find(index =>
      indexIsAllowed(index) && !excluded.includes(index)
    );
  }

  function sanitizeSettings(source = {}) {
    if (!source || typeof source !== "object" || Array.isArray(source)) source = {};
    const firePrimary = validButton(source.firePrimary, DEFAULTS.firePrimary);
    const fireSecondary = validButton(source.fireSecondary, DEFAULTS.fireSecondary, [firePrimary]);
    const bombButton = validButton(source.bombButton, DEFAULTS.bombButton, [firePrimary, fireSecondary]);
    const overdriveButton = validButton(source.overdriveButton, DEFAULTS.overdriveButton, [firePrimary, fireSecondary, bombButton]);
    const rawDeadzone = source.stickDeadzone;
    const parsed = rawDeadzone == null || rawDeadzone === "" ? DEFAULTS.stickDeadzone : Number(rawDeadzone);
    const stickDeadzone = Number.isFinite(parsed)
      ? Math.round(Math.max(0.08, Math.min(0.44, parsed)) * 100) / 100
      : DEFAULTS.stickDeadzone;
    return { firePrimary, fireSecondary, bombButton, overdriveButton, stickDeadzone };
  }

  function cycleButton(current, direction, reserved = []) {
    const start = BUTTONS.findIndex(button => button.index === current);
    const len = BUTTONS.length;
    const delta = direction < 0 ? -1 : 1;
    for (let n = 1; n <= len; n++) {
      const candidate = BUTTONS[(start + delta * n + len * 2) % len].index;
      if (!reserved.includes(candidate)) return candidate;
    }
    return current;
  }

  function buttonLabel(index) {
    return BUTTONS.find(button => button.index === index)?.label || "?";
  }

  function pressed(pad, index) {
    const button = pad?.buttons?.[index];
    return !!(button && (button.pressed === true || button.value > 0.5));
  }

  function anyPressed(pad) {
    return !!pad?.buttons?.some(button => button?.pressed === true || button?.value > 0.5);
  }

  function normalizeAxis(value, deadzone = DEFAULTS.stickDeadzone) {
    const axis = Number(value);
    if (!Number.isFinite(axis)) return 0;
    const clamped = Math.max(-1, Math.min(1, axis));
    const dz = Math.max(0, Math.min(0.9, Number.isFinite(deadzone) ? deadzone : DEFAULTS.stickDeadzone));
    if (Math.abs(clamped) <= dz) return 0;
    return Math.sign(clamped) * (Math.abs(clamped) - dz) / (1 - dz);
  }

  const api = Object.freeze({ BUTTONS, DEFAULTS, sanitizeSettings, cycleButton, buttonLabel, pressed, anyPressed, normalizeAxis });
  root.NeonController = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
