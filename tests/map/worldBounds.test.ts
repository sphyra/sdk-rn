import { describe, expect, it } from "vitest";

import { worldPanBounds, MERCATOR_LAT_LIMIT } from "../../src/map/worldBounds";

describe("worldPanBounds", () => {
  it("keeps the viewport inside the world at the given floor", () => {
    // At z3 the world is 4096 dp tall. A 870 dp viewport needs its centre to stay
    // 435 dp below the top edge — 435/4096 of the way down, which is ~80.4N.
    const b = worldPanBounds(3, 870);
    expect(b.ne[1]).toBeCloseTo(80.4, 1);
    expect(b.sw[1]).toBeCloseTo(-80.4, 1);
  });

  it("spans the full longitude range — only latitude is constrained", () => {
    const b = worldPanBounds(3, 870);
    expect(b.sw[0]).toBe(-180);
    expect(b.ne[0]).toBe(180);
  });

  it("is symmetric about the equator", () => {
    const b = worldPanBounds(5, 1000);
    expect(b.ne[1]).toBeCloseTo(-b.sw[1], 10);
  });

  it("relaxes toward the mercator limit as the floor rises", () => {
    // The taller the world relative to the viewport, the closer to the pole the
    // centre may sit. It must never exceed the mercator limit itself.
    const low = worldPanBounds(3, 870).ne[1];
    const high = worldPanBounds(10, 870).ne[1];
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThan(MERCATOR_LAT_LIMIT);
    expect(worldPanBounds(22, 870).ne[1]).toBeLessThan(MERCATOR_LAT_LIMIT);
  });

  it("degrades safely when the viewport is taller than the world", () => {
    // Nothing can keep a 4096 dp viewport inside a 4096 dp world, so the centre is
    // pinned to the equator rather than producing a NaN or an inverted box.
    const b = worldPanBounds(3, 100000);
    expect(b.ne[1]).toBe(0);
    expect(b.sw[1]).toBe(0);
  });

  it("treats a missing or nonsensical viewport as unconstrained-but-valid", () => {
    expect(worldPanBounds(3, 0).ne[1]).toBeCloseTo(MERCATOR_LAT_LIMIT, 5);
    expect(worldPanBounds(3, -5).ne[1]).toBeCloseTo(MERCATOR_LAT_LIMIT, 5);
  });
});
