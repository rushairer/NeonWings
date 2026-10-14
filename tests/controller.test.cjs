const test = require("node:test");
const assert = require("node:assert/strict");
const controller = require("../src/controller.js");

const pad = (pressed = []) => ({
  buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: pressed.includes(index), value: pressed.includes(index) ? 1 : 0 }))
});

test("defaults preserve B / RT for fire and A for bomb", () => {
  assert.deepEqual(controller.sanitizeSettings(), { firePrimary: 1, fireSecondary: 7, bombButton: 0, stickDeadzone: 0.18 });
  assert.equal(controller.pressed(pad([7]), controller.DEFAULTS.fireSecondary), true);
  assert.equal(controller.pressed(pad([0]), controller.DEFAULTS.bombButton), true);
});

test("corrupted or duplicate bindings are repaired without disabling an action", () => {
  const stored = controller.sanitizeSettings({ firePrimary: 2, fireSecondary: 2, bombButton: 2, stickDeadzone: "NaN" });
  assert.deepEqual(new Set([stored.firePrimary, stored.fireSecondary, stored.bombButton]).size, 3);
  assert.equal(stored.firePrimary, 2);
  assert.equal(stored.stickDeadzone, 0.18);
  assert.deepEqual(controller.sanitizeSettings({ stickDeadzone: 99 }).stickDeadzone, 0.44);
  assert.equal(controller.sanitizeSettings({ firePrimary: "bogus" }).firePrimary, 1);
});

test("cycling the controller binding skips buttons used by other actions", () => {
  assert.equal(controller.cycleButton(1, 1, [0, 2]), 3);
  assert.equal(controller.cycleButton(0, -1, [7]), 6);
  assert.equal(controller.buttonLabel(7), "RT");
  assert.equal(controller.buttonLabel(999), "?");
});

test("stick deadzone suppresses drift but keeps analogue travel smooth", () => {
  assert.equal(controller.normalizeAxis(0.12, 0.18), 0);
  assert.equal(controller.normalizeAxis(-0.18, 0.18), 0);
  assert.equal(controller.normalizeAxis(1, 0.18), 1);
  assert.equal(controller.normalizeAxis(-1, 0.18), -1);
  assert.ok(controller.normalizeAxis(0.5, 0.18) > 0.38);
  assert.ok(controller.normalizeAxis(0.5, 0.18) < 0.40);
  assert.equal(controller.normalizeAxis(NaN, 0.18), 0);
});

test("gamepad control helpers tolerate missing APIs and avoid phantom presses", () => {
  assert.equal(controller.pressed(null, 0), false);
  assert.equal(controller.pressed(pad([0]), 1), false);
  assert.equal(controller.anyPressed(pad()), false);
  assert.equal(controller.anyPressed(pad([6])), true);
});
