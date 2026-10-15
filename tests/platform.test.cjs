const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const platform = require("../src/platform.js");
const controller = require("../src/controller.js");
const combat = require("../src/combat.js");
const collision = require("../src/collision.js");
const enemyBehaviors = require("../src/enemy-behaviors.js");
const worlds = require("../src/worlds.js");
const bossParts = require("../src/boss-parts.js");
const modes = require("../src/modes.js");
const records = require("../src/records.js");
const selectLayout = require("../src/select-layout.js");

const gameSource = fs.readFileSync(path.join(__dirname, "../src/game.js"), "utf8");

function boot(options = {}) {
  const windowEvents = new Map();
  const documentEvents = new Map();
  const canvas = { style: {}, getContext: () => ({}) };
  const storageData = new Map();
  const localStorage = {
    getItem(key) {
      if (options.storageBlocked) throw Error("Storage unavailable");
      return storageData.get(key) ?? null;
    },
    setItem(key, value) {
      if (options.storageBlocked) throw Error("Storage unavailable");
      storageData.set(key, String(value));
    }
  };
  const browserWindow = {
    NeonPlatform: platform,
    NeonController: controller,
    NeonCombat: combat,
    NeonCollision: collision,
    NeonEnemyBehaviors: enemyBehaviors,
    NeonWorlds: worlds,
    NeonBossParts: bossParts,
    NeonModes: modes,
    NeonRecords: records,
    NeonSelectLayout: selectLayout,
    innerWidth: options.width || 1920,
    innerHeight: options.height || 1080,
    addEventListener: (event, fn) => windowEvents.set(event, fn)
  };
  const document = {
    hidden: false,
    getElementById: () => canvas,
    addEventListener: (event, fn) => documentEvents.set(event, fn)
  };
  const context = vm.createContext({
    window: browserWindow, document, localStorage,
    navigator: { getGamepads: () => [] },
    performance: { now: () => 100 },
    requestAnimationFrame: () => {},
    setInterval: () => 1, clearInterval: () => {},
    setTimeout: () => 1,
    console
  });
  vm.runInContext(gameSource, context, { filename: "src/game.js" });
  const evaluate = (code) => vm.runInContext(code, context);
  return { windowEvents, documentEvents, browserWindow, document, canvas, evaluate };
}

test("letterboxes without stretching on wide and portrait viewports", () => {
  assert.deepEqual(platform.calculateViewport(1280, 960, 1920, 1080), {
    width: 1440, height: 1080, left: 240, top: 0
  });
  assert.deepEqual(platform.calculateViewport(1280, 960, 390, 844), {
    width: 390, height: 292, left: 0, top: 276
  });
});

test("settings coercion rejects NaN and clamps finite values", () => {
  assert.equal(platform.finiteClamped("oops", 1, 0, 2), 1);
  assert.equal(platform.finiteClamped(10, 1, 0, 2), 2);
  assert.equal(platform.finiteClamped(-5, 1, 0, 2), 0);
});

test("title boots and resizes the original playfield", () => {
  const game = boot();
  assert.equal(game.evaluate("game.state"), "TITLE");
  assert.equal(game.canvas.style.width, "1440px");
  assert.equal(game.canvas.style.left, "240px");
  game.browserWindow.innerWidth = 800;
  game.browserWindow.innerHeight = 600;
  game.windowEvents.get("resize")();
  assert.equal(game.canvas.style.width, "800px");
  assert.equal(game.canvas.style.height, "600px");
});

test("blur pauses gameplay and clears held shooting key", () => {
  const game = boot();
  game.evaluate('game.state = "PLAYING"; keys.Space = true');
  game.windowEvents.get("blur")();
  assert.equal(game.evaluate("game.state"), "PAUSED");
  assert.equal(game.evaluate("keys.Space"), false);
  assert.match(game.evaluate("game.message"), /FOCUS LOST/);
});

test("hiding the page pauses instead of advancing gameplay in background", () => {
  const game = boot();
  game.evaluate('game.state = "PLAYING"');
  game.document.hidden = true;
  game.documentEvents.get("visibilitychange")();
  assert.equal(game.evaluate("game.state"), "PAUSED");
});

test("game still starts when localStorage is blocked", () => {
  const game = boot({ storageBlocked: true });
  assert.equal(game.evaluate("game.state"), "TITLE");
  assert.equal(game.evaluate("highScore()"), 0);
  assert.equal(game.evaluate("saveHighScore(250)"), 250);
  assert.equal(game.evaluate("highScore()"), 250);
});

test("static HTML loads platform before game and doesn't embed legacy code", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.ok(html.indexOf('src="./src/platform.js"') < html.indexOf('src="./src/controller.js"'));
  assert.ok(html.indexOf('src="./src/controller.js"') < html.indexOf('src="./src/combat.js"'));
  assert.ok(html.indexOf('src="./src/combat.js"') < html.indexOf('src="./src/collision.js"'));
  assert.ok(html.indexOf('src="./src/collision.js"') < html.indexOf('src="./src/enemy-behaviors.js"'));
  assert.ok(html.indexOf('src="./src/enemy-behaviors.js"') < html.indexOf('src="./src/worlds.js"'));
  assert.ok(html.indexOf('src="./src/worlds.js"') < html.indexOf('src="./src/boss-parts.js"'));
  assert.ok(html.indexOf('src="./src/boss-parts.js"') < html.indexOf('src="./src/modes.js"'));
  assert.ok(html.indexOf('src="./src/modes.js"') < html.indexOf('src="./src/records.js"'));
  assert.ok(html.indexOf('src="./src/records.js"') < html.indexOf('src="./src/select-layout.js"'));
  assert.ok(html.indexOf('src="./src/select-layout.js"') < html.indexOf('src="./src/game.js"'));
  assert.ok(!html.includes("<script>"));
});
