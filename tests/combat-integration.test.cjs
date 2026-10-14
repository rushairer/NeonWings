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

const gameSource = fs.readFileSync(path.join(__dirname, "../src/game.js"), "utf8");

function makeCanvasContext() {
  const gradient = () => ({ addColorStop() {} });
  return new Proxy({ createLinearGradient: gradient, createRadialGradient: gradient }, {
    get(target, key) {
      return target[key] ?? (() => {});
    }
  });
}

function boot() {
  const ctx = makeCanvasContext();
  const events = new Map();
  const documentEvents = new Map();
  const canvas = { style: {}, getContext: () => ctx };
  const storage = new Map();
  const window = {
    NeonPlatform: platform, NeonController: controller, NeonCombat: combat, NeonCollision: collision, NeonEnemyBehaviors: enemyBehaviors,
    innerWidth: 1280, innerHeight: 960,
    addEventListener: (name, fn) => events.set(name, fn)
  };
  const document = {
    hidden: false,
    getElementById: () => canvas,
    addEventListener: (name, fn) => documentEvents.set(name, fn)
  };
  const context = vm.createContext({
    window, document, console,
    navigator: { getGamepads: () => [] },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value))
    },
    requestAnimationFrame: () => {},
    setTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    performance: { now: () => 100 }
  });
  vm.runInContext(gameSource, context, { filename: "src/game.js" });
  return { events, documentEvents, eval: code => vm.runInContext(code, context) };
}

test("grazing a bullet outside the hitbox charges exactly once without damage", () => {
  const app = boot();
  app.eval(`game.state = "PLAYING";
    game.player.x = 100; game.player.y = 100;
    game.enemyBullets = [{ x: 100, y: 155, vx: 0, vy: 0, r: 8, life: 3 }]`);
  app.eval("updateEnemyBullets(0); updateEnemyBullets(0)");
  assert.equal(app.eval("game.combat.energy"), 10);
  assert.equal(app.eval("game.combat.grazes"), 1);
  assert.equal(app.eval("game.hp"), 3);
  assert.equal(app.eval("game.enemyBullets[0].grazed"), true);
});

test("a real enemy bullet hit never gives graze charge, even when nearby", () => {
  const app = boot();
  app.eval(`game.state = "PLAYING";
    game.player.x = 100; game.player.y = 100;
    game.enemyBullets = [{ x: 100, y: 121, vx: 0, vy: 0, r: 8, life: 3 }];
    updateEnemyBullets(0)`);
  assert.equal(app.eval("game.hp"), 2);
  assert.equal(app.eval("game.combat.grazes"), 0);
  assert.equal(app.eval("game.combat.energy"), 0);
});

test("six normal enemy kills progress chain and points, and hitting player resets chain", () => {
  const app = boot();
  app.eval(`game.state = "PLAYING";
    for (let i = 0; i < 6; i++) {
      const e = { hp: 1, maxHp: 1, r: 28, x: 400, y: 400, score: 100, kind: "scout", color: "#ffffff", core: "#eeeeee" };
      damageEnemy(e, 3, 400, 400);
    }`);
  assert.equal(app.eval("game.stats.kills"), 6);
  assert.equal(app.eval("game.combat.combo"), 6);
  assert.equal(app.eval("game.score"), 700);
  assert.equal(app.eval("game.combat.maxCombo"), 6);
  app.eval("damagePlayer()");
  assert.equal(app.eval("game.combat.combo"), 0);
  assert.equal(app.eval("game.hp"), 2);
});

test("bomb kills count toward wave clear without farming combo or energy", () => {
  const app = boot();
  app.eval(`game.state = "PLAYING";
    game.waveKills = killTarget() - 1;
    game.enemies = [{hp: 1, maxHp: 1, r: 28, x: 700, y: 500, score: 40, kind: "scout", color: "#ffffff", core: "#eeeeee"}];
    useBomb()`);
  assert.equal(app.eval("game.stats.kills"), 1);
  assert.equal(app.eval("game.combat.combo"), 0);
  assert.equal(app.eval("game.combat.energy"), 0);
  assert.equal(app.eval("game.stageMode"), "BOSS");
  assert.equal(app.eval("game.bomb"), 1);
});

