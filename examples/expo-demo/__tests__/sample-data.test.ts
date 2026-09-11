import { describe, expect, it } from "vitest";
import {
  DIRECTIONS_WAYPOINTS,
  ISOCHRONE_ORIGIN,
  LANDMARKS,
  MAP_MATCH_TRACE,
  MATRIX_SOURCES,
  MATRIX_TARGETS,
  OPTIMIZE_STOPS,
  SAMPLE_POINTS,
} from "../src/sample-data";

const ARMENIA_LON = [43, 46] as const;
const ARMENIA_LAT = [38.8, 41.3] as const;

function inArmenia(lon: number, lat: number): boolean {
  return lon >= ARMENIA_LON[0] && lon <= ARMENIA_LON[1] && lat >= ARMENIA_LAT[0] && lat <= ARMENIA_LAT[1];
}

describe("sample-data", () => {
  it("SAMPLE_POINTS has ≥12 Armenia-bounded GeoJSON Points with name + category", () => {
    expect(SAMPLE_POINTS.features.length).toBeGreaterThanOrEqual(12);
    for (const f of SAMPLE_POINTS.features) {
      expect(f.geometry.type).toBe("Point");
      const [lon, lat] = f.geometry.coordinates;
      expect(inArmenia(lon, lat)).toBe(true);
      expect(f.properties?.name).toBeTruthy();
      expect(f.properties?.category).toBeTruthy();
      expect(lon).toBeGreaterThan(lat);
    }
  });

  it("LANDMARKS has 3 entries with [lon,lat] coordinates", () => {
    expect(LANDMARKS).toHaveLength(3);
    for (const lm of LANDMARKS) {
      const [lon, lat] = lm.coordinate;
      expect(inArmenia(lon, lat)).toBe(true);
    }
  });

  it("service sample arrays are non-empty and [lon,lat] ordered", () => {
    expect(DIRECTIONS_WAYPOINTS.length).toBeGreaterThanOrEqual(2);
    expect(MATRIX_SOURCES.length).toBeGreaterThan(0);
    expect(MATRIX_TARGETS.length).toBeGreaterThan(0);
    expect(MAP_MATCH_TRACE.length).toBeGreaterThan(0);
    expect(OPTIMIZE_STOPS.length).toBeGreaterThan(0);
    expect(inArmenia(ISOCHRONE_ORIGIN[0], ISOCHRONE_ORIGIN[1])).toBe(true);

    for (const coords of [
      ...DIRECTIONS_WAYPOINTS,
      ...MATRIX_SOURCES,
      ...MATRIX_TARGETS,
      ...MAP_MATCH_TRACE,
      ...OPTIMIZE_STOPS,
    ]) {
      const [lon, lat] = coords;
      expect(inArmenia(lon, lat)).toBe(true);
    }
  });
});
