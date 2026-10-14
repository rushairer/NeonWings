const test = require("node:test");
const assert = require("node:assert/strict");
const worlds = require("../src/worlds.js");

test("all five worlds have distinct named telegraphed hazards", () => {
  assert.equal(worlds.PROFILES.length, 5);
  assert.equal(new Set(worlds.PROFILES.map(p => p.kind)).size, 5);
  for (let i = 0; i < 5; i++) {
    const state = worlds.createState(i);
    const before = worlds.step(state, 6.99, i, {x:250, y:450});
    assert.equal(before.warning, false);
    assert.equal(state.phase, "idle");
    assert.equal(worlds.touchesPlayer(state, 250, 450, 24), false);
    const warned = worlds.step(state, 0.01, i, {x:250, y:450});
    assert.equal(warned.warning, true);
    assert.equal(state.phase, "warning");
    assert.equal(worlds.touchesPlayer(state, 250, 450, 24), false);
    const activated = worlds.step(state, worlds.PROFILES[i].warn, i, {x:250, y:450});
    assert.equal(activated.activated, true);
    assert.equal(state.phase, "active");
    const ended = worlds.step(state, worlds.PROFILES[i].live, i, {x:250, y:450});
    assert.equal(ended.ended, true);
    assert.equal(state.phase, "idle");
  }
});

test("hazard clocks freeze outside active wave/boss and reset on stage transition", () => {
  const s = worlds.createState(0);
  worlds.step(s, 3, 0, {x:250, y:450});
  assert.equal(s.time, 4);
  worlds.step(s, 50, 0, {x:250, y:450}, "TRANSITION");
  assert.equal(s.time, 4);
  worlds.step(s, 2, 0, {x:250, y:450}, "BOSS_REWARD");
  assert.equal(s.time, 4);
  worlds.step(s, 0.5, 1, {x:250, y:450}, "TRANSITION");
  assert.equal(s.stageIndex, 1);
  assert.equal(s.phase, "idle");
  assert.equal(s.time, 7);
});

test("rail and cryo rectangles are lethal only inside expanded warning zone when active", () => {
  const rail = worlds.geometryFor(0, {x:250,y:450}, 0);
  assert.equal(worlds.contains(rail, rail.x, 450, 24), true);
  assert.equal(worlds.contains(rail, rail.x + rail.halfWidth + 40, 450, 24), false);
  const cryo = worlds.geometryFor(2, {x:250,y:450}, 0);
  assert.equal(worlds.contains(cryo, 250, cryo.y - cryo.halfHeight - 20, 24), true);
  assert.equal(worlds.contains(cryo, 250, cryo.y - cryo.halfHeight - 40, 24), false);
});

test("rockfall and spore circles hit with radius and leave safe space", () => {
  for (const stage of [1,3]) {
    const h = worlds.geometryFor(stage, {x:380,y:410}, 0);
    assert.equal(worlds.contains(h, h.x, h.y, 25), true);
    assert.equal(worlds.contains(h, h.x + h.radius + 24, h.y, 25), true);
    assert.equal(worlds.contains(h, h.x + h.radius + 50, h.y, 25), false);
  }
});

test("citadel sweep uses finite diagonal segment not infinite line", () => {
  const sweep = worlds.geometryFor(4, {x:600,y:470}, 0);
  assert.equal(worlds.contains(sweep, sweep.x0, sweep.y0, 10), true);
  assert.equal(worlds.contains(sweep, sweep.x1 + 180, sweep.y1 + 180, 10), false);
  assert.equal(worlds.contains(sweep, sweep.x0, sweep.y0 + 220, 10), false);
});

test("large delta consumes phases without unbounded loops or stale world state", () => {
  const s = worlds.createState(4);
  worlds.step(s, 10, 4, {x:450,y:440}, "WAVE");
  assert.equal(s.phase, "idle");
  assert.equal(s.serial, 1);
  assert.ok(s.time > 1);
});

test("visuals render using standard 2D context and leave alpha state encapsulated", () => {
  const ctx = new Proxy({}, {get: (_, key) => () => {}});
  for (let i = 0; i < 5; i++) {
    worlds.drawAtmosphere(ctx, i, 12, 1280, 960);
    const s = worlds.createState(i);
    s.phase = "warning"; s.hazard = worlds.geometryFor(i, {x:500, y:450});
    worlds.drawHazard(ctx,s);
    s.phase = "active";
    worlds.drawHazard(ctx,s);
  }
});
