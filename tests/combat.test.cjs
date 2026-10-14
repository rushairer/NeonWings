const test = require("node:test");
const assert = require("node:assert/strict");
const rules = require("../src/combat.js");

test("energy is bounded; killing enemies charges and increases combo scoring", () => {
  const s = rules.createState();
  for (let i = 0; i < 6; i++) rules.registerKill(s, 100, "falcon");
  assert.equal(s.energy, 18);
  assert.equal(s.combo, 6);
  assert.equal(s.maxCombo, 6);
  assert.equal(s.bestMultiplier, 2);
  assert.equal(rules.registerKill(s, 100, "falcon").points, 200);
  for (let i = 0; i < 50; i++) rules.registerKill(s, 100, "falcon");
  assert.equal(s.energy, 100);
  assert.equal(s.bestMultiplier, 5);
  assert.equal(rules.registerKill(s, 100, "falcon").points, 500);
});

test("bomb kills do not exploit combo or energy and have unmultiplied score", () => {
  const s = rules.createState();
  rules.registerKill(s, 50, "falcon");
  const before = { energy: s.energy, combo: s.combo };
  assert.deepEqual(rules.registerKill(s, 50, "falcon", "bomb"), { points: 50, multiplier: 1, ready: false });
  assert.deepEqual({ energy: s.energy, combo: s.combo }, before);
});

test("graze requires strictly non-lethal near pass and counts each bullet only once", () => {
  const state = rules.createState();
  const bullet = { x: 100, y: 150, r: 8, life: 3 };
  assert.equal(rules.registerGraze(state, bullet, 100, 100, 24, "falcon").grazed, true);
  assert.equal(state.energy, 10);
  assert.equal(state.grazes, 1);
  assert.equal(rules.registerGraze(state, bullet, 100, 100, 24, "falcon").grazed, false);
  assert.equal(state.energy, 10);
  assert.equal(rules.registerGraze(state, { x: 100, y: 122, r: 8, life: 3 }, 100, 100, 24, "falcon").grazed, false);
  assert.equal(rules.registerGraze(state, { x: 100, y: 200, r: 8, life: 3 }, 100, 100, 24, "falcon").grazed, false);
  assert.equal(rules.registerGraze(state, { x: 100, y: 150, r: 8, life: 0 }, 100, 100, 24, "falcon").grazed, false);
});

test("Falcon gains more from grazes while Vanguard gains more from kills", () => {
  const f = rules.createState(), v = rules.createState();
  rules.registerGraze(f, { x: 100, y: 145, r: 8, life: 1 }, 100, 100, 24, "falcon");
  rules.registerGraze(v, { x: 100, y: 145, r: 8, life: 1 }, 100, 100, 30, "vanguard");
  assert.equal(f.energy, 10);
  assert.equal(v.energy, 7);
  rules.registerKill(f, 20, "falcon");
  rules.registerKill(v, 20, "vanguard");
  assert.equal(f.energy, 13);
  assert.equal(v.energy, 12);
});

test("overdrive needs full charge; drains and blocks reactivation until refilled", () => {
  const s = rules.createState();
  assert.equal(rules.activate(s, "falcon"), false);
  rules.gainEnergy(s, 100);
  assert.equal(rules.activate(s, "falcon"), true);
  assert.equal(s.active, 6);
  assert.equal(s.energy, 0);
  assert.equal(s.activations, 1);
  assert.equal(rules.activate(s, "falcon"), false);
  assert.equal(rules.gainEnergy(s, 200), false);
  assert.equal(s.energy, 0);
  assert.equal(rules.tick(s, 2), false);
  assert.equal(s.active, 4);
  assert.equal(rules.tick(s, 5), true);
  assert.equal(s.active, 0);
  assert.equal(rules.tick(s, 1), false);
});

test("Vanguard gets a single overdrive guard; second hit damages and cancels overdrive", () => {
  const s = rules.createState();
  rules.gainEnergy(s, 100);
  assert.equal(rules.activate(s, "vanguard"), true);
  assert.equal(s.active, 7);
  assert.equal(s.guard, 1);
  assert.equal(rules.takeHit(s, "vanguard").blocked, true);
  assert.equal(s.guard, 0);
  assert.equal(s.active, 7);
  assert.equal(rules.takeHit(s, "vanguard").blocked, false);
  assert.equal(s.active, 0);
});

test("actual hits break combo and reduce banked energy", () => {
  const s = rules.createState();
  rules.gainEnergy(s, 40);
  rules.registerKill(s, 100, "falcon");
  rules.takeHit(s, "falcon");
  assert.equal(s.combo, 0);
  assert.equal(s.comboTime, 0);
  assert.equal(s.energy, 18);
});

test("combo timer does not advance when tick is not called; expires when running", () => {
  const s = rules.createState();
  rules.registerKill(s, 100, "falcon");
  assert.equal(s.combo, 1);
  rules.tick(s, 3.7);
  assert.equal(s.combo, 1);
  rules.tick(s, 0.2);
  assert.equal(s.combo, 0);
  assert.equal(s.maxCombo, 1);
});

test("damage multipliers are ship-dependent and only active in overdrive", () => {
  const s = rules.createState();
  assert.equal(rules.weaponDamageScale(s, "falcon"), 1);
  rules.gainEnergy(s, 100);
  rules.activate(s, "vanguard");
  assert.equal(rules.weaponDamageScale(s, "vanguard"), 1.3);
  assert.equal(rules.weaponDamageScale(s, "falcon"), 1.12);
});

test("swept grazing distance catches fast near-misses once, never actual hits", () => {
  const s = rules.createState();
  const fast = { x: 500, y: 500, r: 8, life: 4 };
  assert.equal(rules.registerGraze(s, fast, 100, 100, 24, "falcon", 45).grazed, true);
  assert.equal(rules.registerGraze(s, fast, 100, 100, 24, "falcon", 45).grazed, false);
  assert.equal(s.grazes, 1);
  assert.equal(rules.registerGraze(s, {x: 500, y: 500, r: 8, life: 4}, 100, 100, 24, "falcon", 25).grazed, false);
});
