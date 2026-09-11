import test from "node:test";
import assert from "node:assert/strict";
import { SphyraClient } from "../../src/SphyraClient";
import {
  DIRECTIONS_WAYPOINTS,
  ISOCHRONE_ORIGIN,
  MAP_MATCH_TRACE,
  MATRIX_SOURCES,
  MATRIX_TARGETS,
  OPTIMIZE_STOPS,
  SEARCH_SAMPLE,
  STATIC_IMAGE_SAMPLE,
} from "./smoke-samples.mjs";

const BASE = process.env.SPHYRA_BASE_URL ?? process.env.EXPO_PUBLIC_SPHYRA_URL ?? "http://localhost:4000";
const KEY = process.env.SPHYRA_API_KEY ?? process.env.EXPO_PUBLIC_SPHYRA_KEY ?? "sphyra_dev_local";

function staticPath({ lon, lat, zoom, width, height, retina = false }: typeof STATIC_IMAGE_SAMPLE) {
  const suffix = retina ? "@2x" : "";
  return `/api/v1/static/${lon},${lat},${zoom}/${width}x${height}${suffix}.png`;
}

async function stackSkipReason(): Promise<string | undefined> {
  if (!process.env.SPHYRA_LOCAL_STACK) {
    return "local stack not reachable (set SPHYRA_LOCAL_STACK=1 with the stack up)";
  }
  try {
    const res = await fetch(`${BASE.replace(/\/$/, "")}/health`);
    if (!res.ok) return "local stack not reachable (set SPHYRA_LOCAL_STACK=1 with the stack up)";
  } catch {
    return "local stack not reachable (set SPHYRA_LOCAL_STACK=1 with the stack up)";
  }
  return undefined;
}

async function fetchStaticImageDataUri(cfg: { baseUrl: string; apiKey: string }, params: typeof STATIC_IMAGE_SAMPLE) {
  const url = `${cfg.baseUrl.replace(/\/$/, "")}${staticPath(params)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${cfg.apiKey}` } });
  assert.equal(res.ok, true, `static image ${res.status}`);
  const buf = await res.arrayBuffer();
  assert.ok(buf.byteLength > 0);
  return `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
}

test("reverseGeocode via SphyraClient", async (t) => {
  const skip = await stackSkipReason();
  if (skip) t.skip(skip);
  const client = new SphyraClient({ baseUrl: BASE, apiKey: KEY });
  const result = await client.reverseGeocode({ lat: 40.1872, lon: 44.5152, lang: "hy" });
  assert.ok(result.displayName.length > 0);
});

test("directions returns a route geometry", async (t) => {
  const skip = await stackSkipReason();
  if (skip) t.skip(skip);
  const client = new SphyraClient({ baseUrl: BASE, apiKey: KEY });
  const result = await client.directions({ waypoints: DIRECTIONS_WAYPOINTS, geometries: "geojson" });
  assert.equal(result.routes[0].geometry.type, "LineString");
});

test("matrix returns durations grid", async (t) => {
  const skip = await stackSkipReason();
  if (skip) t.skip(skip);
  const client = new SphyraClient({ baseUrl: BASE, apiKey: KEY });
  const result = await client.matrix({
    sources: MATRIX_SOURCES.slice(0, 2),
    targets: MATRIX_TARGETS.slice(0, 2),
  });
  assert.equal(result.durations.length, 2);
});

test("isochrone returns features", async (t) => {
  const skip = await stackSkipReason();
  if (skip) t.skip(skip);
  const client = new SphyraClient({ baseUrl: BASE, apiKey: KEY });
  const result = await client.isochrone({ origin: ISOCHRONE_ORIGIN, contoursMinutes: [5, 10] });
  assert.ok(result.features.length >= 1);
});

test("mapMatch returns matched geometry", async (t) => {
  const skip = await stackSkipReason();
  if (skip) t.skip(skip);
  const client = new SphyraClient({ baseUrl: BASE, apiKey: KEY });
  const result = await client.mapMatch({ coordinates: MAP_MATCH_TRACE, geometries: "geojson" });
  assert.equal(typeof result.distance, "number");
});

test("optimize returns reordered trip", async (t) => {
  const skip = await stackSkipReason();
  if (skip) t.skip(skip);
  const client = new SphyraClient({ baseUrl: BASE, apiKey: KEY });
  const result = await client.optimize({ waypoints: OPTIMIZE_STOPS, geometries: "geojson" });
  assert.ok(result.trips[0].geometry);
});

test("tilequery returns features", async (t) => {
  const skip = await stackSkipReason();
  if (skip) t.skip(skip);
  const client = new SphyraClient({ baseUrl: BASE, apiKey: KEY, timeout: 30_000 });
  const result = await client.tilequery({ lon: 44.5136, lat: 40.1772, limit: 5 });
  assert.ok(Array.isArray(result.features));
});

test("static image PNG is reachable with Bearer auth", async (t) => {
  const skip = await stackSkipReason();
  if (skip) t.skip(skip);
  const uri = await fetchStaticImageDataUri({ baseUrl: BASE, apiKey: KEY }, STATIC_IMAGE_SAMPLE);
  assert.match(uri, /^data:image\/png;base64,/);
});

test("searchSuggest returns suggestions", async (t) => {
  const skip = await stackSkipReason();
  if (skip) t.skip(skip);
  const client = new SphyraClient({ baseUrl: BASE, apiKey: KEY });
  const result = await client.searchSuggest(SEARCH_SAMPLE);
  assert.ok(result.suggestions.length >= 1);
});

test("getMapStyle returns signed sources", async (t) => {
  const skip = await stackSkipReason();
  if (skip) t.skip(skip);
  const client = new SphyraClient({ baseUrl: BASE, apiKey: KEY });
  const style = await client.getMapStyle();
  const keys = Object.keys(style.sources ?? {});
  assert.ok(keys.length > 0);
  const tiles = style.sources?.[keys[0]!]?.tiles;
  assert.match(String(tiles?.[0]), /sig=/);
});
