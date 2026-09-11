export interface NavigationOptions {
  zoom?: boolean; // default true → zoomEnabled
  rotate?: boolean; // default true → rotateEnabled
  pitch?: boolean; // default true → pitchEnabled
  compass?: boolean; // default true → compassEnabled
}
export interface MapNavigationProps {
  zoomEnabled: boolean;
  rotateEnabled: boolean;
  pitchEnabled: boolean;
  compassEnabled: boolean;
}

/**
 * Map a navigation-control intent to the <MapView> props that express it in
 * @maplibre/maplibre-react-native (which has no separate nav-control widget). Spread the result
 * onto <SphyraMap>/<MapView>.
 */
export function mapNavigationProps(options: NavigationOptions = {}): MapNavigationProps {
  return {
    zoomEnabled: options.zoom ?? true,
    rotateEnabled: options.rotate ?? true,
    pitchEnabled: options.pitch ?? true,
    compassEnabled: options.compass ?? true,
  };
}