test("overdrive is manually activated and freezes in pause / stage transition", () => {
  const app = boot();
  app.eval('game.state = "PLAYING"; game.combat.energy = 100');
  assert.equal(app.eval("activateOverdrive()"), true);
  assert.equal(app.eval("game.combat.active"), 6);
  assert.equal(app.eval("game.combat.energy"), 0);
  app.eval("pauseGame()");
  assert.equal(app.eval("game.state"), "PAUSED");
  assert.equal(app.eval("game.combat.active"), 6);
  app.eval('game.state = "PLAYING"; game.stageMode = "TRANSITION"; updatePlaying(0.02)');
  assert.equal(app.eval("game.combat.active"), 6);
  app.eval('game.stageMode = "WAVE"; updatePlaying(0.02)');
  assert.ok(app.eval("game.combat.active") < 6);
});

test("Vanguard Overdrive first guard blocks real damage, second hit cancels drive", () => {
  const app = boot();
  app.eval(`menu.selectedShip = 1; game = newGame(); game.state = "PLAYING";
    game.combat.energy = 100; activateOverdrive(); damagePlayer()`);
  assert.equal(app.eval("game.hp"), 4);
  assert.equal(app.eval("game.combat.guard"), 0);
  assert.equal(app.eval("game.combat.active"), 7);
  assert.equal(app.eval("game.stats.damageTaken"), 0);
  app.eval("game.invuln = 0; damagePlayer()");
  assert.equal(app.eval("game.hp"), 3);
  assert.equal(app.eval("game.combat.active"), 0);
  assert.equal(app.eval("game.stats.damageTaken"), 1);
});

test("blue Overdrive lance hits each enemy once, up to three distinct targets", () => {
  const app = boot();
  app.eval(`game.state = "PLAYING"; game.combat.energy = 100;
    activateOverdrive(); game.weaponType = "blue"; firePlayerWeapons();
    const lance = game.bullets.find(b => b.lance);
    game.enemies = Array.from({length: 3}, (_, i) => ({
      hp: 20, maxHp: 20, r: 35, x: lance.x + 14, y: lance.y, score: 40,
      kind: "scout", color: "#ffffff", core: "#eeeeee"
    }));
    updatePlayerBullets(0.01)`);
  assert.equal(app.eval("game.enemies.every(e => e.hp < 20)"), true);
  assert.equal(app.eval("game.bullets.some(b => b.lance)"), false);
});

test("purple Overdrive enhances close-range hit damage", () => {
  const app = boot();
  app.eval(`game.state = "PLAYING"; game.combat.energy = 100; activateOverdrive();
    game.weaponType = "purple"; firePlayerWeapons();
    const bullet = game.bullets[0];
    game.enemies = [{hp: 20, maxHp: 20, r: 35, x: bullet.x, y: bullet.y,
      score: 40, kind: "scout", color: "#ffffff", core: "#eeeeee"}];
    updatePlayerBullets(0)`);
  // All spread shots begin at the same muzzle position; the close target absorbs five.
  assert.equal(app.eval("game.bullets.length"), 0);
  assert.ok(app.eval("game.enemies[0].hp") < 14);
});

test("yellow Overdrive missiles are distributed among nearby targets", () => {
  const app = boot();
  app.eval(`game.state = "PLAYING"; game.combat.energy = 100; activateOverdrive();
    game.weaponType = "yellow";
    game.enemies = [0, 1, 2].map(i => ({
      hp: 20, maxHp: 20, x: 550 + 90 * i, y: 370 + i * 120, r: 25
    }));
    firePlayerWeapons()`);
  assert.ok(app.eval("game.missiles.length") >= 4);
  assert.equal(app.eval("game.missiles.every(m => m.overdrive)"), true);
  assert.ok(app.eval("new Set(game.missiles.map(m => findMissileTarget(m))).size") >= 2);
});

test("title, active gameplay, paused controller options and game over render without errors", () => {
  const app = boot();
  app.eval("drawFrame(0.016)");
  app.eval('game.state = "PLAYING"; game.combat.energy = 100; activateOverdrive(); drawFrame(0.016)');
  app.eval('game.state = "PAUSED"; pauseMenu.page = "controls"; drawFrame(0.016)');
  app.eval('game.state = "GAME_OVER"; drawFrame(0.016)');
});

