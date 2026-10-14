/* Pure, dependency-free rules for NEON OVERDRIVE. No DOM, audio or renderer coupling. */
(function (root) {
  "use strict";
  const ENERGY_MAX = 100;
  const COMBO_WINDOW = 3.8;
  const CONFIG = Object.freeze({ ENERGY_MAX, COMBO_WINDOW, FALCON_DURATION: 6.0, VANGUARD_DURATION: 7.0 });

  function createState() {
    return {
      energy: 0, active: 0, guard: 0,
      combo: 0, comboTime: 0, maxCombo: 0, bestMultiplier: 1,
      grazes: 0, activations: 0
    };
  }

  function isActive(state) {
    return state.active > 0;
  }

  function multiplier(combo) {
    return Math.min(5, 1 + Math.floor(Math.max(0, combo - 1) / 5));
  }

  function gainEnergy(state, amount) {
    if (isActive(state)) return false;
    const before = state.energy;
    state.energy = Math.min(ENERGY_MAX, Math.max(0, state.energy + amount));
    return before < ENERGY_MAX && state.energy === ENERGY_MAX;
  }

  function registerKill(state, basePoints, shipId, source = "shot") {
    // A bomb is defensive; clearing a screen must not farm charge / combo.
    if (source === "bomb") return { points: Math.round(basePoints), multiplier: 1, ready: false };
    state.combo += 1;
    state.comboTime = COMBO_WINDOW;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    const multi = multiplier(state.combo);
    state.bestMultiplier = Math.max(state.bestMultiplier, multi);
    const ready = gainEnergy(state, shipId === "vanguard" ? 5 : 3);
    return { points: Math.round(basePoints * multi), multiplier: multi, ready };
  }

  function registerGraze(state, bullet, x, y, hitbox, shipId, sweptDistance = null) {
    if (!bullet || bullet.grazed || !(bullet.life > 0)) return { grazed: false, ready: false };
    const dx = bullet.x - x, dy = bullet.y - y;
    const distance = sweptDistance == null ? Math.hypot(dx, dy) : sweptDistance;
    const collision = hitbox + bullet.r;
    const margin = shipId === "falcon" ? 43 : 32;
    if (!(distance > collision && distance <= collision + margin)) return { grazed: false, ready: false };
    bullet.grazed = true;
    state.grazes += 1;
    const ready = gainEnergy(state, shipId === "falcon" ? 10 : 7);
    return { grazed: true, ready };
  }

  function activate(state, shipId) {
    if (state.energy < ENERGY_MAX || isActive(state)) return false;
    state.energy = 0;
    state.active = shipId === "vanguard" ? CONFIG.VANGUARD_DURATION : CONFIG.FALCON_DURATION;
    state.guard = shipId === "vanguard" ? 1 : 0;
    state.activations += 1;
    return true;
  }

  function takeHit(state, shipId) {
    if (isActive(state) && shipId === "vanguard" && state.guard > 0) {
      state.guard = 0;
      return { blocked: true };
    }
    state.combo = 0;
    state.comboTime = 0;
    state.energy = Math.max(0, state.energy - (shipId === "vanguard" ? 15 : 25));
    state.active = 0;
    state.guard = 0;
    return { blocked: false };
  }

  function tick(state, dt) {
    if (!Number.isFinite(dt) || dt <= 0) return false;
    const prev = state.active;
    state.active = Math.max(0, state.active - dt);
    if (prev > 0 && state.active === 0) state.guard = 0;
    if (state.comboTime > 0) {
      state.comboTime = Math.max(0, state.comboTime - dt);
      if (state.comboTime === 0) state.combo = 0;
    }
    return prev > 0 && state.active === 0;
  }

  function weaponDamageScale(state, shipId) {
    if (!isActive(state)) return 1;
    return shipId === "vanguard" ? 1.3 : 1.12;
  }

  const api = Object.freeze({ CONFIG, createState, isActive, multiplier, gainEnergy, registerKill, registerGraze, activate, takeHit, tick, weaponDamageScale });
  root.NeonCombat = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
