import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { CircleLayer, FillLayer, LineLayer, ShapeSource } from "@maplibre/maplibre-react-native";
import { buildDrawFeatureCollection, type DrawGeometryType, type DrawStyleOptions } from "./draw";

const SOURCE_ID = "sphyra-draw";

export interface SphyraDrawControlProps extends DrawStyleOptions {
  mode: DrawGeometryType;
  /** Optional starting vertices. */
  initialVertices?: [number, number][];
  /** Fired with the full FeatureCollection whenever the geometry changes. */
  onChange?: (features: GeoJSON.FeatureCollection) => void;
}

export interface SphyraDrawControlHandle {
  /** Append a vertex (wire <SphyraMap onPress> to this). */
  addVertex(coordinate: [number, number]): void;
  /** Remove the last vertex. */
  undo(): void;
  /** Remove all vertices. */
  clear(): void;
  getFeatures(): GeoJSON.FeatureCollection;
}

/**
 * Declarative draw layer: renders the current point/line/polygon geometry inside <SphyraMap> and
 * exposes imperative addVertex/undo/clear. The consumer wires map taps (and any toolbar buttons)
 * — the RN SDK ships no react-native chrome.
 */
export const SphyraDrawControl = forwardRef<SphyraDrawControlHandle, SphyraDrawControlProps>(
  function SphyraDrawControl(props, ref) {
    const [vertices, setVertices] = useState<[number, number][]>(props.initialVertices ?? []);
    const fc = useMemo(() => buildDrawFeatureCollection(props.mode, vertices), [props.mode, vertices]);

    const commit = (next: [number, number][]): void => {
      setVertices(next);
      props.onChange?.(buildDrawFeatureCollection(props.mode, next));
    };

    useImperativeHandle(
      ref,
      () => ({
        addVertex(c) {
          commit([...vertices, c]);
        },
        undo() {
          commit(vertices.slice(0, -1));
        },
        clear() {
          commit([]);
        },
        getFeatures() {
          return buildDrawFeatureCollection(props.mode, vertices);
        },
      }),
      [vertices, props.mode], // eslint-disable-line react-hooks/exhaustive-deps
    );

    return (
      <ShapeSource id={SOURCE_ID} shape={fc}>
        {props.mode === "polygon" ? (
          <FillLayer
            id={`${SOURCE_ID}-fill`}
            style={{ fillColor: props.fillColor ?? "#2563eb", fillOpacity: props.fillOpacity ?? 0.2 }}
          />
        ) : null}
        {props.mode !== "point" ? (
          <LineLayer
            id={`${SOURCE_ID}-line`}
            style={{ lineColor: props.lineColor ?? "#2563eb", lineWidth: props.lineWidth ?? 3 }}
          />
        ) : null}
        <CircleLayer
          id={`${SOURCE_ID}-vertices`}
          style={{ circleColor: props.vertexColor ?? "#2563eb", circleRadius: props.vertexRadius ?? 5 }}
        />
      </ShapeSource>
    );
  },
);
