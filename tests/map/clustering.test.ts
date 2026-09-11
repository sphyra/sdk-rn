import { describe, expect, it, vi } from "vitest";

import {
  buildClusterConfig,
  resolveClusterExpansion,
  DEFAULT_CLUSTER_RADIUS,
  DEFAULT_CLUSTER_MAX_ZOOM,
} from "../../src/map/clustering";

describe("buildClusterConfig", () => {
  it("CC1 — defaults", () => {
    const cfg = buildClusterConfig();

    expect(cfg.source.cluster).toBe(true);
    expect(cfg.source.clusterRadius).toBe(50);
    expect(cfg.source.clusterMaxZoomLevel).toBe(14);
    expect(DEFAULT_CLUSTER_RADIUS).toBe(50);
    expect(DEFAULT_CLUSTER_MAX_ZOOM).toBe(14);

    expect((cfg.clusterCircleStyle as Record<string, unknown>)["circleColor"]).toBe("#1d4ed8");
    expect((cfg.clusterCountStyle as Record<string, unknown>)["textColor"]).toBe("#ffffff");
    expect((cfg.clusterCountStyle as Record<string, unknown>)["textFont"]).toEqual([
      "Noto Sans Regular",
    ]);
    expect((cfg.unclusteredCircleStyle as Record<string, unknown>)["circleColor"]).toBe("#2563eb");
    expect((cfg.unclusteredCircleStyle as Record<string, unknown>)["circleRadius"]).toBe(6);
  });

  it("CC2 — overrides flow through", () => {
    const cfg = buildClusterConfig({
      clusterRadius: 80,
      clusterMaxZoom: 10,
      clusterColor: "#abc",
      clusterTextColor: "#def",
      pointColor: "#123",
      pointRadius: 9,
    });

    expect(cfg.source.clusterRadius).toBe(80);
    expect(cfg.source.clusterMaxZoomLevel).toBe(10);
    expect((cfg.clusterCircleStyle as Record<string, unknown>)["circleColor"]).toBe("#abc");
    expect((cfg.clusterCountStyle as Record<string, unknown>)["textColor"]).toBe("#def");
    expect((cfg.unclusteredCircleStyle as Record<string, unknown>)["circleColor"]).toBe("#123");
    expect((cfg.unclusteredCircleStyle as Record<string, unknown>)["circleRadius"]).toBe(9);
  });
});

describe("resolveClusterExpansion", () => {
  it("CC3 — returns center + expansion zoom and calls getClusterExpansionZoom with the feature", async () => {
    const getClusterExpansionZoom = vi.fn().mockResolvedValue(9);
    const feature = {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [44.5, 40.18] },
    } as unknown as GeoJSON.Feature;

    const target = await resolveClusterExpansion({ getClusterExpansionZoom }, feature);

    expect(getClusterExpansionZoom).toHaveBeenCalledWith(feature);
    expect(target).toEqual({ center: [44.5, 40.18], zoom: 9 });
  });
});
