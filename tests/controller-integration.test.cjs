const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const platform = require("../src/platform.js");
const controller = require("../src/controller.js");
const source = fs.readFileSync(path.join(__dirname, "../src/game.js"), "utf8");

function makePad(index = 0) {
  return {
    index, connected: true, axes: [0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }))
  };
}
function press(pad, index, down) {
  pad.buttons[index].pressed = down;
  pad.buttons[index].value = down ? 1 : 0;
}
function boot(storage = new Map()) {
  const listeners = new Map();
  const documentListeners = new Map();
  const pad = makePad();
  const gamepads = [pad];
  const canvas = { style: {}, getContext: () => ({}) };
  const window = {
    innerWidth: 1280, innerHeight: 960,
    NeonPlatform: platform, NeonController: controller,
    addEventListener: (event, callback) => listeners.set(event, callback)
  };
  const document = {
    hidden: false,
    getElementById: () => canvas,
    addEventListener: (event, callback) => documentListeners.set(event, callback)
  };
  const context = vm.createContext({
    window, document,
    navigator: { getGamepads: () => gamepads },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value))
    },
    performance: { now: () => 100 },
    requestAnimationFrame: () => {},
    setTimeout: () => {}, setInterval: () => 1, clearInterval: () => {},
    console
  });
  vm.runInContext(source, context, { filename: "src/game.js" });
  return { pad, gamepads, listeners, documentListeners, storage, eval: code => vm.runInContext(code, context) };
}

test("default B and RT both shoot without consuming BOMB", () => {
  const app = boot();
  app.eval('game.state = "PLAYING"');
  press(app.pad, 1, true);
  assert.equal(app.eval("readInput(0.016)"), true);
  press(app.pad, 1, false);
  press(app.pad, 7, true);
  assert.equal(app.eval("readInput(0.016)"), true);
  press(app.pad, 7, false);
  assert.equal(app.eval("readInput(0.016)"), false);
  assert.equal(app.eval("game.bomb"), 2);
});

test("controller options can remap fire/bomb and persist to another boot", () => {
  const storage = new Map();
  const app = boot(storage);
  app.eval('game.state = "PAUSED"; pauseMenu.page = "main"; pauseMenu.index = 8; activatePauseItem()');
  assert.equal(app.eval('pauseMenu.page'), 'controls');
  app.eval('pauseMenu.index = 1; adjustPauseItem(1)');
  assert.equal(app.eval('settings.firePrimary'), 2);
  app.eval('pauseMenu.index = 3; adjustPauseItem(1)');
  assert.equal(app.eval('settings.bombButton'), 3);
  const after = boot(storage);
  assert.equal(after.eval('settings.firePrimary'), 2);
  assert.equal(after.eval('settings.bombButton'), 3);
  after.eval('game.state = "PLAYING"');
  press(after.pad, 2, true);
  assert.equal(after.eval('readInput(0.016)'), true);
  press(after.pad, 2, false);
  press(after.pad, 3, true);
  after.eval('pollGamepadSystemButtons()');
  assert.equal(after.eval('game.bomb'), 1);
  after.eval('pollGamepadSystemButtons()');
  assert.equal(after.eval('game.bomb'), 1);
  press(after.pad, 3, false);
  after.eval('pollGamepadSystemButtons()');
  press(after.pad, 3, true);
  after.eval('pollGamepadSystemButtons()');
  assert.equal(after.eval('game.bomb'), 0);
});

test("deadzone adjustment affects input, not D-pad controls", () => {
  const app = boot();
  app.eval('game.state = "PLAYING"');
  app.pad.axes[0] = 0.14;
  app.eval('readInput(0.016)');
  assert.equal(app.eval('game.player.vx'), 0);
  app.eval('game.state = "PAUSED"; pauseMenu.page = "controls"; pauseMenu.index = 4; adjustPauseItem(-1)');
  assert.equal(app.eval('settings.stickDeadzone'), 0.16);
  app.eval('game.state = "PLAYING"');
  app.pad.axes[0] = 0.17;
  app.eval('readInput(0.016)');
  assert.ok(app.eval('game.player.vx') > 0);
});

test("controller loss pauses game, and reconnect cannot auto-resume with held START", () => {
  const app = boot();
  app.eval('game.state = "PLAYING"; keys.Space = true');
  app.eval('pollGamepadSystemButtons()');
  app.pad.connected = false;
  app.listeners.get('gamepaddisconnected')({ gamepad: app.pad });
  assert.equal(app.eval('game.state'), 'PAUSED');
  assert.equal(app.eval('keys.Space'), false);
  assert.equal(app.eval('activeGamepadIndex'), null);
  app.pad.connected = true;
  press(app.pad, 9, true);
  app.listeners.get('gamepadconnected')({ gamepad: app.pad });
  app.eval('pollGamepadSystemButtons()');
  assert.equal(app.eval('game.state'), 'PAUSED');
  press(app.pad, 9, false);
  app.eval('pollGamepadSystemButtons()');
  press(app.pad, 9, true);
  app.eval('pollGamepadSystemButtons()');
  assert.equal(app.eval('game.state'), 'PLAYING');
});

test("silent disconnect is detected during polling", () => {
  const app = boot();
  app.eval('game.state = "PLAYING"; pollGamepadSystemButtons()');
  app.gamepads.length = 0;
  app.eval('pollGamepadSystemButtons()');
  assert.equal(app.eval('game.state'), 'PAUSED');
});

test("reset controller settings preserves audio settings and escape exits submenu", () => {
  const app = boot();
  app.eval('settings.master = 0.5; settings.firePrimary = 2; settings.bombButton = 3; game.state = "PAUSED"; pauseMenu.page = "controls"; pauseMenu.index = 5; activatePauseItem()');
  assert.equal(app.eval('settings.master'), 0.5);
  assert.equal(app.eval('settings.firePrimary'), 1);
  assert.equal(app.eval('settings.bombButton'), 0);
  app.listeners.get('keydown')({ code: 'Escape', preventDefault() {} });
  assert.equal(app.eval('game.state'), 'PAUSED');
  assert.equal(app.eval('pauseMenu.page'), 'main');
});
