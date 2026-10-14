/* Arcade-mode progression rules, independent of Canvas and WebAudio. */
(function (root) {
  "use strict";
  const MODES = Object.freeze([
    Object.freeze({id:"classic", name:"CLASSIC ARCADE", description:"FIVE STAGES / ENDLESS LOOPS", ranked:true}),
    Object.freeze({id:"bossRush", name:"BOSS RUSH", description:"FIVE BOSSES / NO WAVE GRIND", ranked:true}),
    Object.freeze({id:"training", name:"TRAINING", description:"STAGE PRACTICE / NO RANKING", ranked:false})
  ]);
  const MAX_STAGES = 5;
  const TRAINING_KILLS = 10;

  function modeById(id) {
    return MODES.find(m => m.id === id) || MODES[0];
  }
  function cycleMode(current, delta) {
    const idx = MODES.findIndex(m => m.id === current);
    const n = MODES.length;
    return MODES[((idx < 0 ? 0 : idx) + (delta < 0 ? -1 : 1) + n) % n].id;
  }
  function clampStage(value) {
    const i = Number(value);
    return Number.isFinite(i) ? Math.max(0, Math.min(MAX_STAGES - 1, Math.trunc(i))) : 0;
  }
  function cycleStage(stage, delta) {
    return (clampStage(stage) + (delta < 0 ? -1 : 1) + MAX_STAGES) % MAX_STAGES;
  }
  function initialSetup(id, practiceStage, baseHP, hpMax) {
    const mode = modeById(id).id;
    if (mode === "bossRush") {
      return { mode, stageIndex:0, stageMode:"BOSS", hp:baseHP, bomb:2, weaponLevel:2, weaponType:"blue" };
    }
    if (mode === "training") {
      return {
        mode, stageIndex:clampStage(practiceStage), stageMode:"WAVE",
        hp:hpMax, bomb:3, weaponLevel:3, weaponType:"blue"
      };
    }
    return { mode:"classic", stageIndex:0, stageMode:"WAVE", hp:baseHP, bomb:2, weaponLevel:1, weaponType:"blue" };
  }

  function waveTarget(mode, classicTarget) {
    return mode === "training" ? TRAINING_KILLS : classicTarget;
  }

  function nextAfterBoss(mode, stageIndex, loop, stageCount = MAX_STAGES, practiceStage = 0) {
    if (mode === "bossRush") {
      return stageIndex + 1 >= stageCount
        ? { kind:"complete", stageIndex, loop, text:"ALL FIVE BOSSES DEFEATED" }
        : { kind:"advance", stageIndex:stageIndex + 1, loop:1, text:"NEXT BOSS INCOMING" };
    }
    if (mode === "training") {
      return { kind:"repeat", stageIndex:clampStage(practiceStage), loop:1, text:"TRAINING ROUND COMPLETE" };
    }
    return stageIndex + 1 >= stageCount
      ? { kind:"advance", stageIndex:0, loop:loop + 1, text:`5 STAGES CLEAR / LOOP ${loop + 1} START` }
      : { kind:"advance", stageIndex:stageIndex + 1, loop, text:"STAGE CLEAR / NEXT AREA" };
  }

  function ranked(mode) {
    return modeById(mode).ranked;
  }

  const api = Object.freeze({
    MODES, MAX_STAGES, TRAINING_KILLS, modeById, cycleMode,
    clampStage, cycleStage, initialSetup, waveTarget, nextAfterBoss, ranked
  });
  root.NeonModes = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
