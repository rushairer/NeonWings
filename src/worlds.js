/* Five deterministic, telegraphed arena hazards and lightweight Canvas scenery. */
(function (root) {
  "use strict";
  const W = 1280, H = 960;
  const PROFILES = Object.freeze([
    Object.freeze({ name: "SKYLINE RAIL PULSE", kind: "rail", color: "#38e8ff", warn: 1.45, live: 0.72 }),
    Object.freeze({ name: "CANYON ROCKFALL", kind: "rockfall", color: "#ff9d66", warn: 1.55, live: 0.65 }),
    Object.freeze({ name: "ORBIT CRYO LANE", kind: "cryo", color: "#a7eeff", warn: 1.50, live: 0.85 }),
    Object.freeze({ name: "HIVE SPORE BLOOM", kind: "spore", color: "#69ff8f", warn: 1.65, live: 1.00 }),
    Object.freeze({ name: "CITADEL CORE SWEEP", kind: "sweep", color: "#d79aff", warn: 1.65, live: 0.85 })
  ]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function createState(stageIndex = 0) {
    return { stageIndex, phase: "idle", time: 7, serial: 0, hazard: null };
  }

  function geometryFor(stageIndex, target = {x: 175, y: H / 2}, serial = 0) {
    const x = clamp(Number.isFinite(target.x) ? target.x : 175, 80, W - 100);
    const y = clamp(Number.isFinite(target.y) ? target.y : H / 2, 80, H - 80);
    switch (stageIndex) {
      case 0: return { kind: "rail", x: clamp(x + 270, 360, 1010), halfWidth: 45 };
      case 1: return { kind: "rockfall", x: clamp(x + 175, 320, 1050), y, radius: 103 };
      case 2: return { kind: "cryo", y: clamp(y + (serial % 2 ? -80 : 80), 160, 800), halfHeight: 42 };
      case 3: return { kind: "spore", x: clamp(x + 150, 335, 1010), y, radius: 132 };
      case 4: {
        const y0 = clamp(y - 165 + (serial % 2 ? 110 : 0), 100, 570);
        return { kind: "sweep", x0: 320, y0, x1: 1170, y1: y0 + 300, halfWidth: 39 };
      }
      default: throw new RangeError("Unknown arena index: " + stageIndex);
    }
  }

  function step(state, dt, stageIndex, target, stageMode = "WAVE", loop = 1) {
    if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= PROFILES.length) {
      throw new RangeError("Invalid stage");
    }
    if (state.stageIndex !== stageIndex) Object.assign(state, createState(stageIndex));
    if (stageMode !== "WAVE" && stageMode !== "BOSS") {
      return { warning: false, activated: false, ended: false };
    }
    if (!Number.isFinite(dt) || dt <= 0) return { warning: false, activated: false, ended: false };

    const result = { warning: false, activated: false, ended: false };
    let remaining = Math.min(dt, 10);
    let changes = 0;
    while (remaining > 0 && changes < 8) {
      const consumed = Math.min(remaining, Math.max(0, state.time));
      state.time -= consumed;
      remaining -= consumed;
      if (state.time > 1e-8) break;
      const profile = PROFILES[stageIndex];
      if (state.phase === "idle") {
        state.phase = "warning";
        state.hazard = geometryFor(stageIndex, target, state.serial);
        state.time = profile.warn;
        result.warning = true;
      } else if (state.phase === "warning") {
        state.phase = "active";
        state.time = profile.live;
        result.activated = true;
      } else {
        state.phase = "idle";
        state.hazard = null;
        state.serial += 1;
        state.time = Math.max(6.5, 10 - Math.min(3, loop - 1) * 0.55) + stageIndex * 0.7 + state.serial % 2;
        result.ended = true;
      }
      changes++;
    }
    return result;
  }

  function segmentDistanceSq(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const den = dx * dx + dy * dy;
    const k = den > 0 ? clamp(((px - x0) * dx + (py - y0) * dy) / den, 0, 1) : 0;
    const ox = px - (x0 + dx * k), oy = py - (y0 + dy * k);
    return ox * ox + oy * oy;
  }

  function contains(hazard, x, y, playerRadius = 0) {
    if (!hazard) return false;
    switch (hazard.kind) {
      case "rail": return Math.abs(x - hazard.x) <= hazard.halfWidth + playerRadius;
      case "cryo": return Math.abs(y - hazard.y) <= hazard.halfHeight + playerRadius;
      case "rockfall":
      case "spore": return Math.hypot(x - hazard.x, y - hazard.y) <= hazard.radius + playerRadius;
      case "sweep":
        return segmentDistanceSq(x, y, hazard.x0, hazard.y0, hazard.x1, hazard.y1)
          <= (hazard.halfWidth + playerRadius) ** 2;
      default: return false;
    }
  }

  function touchesPlayer(state, x, y, radius) {
    return state.phase === "active" && contains(state.hazard, x, y, radius);
  }

  function drawAtmosphere(ctx, stageIndex, time, width = W, height = H) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    if (stageIndex === 0) {
      // Skyline: moving distant towers, sparse luminous windows.
      ctx.fillStyle = "#58b8ff";
      for (let i = 0; i < 10; i++) {
        const x = (i * 153 - time * 14 % 153 + width + 153) % (width + 153) - 70;
        const tall = 140 + (i * 43 % 190);
        ctx.fillRect(x, height - tall, 104, tall);
        ctx.fillStyle = "#daf6ff";
        for (let n = 0; n < 5; n++) ctx.fillRect(x + 14 + (n % 2) * 34, height - tall + 24 + n * 24, 8, 5);
        ctx.fillStyle = "#58b8ff";
      }
    } else if (stageIndex === 1) {
      // Canyon: terraced mesas and airborne sand ribbons.
      ctx.fillStyle = "#ed7848";
      for (let i = 0; i < 8; i++) {
        const x = i * 185 - (time * 9 % 185);
        const rise = 75 + (i * 41 % 125);
        ctx.fillRect(x, height - rise, 150, rise);
        ctx.fillRect(x + 28, height - rise - 42, 94, 42);
      }
      ctx.strokeStyle = "#ffca8d";
      ctx.lineWidth = 3;
      for (let i = 0; i < 9; i++) {
        const y = 115 + i * 86;
        ctx.beginPath(); ctx.moveTo((time * 90 + i * 111) % width, y);
        ctx.lineTo(((time * 90 + i * 111) % width) + 90, y + 8); ctx.stroke();
      }
    } else if (stageIndex === 2) {
      // Orbit: large planetary limb, satellites and arc geometry.
      ctx.strokeStyle = "#a6eeff";
      ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(width - 50, 130, 170 + i * 62, 75 + i * 47, -0.35, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#b1d8ff";
      ctx.beginPath(); ctx.arc(width - 50, 130, 105, 0, Math.PI * 2); ctx.fill();
    } else if (stageIndex === 3) {
      // Biomech hive: cell lattice; no expensive gradients or per-frame allocations.
      ctx.strokeStyle = "#76ffac";
      ctx.lineWidth = 3;
      for (let y = 60; y < height; y += 160) {
        for (let x = 35; x < width; x += 220) {
          const cx = x + (Math.floor(y / 160) % 2) * 100;
          ctx.beginPath();
          for (let k = 0; k <= 6; k++) {
            const a = k * Math.PI / 3;
            const px = cx + 53 * Math.cos(a), py = y + 53 * Math.sin(a);
            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }
    } else if (stageIndex === 4) {
      // Citadel: floating arcology columns and a slow scanner grid.
      ctx.fillStyle = "#ad80ff";
      for (let i = 0; i < 8; i++) {
        const x = i * 185 + (Math.sin(time * 0.2 + i) * 12);
        ctx.fillRect(x, 40, 34, height - 80);
        ctx.fillRect(x + 34, 140, 18, height - 280);
      }
      ctx.strokeStyle = "#f4bbff";
      ctx.lineWidth = 3;
      for (let n = 0; n < 6; n++) {
        ctx.beginPath();
        ctx.moveTo(0, 130 + n * 160);
        ctx.lineTo(width, 30 + n * 160);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawHazard(ctx, state, width = W, height = H) {
    if (!state || state.phase === "idle" || !state.hazard) return;
    const h = state.hazard, profile = PROFILES[state.stageIndex];
    const warning = state.phase === "warning";
    ctx.save();
    ctx.strokeStyle = profile.color;
    ctx.fillStyle = profile.color;
    ctx.lineWidth = warning ? 4 : 12;
    ctx.globalAlpha = warning ? 0.36 : 0.66;
    if (h.kind === "rail") {
      ctx.fillRect(h.x - h.halfWidth, 0, h.halfWidth * 2, height);
      ctx.strokeRect(h.x - h.halfWidth - 7, 0, h.halfWidth * 2 + 14, height);
    } else if (h.kind === "cryo") {
      ctx.fillRect(0, h.y - h.halfHeight, width, h.halfHeight * 2);
      ctx.strokeRect(0, h.y - h.halfHeight - 7, width, h.halfHeight * 2 + 14);
    } else if (h.kind === "rockfall" || h.kind === "spore") {
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      if (!warning) ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius * (warning ? 0.52 : 0.78), 0, Math.PI * 2);
      ctx.stroke();
    } else if (h.kind === "sweep") {
      ctx.lineWidth = h.halfWidth * 2;
      ctx.beginPath(); ctx.moveTo(h.x0, h.y0); ctx.lineTo(h.x1, h.y1);
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  const api = Object.freeze({ PROFILES, createState, geometryFor, step, contains, touchesPlayer, drawAtmosphere, drawHazard });
  root.NeonWorlds = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
