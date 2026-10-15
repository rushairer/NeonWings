const test = require("node:test");
const assert = require("node:assert/strict");
const layout = require("../src/select-layout.js");

test("reference regression: old mode frame and selected fighter frame overlapped", () => {
  // Legacy mode bottom 326, preview center 455 and scale 1.55:
  // 455 - 92 * 1.55 = 312.4, a visible 13.6px overlap.
  assert.ok(455 - 92 * 1.55 < 227 + 99);
});

test("both selected fighter frames have at least 40px clearance below the mode selector", () => {
  const page = layout.create(1280, 960);
  for (const ship of [0, 1]) {
    const frame = layout.shipFrame(page, ship);
    const gap = layout.verticalGaps(page, ship);
    assert.ok(gap.modeToShip >= 40, "mode/frame gap is " + gap.modeToShip);
    assert.ok(gap.trainingHintToShip >= 12, "training/frame gap is " + gap.trainingHintToShip);
    assert.ok(gap.captionToDetail >= 14, "subtitle/detail gap is " + gap.captionToDetail);
    assert.ok(gap.detailToBest >= 20, "detail/best gap is " + gap.detailToBest);
    assert.ok(gap.bottomMargin >= 40, "bottom margin is " + gap.bottomMargin);
    assert.ok(frame.x >= 0 && frame.x + frame.width <= 1280);
    assert.ok(frame.y + frame.height < page.detail.y);
  }
});

test("Classic, Boss Rush and Training use the same collision-free layout", () => {
  const page = layout.create();
  for (const mode of ["classic", "bossRush", "training"]) {
    for (const selected of [0, 1]) {
      const g = layout.verticalGaps(page, selected);
      assert.ok(g.modeToShip > 0, mode + "/ship" + selected);
      if (mode === "training") assert.ok(g.trainingHintToShip > 0, "training hint collision");
    }
  }
});

test("4:3 canvas letterboxing scales the entire safe layout without introducing overlap", () => {
  for (const [w, h] of [[1280, 960], [640, 480], [1920, 1080], [390, 844], [800, 600]]) {
    const page = layout.create(w, h);
    for (const selected of [0, 1]) {
      const gaps = layout.verticalGaps(page, selected);
      assert.ok(gaps.modeToShip >= 40 * page.scale - 1e-6);
      assert.ok(gaps.captionToDetail >= 14 * page.scale - 1e-6);
      assert.ok(gaps.bottomMargin >= 40 * page.scale - 1e-6);
      const frame = layout.shipFrame(page, selected);
      assert.ok(frame.x >= 0 && frame.x + frame.width <= w);
      assert.ok(frame.y >= 0 && frame.y + frame.height <= h);
    }
  }
});

test("invalid dimensions or fighter indexes fail early", () => {
  assert.throws(() => layout.create(0, 960), RangeError);
  assert.throws(() => layout.create(1280, NaN), RangeError);
  assert.throws(() => layout.shipFrame(layout.create(), 2), RangeError);
});
