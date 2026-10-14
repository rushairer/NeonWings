const test = require("node:test");
const assert = require("node:assert/strict");
const rules = require("../src/enemy-behaviors.js");

test("shield absorbs frontal shots with spillover, then exposes hull", () => {
  const enemy = rules.initializeEnemy({kind:"shield", x:400, maxHp:8, hp:8});
  assert.equal(enemy.shieldHp, 6);
  assert.deepEqual(rules.applyFrontalShield(enemy, 4, 100),
    {hullDamage:0, absorbed:4, broken:false});
  assert.deepEqual(rules.applyFrontalShield(enemy, 3, 100),
    {hullDamage:1, absorbed:2, broken:true});
  assert.equal(enemy.shieldHp, 0);
  assert.deepEqual(rules.applyFrontalShield(enemy, 2, 100),
    {hullDamage:2, absorbed:0, broken:false});
});

test("flanking bypasses shield and negative damage never charges it", () => {
  const enemy = rules.initializeEnemy({kind:"shield", x:400, maxHp:10, hp:10});
  const before=enemy.shieldHp;
  assert.equal(rules.applyFrontalShield(enemy, 2, 500).hullDamage, 2);
  assert.equal(enemy.shieldHp, before);
  assert.equal(rules.applyFrontalShield(enemy, -4, 100).hullDamage, 0);
});

test("splitter creates at most two minions, limited by remaining enemy slots", () => {
  const splitter = {kind:"splitter", minion:false};
  assert.equal(rules.splitterCount(splitter, "WAVE", 10), 2);
  assert.equal(rules.splitterCount(splitter, "WAVE", 1), 1);
  assert.equal(rules.splitterCount(splitter, "BOSS", 10), 0);
  assert.equal(rules.splitterCount({kind:"splitter", minion:true}, "WAVE", 10), 0);
  assert.equal(rules.splitterCount({kind:"orb"}, "WAVE", 10), 0);
});

test("carrier launches a bounded number of escorts and waits for the next cycle", () => {
  const carrier=rules.initializeEnemy({kind:"carrier", maxHp:12});
  assert.equal(rules.maybeLaunchEscort(carrier, "WAVE", 0, 80, 0.6),false);
  assert.equal(rules.maybeLaunchEscort(carrier, "WAVE", 0, 80, 0.5),true);
  assert.equal(carrier.launchedEscorts,1);
  assert.equal(rules.maybeLaunchEscort(carrier, "WAVE", 2, 80, 3),false);
  assert.equal(rules.maybeLaunchEscort(carrier, "WAVE", 0, 80, 0),true);
  assert.equal(rules.maybeLaunchEscort(carrier, "WAVE", 0, 80, 3),true);
  assert.equal(rules.maybeLaunchEscort(carrier, "WAVE", 0, 80, 3),false);
  assert.equal(carrier.launchedEscorts,3);
});

test("child drones have reduced payout but cannot farm energy, chain, pickups or wave kills", () => {
  const child=rules.rewardsFor({minion:true});
  assert.deepEqual(child,{countsTowardWave:false,chargeAndCombo:false,dropsPowerup:false});
  assert.deepEqual(rules.rewardsFor({kind:"scout"}),
    {countsTowardWave:true,chargeAndCombo:true,dropsPowerup:true});
});
