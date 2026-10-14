const test = require("node:test");
const assert = require("node:assert/strict");
const modes = require("../src/modes.js");

test("classic remains the unchanged default, including the original starting equipment", () => {
  assert.deepEqual(modes.initialSetup(undefined, 4, 3, 5),
    { mode:"classic", stageIndex:0, stageMode:"WAVE", hp:3, bomb:2, weaponLevel:1, weaponType:"blue" });
  assert.equal(modes.waveTarget("classic", 32), 32);
  assert.equal(modes.ranked("classic"), true);
});

test("mode and training stage cycle in either direction with safe invalid-value fallbacks", () => {
  assert.equal(modes.cycleMode("classic",1),"bossRush");
  assert.equal(modes.cycleMode("bossRush",1),"training");
  assert.equal(modes.cycleMode("training",1),"classic");
  assert.equal(modes.cycleMode("classic",-1),"training");
  assert.equal(modes.cycleStage(0,-1),4);
  assert.equal(modes.cycleStage(4,1),0);
  assert.equal(modes.clampStage(-99),0);
  assert.equal(modes.clampStage(999),4);
  assert.equal(modes.clampStage(NaN),0);
});

test("Boss Rush starts at Boss 1 with level-two weapon and progresses through five bosses", () => {
  const setup=modes.initialSetup("bossRush",4,4,6);
  assert.equal(setup.stageIndex,0);
  assert.equal(setup.stageMode,"BOSS");
  assert.equal(setup.weaponLevel,2);
  assert.equal(setup.hp,4);
  for(let i=0;i<4;i++) {
    const next=modes.nextAfterBoss("bossRush",i,1);
    assert.deepEqual([next.kind,next.stageIndex,next.loop],["advance",i+1,1]);
  }
  assert.equal(modes.nextAfterBoss("bossRush",4,1).kind,"complete");
  assert.equal(modes.ranked("bossRush"),true);
});

test("Training chooses any stage, starts at maximum HP and level-three equipment", () => {
  const setup=modes.initialSetup("training",3,3,5);
  assert.deepEqual(setup,{mode:"training",stageIndex:3,stageMode:"WAVE",hp:5,bomb:3,weaponLevel:3,weaponType:"blue"});
  assert.equal(modes.waveTarget("training",999),10);
  assert.deepEqual(modes.nextAfterBoss("training",3,1,5,3),
    {kind:"repeat",stageIndex:3,loop:1,text:"TRAINING ROUND COMPLETE"});
  assert.equal(modes.ranked("training"),false);
});

test("classic fifth-stage clear retains increasing endless-loop semantics", () => {
  const v=modes.nextAfterBoss("classic",4,2);
  assert.deepEqual([v.kind,v.stageIndex,v.loop],["advance",0,3]);
  const next=modes.nextAfterBoss("classic",0,3);
  assert.deepEqual([next.kind,next.stageIndex,next.loop],["advance",1,3]);
});
