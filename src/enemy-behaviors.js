/* Pure tactical enemy rules, independent from Canvas and the spawning engine. */
(function (root) {
  "use strict";

  const CONFIG = Object.freeze({
    maxEnemies: 84,
    splitterChildren: 2,
    carrierMaxLaunches: 3,
    carrierMaxAliveEscorts: 2,
    carrierLaunchPeriod: 2.9,
    carrierFirstLaunch: 1.1
  });

  function initializeEnemy(enemy) {
    if (enemy.kind === "shield") {
      enemy.shieldMax = Math.max(2, Math.ceil(enemy.maxHp * 0.75));
      enemy.shieldHp = enemy.shieldMax;
    }
    if (enemy.kind === "carrier") {
      enemy.launchCooldown = CONFIG.carrierFirstLaunch;
      enemy.launchedEscorts = 0;
    }
    return enemy;
  }

  function applyFrontalShield(enemy, damage, attackerX) {
    if (!(damage > 0)) return { hullDamage: 0, absorbed: 0, broken: false };
    if (enemy.kind !== "shield" || !(enemy.shieldHp > 0) || attackerX >= enemy.x) {
      return { hullDamage: damage, absorbed: 0, broken: false };
    }
    const absorbed = Math.min(enemy.shieldHp, damage);
    enemy.shieldHp = Math.max(0, enemy.shieldHp - absorbed);
    return { hullDamage: damage - absorbed, absorbed, broken: enemy.shieldHp === 0 };
  }

  function splitterCount(enemy, stageMode, availableSlots) {
    if (stageMode !== "WAVE" || enemy.kind !== "splitter" || enemy.minion) return 0;
    return Math.min(CONFIG.splitterChildren, Math.max(0, Math.floor(availableSlots)));
  }

  function maybeLaunchEscort(enemy, stageMode, activeEscorts, availableSlots, dt) {
    if (enemy.kind !== "carrier" || enemy.minion) return false;
    if (Number.isFinite(dt) && dt > 0) enemy.launchCooldown = Math.max(0, enemy.launchCooldown - dt);
    if (stageMode !== "WAVE" || availableSlots < 1 || activeEscorts >= CONFIG.carrierMaxAliveEscorts) return false;
    if (enemy.launchedEscorts >= CONFIG.carrierMaxLaunches || enemy.launchCooldown > 1e-6) return false;
    enemy.launchedEscorts += 1;
    enemy.launchCooldown = CONFIG.carrierLaunchPeriod;
    return true;
  }

  function rewardsFor(enemy) {
    return enemy.minion
      ? Object.freeze({ countsTowardWave: false, chargeAndCombo: false, dropsPowerup: false })
      : Object.freeze({ countsTowardWave: true, chargeAndCombo: true, dropsPowerup: true });
  }

  const api = Object.freeze({ CONFIG, initializeEnemy, applyFrontalShield, splitterCount, maybeLaunchEscort, rewardsFor });
  root.NeonEnemyBehaviors = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