test("fast blue shot crosses a target between frame endpoints without tunneling", () => {
  const app = boot();
  app.eval(`game.state = "PLAYING";
    game.enemies = [{kind:"scout", x:350, y:500, r:10, hp:3, maxHp:3,
      score:30, color:"#f88", core:"#fff"}];
    game.bullets = [{x:250, y:500, vx:1200, vy:0, r:8, power:1, c:"#0ff"}];
    updatePlayerBullets(0.16)`);
  assert.ok(app.eval("game.enemies[0].hp") < 3);
  assert.equal(app.eval("game.bullets.length"), 0);
});

test("fast enemy bullet crossing the ship causes damage even when both endpoints are safe", () => {
  const app = boot();
  app.eval(`game.state="PLAYING";
    game.player.x=100; game.player.y=100;
    game.enemyBullets=[{x:0,y:100,vx:600,vy:0,r:8,life:2}];
    updateEnemyBullets(0.32)`);
  assert.equal(app.eval("game.hp"), 2);
  assert.equal(app.eval("game.combat.grazes"), 0);
});

test("simultaneous lethal hit overrides near-miss graze regardless of bullet list order", () => {
  const app = boot();
  app.eval(`game.state="PLAYING";
    game.player.x=100; game.player.y=100;
    game.enemyBullets=[
      {x:100,y:150,vx:0,vy:0,r:8,life:2},
      {x:100,y:115,vx:0,vy:0,r:8,life:2}
    ];
    updateEnemyBullets(0)`);
  assert.equal(app.eval("game.hp"), 2);
  assert.equal(app.eval("game.combat.grazes"), 0);
  assert.equal(app.eval("game.combat.energy"), 0);
});

test("large particle and bullet volleys have strict bounded memory budgets", () => {
  const app = boot();
  app.eval(`game.state="PLAYING";
    for(let i=0; i<1500; i++) addParticle(100,100,0,0,1,"#fff");
    for(let i=0; i<500; i++) addPlayerShot(100,100,100,0);
    for(let i=0; i<520; i++) aimAtPlayer(600,500,300,8,"#f00","#fff");
    for(let i=0; i<120; i++) addMissile(100,100,1,2)`);
  assert.equal(app.eval("game.particles.length"), 800);
  assert.equal(app.eval("game.bullets.length"), 240);
  assert.equal(app.eval("game.enemyBullets.length"), 340);
  assert.equal(app.eval("game.missiles.length"), 48);
});

test("F3 debug HUD toggles without affecting gameplay or overriding held keys", () => {
  const app = boot();
  app.eval('game.state="PLAYING"');
  assert.equal(app.eval("performanceOverlay"), false);
  app.events.get("keydown")({ code:"F3", repeat:false, preventDefault() {} });
  assert.equal(app.eval("performanceOverlay"), true);
  app.eval("drawFrame(0.016)");
  app.events.get("keydown")({ code:"F3", repeat:true, preventDefault() {} });
  assert.equal(app.eval("performanceOverlay"), true);
  app.events.get("keydown")({ code:"F3", repeat:false, preventDefault() {} });
  assert.equal(app.eval("performanceOverlay"), false);
});

test("shield absorbs frontal damage before hull damage, visibly breaks after depletion", () => {
  const app = boot();
  app.eval(`game.state="PLAYING"; game.stageIndex=2;
    spawnEnemyOfKind("shield", 600, 480, {vx:0, vy:0})`);
  const hp=app.eval("game.enemies[0].hp");
  const shield=app.eval("game.enemies[0].shieldHp");
  app.eval("damageEnemy(game.enemies[0], 2, 570, 480)");
  assert.equal(app.eval("game.enemies[0].hp"), hp);
  assert.equal(app.eval("game.enemies[0].shieldHp"), shield-2);
  app.eval("damageEnemy(game.enemies[0], 99, 570, 480)");
  assert.equal(app.eval("game.enemies[0].shieldHp"), 0);
  assert.equal(app.eval("game.enemies[0].hp <= 0"), true);
});

