/* Geometry for the 4:3 Canvas fighter / arcade-mode selection screen.
   The browser letterboxes the whole 1280x960 playfield; keep internal regions
   separated in logical coordinates instead of adjusting magic Y values in draw calls. */
(function (root) {
  "use strict";

  const BASE_WIDTH = 1280;
  const BASE_HEIGHT = 960;
  const SHIP_HALF_WIDTH = 120;
  const SHIP_HALF_HEIGHT = 92;

  function create(width = BASE_WIDTH, height = BASE_HEIGHT) {
    if (!(Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0)) {
      throw new RangeError("Selection viewport must have positive finite dimensions");
    }
    const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    const dx = (width - BASE_WIDTH * scale) / 2;
    const dy = (height - BASE_HEIGHT * scale) / 2;
    const x = value => dx + value * scale;
    const y = value => dy + value * scale;

    return {
      scale,
      width,
      height,
      titleY: y(124),
      controlsY: y(185),
      mode: {
        x: x(215),
        y: y(217),
        width: 850 * scale,
        height: 92 * scale,
        titleY: y(250),
        descriptionY: y(286)
      },
      trainingHintY: y(327),
      preview: {
        leftX: x(385),
        rightX: x(895),
        y: y(485),
        selectedScale: 1.45 * scale,
        normalScale: 1.28 * scale
      },
      detail: {
        x: x(170),
        y: y(728),
        width: 940 * scale,
        height: 140 * scale,
        titleY: y(766),
        descriptionY: y(809),
        statsY: y(843),
        bestY: y(902)
      }
    };
  }

  function shipFrame(layout, index) {
    if (index !== 0 && index !== 1) throw new RangeError("Unknown fighter index");
    const x = index === 0 ? layout.preview.leftX : layout.preview.rightX;
    const y = layout.preview.y;
    const scale = layout.preview.selectedScale;
    return {
      x: x - SHIP_HALF_WIDTH * scale,
      y: y - SHIP_HALF_HEIGHT * scale,
      width: 2 * SHIP_HALF_WIDTH * scale,
      height: 2 * SHIP_HALF_HEIGHT * scale
    };
  }

  function verticalGaps(layout, selectedShip = 0) {
    const frame = shipFrame(layout, selectedShip);
    const modeBottom = layout.mode.y + layout.mode.height;
    const scale = layout.scale;
    const selectedSubtitleBottom = layout.preview.y + 150 * layout.preview.selectedScale + 10 * scale;
    const detailBottom = layout.detail.y + layout.detail.height;
    return {
      modeToShip: frame.y - modeBottom,
      trainingHintToShip: frame.y - (layout.trainingHintY + 9 * scale),
      captionToDetail: layout.detail.y - selectedSubtitleBottom,
      detailToBest: (layout.detail.bestY - 11 * scale) - detailBottom,
      bottomMargin: layout.height - (layout.detail.bestY + 11 * scale)
    };
  }

  const api = Object.freeze({ create, shipFrame, verticalGaps });
  root.NeonSelectLayout = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
