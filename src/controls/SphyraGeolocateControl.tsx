import { UserLocation } from "@maplibre/maplibre-react-native";
import type { ReactElement } from "react";

export interface SphyraGeolocateControlProps {
  visible?: boolean; // default true
  renderMode?: "normal" | "native"; // default "normal"
  showsUserHeadingIndicator?: boolean; // default true
  onPress?: () => void;
  onUpdate?: (location: unknown) => void;
}

/** Thin wrapper over @maplibre/maplibre-react-native's <UserLocation>. Render inside <SphyraMap>. */
export function SphyraGeolocateControl(props: SphyraGeolocateControlProps): ReactElement {
  return (
    <UserLocation
      visible={props.visible ?? true}
      renderMode={props.renderMode ?? "normal"}
      showsUserHeadingIndicator={props.showsUserHeadingIndicator ?? true}
      onPress={props.onPress}
      onUpdate={props.onUpdate as never}
    />
  );
}
