const test = require("node:test");
const assert = require("node:assert/strict");
const records = require("../src/records.js");

const backing = () => {
  const values = new Map();
  return {
    getItem: key=>values.get(key) ?? null,
    setItem: (key,val)=>values.set(key,String(val)),
    get values(){return values;}
  };
};

test("ranked run records maintain separate best-five histories and sort descending", () => {
  const storage=backing(),store=records.createStore(storage);
  for(let i=0;i<8;i++)store.add({mode:"classic",score:i*1000,reachedStage:5,loop:1,grade:"A",ship:"falcon"},i+1);
  store.add({mode:"bossRush",score:3200,bossesDefeated:4,grade:"B",ship:"vanguard"},100);
  assert.equal(store.top("classic").length,5);
  assert.deepEqual(store.top("classic").map(x=>x.score),[7000,6000,5000,4000,3000]);
  assert.equal(store.top("bossRush")[0].score,3200);
  assert.equal(records.createStore(storage).top("bossRush")[0].ship,"vanguard");
});

test("training scores never enter ranked history or unlock achievements", () => {
  const store=records.createStore(backing());
  assert.equal(store.add({mode:"training",score:999999}),null);
  assert.deepEqual(store.unlock({mode:"training",bossesDefeated:9,grazes:500},{firstClear:true,rushClear:true}),[]);
  assert.equal(store.top("training").length,0);
  assert.equal(store.achievements().filter(x=>x.unlocked).length,0);
  assert.equal(records.grade("training",{},false),"PRACTICE");
});

test("Boss Rush clear grades are deterministic and reflect perfect survival", () => {
  assert.equal(records.grade("bossRush",{bossesDefeated:5,damageTaken:0},true),"S");
  assert.equal(records.grade("bossRush",{bossesDefeated:5,damageTaken:2},true),"A");
  assert.equal(records.grade("bossRush",{bossesDefeated:3,damageTaken:4},false),"B");
  assert.equal(records.grade("bossRush",{bossesDefeated:1,damageTaken:0},false),"C");
});

test("Classic grades consider reached stages and replay loops", () => {
  assert.equal(records.grade("classic",{reachedStage:1,loop:1},false),"C");
  assert.equal(records.grade("classic",{reachedStage:3,loop:1},false),"B");
  assert.equal(records.grade("classic",{reachedStage:5,loop:1},false),"A");
  assert.equal(records.grade("classic",{reachedStage:5,loop:2},false),"S");
});

test("achievement unlocks persist, deduplicate and do not require a completed run", () => {
  const storage=backing(),store=records.createStore(storage);
  const run={mode:"classic",bossesDefeated:4,reachedStage:5,grazes:30,maxCombo:25,activations:3,damageTaken:2};
  const earned=store.unlock(run,{firstClear:true});
  assert.deepEqual(new Set(earned),new Set(["firstFlight","bossHunter","firstDawn","grazeAce","chainMaster","overdrivePilot"]));
  assert.deepEqual(store.unlock(run,{firstClear:true}),[]);
  assert.equal(records.createStore(storage).achievements().filter(x=>x.unlocked).length,6);
});

test("Titan Slayer and Untouchable require an actual flawless Boss Rush clear", () => {
  const store=records.createStore(backing());
  const run={mode:"bossRush",bossesDefeated:5,damageTaken:0};
  let earned=store.unlock(run,{rushClear:false});
  assert.equal(earned.includes("untouchable"),false);
  earned=store.unlock(run,{rushClear:true});
  assert.deepEqual(new Set(earned),new Set(["titanSlayer","untouchable"]));
});

test("corrupt or blocked storage falls back to playable in-memory state", () => {
  const broken={getItem(){throw Error("blocked")},setItem(){throw Error("blocked")}};
  const store=records.createStore(broken);
  store.add({mode:"classic",score:123,grade:"C"},1);
  assert.equal(store.top("classic")[0].score,123);
  assert.ok(store.unlock({mode:"classic",bossesDefeated:0}).includes("firstFlight"));
  const invalid=backing();
  invalid.setItem(records.STORAGE_KEY,"{");
  assert.deepEqual(records.createStore(invalid).top("classic"),[]);
});

test("stored prototype-like junk and corrupted numbers are ignored", () => {
  const storage=backing();
  storage.setItem(records.STORAGE_KEY,JSON.stringify({
    classic:[null,{},{"mode":"classic","score":-5},{"mode":"classic","score":12,"grade":"S","date":11}],
    bossRush:[{"mode":"bossRush","score":"oops"}],
    achievements:["firstDawn","unknown","firstDawn"]
  }));
  const store=records.createStore(storage);
  assert.equal(store.top("classic").length,1);
  assert.equal(store.top("bossRush").length,0);
  assert.equal(store.achievements().filter(x=>x.unlocked).length,1);
});