test("flanking around a shield unit damages its hull without consuming armor", () => {
  const app = boot();
  app.eval(`game.state="PLAYING"; game.stageIndex=2;
    spawnEnemyOfKind("shield", 600, 480, {vx:0, vy:0});
    game.player.x=750`);
  const hp=app.eval("game.enemies[0].hp");
  const shield=app.eval("game.enemies[0].shieldHp");
  app.eval("damageEnemy(game.enemies[0], 2, 605, 480)");
  assert.equal(app.eval("game.enemies[0].hp"), hp-2);
  assert.equal(app.eval("game.enemies[0].shieldHp"), shield);
});

test("splitters produce exactly two smaller drones, but child kills cannot farm chain, charge or wave progress", () => {
  const app = boot();
  app.eval(`game.state="PLAYING"; game.stageIndex=3;
    spawnEnemyOfKind("splitter", 630, 440, {vx:0, vy:0});
    damageEnemy(game.enemies[0], game.enemies[0].hp + 1, 620, 440)`);
  assert.equal(app.eval("game.enemies.filter(e => e.minion).length"), 2);
  assert.equal(app.eval("game.waveKills"), 1);
  assert.equal(app.eval("game.combat.energy"), 3);
  assert.equal(app.eval("game.combat.combo"), 1);
  app.eval(`for (const e of game.enemies.filter(e=>e.minion))
    damageEnemy(e, e.hp + 1, e.x, e.y)`);
  assert.equal(app.eval("game.waveKills"), 1);
  assert.equal(app.eval("game.combat.energy"), 3);
  assert.equal(app.eval("game.combat.combo"), 1);
  assert.equal(app.eval("game.stats.kills"), 3);
});

test("carriers launch at most three escorts with a per-carrier live-escort limit", () => {
  const app = boot();
  app.eval(`game.state="PLAYING"; game.stageIndex=4;
    spawnEnemyOfKind("carrier", 900, 480, {vx:0,vy:0,shootCd:9})`);
  app.eval("updateEnemies(1.1)");
  assert.equal(app.eval("game.enemies.filter(e => e.minion).length"), 1);
  assert.equal(app.eval("game.enemies[0].launchedEscorts"), 1);
  app.eval("updateEnemies(3.0); updateEnemies(3.0); updateEnemies(3.0)");
  assert.equal(app.eval("game.enemies[0].launchedEscorts"), 3);
  assert.ok(app.eval("game.enemies.filter(e => e.minion).length") <= 2);
});

test("first stage formations never spawn late-game shield enemies and enemy count is bounded", () => {
  const app = boot();
  app.eval(`game.state="PLAYING"; game.stageIndex=0; game.loop=1; game.t=21;
    spawnFormation()`);
  assert.equal(app.eval("game.enemies.every(e => stageDef().enemies.includes(e.kind))"), true);
  assert.ok(app.eval("game.enemies.some(e => e.kind === 'gunner')"));
  app.eval("for(let i=0;i<500;i++) spawnEnemyOfKind('scout',600,480)");
  assert.equal(app.eval("game.enemies.length"), 84);
});

test("BOMB immediately destroys a splitter without causing a second enemy wave", () => {
  const app = boot();
  app.eval(`game.state="PLAYING"; game.stageIndex=3; game.bomb=2;
    spawnEnemyOfKind("splitter", 700, 480, {vx:0,vy:0});
    useBomb()`);
  assert.equal(app.eval("game.enemies.filter(e => e.minion).length"), 0);
  assert.equal(app.eval("game.enemies.length"), 0);
  assert.equal(app.eval("game.waveKills"), 1);
  assert.equal(app.eval("game.combat.energy"), 0);
});

test("shield and carrier visual telegraphs render in Canvas smoke environment", () => {
  const app = boot();
  app.eval(`game.state="PLAYING"; game.stageIndex=4;
    spawnEnemyOfKind("shield", 750, 440, {vx:0,vy:0});
    spawnEnemyOfKind("carrier", 880, 530, {vx:0,vy:0});
    game.enemies[1].launchCooldown=0.55;
    drawFrame(0.016)`);
});
