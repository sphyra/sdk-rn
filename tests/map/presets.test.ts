import { describe, expect, it } from "vitest";
import { apply3dGroundDepth, applyStyleVariant } from "../../src/map/presets";

/** A style carrying the 10-012 metadata tables + a painted background and the two 3D-only layers. */
function fakeStyle() {
  return {
    version: 8,
    light: { anchor: "map", color: "#ffffff", intensity: 0.5 },
    sky: { "sky-color": "#9acdff" },
    projection: { type: ["interpolate", ["linear"], ["zoom"], 4, "vertical-perspective", 6, "mercator"] },
    layers: [
      { id: "background", paint: { "background-color": "#f5f5f5" } },
      { id: "buildings-ao", layout: {} },
      { id: "buildings-outline", layout: {} },
      { id: "buildings-3d", layout: {} },
      { id: "terrain-hillshade", layout: {} },
    ],
    metadata: {
      "sphyra:presets": {
        day: {
          light: { anchor: "map", color: "#ffffff", intensity: 0.5 },
          sky: { "sky-color": "#9acdff" },
          stars: 0,
          layers: { background: { "background-color": "#e8e8e8" } },
        },
        night: {
          light: { anchor: "map", color: "#0b1020", intensity: 0.2 },
          sky: { "sky-color": "#092b51" },
          stars: 1,
          layers: { background: { "background-color": "#0b1020" } },
        },
      },
      "sphyra:modes": {
        "2d": { hiddenLayers: ["buildings-3d", "terrain-hillshade", "buildings-ao"], terrain: null, pitch: 0 },
        "3d": { hiddenLayers: ["buildings-outline"], terrain: { source: "sphyra_terrain", exaggeration: 1 }, pitch: 45 },
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
    // The native renderer has neither sky nor globe, so the clone must not carry them.
    expect(out.sky).toBeUndefined();
    expect(out.projection).toBeUndefined();
    // input untouched
    expect(layer(style, "background").paint["background-color"]).toBe("#f5f5f5");
    expect((style.light as any).color).toBe("#ffffff");
  });

  it("P2 — 2d hides the toggleable layers; 3d shows them", () => {
    const twoD = applyStyleVariant(fakeStyle(), "day", "2d") as any;
    expect(layer(twoD, "buildings-3d").layout.visibility).toBe("none");
    expect(layer(twoD, "terrain-hillshade").layout.visibility).toBe("none");
    expect(layer(twoD, "buildings-ao").layout.visibility).toBe("none");
    expect(layer(twoD, "buildings-outline").layout.visibility).toBe("visible");
    expect(twoD.terrain).toBeUndefined();

    const threeD = applyStyleVariant(fakeStyle(), "day", "3d") as any;
    expect(layer(threeD, "buildings-3d").layout.visibility).toBe("visible");
    expect(layer(threeD, "terrain-hillshade").layout.visibility).toBe("visible");
    expect(layer(threeD, "buildings-ao").layout.visibility).toBe("visible");
    expect(layer(threeD, "buildings-outline").layout.visibility).toBe("none");
    expect(threeD.terrain).toEqual({ source: "sphyra_terrain", exaggeration: 1 });
  });

  it("P3 — a style without the 10-012 metadata contract is returned unchanged", () => {
    const plain = { version: 8, layers: [{ id: "background", paint: { "background-color": "#abc" } }] };

    const out = applyStyleVariant(plain, "night", "2d");

    expect(out).toEqual(plain);
  });

  it("P4 — runtime switch reproduces a fresh bake of the same preset × mode", () => {
    const day = fakeStyle();
    const switched = applyStyleVariant(day, "night", "3d") as any;
    const fresh = applyStyleVariant(
      {
        ...fakeStyle(),
        light: { anchor: "map", color: "#0b1020", intensity: 0.2 },
        sky: { "sky-color": "#092b51" },
        layers: [
          { id: "background", paint: { "background-color": "#0b1020" } },
          { id: "buildings-outline", layout: {} },
          { id: "buildings-ao", layout: {} },
          { id: "buildings-3d", layout: {} },
          { id: "terrain-hillshade", layout: {} },
        ],
      },
      "night",
      "3d",
    ) as any;

    expect(layer(switched, "background").paint).toEqual(layer(fresh, "background").paint);
    expect(switched.light).toEqual(fresh.light);
    expect(switched.sky).toEqual(fresh.sky);
    expect(layer(switched, "buildings-3d").layout.visibility).toBe("visible");
    expect(layer(switched, "buildings-outline").layout.visibility).toBe("none");
  });

  it("P5 — day → night → day returns to the day bake", () => {
    const day = applyStyleVariant(fakeStyle(), "day", "3d");
    const roundTrip = applyStyleVariant(applyStyleVariant(day, "night", "3d"), "day", "3d");

    expect(roundTrip).toEqual(day);
  });
});

describe("apply3dGroundDepth (API 11-023 facade stack)", () => {
  it("P6 — keeps ground shadows, walls and roof cap contiguous above ground ink, POIs straight on top", () => {
    const style = {
      version: 8,
      layers: [
        { id: "buildings-ao" },
        { id: "buildings-ao-contact" },
        { id: "buildings-3d", paint: {} },
        { id: "buildings-3d-roof" },
        { id: "street-furniture-circle" },
        { id: "infrastructure-line" },
        { id: "housenumbers-label" },
        { id: "roads-line" },
        { id: "roads-label", layout: {} },
        { id: "pois" },
        { id: "places-label" },
      ],
    };

    apply3dGroundDepth(style);

    const ids = style.layers.map((layer) => layer.id);
    const start = ids.indexOf("buildings-ao");
    expect(ids.slice(start, start + 5)).toEqual(["buildings-ao", "buildings-ao-contact", "buildings-3d", "buildings-3d-roof", "pois"]);
    for (const ground of ["roads-line", "roads-label", "street-furniture-circle", "infrastructure-line"]) {
      expect(ids.indexOf(ground), ground).toBeLessThan(start);
    }
    expect(ids.indexOf("housenumbers-label")).toBeGreaterThan(start + 3);
  });
});
