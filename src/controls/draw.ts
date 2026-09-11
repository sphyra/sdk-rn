export type DrawGeometryType = "point" | "line" | "polygon";

export interface DrawStyleOptions {
  vertexColor?: string; // default "#2563eb"
  vertexRadius?: number; // default 5
  lineColor?: string; // default "#2563eb"
  lineWidth?: number; // default 3
  fillColor?: string; // default "#2563eb"
  fillOpacity?: number; // default 0.2
}

/**
 * Build a GeoJSON FeatureCollection from the ordered vertices for the given mode. Pure — never
 * mutates `vertices`. point → one Point per vertex; line → a single LineString (≥2 vertices,
 * else empty); polygon → a single closed Polygon (≥3 vertices, else empty).
 */
export function buildDrawFeatureCollection(
  mode: DrawGeometryType,
  vertices: [number, number][],
): GeoJSON.FeatureCollection {
  if (mode === "point") {
    return {
      type: "FeatureCollection",
      features: vertices.map((c) => ({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [c[0], c[1]] },
      })),
    };
  }
  if (mode === "line") {
    if (vertices.length < 2) return { type: "FeatureCollection", features: [] };
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: vertices.map((c) => [c[0], c[1]]) },
        },
      ],
    };
  }
  // polygon
  if (vertices.length < 3) return { type: "FeatureCollection", features: [] };
  const ring: [number, number][] = vertices.map((c) => [c[0], c[1]]);
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } }],
  };
}
