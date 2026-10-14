// Shared platform helpers for the static Canvas 2D game.
// CommonJS export is for dependency-free Node tests; browser uses window.NeonPlatform.
(function (root) {
  "use strict";

  function finiteClamped(value, fallback, min, max) {
    if (value === undefined || value === null || value === "") return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }

  function calculateViewport(worldWidth, worldHeight, viewportWidth, viewportHeight) {
    if (![worldWidth, worldHeight, viewportWidth, viewportHeight].every(
      value => Number.isFinite(value) && value > 0
    )) throw new RangeError("Viewport and playfield dimensions must be positive");

    const scale = Math.min(viewportWidth / worldWidth, viewportHeight / worldHeight);
    const width = Math.max(1, Math.floor(worldWidth * scale));
    const height = Math.max(1, Math.floor(worldHeight * scale));
    return {
      width,
      height,
      left: Math.floor((viewportWidth - width) / 2),
      top: Math.floor((viewportHeight - height) / 2)
    };
  }

  function fitCanvas(canvas, worldWidth, worldHeight, viewportWidth, viewportHeight) {
    const dimensions = calculateViewport(worldWidth, worldHeight, viewportWidth, viewportHeight);
    canvas.style.width = dimensions.width + "px";
    canvas.style.height = dimensions.height + "px";
    canvas.style.left = dimensions.left + "px";
    canvas.style.top = dimensions.top + "px";
    return dimensions;
  }

  const api = Object.freeze({ finiteClamped, calculateViewport, fitCanvas });
  root.NeonPlatform = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
