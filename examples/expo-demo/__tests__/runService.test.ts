import { describe, expect, it, vi } from "vitest";
import { SphyraError } from "@sphyra/react-native";
import type { SphyraClient } from "@sphyra/react-native";
import { runService } from "../src/services/runService";
import {
  DIRECTIONS_WAYPOINTS,
  ISOCHRONE_ORIGIN,
  MAP_MATCH_TRACE,
  MATRIX_SOURCES,
  MATRIX_TARGETS,
  OPTIMIZE_STOPS,
  SEARCH_SAMPLE,
} from "../src/sample-data";

function mockClient() {
  return {
    directions: vi.fn().mockResolvedValue({ routes: [{ geometry: { type: "LineString" } }] }),
    matrix: vi.fn().mockResolvedValue({ durations: [[0]] }),
    isochrone: vi.fn().mockResolvedValue({ features: [] }),
    mapMatch: vi.fn().mockResolvedValue({ distance: 1 }),
    optimize: vi.fn().mockResolvedValue({ trips: [{ geometry: {} }] }),
    tilequery: vi.fn().mockResolvedValue({ features: [] }),
    searchSuggest: vi.fn().mockResolvedValue({ suggestions: [] }),
    reverseGeocode: vi.fn().mockResolvedValue({ displayName: "Test" }),
  } as unknown as SphyraClient & Record<string, ReturnType<typeof vi.fn>>;
}

describe("runService", () => {
  it("dispatches directions with waypoints", async () => {
    const client = mockClient();
    const input = { waypoints: DIRECTIONS_WAYPOINTS, geometries: "geojson" as const };
    const result = await runService(client, "directions", input);
    expect(client.directions).toHaveBeenCalledWith(input);
    expect(result).toEqual({ id: "directions", ok: true, data: expect.any(Object) });
  });

  it("dispatches matrix with sources and targets", async () => {
    const client = mockClient();
    const input = { sources: MATRIX_SOURCES.slice(0, 2), targets: MATRIX_TARGETS.slice(0, 2) };
    await runService(client, "matrix", input);
    expect(client.matrix).toHaveBeenCalledWith(input);
  });

  it("dispatches isochrone with origin", async () => {
    const client = mockClient();
    const input = { origin: ISOCHRONE_ORIGIN, contoursMinutes: [5, 10] };
    await runService(client, "isochrone", input);
    expect(client.isochrone).toHaveBeenCalledWith(input);
  });

  it("dispatches mapMatch with trace", async () => {
    const client = mockClient();
    const input = { coordinates: MAP_MATCH_TRACE, geometries: "geojson" as const };
    await runService(client, "mapMatch", input);
    expect(client.mapMatch).toHaveBeenCalledWith(input);
  });

  it("dispatches optimize with stops", async () => {
    const client = mockClient();
    const input = { waypoints: OPTIMIZE_STOPS, geometries: "geojson" as const };
    await runService(client, "optimize", input);
    expect(client.optimize).toHaveBeenCalledWith(input);
  });

  it("dispatches tilequery at a coordinate", async () => {
    const client = mockClient();
    const input = { lon: 44.5136, lat: 40.1772, limit: 5 };
    await runService(client, "tilequery", input);
    expect(client.tilequery).toHaveBeenCalledWith(input);
  });

  it("dispatches search via searchSuggest", async () => {
    const client = mockClient();
    await runService(client, "search", SEARCH_SAMPLE);
    expect(client.searchSuggest).toHaveBeenCalledWith(SEARCH_SAMPLE);
  });

  it("dispatches reverse from [lon,lat] tuple", async () => {
    const client = mockClient();
    const tap: [number, number] = [44.5136, 40.1772];
    await runService(client, "reverse", tap);
    expect(client.reverseGeocode).toHaveBeenCalledWith({ lon: 44.5136, lat: 40.1772, lang: "hy" });
  });

  it("re-throws SphyraError from the client", async () => {
    const client = mockClient();
    const err = new SphyraError("NO_ROUTE", "no route");
    vi.mocked(client.directions).mockRejectedValue(err);
    await expect(runService(client, "directions", { waypoints: DIRECTIONS_WAYPOINTS })).rejects.toBe(err);
  });
});
