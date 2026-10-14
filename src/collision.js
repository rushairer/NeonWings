/* Geometry helpers for fast-moving projectiles. Shared in browser and Node tests. */
(function (root) {
  "use strict";

  function segmentPointDistanceSq(ax, ay, bx, by, px, py) {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq <= 0 ? 0 : Math.max(0, Math.min(1,
      ((px - ax) * dx + (py - ay) * dy) / lenSq
    ));
    const vx = ax + t * dx - px;
    const vy = ay + t * dy - py;
    return vx * vx + vy * vy;
  }

  function sweptCircleHit(ax, ay, bx, by, cx, cy, radius) {
    if (!(radius >= 0)) return false;
    return segmentPointDistanceSq(ax, ay, bx, by, cx, cy) <= radius * radius;
  }

  // Slab intersection of a finite movement segment and an axis-aligned box.
  // Used with expanded boss radii so a fast shot cannot tunnel through the boss.
  function sweptAabbHit(ax, ay, bx, by, minX, maxX, minY, maxY) {
    let enter = 0, leave = 1;
    const direction = [bx - ax, by - ay];
    const origins = [ax, ay];
    const mins = [minX, minY], maxs = [maxX, maxY];
    for (let i = 0; i < 2; i++) {
      if (direction[i] === 0) {
        if (origins[i] < mins[i] || origins[i] > maxs[i]) return false;
        continue;
      }
      const near = (mins[i] - origins[i]) / direction[i];
      const far = (maxs[i] - origins[i]) / direction[i];
      enter = Math.max(enter, Math.min(near, far));
      leave = Math.min(leave, Math.max(near, far));
      if (enter > leave) return false;
    }
    return true;
  }

  const api = Object.freeze({ segmentPointDistanceSq, sweptCircleHit, sweptAabbHit });
  root.NeonCollision = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
