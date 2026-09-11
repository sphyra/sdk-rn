import { describe, expect, it } from "vitest";
import { applyStyleVariant } from "../../src/map/presets";

/** A style carrying the 10-012 metadata tables + a painted background and the two 3D-only layers. */
function fakeStyle() {
  return {
    version: 8,
    light: { anchor: "viewport", color: "#ffffff", intensity: 0.5 },
    layers: [
      { id: "background", paint: { "background-color": "#f5f5f5" } },
      { id: "buildings-3d", layout: {} },
      { id: "terrain-hillshade", layout: {} },
    ],
    metadata: {
      "sphyra:presets": {
        day: {
          light: { anchor: "viewport", color: "#ffffff", intensity: 0.5 },
          layers: { background: { "background-color": "#e8e8e8" } },
        },
        night: {
          light: { anchor: "viewport", color: "#0b1020", intensity: 0.2 },
          layers: { background: { "background-color": "#0b1020" } },
        },
      },
      "sphyra:modes": {
        "2d": { hiddenLayers: ["buildings-3d", "terrain-hillshade"], terrain: null, pitch: 0 },
        "3d": { hiddenLayers: [], terrain: { source: "sphyra_terrain", exaggeration: 1 }, pitch: 45 },
      },
    },
  };
}

const layer = (style: any, id: string) =>
  (style.layers as any[]).find((l) => l.id === id);

describe("applyStyleVariant", () => {
  it("P1 — bakes the preset palette + top-level light, without mutating the input", () => {
    const style = fakeStyle();

    const out = applyStyleVariant(style, "night", "3d") as any;

    expect(layer(out, "background").paint["background-color"]).toBe("#0b1020");
    expect((out.light as any).color).toBe("#0b1020");
    // input untouched
    expect(layer(style, "background").paint["background-color"]).toBe("#f5f5f5");
    expect((style.light as any).color).toBe("#ffffff");
  });

  it("P2 — 2d hides the toggleable layers; 3d shows them", () => {
    const twoD = applyStyleVariant(fakeStyle(), "day", "2d") as any;
    expect(layer(twoD, "buildings-3d").layout.visibility).toBe("none");
    expect(layer(twoD, "terrain-hillshade").layout.visibility).toBe("none");

    const threeD = applyStyleVariant(fakeStyle(), "day", "3d") as any;
    expect(layer(threeD, "buildings-3d").layout.visibility).toBe("visible");
    expect(layer(threeD, "terrain-hillshade").layout.visibility).toBe("visible");
  });

  it("P3 — a style without the 10-012 metadata contract is returned unchanged", () => {
    const plain = { version: 8, layers: [{ id: "background", paint: { "background-color": "#abc" } }] };

    const out = applyStyleVariant(plain, "night", "2d");

    expect(out).toEqual(plain);
  });
});
