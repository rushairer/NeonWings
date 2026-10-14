const test = require("node:test");
const assert = require("node:assert/strict");
const c = require("../src/collision.js");

test("swept hit registers when a fast projectile crosses a small enemy between frames", () => {
  assert.equal(c.sweptCircleHit(0, 50, 150, 50, 75, 50, 10), true);
  assert.equal(c.sweptCircleHit(0, 70, 150, 70, 75, 50, 10), false);
  assert.equal(c.sweptCircleHit(0, 60, 150, 60, 75, 50, 10), true);
});

test("stationary or zero-length movement correctly preserves overlap checks", () => {
  assert.equal(c.segmentPointDistanceSq(0, 0, 0, 0, 3, 4), 25);
  assert.equal(c.sweptCircleHit(5, 5, 5, 5, 5, 5, 0), true);
  assert.equal(c.sweptCircleHit(5, 5, 5, 5, 8, 5, 2), false);
});

test("swept boss box checks crossing segments and misses", () => {
  assert.equal(c.sweptAabbHit(0, 10, 200, 10, 75, 125, 0, 25), true);
  assert.equal(c.sweptAabbHit(0, 40, 200, 40, 75, 125, 0, 25), false);
  assert.equal(c.sweptAabbHit(90, 10, 90, 10, 75, 125, 0, 25), true);
  assert.equal(c.sweptAabbHit(90, -10, 90, 35, 75, 125, 0, 25), true);
  assert.equal(c.sweptAabbHit(0, 20, 30, 20, 75, 125, 0, 25), false);
});

test("swept helper is pure and respects segment endpoints", () => {
  assert.equal(c.segmentPointDistanceSq(0, 0, 10, 0, 20, 0), 100);
  assert.equal(c.segmentPointDistanceSq(0, 0, 10, 0, 5, 7), 49);
});
