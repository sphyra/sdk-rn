import { describe, expect, it } from "vitest";
import { buildDrawFeatureCollection } from "../../src/controls/draw";

describe("buildDrawFeatureCollection", () => {
  it("DP1 — point → one Point feature per vertex; coordinates preserved; input not mutated", () => {
    const input: [number, number][] = [[44.5, 40.1], [44.6, 40.2]];
    const fc = buildDrawFeatureCollection("point", input);

    expect(fc.features).toHaveLength(2);
    expect(fc.features.map((f) => f.geometry)).toEqual([
      { type: "Point", coordinates: [44.5, 40.1] },
      { type: "Point", coordinates: [44.6, 40.2] },
    ]);
    expect(input).toEqual([[44.5, 40.1], [44.6, 40.2]]);
  });

  it("DP2 — line with ≥2 → one LineString; with <2 → empty", () => {
    const fc = buildDrawFeatureCollection("line", [[44.5, 40.1], [44.6, 40.2]]);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0]!.geometry).toEqual({
      type: "LineString",
      coordinates: [[44.5, 40.1], [44.6, 40.2]],
    });

    expect(buildDrawFeatureCollection("line", [[44.5, 40.1]]).features).toHaveLength(0);
  });

  it("DP3 — polygon with ≥3 → one closed Polygon (first === last); with <3 → empty", () => {
    const fc = buildDrawFeatureCollection("polygon", [[44.5, 40.1], [44.6, 40.1], [44.6, 40.2]]);
    expect(fc.features).toHaveLength(1);
    const poly = fc.features[0]!.geometry as GeoJSON.Polygon;
    expect(poly.type).toBe("Polygon");
    const ring = poly.coordinates[0]!;
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring).toHaveLength(4); // 3 vertices + closing point

    expect(buildDrawFeatureCollection("polygon", [[44.5, 40.1], [44.6, 40.1]]).features).toHaveLength(0);
  });
});
