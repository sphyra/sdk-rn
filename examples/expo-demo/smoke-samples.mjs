/** Smoke-test sample inputs — mirrors src/sample-data.ts (ESM for node:test). */

export const DIRECTIONS_WAYPOINTS = [
  [44.5152, 40.1893],
  [44.5136, 40.1772],
];

export const MATRIX_SOURCES = [
  [44.5152, 40.1893],
  [44.5136, 40.1772],
];

export const MATRIX_TARGETS = [
  [44.5136, 40.1772],
  [44.5152, 40.1893],
];

export const ISOCHRONE_ORIGIN = [44.5136, 40.1772];

export const MAP_MATCH_TRACE = [
  [44.5136, 40.1772],
  [44.5142, 40.179],
  [44.5148, 40.1815],
  [44.515, 40.184],
  [44.5152, 40.1872],
  [44.5152, 40.1893],
];

export const OPTIMIZE_STOPS = [
  [44.5152, 40.1893],
  [44.5136, 40.1772],
  [44.5028, 40.1936],
  [44.5264, 40.1878],
];

export const SEARCH_SAMPLE = { q: "Yerevan", limit: 3 };

export const STATIC_IMAGE_SAMPLE = {
  lon: 44.51,
  lat: 40.18,
  zoom: 12,
  width: 128,
  height: 128,
  retina: false,
};
