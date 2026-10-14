/* Destructible, player-facing Boss weapons; no DOM or Canvas dependency. */
(function (root) {
  "use strict";

  const BALANCE = Object.freeze({
    partHpFraction: 0.045,
    weakPointDamageScale: 2.35,
    hullDamageOnBreak: 0.065,
    attackDelayPerBroken: 0.32
  });

  function createParts(boss) {
    if (!(boss?.maxHp > 0) || !(boss?.rx > 0) || !(boss?.ry > 0)) {
      throw new TypeError("Boss dimensions and maximum HP are required");
    }
    const hp = Math.max(20, Math.ceil(boss.maxHp * BALANCE.partHpFraction));
    const x = -boss.rx - 19;
    const y = Math.max(37, Math.round(boss.ry * 0.76));
    return [
      { id: "UPPER TURRET", x, y: -y, r: 28, hp, maxHp: hp },
      { id: "LOWER TURRET", x, y, r: 28, hp, maxHp: hp }
    ];
  }

  function intact(parts) {
    return (parts || []).filter(part => part.hp > 0).length;
  }

  function destroyedCount(boss) {
    if (!boss.parts) return 0;
    return boss.parts.length - intact(boss.parts);
  }

  function attackDelayMultiplier(boss) {
    return 1 + destroyedCount(boss) * BALANCE.attackDelayPerBroken;
  }

  function reducedFanCount(boss, requested) {
    return Math.max(1, Math.floor(requested) - destroyedCount(boss));
  }

  function segmentDistanceSq(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared
      ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared))
      : 0;
    const vx = px - (ax + t * dx), vy = py - (ay + t * dy);
    return vx * vx + vy * vy;
  }

  function findHit(boss, ax, ay, bx, by, projectileRadius = 0) {
    if (!boss || !boss.active || !boss.parts) return null;
    let nearest = null;
    let best = Infinity;
    for (const part of boss.parts) {
      if (part.hp <= 0) continue;
      const cx = boss.x + part.x, cy = boss.y + part.y;
      const r = part.r + projectileRadius;
      if (segmentDistanceSq(cx, cy, ax, ay, bx, by) > r * r) continue;
      // Choose the closest occupied weak point to the shot origin.
      const ds = (cx - ax) ** 2 + (cy - ay) ** 2;
      if (ds < best) {
        best = ds;
        nearest = part;
      }
    }
    return nearest;
  }

  function damagePart(boss, part, amount) {
    if (!boss?.parts?.includes(part) || part.hp <= 0 || !(amount > 0)) {
      return { hit: false, broken: false, hullDamage: 0 };
    }
    part.hp = Math.max(0, part.hp - amount * BALANCE.weakPointDamageScale);
    const broken = part.hp === 0;
    const hullDamage = broken ? Math.ceil(boss.maxHp * BALANCE.hullDamageOnBreak) : 0;
    if (broken) boss.hp = Math.max(0, boss.hp - hullDamage);
    return { hit: true, broken, hullDamage };
  }

  const api = Object.freeze({
    BALANCE, createParts, intact, destroyedCount, attackDelayMultiplier,
    reducedFanCount, findHit, damagePart
  });
  root.NeonBossParts = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
