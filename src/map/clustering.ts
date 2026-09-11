import type { CircleLayerStyle, SymbolLayerStyle } from "@maplibre/maplibre-react-native";

export interface ClusterStyleOptions {
  clusterRadius?: number; // default 50
  clusterMaxZoom?: number; // default 14
  clusterColor?: string; // default "#1d4ed8"
  clusterTextColor?: string; // default "#ffffff"
  pointColor?: string; // default "#2563eb"
  pointRadius?: number; // default 6
}

export const DEFAULT_CLUSTER_RADIUS = 50;
export const DEFAULT_CLUSTER_MAX_ZOOM = 14;

export interface ClusterConfig {
  /** Spread onto <ShapeSource cluster …>. */
  source: { cluster: true; clusterRadius: number; clusterMaxZoomLevel: number };
  /** Spread onto <CircleLayer style={…}> for cluster bubbles (filter ["has","point_count"]). */
  clusterCircleStyle: CircleLayerStyle;
  /** Spread onto <SymbolLayer style={…}> for the cluster count label. */
  clusterCountStyle: SymbolLayerStyle;
  /** Spread onto <CircleLayer style={…}> for individual points (filter ["!",["has","point_count"]]). */
  unclusteredCircleStyle: CircleLayerStyle;
}

/** Build the <ShapeSource>/<CircleLayer>/<SymbolLayer> config for a clustered point source. */
export function buildClusterConfig(options: ClusterStyleOptions = {}): ClusterConfig {
  const clusterColor = options.clusterColor ?? "#1d4ed8";
  const clusterTextColor = options.clusterTextColor ?? "#ffffff";
  const pointColor = options.pointColor ?? "#2563eb";
  const pointRadius = options.pointRadius ?? 6;

  return {
    source: {
      cluster: true,
      clusterRadius: options.clusterRadius ?? DEFAULT_CLUSTER_RADIUS,
      clusterMaxZoomLevel: options.clusterMaxZoom ?? DEFAULT_CLUSTER_MAX_ZOOM,
    },
    clusterCircleStyle: {
      circleColor: clusterColor,
      circleRadius: ["step", ["get", "point_count"], 16, 25, 22, 100, 30],
    } as CircleLayerStyle,
    clusterCountStyle: {
      textField: ["get", "point_count_abbreviated"],
      textSize: 12,
      textColor: clusterTextColor,
      textFont: ["Noto Sans Regular"],
    } as SymbolLayerStyle,
    unclusteredCircleStyle: {
      circleColor: pointColor,
      circleRadius: pointRadius,
      circleStrokeWidth: 1,
      circleStrokeColor: "#ffffff",
    } as CircleLayerStyle,
  };
}

export interface ClusterCameraTarget {
  /** [lon, lat] to recenter on. */
  center: [number, number];
  /** Zoom level that expands the cluster. */
  zoom: number;
}

/** Minimal shape of the bits of a ShapeSource ref this helper needs. */
export interface ClusterExpansionSource {
  getClusterExpansionZoom(feature: GeoJSON.Feature): Promise<number>;
}

/**
 * Resolve the click-to-zoom target for a pressed cluster feature: asks the ShapeSource for the
 * expansion zoom and returns the camera center (the cluster's coordinate) + that zoom. Feed the
 * result into the <Camera> ref / setCamera.
 */
export async function resolveClusterExpansion(
  shapeSource: ClusterExpansionSource,
  feature: GeoJSON.Feature,
): Promise<ClusterCameraTarget> {
  const zoom = await shapeSource.getClusterExpansionZoom(feature);
  const coords = (feature.geometry as GeoJSON.Point).coordinates;
  return { center: [coords[0] ?? 0, coords[1] ?? 0], zoom };
}
