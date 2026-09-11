import { useEffect, useMemo, useState } from "react";
import { LineLayer, ShapeSource } from "@maplibre/maplibre-react-native";
import { useSphyra } from "../context/SphyraProvider";
import { SphyraError } from "../errors";
import type { DirectionsLang, DirectionsProfile, DirectionsResult, GeoJSONLineString } from "../types";
import type { ReactElement } from "react";

const SOURCE_ID = "sphyra-directions";

export interface SphyraDirectionsControlProps {
  /** Ordered [lon,lat]; ≥2 triggers a route request. */
  waypoints: [number, number][];
  profile?: DirectionsProfile; // default "driving"
  language?: DirectionsLang;
  lineColor?: string; // default "#2563eb"
  lineWidth?: number; // default 5
  onRoute?: (result: DirectionsResult) => void;
  onError?: (error: SphyraError) => void;
}

function toSphyraError(err: unknown): SphyraError {
  return err instanceof SphyraError
    ? err
    : new SphyraError("UNKNOWN", err instanceof Error ? err.message : "Directions failed");
}

/**
 * Requests a route via client.directions() when waypoints change (≥2) and renders the route line
 * inside <SphyraMap>. The turn-by-turn list is delivered to the consumer via onRoute(result).
 */
export function SphyraDirectionsControl(props: SphyraDirectionsControlProps): ReactElement | null {
  const client = useSphyra();
  const [geometry, setGeometry] = useState<GeoJSONLineString | null>(null);
  const waypointKey = props.waypoints.map((w) => w.join(",")).join(";");

  useEffect(() => {
    if (props.waypoints.length < 2) {
      setGeometry(null);
      return;
    }
    let cancelled = false;
    client
      .directions({
        waypoints: props.waypoints,
        profile: props.profile,
        language: props.language,
        geometries: "geojson",
        steps: true,
      })
      .then((result) => {
        if (cancelled) return;
        const route = result.routes[0];
        setGeometry(route ? (route.geometry as GeoJSONLineString) : null);
        if (route) props.onRoute?.(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) props.onError?.(toSphyraError(err));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, waypointKey, props.profile, props.language]);

  const fc = useMemo<GeoJSON.FeatureCollection | null>(
    () =>
      geometry
        ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry }] }
        : null,
    [geometry],
  );

  if (!fc) return null;
  return (
    <ShapeSource id={SOURCE_ID} shape={fc}>
      <LineLayer
        id={`${SOURCE_ID}-line`}
        style={{
          lineColor: props.lineColor ?? "#2563eb",
          lineWidth: props.lineWidth ?? 5,
          lineJoin: "round",
          lineCap: "round",
        }}
      />
    </ShapeSource>
  );
}
