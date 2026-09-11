export type ScaleUnit = "metric" | "imperial";

export interface ScaleBarOptions {
  maxWidth?: number; // px, default 100
  unit?: ScaleUnit; // default "metric"
}
export interface ScaleBar {
  /** Rounded "nice" distance in the unit's display base (m, km, ft, or mi). */
  distance: number;
  /** e.g. "500 m", "2 km", "1000 ft", "1 mi". */
  label: string;
  /** Pixel width representing `distance` (≤ maxWidth). */
  width: number;
}

const EARTH_CIRCUMFERENCE = 40075016.686; // meters

function metersPerPixel(zoom: number, latitude: number): number {
  return (EARTH_CIRCUMFERENCE * Math.cos((latitude * Math.PI) / 180)) / 2 ** (zoom + 8);
}
function niceRound(value: number): number {
  const pow = 10 ** Math.floor(Math.log10(value));
  const d = value / pow;
  const nice = d >= 5 ? 5 : d >= 3 ? 3 : d >= 2 ? 2 : 1;
  return nice * pow;
}

/**
 * Compute a MapLibre-style scale bar (the visual bar/label the consumer renders) for the given
 * zoom + latitude. RN's MapView has no scale-bar widget, so this returns the math. Pure.
 */
export function computeScaleBar(zoom: number, latitude: number, options: ScaleBarOptions = {}): ScaleBar {
  const maxWidth = options.maxWidth ?? 100;
  const unit = options.unit ?? "metric";
  const mpp = metersPerPixel(zoom, latitude);
  const maxMeters = mpp * maxWidth;

  if (unit === "imperial") {
    const maxFeet = maxMeters * 3.28084;
    if (maxFeet >= 5280) {
      const miles = niceRound(maxFeet / 5280);
      return { distance: miles, label: `${miles} mi`, width: (miles * 5280) / 3.28084 / mpp };
    }
    const feet = niceRound(maxFeet);
    return { distance: feet, label: `${feet} ft`, width: feet / 3.28084 / mpp };
  }
  if (maxMeters >= 1000) {
    const km = niceRound(maxMeters / 1000);
    return { distance: km, label: `${km} km`, width: (km * 1000) / mpp };
  }
  const meters = niceRound(maxMeters);
  return { distance: meters, label: `${meters} m`, width: meters / mpp };
}
