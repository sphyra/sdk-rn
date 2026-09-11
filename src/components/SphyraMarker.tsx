import { PointAnnotation } from "@maplibre/maplibre-react-native";
import type { ReactElement } from "react";

export interface SphyraMarkerProps {
  /** Stable unique id (required by PointAnnotation). */
  id: string;
  /** [lon, lat]. */
  coordinate: [number, number];
  draggable?: boolean;
  /** Fired when the marker is selected/pressed. */
  onPress?: () => void;
  /** Fired after a drag completes, with the new [lon, lat]. */
  onDragEnd?: (coordinate: [number, number]) => void;
  /** Custom icon visual (required — supply an <Image>/<View> for the pin). */
  children: ReactElement;
}

function coordsFromPayload(payload: unknown): [number, number] {
  const geometry = (payload as { geometry?: { coordinates?: number[] } })?.geometry;
  const c = geometry?.coordinates ?? [0, 0];
  return [c[0] ?? 0, c[1] ?? 0];
}

/**
 * Declarative marker: custom-icon children, draggable, press + drag-end. Render inside <SphyraMap>.
 *
 * To bind a popup to this marker, render a <SphyraPopup> at the same `coordinate` and toggle its
 * `visible` prop from `onPress`.
 */
export function SphyraMarker(props: SphyraMarkerProps): ReactElement {
  return (
    <PointAnnotation
      id={props.id}
      coordinate={props.coordinate}
      draggable={props.draggable}
      onSelected={() => props.onPress?.()}
      onDragEnd={(payload: unknown) => props.onDragEnd?.(coordsFromPayload(payload))}
    >
      {props.children}
    </PointAnnotation>
  );
}
