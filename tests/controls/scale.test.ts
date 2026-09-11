import { describe, expect, it } from "vitest";
import { computeScaleBar } from "../../src/controls/scale";

const NICE = new Set([1, 2, 3, 5]);
function isNice(distance: number): boolean {
  const pow = 10 ** Math.floor(Math.log10(distance));
  return NICE.has(Math.round(distance / pow));
}

describe("computeScaleBar", () => {
  it("SC1 — metric: km label at low zoom, m label at high zoom; width ≤ maxWidth; nice distance", () => {
    const low = computeScaleBar(5, 40.18, { maxWidth: 100 });
    expect(low.label.endsWith(" km")).toBe(true);
    expect(low.width).toBeLessThanOrEqual(100);
    expect(isNice(low.distance)).toBe(true);

    const high = computeScaleBar(18, 40.18, { maxWidth: 100 });
    expect(high.label.endsWith(" m")).toBe(true);
    expect(high.width).toBeLessThanOrEqual(100);
  });

  it("SC2 — imperial: ft or mi label; width ≤ maxWidth", () => {
    const bar = computeScaleBar(10, 40.18, { unit: "imperial", maxWidth: 100 });
    expect(bar.label.endsWith(" ft") || bar.label.endsWith(" mi")).toBe(true);
    expect(bar.width).toBeLessThanOrEqual(100);
  });

  it("SC3 — higher latitude → smaller metersPerPixel → distance not larger than at equator", () => {
    const equator = computeScaleBar(10, 0, { maxWidth: 100 });
    const north = computeScaleBar(10, 60, { maxWidth: 100 });
    expect(north.distance).toBeLessThanOrEqual(equator.distance);
  });
});
