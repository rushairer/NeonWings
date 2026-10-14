const test = require("node:test");
const assert = require("node:assert/strict");
const parts = require("../src/boss-parts.js");

function boss() {
  const b = {active:true, x:1030, y:480, rx:92, ry:76, hp:650, maxHp:650};
  b.parts = parts.createParts(b);
  return b;
}

test("two stage-independent but boss-scaled breakable turrets start with positive HP", () => {
  const b = boss();
  assert.equal(b.parts.length, 2);
  assert.equal(b.parts[0].hp, Math.ceil(650 * 0.045));
  assert.equal(b.parts[0].y < 0, true);
  assert.equal(b.parts[1].y > 0, true);
  assert.equal(parts.intact(b.parts), 2);
  assert.equal(parts.attackDelayMultiplier(b), 1);
});

test("swept laser passes through a visible turret on the player-facing side", () => {
  const b = boss(), upper = b.parts[0], lower = b.parts[1];
  assert.equal(parts.findHit(b, 700, b.y+upper.y, 1100, b.y+upper.y, 9), upper);
  assert.equal(parts.findHit(b, 700, b.y+lower.y, 1100, b.y+lower.y, 9), lower);
  assert.equal(parts.findHit(b, 700, b.y, 1100, b.y, 9), null);
  b.active = false;
  assert.equal(parts.findHit(b, 700, b.y+upper.y, 1100, b.y+upper.y, 9), null);
});

test("part damage only reduces turret until broken, then inflicts bounded hull damage", () => {
  const b = boss(), part = b.parts[0];
  const a = parts.damagePart(b, part, 1);
  assert.equal(a.hit, true);
  assert.equal(a.broken, false);
  assert.equal(b.hp, 650);
  const c = parts.damagePart(b, part, 100);
  assert.equal(c.broken, true);
  assert.equal(c.hullDamage, Math.ceil(650 * 0.065));
  assert.equal(b.hp, 650 - c.hullDamage);
  const hp = b.hp;
  assert.equal(parts.damagePart(b, part, 50).hit, false);
  assert.equal(b.hp, hp);
});

test("breaking turrets reliably reduces aimed attack count and total attack frequency", () => {
  const b = boss();
  assert.equal(parts.reducedFanCount(b, 5), 5);
  parts.damagePart(b,b.parts[0],100);
  assert.equal(parts.reducedFanCount(b, 5), 4);
  assert.equal(parts.attackDelayMultiplier(b), 1.32);
  parts.damagePart(b,b.parts[1],100);
  assert.equal(parts.reducedFanCount(b, 5), 3);
  assert.equal(parts.reducedFanCount(b, 1), 1);
  assert.equal(parts.attackDelayMultiplier(b), 1.64);
});

test("part health scales safely for all five boss shapes and later loops", () => {
  for (const [rx,ry,maxHp] of [[92,76,650],[110,68,850],[122,82,1050],[118,90,1250],[142,104,1600],[142,104,4800]]) {
    const b={active:true,x:1050,y:450,rx,ry,hp:maxHp,maxHp};
    b.parts=parts.createParts(b);
    assert.ok(b.parts.every(p => p.hp >= 20 && p.x < -rx && Math.abs(p.y) < ry));
  }
});
