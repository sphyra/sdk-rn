import { MarkerView } from "@maplibre/maplibre-react-native";
import type { ReactElement } from "react";

export interface SphyraPopupProps {
  /** [lon, lat] the popup is anchored to. */
  coordinate: [number, number];
  /** Open/close control. Default true. When false, nothing renders. */
  visible?: boolean;
  /** Anchor in [0..1] x [0..1] space. Default { x: 0.5, y: 0 } (bottom-centered above the point). */
  anchor?: { x: number; y: number };
  /** Popup content. */
  children: ReactElement;
}

/** Declarative coordinate-bound popup with open/close control. Render inside <SphyraMap>. */
export function SphyraPopup(props: SphyraPopupProps): ReactElement | null {
  if (props.visible === false) return null;
  return (
    <MarkerView coordinate={props.coordinate} anchor={props.anchor ?? { x: 0.5, y: 0 }}>
      {props.children}
    </MarkerView>
  );
}
